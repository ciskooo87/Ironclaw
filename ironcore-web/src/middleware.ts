import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const AUTH_COOKIE = "ironcore_session";
const CSRF_COOKIE = "ironcore_csrf";

function makeCsrf() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const withCsrf = (res: NextResponse) => {
    if (!req.cookies.get(CSRF_COOKIE)?.value) {
      res.cookies.set(CSRF_COOKIE, makeCsrf(), {
        httpOnly: false,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    }
    return res;
  };

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/dre") ||
    pathname === "/favicon.ico"
  ) {
    return withCsrf(NextResponse.next());
  }

  const session = req.cookies.get(AUTH_COOKIE)?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return withCsrf(NextResponse.redirect(url));
  }

  return withCsrf(NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};
