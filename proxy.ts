import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["es", "en"] as const;
const COOKIE = "NEXT_LOCALE";

/**
 * Every page is prerendered twice, under app/[lang]. Visitors never see that segment:
 * /historia is served from /es/historia or /en/historia depending on the language cookie.
 * An explicit /en/... or /es/... link sets the cookie and redirects to the clean address.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const explicit = LOCALES.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (explicit) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(explicit.length + 1) || "/";
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE, explicit, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  }

  const locale = request.cookies.get(COOKIE)?.value === "en" ? "en" : "es";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next.js internals and any file with an extension (images, JSON, the embedded apps).
  matcher: ["/((?!api/|_next/|.*\\.[^/]+$).*)"]
};
