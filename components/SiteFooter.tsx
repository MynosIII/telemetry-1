import Link from "next/link";

export function SiteFooter() {
  return (
    <footer>
      <Link className="brand footer-brand" href="/">
        <span className="brand-mark">T<span>1</span></span>
        <span className="brand-copy">TELEMETRY <b>ONE</b></span>
      </Link>
      <p>Proyecto independiente sobre automovilismo. No afiliado a Formula One Group.</p>
      <div>
        <a href="https://github.com/MynosIII" target="_blank" rel="noreferrer">GITHUB ↗</a>
        <Link href="/#top">INICIO ↑</Link>
      </div>
    </footer>
  );
}
