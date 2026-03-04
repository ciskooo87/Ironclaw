import { cookies } from "next/headers";

export const AUTH_COOKIE = "ironcore_session";

export type UserRole = "consultor" | "head" | "diretoria" | "admin_master";

export type SessionUser = {
  email: string;
  role: UserRole;
  name: string;
};

const FALLBACK_USERS: Array<SessionUser & { password: string }> = [
  { email: "admin@ironcore.lat", password: "ironcore123", role: "admin_master", name: "Admin Master" },
  { email: "head@ironcore.lat", password: "ironcore123", role: "head", name: "Head" },
  { email: "diretoria@ironcore.lat", password: "ironcore123", role: "diretoria", name: "Diretoria" },
  { email: "consultor@ironcore.lat", password: "ironcore123", role: "consultor", name: "Consultor" },
];

export function authenticate(email: string, password: string): SessionUser | null {
  const user = FALLBACK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return null;
  return { email: user.email, role: user.role, name: user.name };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(AUTH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as SessionUser;
  } catch {
    return null;
  }
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf-8").toString("base64url");
}
