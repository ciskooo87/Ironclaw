import { NextResponse } from "next/server";
import { authenticate, AUTH_COOKIE, encodeSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { publicUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`login:${ip}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.redirect(publicUrl(req, "/login?error=rate"));
  }

  const form = await req.formData();
  const csrfOk = await validateCsrf(form);
  if (!csrfOk) {
    return NextResponse.redirect(publicUrl(req, "/login?error=csrf"));
  }

  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");

  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.redirect(publicUrl(req, "/login?error=1"));
  }

  const res = NextResponse.redirect(publicUrl(req, "/dashboard/"));
  res.cookies.set(AUTH_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
