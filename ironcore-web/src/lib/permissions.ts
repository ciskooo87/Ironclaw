import { dbQuery } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export async function canAccessProject(user: SessionUser, projectId: string) {
  if (user.role === "admin_master" || user.role === "diretoria") return true;

  try {
    const q = await dbQuery<{ can_edit: boolean }>(
      "select can_edit from project_permissions pp join users u on u.id = pp.user_id where u.email = $1 and pp.project_id = $2",
      [user.email.toLowerCase(), projectId]
    );
    return q.rows.length > 0;
  } catch {
    return true;
  }
}
