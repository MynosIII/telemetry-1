"use client";

import { useEffect, useState } from "react";

export function LanguageSwitcher() {
  const [lang, setLang] = useState("es");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // The server renders from the cookie, so the button must read the same source.
    const current = /(?:^|; )NEXT_LOCALE=en(?:;|$)/.test(document.cookie) ? "en" : "es";
    setLang(current);
    document.documentElement.lang = current;
  }, []);

  const toggle = () => {
    const next = lang === "es" ? "en" : "es";
    setLang(next);
    document.documentElement.lang = next;
    
    // Almacena en la cookie para SSR si fuera necesario a futuro, y recarga para que 
    // todo el app tome el nuevo idioma si los componentes miran localStorage
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    window.location.reload();
  };

  const style: React.CSSProperties = {
    cursor: "pointer", 
    background: "transparent", 
    color: "#d9d9dc",
    border: "1px solid #38383d",
    padding: "10px 14px",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: ".8px",
    textTransform: "uppercase",
    display: "block",
    borderRadius: "4px"
  };

  if (!mounted) {
    // Prevent hydration mismatch by rendering a placeholder of the same size
    return (
      <button aria-hidden="true" style={{ ...style, opacity: 0 }}>
        ESP
      </button>
    );
  }

  return (
    <button 
      onClick={toggle} 
      className="button-lang" 
      aria-label="Cambiar idioma / Change language"
      title="Cambiar idioma / Change language"
      style={style}
      onMouseOver={(e) => e.currentTarget.style.background = "#222"}
      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
    >
      {lang === "es" ? "ESP" : "ENG"}
    </button>
  );
}
