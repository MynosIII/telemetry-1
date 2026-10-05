"use client";

import { useRef, type ReactNode } from "react";

export function Encyclopedia({ sections, children, aside }: { sections: { id: string; name: string }[]; children: ReactNode; aside: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  function openSection(id: string) {
    const section = root.current?.querySelector<HTMLDetailsElement>(`details[id="${id}"]`);
    if (section) section.open = true;
  }
  function expand(open: boolean) { root.current?.querySelectorAll<HTMLDetailsElement>("details.ency-section").forEach(section => { section.open = open; }); }
  return <div ref={root} className="ency-layout">
    <nav className="ency-contents" aria-label="Contenido del artículo"><p>Contenido</p><ol>{sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} onClick={() => openSection(s.id)}><span>{String(i + 1).padStart(2, "0")}</span>{s.name}</a></li>)}</ol><div className="ency-expand"><button onClick={() => expand(true)}>Ampliar todo</button><button onClick={() => expand(false)}>Plegar todo</button></div></nav>
    <article className="ency-article">{children}</article><aside className="ency-aside">{aside}</aside>
  </div>;
}

export function EncyclopediaSection({ id, title, children, open = false, kicker }: { id: string; title: string; children: ReactNode; open?: boolean; kicker?: string }) {
  return <details className="ency-section" id={id} open={open}><summary>{kicker ? <small>{kicker}</small> : null}<h2>{title}</h2><span className="ency-chevron" aria-hidden="true">⌄</span></summary><div className="ency-section-body">{children}</div></details>;
}
