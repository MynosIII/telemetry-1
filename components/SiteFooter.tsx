import Link from "next/link";

export function SiteFooter() {
  return (
    <footer>
      <Link className="brand footer-brand" href="/">
        <span className="brand-mark">T<span>1</span></span>
        <span className="brand-copy">TELEMETRY <b>ONE</b></span>
      </Link>
      <p>Sitio independiente y no oficial. No está afiliado a Formula One Group, la FIA ni los equipos. F1 y Formula 1 son marcas de Formula One Licensing B.V.</p>
      <div>
        <Link href="/articulos">ARTÍCULOS ↗</Link>
        <a href="https://github.com/MynosIII" target="_blank" rel="noreferrer">GITHUB ↗</a>
        <Link href="/#top">INICIO ↑</Link>
      </div>
    </footer>
  );
}
