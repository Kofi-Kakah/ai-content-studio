import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection (Next.js 16 Proxy, formerly middleware).
 * The session cookie's presence gates protected routes instantly; the real
 * session check happens in the (app) layout server-side.
 */

const PROTECTED_PREFIXES = ["/workspace", "/projects", "/dashboard", "/editor", "/settings"];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie =
    req.cookies.get("authjs.session-token") ?? req.cookies.get("__Secure-authjs.session-token");

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isProtected && !sessionCookie) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/workspace", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // run on everything except static assets, Next internals and the BFF API
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
