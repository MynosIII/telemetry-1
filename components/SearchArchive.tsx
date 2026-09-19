"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ArchiveRecord = { type: string; title: string; detail: string; tag: string; href?: string };

const records: ArchiveRecord[] = [
  { type: "Piloto", title: "Ayrton Senna", detail: "Brasil · 3 campeonatos · 41 victorias", tag: "LEYENDA", href: "/pilotos/senna" },
  { type: "Piloto", title: "Lewis Hamilton", detail: "Reino Unido · 7 campeonatos · Era moderna", tag: "PILOTO", href: "/pilotos/hamilton" },
  { type: "Piloto", title: "Andrea Kimi Antonelli", detail: "Italia · Mercedes", tag: "ACTUAL", href: "/pilotos/antonelli" },
  { type: "Circuito", title: "Autodromo Nazionale Monza", detail: "Italia · 5.793 km · Templo de la velocidad", tag: "PISTA", href: "/circuitos/monza" },
  { type: "Circuito", title: "Suzuka International Racing Course", detail: "Japón · 5.807 km · Figura de ocho", tag: "PISTA", href: "/circuitos/suzuka" },
  { type: "Circuito", title: "Circuito de Buenos Aires", detail: "Argentina · Archivo histórico", tag: "HISTORIA" },
  { type: "Artículo", title: "Cómo leer una estrategia de neumáticos", detail: "Próximamente", tag: "PRÓXIMO" },
  { type: "Artículo", title: "Por qué cambia el rendimiento entre eras", detail: "Próximamente", tag: "PRÓXIMO" }
];

export function SearchArchive() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    if (!needle) return records.slice(0, 4);
    return records.filter((record) =>
      `${record.type} ${record.title} ${record.detail}`.toLocaleLowerCase("es").includes(needle)
    );
  }, [query]);

  return (
    <div className="archive-tool">
      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <span className="sr-only">Buscar pilotos, circuitos y artículos</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscá un piloto, circuito o tema…"
        />
        <kbd>BUSCAR</kbd>
      </label>

      <div className="archive-results" aria-live="polite">
        {results.length ? results.map((record) => (
          <article className="archive-record" key={record.title}>
            <span className="record-index">{record.type.slice(0, 1)}</span>
            <div>
              <p>{record.type}</p>
              <h3>{record.href ? <Link href={record.href}>{record.title}</Link> : record.title}</h3>
              <span>{record.detail}</span>
            </div>
            {record.href ? <Link className="record-action" href={record.href}>{record.tag} →</Link> : <b>{record.tag}</b>}
          </article>
        )) : (
          <p className="no-results">No encontramos coincidencias. Probá con “Senna”, “Monza” o “estrategia”.</p>
        )}
      </div>
    </div>
  );
}
