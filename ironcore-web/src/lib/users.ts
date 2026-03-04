import { dbQuery } from "@/lib/db";
import type { UserRole } from "@/lib/auth";

export type DbUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
};

export async function getUserByEmail(email: string) {
  try {
    const q = await dbQuery<DbUser>("select id, email, role, name from users where email = $1 and active = true", [email.toLowerCase()]);
    return q.rows[0] || null;
  } catch {
    return null;
  }
}
