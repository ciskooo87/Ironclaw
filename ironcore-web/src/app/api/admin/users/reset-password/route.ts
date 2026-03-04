import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { str } from "@/lib/validation";
import { resetUserPassword } from "@/lib/users";
import { validateCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin_master") return NextResponse.redirect(new URL("/admin/?error=forbidden", req.url));

  const form = await req.formData();
  const csrfOk = await validateCsrf(form);
  if (!csrfOk) return NextResponse.redirect(new URL("/admin/?error=csrf", req.url));

  try {
    const email = str(form.get("email"), 5, 200);
    const newPassword = str(form.get("new_password"), 8, 120);
    await resetUserPassword(email, newPassword);
    return NextResponse.redirect(new URL("/admin/?saved=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/?error=invalid", req.url));
  }
}
