import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { getDeliveryRun } from "@/lib/delivery-runs";
import { dispatchRoutineSummary } from "@/lib/notify";
import { dbQuery } from "@/lib/db";
import { getUserByEmail } from "@/lib/users";

export async function POST(req: Request, ctx: { params: Promise<{ code: string; deliveryId: string }> }) {
  const { code, deliveryId } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/delivery/?error=forbidden`, req.url));

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/delivery/?error=forbidden`, req.url));

  const run = await getDeliveryRun(deliveryId);
  if (!run || run.project_id !== project.id) return NextResponse.redirect(new URL(`/projetos/${code}/delivery/?error=notfound`, req.url));

  const summaryText = String((run.payload?.summaryText as string | undefined) || "Rotina diária");
  const results = await dispatchRoutineSummary(summaryText);
  const current = results.find((r) => r.channel === run.channel);

  if (current) {
    await dbQuery(
      "insert into delivery_runs(project_id, routine_run_id, channel, target, status, provider_message, payload) values($1,$2,$3,$4,$5,$6,$7::jsonb)",
      [project.id, run.routine_run_id, current.channel, current.target || null, current.status, current.message, JSON.stringify({ summaryText, retriedFrom: deliveryId })]
    );
  }

  const dbUser = await getUserByEmail(user.email);
  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
    [project.id, dbUser?.id || null, "delivery.retry", "delivery_runs", deliveryId, JSON.stringify(current || { status: "failed" })]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/delivery/?saved=1`, req.url));
}
