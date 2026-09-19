import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Telemetry 1, inicio">
        <span className="brand-mark">T<span>1</span></span>
        <span className="brand-copy">TELEMETRY <b>ONE</b></span>
      </Link>
      <nav aria-label="Navegación principal">
        <Link href="/#resultados">Resultados</Link>
        <Link href="/calendario">Calendario</Link>
        <Link href="/#juegos">Juegos</Link>
        <Link href="/predestinato">El Predestinado</Link>
        <Link href="/estadisticas">Estadísticas</Link>
      </nav>
      <Link className="header-cta" href="/en-vivo"><span className="live-dot" /> En vivo</Link>
    </header>
  );
}
