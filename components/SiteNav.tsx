"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { activeSubLink, sectionFor, siteSections } from "@/lib/site-sections";

export function SiteNav() {
  const active = sectionFor(usePathname() ?? "/");
  return (
    <nav aria-label="Navegación principal">
      {siteSections.filter((section) => !section.hidden).map((section) => (
        <Link key={section.href} href={section.href} aria-current={section === active ? "page" : undefined}>{section.label}</Link>
      ))}
    </nav>
  );
}

function SubNavLinks({ categoria }: { categoria: string | null }) {
  const pathname = usePathname() ?? "/";
  const section = sectionFor(pathname);
  // In-page anchors (#resultados) don't change the URL Next.js reports, so remember the last click per page.
  const [clicked, setClicked] = useState<{ pathname: string; hash: string }>({ pathname: "", hash: "" });
  const bar = useRef<HTMLElement>(null);
  const hash = clicked.pathname === pathname ? clicked.hash : "";
  const current = section ? activeSubLink(section, pathname, categoria, hash) : undefined;
  // On narrow screens the bar scrolls sideways; keep the current page in view.
  useEffect(() => {
    const link = bar.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (link && bar.current && bar.current.scrollWidth > bar.current.clientWidth) {
      bar.current.scrollLeft = link.offsetLeft - (bar.current.clientWidth - link.offsetWidth) / 2;
    }
  }, [current]);
  if (!section?.links) return null;
  return (
    <nav ref={bar} className="site-subnav" aria-label={`Secciones de ${section.label}`}>
      {section.links.map((link) => (
        <Link key={link.href} href={link.href} aria-current={link.href === current ? "page" : undefined}
          onClick={() => setClicked({ pathname, hash: link.href.includes("#") ? link.href.slice(link.href.indexOf("#")) : "" })}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function SubNavWithQuery() {
  return <SubNavLinks categoria={useSearchParams()?.get("categoria") ?? null} />;
}

/** Second bar with the pages of the current section; hidden outside a section. */
export function SiteSubNav() {
  // useSearchParams needs a Suspense boundary on static pages; the fallback renders the same bar.
  return <Suspense fallback={<SubNavLinks categoria={null} />}><SubNavWithQuery /></Suspense>;
}

/** The live-timing button sits apart from the sections; it lights up on its own page. */
export function LiveLink() {
  const pathname = usePathname() ?? "/";
  const active = pathname === "/en-vivo" || pathname.startsWith("/en-vivo/");
  return <Link className="header-cta" href="/en-vivo" aria-current={active ? "page" : undefined}><span className="live-dot" /> En vivo</Link>;
}
