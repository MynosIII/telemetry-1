"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
type Event = { date: string; kind: string; title: string; text: string; href: string; source?: string };
type Calendar = Record<string, Event[]>;

export function OnThisDay() {
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/history/on-this-day.json', { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('Calendar unavailable');
      return r.json();
    }).then(setCalendar).catch(e => { if (e.name !== 'AbortError') setFailed(true); });
    const update = () => setToday(new Date());
    update();
    const timer = setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const key = today ? `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}` : '';
  const events = (calendar?.[key] ?? []).filter(e => e.date < `${today?.getFullYear()}-${key}`);
  const ordered = [...events].sort((a,b) => Number(b.kind === 'Coronación') - Number(a.kind === 'Coronación') || b.date.localeCompare(a.date));
  // A new local calendar day also resets the disclosure.
  useEffect(() => { setExpanded(false); }, [key]);
  return <section className="section section-dark on-this-day" aria-labelledby="on-this-day-title">
    <div className="section-heading heading-dark"><div><p className="eyebrow eyebrow-yellow">ON THIS DAY · {today?.toLocaleDateString('es-AR', {day:'numeric',month:'long'}) ?? 'Efemérides'}</p><h2 id="on-this-day-title">Un día como hoy</h2><p>Los días que dejaron huella en la Fórmula 1.</p></div><Link href="/articulos">Explorar historias →</Link></div>
    {!calendar ? <p role="status">{failed ? 'No pudimos cargar las efemérides. Podés explorar el archivo histórico.' : 'Buscando en el archivo…'}</p> : !ordered.length ? <p>No hay efemérides documentadas para esta fecha en nuestro archivo. <Link href="/articulos">Descubrí una historia →</Link></p> : <><div className="on-this-day-grid">{(expanded ? ordered : ordered.slice(0,4)).map(e => <article key={`${e.kind}-${e.date}-${e.href}`}><p className="eyebrow eyebrow-red">{e.kind} · <time dateTime={e.date}>{e.date.slice(0,4)}</time></p><h3><Link href={e.href}>{e.title}</Link></h3><p>{e.text}</p><div><Link href={e.href}>Ver historia →</Link>{e.source && <a href={e.source} target="_blank" rel="noreferrer">Fuente ↗</a>}</div></article>)}</div>{ordered.length > 4 && <button className="button button-ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Ver menos' : `Ver las ${ordered.length} efemérides`}</button>}</>}
    <small>Fecha de tu dispositivo · Grandes premios disputados y biografías del archivo; coronaciones verificadas individualmente.</small>
  </section>;
}
