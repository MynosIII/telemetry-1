import Link from "next/link";
import { LiveLink, SiteNav, SiteSubNav } from "@/components/SiteNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLang } from "@/lib/server-i18n";

export async function SiteHeader() {
  const lang = await getLang();
  
  return (
    <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Telemetry One, inicio">
        <span className="brand-mark">T<span>1</span></span>
        <span className="brand-copy">TELEMETRY <b>ONE</b></span>
      </Link>
      <SiteNav lang={lang} />
      <div className="header-actions">
        <LanguageSwitcher lang={lang} />
        <LiveLink lang={lang} />
      </div>
    </header>
    <SiteSubNav lang={lang} />
    <span id="contenido" tabIndex={-1} className="skip-target" />
    </>
  );
}
