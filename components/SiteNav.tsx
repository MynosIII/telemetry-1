"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/temporada", label: "Temporada", match: ["/temporada", "/carreras", "/circuitos"] },
  { href: "/calendario", label: "Calendario", match: ["/calendario"] },
  { href: "/ranking", label: "Ranking", match: ["/ranking"] },
  { href: "/historia", label: "Estadísticas", match: ["/historia"] },
  { href: "/juegos", label: "Juegos", match: ["/juegos"] }
];

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Navegación principal">
      {sections.map(({ href, label, match }) => {
        const active = match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
