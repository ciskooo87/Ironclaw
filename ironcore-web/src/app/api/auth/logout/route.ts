import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { publicUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const res = NextResponse.redirect(publicUrl(req, "/login/"));
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
