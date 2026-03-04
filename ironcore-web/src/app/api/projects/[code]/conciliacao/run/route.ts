import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { runReconciliation } from "@/lib/conciliacao";
import { dbQuery } from "@/lib/db";
import { getUserByEmail } from "@/lib/users";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?error=forbidden`, req.url));

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?error=forbidden`, req.url));

  const form = await req.formData();
  const businessDate = String(form.get("business_date") || "");
  if (!businessDate) return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?error=date`, req.url));

  const out = await runReconciliation(project.id, businessDate);
  const dbUser = await getUserByEmail(user.email);
  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
    [project.id, dbUser?.id || null, "reconciliation.run", "reconciliation_runs", out.id || null, JSON.stringify(out)]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?saved=1`, req.url));
}
