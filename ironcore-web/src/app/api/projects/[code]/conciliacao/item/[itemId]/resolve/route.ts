import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { getUserByEmail } from "@/lib/users";
import { dbQuery } from "@/lib/db";
import { resolveReconItem } from "@/lib/conciliacao";

export async function POST(req: Request, ctx: { params: Promise<{ code: string; itemId: string }> }) {
  const { code, itemId } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?error=forbidden`, req.url));

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?error=forbidden`, req.url));

  const form = await req.formData();
  const note = String(form.get("note") || "").trim();
  const businessDate = String(form.get("business_date") || "").trim();
  if (!note) return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?error=note&business_date=${businessDate}`, req.url));

  const dbUser = await getUserByEmail(user.email);
  const result = await resolveReconItem({ itemId, projectId: project.id, actorUserId: dbUser?.id || null, note });
  if (!result) return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?error=item&business_date=${businessDate}`, req.url));

  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
    [project.id, dbUser?.id || null, "reconciliation.manual_resolve", "reconciliation_items", itemId, JSON.stringify({ note, result })]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/conciliacao/?saved=1&business_date=${businessDate || result.businessDate}`, req.url));
}
