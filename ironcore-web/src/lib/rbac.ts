import type { UserRole } from "@/lib/auth";

const PERMS: Record<UserRole, Set<string>> = {
  consultor: new Set(["project.view", "daily.write"]),
  head: new Set(["project.view", "project.edit", "project.create", "daily.write", "ops.create", "reconcile.run", "routine.run", "delivery.retry", "alert.manage", "closure.create"]),
  diretoria: new Set(["project.view", "audit.view", "delivery.view", "admin.status" ]),
  admin_master: new Set(["*"]),
};

export function can(userRole: UserRole, action: string) {
  const p = PERMS[userRole];
  return p.has("*") || p.has(action);
}
