import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { getUserByEmail } from "@/lib/users";
import { closeMonth } from "@/lib/closure";
import { sumNetOperations } from "@/lib/operations";
import { dbQuery } from "@/lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/fechamento-mensal/?error=forbidden`, req.url));
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/fechamento-mensal/?error=forbidden`, req.url));

  const form = await req.formData();
  const periodYm = String(form.get("period_ym") || "");
  if (!/^\d{4}-\d{2}$/.test(periodYm)) return NextResponse.redirect(new URL(`/projetos/${code}/fechamento-mensal/?error=period`, req.url));

  const netOps = await sumNetOperations(project.id);
  const snapshot = {
    period: periodYm,
    generatedAt: new Date().toISOString(),
    netOperations: netOps,
    notes: "Snapshot imutável gerado no fechamento",
  };

  const dbUser = await getUserByEmail(user.email);
  const out = await closeMonth({ projectId: project.id, periodYm, snapshot, createdBy: dbUser?.id || null });

  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
    [project.id, dbUser?.id || null, "monthly.close", "monthly_closures", out.id || null, JSON.stringify({ periodYm, version: out.version, snapshot })]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/fechamento-mensal/?saved=1`, req.url));
}
