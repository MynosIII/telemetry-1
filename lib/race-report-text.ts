/**
 * The written part of the post-race report: a summary of the race in Spanish and English.
 *
 * Every summary is first written from the data (no external service needed). When the site has
 * API keys, ChatGPT (OPENAI_API_KEY) rewrites the Spanish summary as prose and Gemini
 * (GEMINI_API_KEY) translates the whole report into English. Those texts are generated once per
 * race, when the report is complete, and kept in the Neon database (table race_report_texts).
 */
import { neon } from "@neondatabase/serverless";
import type { RaceReport, ReportFact } from "./race-report";

export type Lang = "es" | "en";

export type ReportTexts = {
  summary: string[];
  stats: ReportFact[];
  records: string[];
  curiosities: string[];
  /** Who wrote the summary: "data" for the built-in writer, or the model that rewrote it. */
  writer: "data" | "chatgpt";
  translator: "data" | "gemini" | null;
};

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const fmt = (value: number, digits = 0, lang: Lang = "es") =>
  value.toLocaleString(lang === "es" ? "es-AR" : "en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const ordinal = (n: number, lang: Lang) => lang === "es" ? `${n}.º` : `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
const list = (items: string[], lang: Lang) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${lang === "es" ? "y" : "and"} ${items.at(-1)}`;

/** A plain, factual summary built only from the report's numbers. */
export function dataSummary(report: RaceReport, lang: Lang): string[] {
  const es = lang === "es";
  const out: string[] = [];
  const [first, second, third] = report.podium;
  const name = (id: string) => report.expectation.find(r => r.driverId === id)?.name ?? id;

  if (first) {
    const grid = first.grid === 1
      ? (es ? ", desde la pole position" : ", from pole position")
      : first.grid ? (es ? `, largando ${ordinal(first.grid, lang)}` : `, starting ${ordinal(first.grid, lang)}`)
      : (es ? ", largando desde boxes" : ", from the pit lane");
    const margin = report.stats.find(s => s.label === "Margen")?.value.replace(/^\+/, "").replace(" s", "");
    const marginText = margin && second ? (es ? ` y le sacó ${margin.replace(".", ",")} s a ${second.name}` : ` and finished ${margin} s ahead of ${second.name}`) : "";
    let p = es
      ? `${first.name} ganó el ${report.name} ${report.season} con ${first.team}${grid}${marginText}.`
      : `${first.name} won the ${report.season} ${report.englishName} for ${first.team}${grid}${marginText}.`;
    if (second && third) p += es ? ` ${second.name} y ${third.name} completaron el podio.` : ` ${second.name} and ${third.name} completed the podium.`;
    if (report.pole && report.pole.driverId !== first.driverId) {
      p += report.pole.finish
        ? (es ? ` ${report.pole.name} había largado primero y terminó ${ordinal(report.pole.finish, lang)}.` : ` ${report.pole.name} started first and finished ${ordinal(report.pole.finish, lang)}.`)
        : (es ? ` ${report.pole.name} había largado primero y abandonó.` : ` ${report.pole.name} started first and retired.`);
    }
    out.push(p);
  }

  if (report.leaders.length > 1) {
    const parts = report.leaders.slice(0, 4).map(l => es ? `${name(l.driverId)} ${l.laps}` : `${name(l.driverId)} ${l.laps}`);
    out.push(es
      ? `La punta cambió de manos ${report.leadChanges} ${report.leadChanges === 1 ? "vez" : "veces"}. Vueltas lideradas: ${list(parts, lang)}.`
      : `The lead changed hands ${report.leadChanges} ${report.leadChanges === 1 ? "time" : "times"}. Laps led: ${list(parts, lang)}.`);
  } else if (report.leaders.length === 1) {
    out.push(es ? `${name(report.leaders[0].driverId)} lideró las ${report.laps} vueltas.` : `${name(report.leaders[0].driverId)} led all ${report.laps} laps.`);
  }

  const ranked = report.expectation.filter(r => r.delta !== null);
  const top = ranked[0];
  const bottom = ranked.at(-1);
  if (top && top.delta! > 0) {
    const describe = (r: typeof top) => es
      ? `largó ${r.grid ? ordinal(r.grid, lang) : "desde boxes"}, la referencia lo ubicaba ${ordinal(r.expected!, lang)} y terminó ${ordinal(r.finish!, lang)}`
      : `started ${r.grid ? ordinal(r.grid, lang) : "from the pit lane"}, was expected ${ordinal(r.expected!, lang)} and finished ${ordinal(r.finish!, lang)}`;
    let p = es
      ? `Contra lo que hacía esperar la grilla, el que más rindió fue ${top.name}: ${describe(top)}.`
      : `Against what the grid predicted, the standout was ${top.name}, who ${describe(top)}.`;
    if (bottom && bottom.delta! < 0) p += es ? ` En el otro extremo, ${bottom.name} ${describe(bottom)}.` : ` At the other end, ${bottom.name} ${describe(bottom)}.`;
    out.push(p);
  }

  const passer = report.overtakes.rows[0];
  const extras: string[] = [];
  if (passer?.made) extras.push(es
    ? `${passer.name} fue el que más adelantó, con ${passer.made} de los ${report.overtakes.total} pases de la carrera.`
    : `${passer.name} made the most passes: ${passer.made} of the race's ${report.overtakes.total}.`);
  if (report.fastestLap) extras.push(es
    ? `La vuelta rápida fue de ${report.fastestLap.name} (${report.fastestLap.time}, vuelta ${report.fastestLap.lap}).`
    : `${report.fastestLap.name} set the fastest lap (${report.fastestLap.time}, lap ${report.fastestLap.lap}).`);
  if (report.retirements.length) extras.push(es
    ? `${report.retirements.length === 1 ? "Abandonó" : "Abandonaron"} ${list(report.retirements.map(r => `${r.name} (${r.status.toLowerCase()}, vuelta ${r.laps})`), lang)}.`
    : `${list(report.retirements.map(r => `${r.name} (lap ${r.laps})`), lang)} retired.`);
  else extras.push(es ? "Todos los que largaron llegaron al final." : "Every starter reached the finish.");
  out.push(extras.join(" "));

  const [leader, runnerUp] = report.standings;
  if (leader && runnerUp) {
    const gap = leader.points - runnerUp.points;
    const remaining = report.remainingRaces;
    if (remaining === 0) out.push(es
      ? `${leader.name} cierra el año al frente del campeonato con ${fmt(leader.points)} puntos, ${fmt(gap)} más que ${runnerUp.name}.`
      : `${leader.name} ends the year top of the championship on ${fmt(leader.points, 0, lang)} points, ${fmt(gap, 0, lang)} ahead of ${runnerUp.name}.`);
    else out.push(es
      ? `Con este resultado, ${leader.name} lidera el campeonato con ${fmt(leader.points)} puntos, ${fmt(gap)} más que ${runnerUp.name}${remaining ? `, con ${remaining} ${remaining === 1 ? "carrera" : "carreras"} por delante` : ""}.`
      : `${leader.name} now leads the championship on ${fmt(leader.points, 0, lang)} points, ${fmt(gap, 0, lang)} ahead of ${runnerUp.name}${remaining ? `, with ${remaining} ${remaining === 1 ? "race" : "races"} to go` : ""}.`);
  }
  return out;
}

// ---------- external writers ----------

async function chatGptSummary(report: RaceReport, draft: string[]): Promise<string[] | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const facts = {
    carrera: `${report.name} ${report.season}`, circuito: report.circuit, vueltas: report.laps,
    resumen_de_datos: draft, estadisticas: report.stats, records: report.records, curiosidades: report.curiosities,
    llegada_contra_largada: report.expectation.filter(r => r.delta !== null).map(r => ({ piloto: r.name, largo: r.grid, esperado: r.expected, llego: r.finish, diferencia: r.delta }))
  };
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: "Sos periodista de Fórmula 1 y escribís en español rioplatense neutro, sobrio, sin exageraciones ni emojis. Usás solo los datos que te pasan: no inventes hechos, causas, declaraciones ni números. Escribí los nombres de pilotos, equipos y carreras exactamente como aparecen en los datos." },
        { role: "user", content: `Escribí el resumen de esta carrera en 4 o 5 párrafos cortos, sin títulos ni listas, separados por una línea en blanco. Datos:\n${JSON.stringify(facts)}` }
      ]
    }),
    signal: AbortSignal.timeout(25_000)
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const body = await response.json() as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  return text ? text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : null;
}

async function geminiTranslate(source: Omit<ReportTexts, "writer" | "translator">): Promise<Omit<ReportTexts, "writer" | "translator"> | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Translate every Spanish string in this JSON into British English for a Formula 1 website. Keep the same keys, array lengths and order. Keep driver, team, circuit and race names exactly as written (translate "Gran Premio de X" as "X Grand Prix"). Numbers use English formatting. Return only the JSON.\n${JSON.stringify(source)}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    }),
    signal: AbortSignal.timeout(25_000)
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const body = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const parsed = JSON.parse(text) as Omit<ReportTexts, "writer" | "translator">;
  const sameShape = parsed.summary?.length === source.summary.length && parsed.stats?.length === source.stats.length
    && parsed.records?.length === source.records.length && parsed.curiosities?.length === source.curiosities.length;
  return sameShape ? parsed : null;
}

// ---------- storage ----------

async function stored(key: string): Promise<ReportTexts | null> {
  if (!process.env.DATABASE_URL) return null;
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS race_report_texts (key text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
  const rows = await sql`SELECT data FROM race_report_texts WHERE key = ${key}`;
  return (rows[0]?.data as ReportTexts | undefined) ?? null;
}

async function store(key: string, data: ReportTexts) {
  if (!process.env.DATABASE_URL) return;
  await neon(process.env.DATABASE_URL)`INSERT INTO race_report_texts (key, data) VALUES (${key}, ${JSON.stringify(data)}::jsonb) ON CONFLICT (key) DO NOTHING`;
}

const fallback = (report: RaceReport, lang: Lang): ReportTexts => ({
  summary: dataSummary(report, lang),
  stats: report.stats,
  records: report.records,
  curiosities: report.curiosities,
  writer: "data",
  translator: lang === "en" ? "data" : null
});

/**
 * Texts for the page. Reads stored ones; when the report is complete and they are missing,
 * `generate` asks ChatGPT and Gemini (only the alert endpoint passes it, so visitors never wait).
 */
export async function getReportTexts(report: RaceReport, lang: Lang, generate = false): Promise<ReportTexts> {
  const base = fallback(report, lang);
  if (!report.complete || (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)) return base;
  const key = `${report.season}-${report.round}-${lang}`;
  try {
    const saved = await stored(key);
    if (saved || !generate) return saved ?? base;

    const spanishKey = `${report.season}-${report.round}-es`;
    let spanish = lang === "es" ? null : await stored(spanishKey);
    if (!spanish) {
      const written = await chatGptSummary(report, dataSummary(report, "es")).catch(() => null);
      spanish = { ...fallback(report, "es"), summary: written ?? dataSummary(report, "es"), writer: written ? "chatgpt" : "data" };
      if (written) await store(spanishKey, spanish);
    }
    if (lang === "es") return spanish;

    const translated = await geminiTranslate({ summary: spanish.summary, stats: spanish.stats, records: spanish.records, curiosities: spanish.curiosities }).catch(() => null);
    if (!translated) return base;
    const english: ReportTexts = { ...translated, writer: spanish.writer, translator: "gemini" };
    await store(key, english);
    return english;
  } catch {
    return base;
  }
}
