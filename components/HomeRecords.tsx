import Link from "next/link";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";
import { getRecordBook, type RecordTable } from "@/lib/records";
import type { LangCode } from "@/lib/i18n";

/** The all-time records shown on the home page, in this order. The full book lives at /historia/records. */
const PICKS: { id: string; en: string }[] = [
  { id: "titulos", en: "Drivers' championships" },
  { id: "victorias-total", en: "Wins" },
  { id: "poles-total", en: "Pole positions" },
  { id: "podios-total", en: "Podiums" },
  { id: "largadas", en: "Grands Prix started" },
  { id: "victorias-seguidas", en: "Consecutive wins" },
  { id: "victorias-temporada", en: "Wins in one season" },
  { id: "joven-victoria", en: "Youngest winner" },
  { id: "constructores-titulos", en: "Constructors' championships" },
  { id: "modelo-pico", en: "Highest ELO (model v7.6)" }
];

/** Record values and details are written in Spanish; English keeps the numbers and drops the race names. */
function toEnglish(text: string) {
  return text
    .replace(/(\d+) años?, (\d+) días?/, "$1 years, $2 days")
    .replace(/^(\d{4}) · .+? → (\d{4}) · .+$/, "$1–$2")
    .replace(/^(\d{4}) · .+$/, "$1")
    .replace(/^(\d{4})–\1$/, "$1")
    .replace(/(\d),(\d{1,2})\b/g, "$1.$2")
    .replace(/(\d)\.(\d{3})\b/g, "$1,$2");
}

export async function HomeRecords({ lang }: { lang: LangCode }) {
  const book = await getRecordBook();
  const all = book.scopes.todas.flatMap(section => section.records);
  const records = PICKS.flatMap(pick => {
    const record = all.find(r => r.id === pick.id);
    return record?.rows.length ? [{ record, title: lang === "en" ? pick.en : record.title }] : [];
  });
  if (!records.length) return null;
  const en = lang === "en";
  const { firstSeason, lastSeason } = book.meta;
  return <section className="section section-dark home-records" id="records" aria-labelledby="home-records-title">
    <div className="section-heading heading-dark">
      <div><h2 id="home-records-title" dangerouslySetInnerHTML={{ __html: en ? "THE <em>RECORDS</em>" : "LOS <em>RÉCORDS</em>" }} /></div>
      <p>{en ? `World Championship ${firstSeason}–${lastSeason}. Who holds each record and who comes next.` : `Campeonato Mundial ${firstSeason}–${lastSeason}. Quién tiene cada récord y quién lo sigue.`}</p>
    </div>
    <div className="home-records-grid">{records.map(({ record, title }) => <Holder key={record.id} record={record} title={title} en={en} />)}</div>
    <div className="section-action"><Link className="button button-ghost" href="/historia/records">{en ? "ALL RECORDS" : "TODOS LOS RÉCORDS"} <span>→</span></Link></div>
  </section>;
}

function Holder({ record, title, en }: { record: RecordTable; title: string; en: boolean }) {
  const [top, ...rest] = record.rows;
  const next = rest.find(row => row.place > top.place);
  const tied = rest.filter(row => row.place === top.place).length;
  const flag = top.country ? getCountryFlagUrl(top.country) : undefined;
  const value = en ? toEnglish(top.value) : top.value;
  const detail = top.detail ? (en ? toEnglish(top.detail) : top.detail) : null;
  return <article className="home-record">
    <h3><Link href={`/historia/records#${record.id}`} prefetch={false}>{title}</Link></h3>
    <strong>{value}</strong>
    <p className="home-record-who">
      {flag ? <img src={flag} alt="" width={16} height={11} loading="lazy" /> : null}
      {top.href ? <Link href={top.href} prefetch={false}>{top.name}</Link> : <span>{top.name}</span>}
      {tied ? <small>{en ? ` and ${tied} more` : ` y ${tied} más`}</small> : null}
    </p>
    {detail ? <p className="home-record-detail">{detail}</p> : null}
    {next ? <p className="home-record-next">{en ? "Next: " : "Lo sigue "}{next.href ? <Link href={next.href} prefetch={false}>{next.name}</Link> : next.name}{next.name === top.name && next.detail ? ` (${en ? toEnglish(next.detail) : next.detail})` : ""}, {en ? toEnglish(next.value) : next.value}</p> : null}
  </article>;
}
