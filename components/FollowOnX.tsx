"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X_HANDLE, X_URL } from "@/lib/site";

type Copy = { title: string; text: string };
const COPY: Record<"live" | "games" | "stats" | "default", { es: Copy; en: Copy }> = {
  live: {
    es: { title: "No te pierdas ninguna sesión", text: "Seguinos en X y activá las notificaciones: avisamos cuando arranca el timing en vivo y cuando está la repetición." },
    en: { title: "Never miss a session", text: "Follow us on X and turn on notifications: we post when live timing starts and when the replay is ready." }
  },
  games: {
    es: { title: "¿Cuánto sabés de F1?", text: "Cada semana subimos desafíos nuevos a X. Seguinos y compartí tus resultados." },
    en: { title: "How much F1 do you know?", text: "We post new challenges on X every week. Follow us and share your results." }
  },
  stats: {
    es: { title: "Un récord por día", text: "En X publicamos los datos del archivo que no vas a encontrar en otro lado." },
    en: { title: "A record a day", text: "On X we post the archive numbers you won't find anywhere else." }
  },
  default: {
    es: { title: "Telemetry One está en X", text: "Resultados, récords y el análisis de cada Gran Premio apenas termina." },
    en: { title: "Telemetry One is on X", text: "Results, records and the analysis of every Grand Prix as soon as it ends." }
  }
};

const KEY = "t1-follow-x";
const DELAY_MS = 25_000;
const SNOOZE_DAYS = 10;

function read(storage: () => Storage, key: string) {
  try { return storage().getItem(key); } catch { return null; }
}
function write(storage: () => Storage, key: string, value: string) {
  try { storage().setItem(key, value); } catch { /* storage blocked: the card just shows again next visit */ }
}

function variant(pathname: string) {
  if (pathname.includes("/en-vivo")) return "live";
  if (pathname.includes("/juegos")) return "games";
  if (/\/(historia|pilotos|carreras|circuitos|ranking|temporada)/.test(pathname)) return "stats";
  return "default";
}

/** A small card in the corner inviting people to follow the site on X. It waits a while, shows once per visit, and stays away for days once closed. */
export function FollowOnX() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"es" | "en">("es");

  useEffect(() => {
    if (window.self !== window.top) return;
    const until = Number(read(() => localStorage, KEY) ?? 0);
    if (until > Date.now() || read(() => sessionStorage, KEY)) return;
    setLang(document.documentElement.lang === "en" ? "en" : "es");
    const timer = setTimeout(() => { setOpen(true); write(() => sessionStorage, KEY, "1"); }, DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!open) return null;
  const copy = COPY[variant(pathname)][lang];
  const close = (days: number) => {
    write(() => localStorage, KEY, String(Date.now() + days * 86_400_000));
    setOpen(false);
  };

  return <aside className="follow-x" aria-labelledby="follow-x-title">
    <button type="button" className="follow-x-close" onClick={() => close(SNOOZE_DAYS)} aria-label={lang === "en" ? "Close" : "Cerrar"}>×</button>
    <h2 id="follow-x-title">{copy.title}</h2>
    <p>{copy.text}</p>
    <a className="follow-x-button" href={X_URL} target="_blank" rel="noopener noreferrer" onClick={() => close(180)}>
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      {lang === "en" ? `Follow ${X_HANDLE}` : `Seguir a ${X_HANDLE}`}
    </a>
  </aside>;
}
