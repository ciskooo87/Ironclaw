import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { getUserByEmail } from "@/lib/users";
import { closeMonth } from "@/lib/closure";
import { sumNetOperations } from "@/lib/operations";
import { dbQuery } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/fechamento-mensal/?error=forbidden`, req.url));
  const allowed = await canAccessProject(user, project.id);
  if (!allowed || !can(user.role, "closure.create")) return NextResponse.redirect(new URL(`/projetos/${code}/fechamento-mensal/?error=forbidden`, req.url));

  const form = await req.formData();
  const periodYm = String(form.get("period_ym") || "");
  if (!/^\d{4}-\d{2}$/.test(periodYm)) return NextResponse.redirect(new URL(`/projetos/${code}/fechamento-mensal/?error=period`, req.url));

  const netOps = await sumNetOperations(project.id);

  const [dailyAgg, reconAgg, alertsAgg] = await Promise.all([
    dbQuery<{ faturamento: number; receber: number; pagar: number }>(
      `select
        coalesce(sum((payload->>'faturamento')::numeric),0)::float8 as faturamento,
        coalesce(sum((payload->>'contas_receber')::numeric),0)::float8 as receber,
        coalesce(sum((payload->>'contas_pagar')::numeric),0)::float8 as pagar
       from daily_entries
       where project_id=$1 and to_char(business_date,'YYYY-MM')=$2`,
      [project.id, periodYm]
    ),
    dbQuery<{ total_runs: number; blocked_runs: number }>(
      `select
        count(*)::int as total_runs,
        count(*) filter (where status='blocked')::int as blocked_runs
       from reconciliation_runs
       where project_id=$1 and to_char(business_date,'YYYY-MM')=$2`,
      [project.id, periodYm]
    ),
    dbQuery<{ critical_alerts: number }>(
      `select count(*)::int as critical_alerts
       from project_alerts
       where project_id=$1 and severity='critical'`,
      [project.id]
    ),
  ]);

  const faturamento = Number(dailyAgg.rows[0]?.faturamento || 0);
  const receber = Number(dailyAgg.rows[0]?.receber || 0);
  const pagar = Number(dailyAgg.rows[0]?.pagar || 0);
  const resultadoOperacional = receber - pagar;

  const snapshot = {
    period: periodYm,
    generatedAt: new Date().toISOString(),
    netOperations: netOps,
    resumoMensal: {
      faturamento,
      contasReceber: receber,
      contasPagar: pagar,
      resultadoOperacional,
    },
    observaveis: {
      totalConciliacoes: Number(reconAgg.rows[0]?.total_runs || 0),
      conciliacoesBloqueadas: Number(reconAgg.rows[0]?.blocked_runs || 0),
      alertasCriticosAtivos: Number(alertsAgg.rows[0]?.critical_alerts || 0),
    },
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
