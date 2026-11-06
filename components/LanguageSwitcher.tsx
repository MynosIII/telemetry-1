"use client";

import type { LangCode } from "@/lib/i18n";

/** Each language is a prerendered copy of the page; the cookie tells the proxy which copy to serve. */
export function LanguageSwitcher({ lang }: { lang: LangCode }) {
  const next = lang === "es" ? "en" : "es";

  const toggle = () => {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="button-lang"
      aria-label={lang === "es" ? "Switch to English" : "Cambiar a español"}
      title={lang === "es" ? "Switch to English" : "Cambiar a español"}
    >
      {lang === "es" ? "ESP" : "ENG"}
    </button>
  );
}
