import { NextResponse } from "next/server";
import { authenticate, AUTH_COOKIE, encodeSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`login:${ip}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.redirect(new URL("/login?error=rate", req.url));
  }

  const form = await req.formData();
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");

  const user = authenticate(email, password);
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=1", req.url));
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set(AUTH_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
