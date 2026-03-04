import { dbQuery } from "@/lib/db";
import { runReconciliation } from "@/lib/conciliacao";

export type RoutineRun = {
  id: string;
  business_date: string;
  status: "success" | "warning" | "blocked";
  summary: Record<string, unknown>;
  created_at: string;
};

export async function listRoutineRuns(projectId: string, limit = 20) {
  try {
    const q = await dbQuery<RoutineRun>(
      "select id, business_date::text, status, summary, created_at::text from routine_runs where project_id = $1 order by created_at desc limit $2",
      [projectId, limit]
    );
    return q.rows;
  } catch {
    return [] as RoutineRun[];
  }
}

export async function runDailyRoutine(projectId: string, businessDate: string) {
  const recon = await runReconciliation(projectId, businessDate);

  const riskLevel = recon.pending === 0 ? "baixo" : recon.pending <= 3 ? "medio" : "alto";
  const status: RoutineRun["status"] = recon.status === "ok" ? "success" : recon.status === "warning" ? "warning" : "blocked";
  const summary = {
    movementProcessed: true,
    aiAnalysis: {
      explainability: true,
      riskLevel,
      recommendation: recon.pending === 0 ? "Sem ação imediata" : "Revisar pendências e validar títulos",
    },
    cashflow90d: {
      basedOn: "daily+projected",
      note: recon.pending > 0 ? "Há impacto potencial por pendências de conciliação" : "Fluxo estável",
    },
    reconciliation: recon,
  };

  const q = await dbQuery<{ id: string }>(
    "insert into routine_runs(project_id, business_date, status, summary) values($1,$2,$3,$4::jsonb) returning id",
    [projectId, businessDate, status, JSON.stringify(summary)]
  );

  return { id: q.rows[0]?.id, status, summary };
}
