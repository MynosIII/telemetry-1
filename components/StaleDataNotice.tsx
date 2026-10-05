export function StaleDataNotice({ live, detail }: { live: boolean; detail?: string }) {
  if (live) return null;
  return (
    <div className="stale-data-notice" role="status">
      <strong>DATOS DESACTUALIZADOS</strong>
      <p>
        No pudimos conectar con la fuente de resultados de la temporada. Mostramos la última copia guardada,
        que puede no incluir las carreras más recientes.{detail ? ` ${detail}` : ""}
      </p>
    </div>
  );
}
