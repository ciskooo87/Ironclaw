import { dbQuery } from "@/lib/db";

export type ReconRun = {
  id: string;
  business_date: string;
  status: "ok" | "warning" | "blocked";
  matched_items: number;
  pending_items: number;
  details: Record<string, unknown>;
  created_at: string;
};

export async function listReconRuns(projectId: string, limit = 20) {
  try {
    const q = await dbQuery<ReconRun>(
      "select id, business_date::text, status, matched_items, pending_items, details, created_at::text from reconciliation_runs where project_id = $1 order by created_at desc limit $2",
      [projectId, limit]
    );
    return q.rows;
  } catch {
    return [] as ReconRun[];
  }
}

export async function runReconciliation(projectId: string, businessDate: string) {
  const daily = await dbQuery<{ payload: Record<string, unknown> }>(
    "select payload from daily_entries where project_id = $1 and business_date = $2 order by created_at desc",
    [projectId, businessDate]
  );

  const totals = daily.rows.reduce(
    (acc, row) => {
      const p = row.payload || {};
      acc.receber += Number(p.contas_receber || 0);
      acc.extrato += Number(p.extrato_bancario || 0);
      acc.duplicatas += Number(p.duplicatas || 0);
      return acc;
    },
    { receber: 0, extrato: 0, duplicatas: 0 }
  );

  const diff = Math.abs(totals.extrato - (totals.receber + totals.duplicatas));
  const pending = diff === 0 ? 0 : Math.ceil(diff / 1000);
  const status: ReconRun["status"] = diff === 0 ? "ok" : diff < 5000 ? "warning" : "blocked";
  const matched = Math.max(0, daily.rows.length - pending);

  const details = {
    extrato: totals.extrato,
    receber: totals.receber,
    duplicatas: totals.duplicatas,
    diff,
    noTolerance: true,
  };

  const q = await dbQuery<{ id: string }>(
    "insert into reconciliation_runs(project_id, business_date, status, matched_items, pending_items, details) values($1,$2,$3,$4,$5,$6::jsonb) returning id",
    [projectId, businessDate, status, matched, pending, JSON.stringify(details)]
  );
  return { id: q.rows[0]?.id, status, matched, pending, details };
}
