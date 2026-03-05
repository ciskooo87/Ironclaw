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

export type ReconItem = {
  id: string;
  reconciliation_run_id: string;
  business_date: string;
  title: string;
  amount: number;
  status: "pending" | "resolved_manual" | "resolved_auto";
  resolution_note: string | null;
  resolved_at: string | null;
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

export async function listPendingReconItems(projectId: string, businessDate: string) {
  try {
    const q = await dbQuery<ReconItem>(
      `select id, reconciliation_run_id, business_date::text, title, amount::float8 as amount,
              status, resolution_note, resolved_at::text
       from reconciliation_items
       where project_id=$1 and business_date=$2
       order by created_at asc`,
      [projectId, businessDate]
    );
    return q.rows;
  } catch {
    return [] as ReconItem[];
  }
}

export async function resolveReconItem(input: {
  itemId: string;
  projectId: string;
  actorUserId: string | null;
  note: string;
}) {
  const itemQ = await dbQuery<{ reconciliation_run_id: string; business_date: string }>(
    "update reconciliation_items set status='resolved_manual', resolution_note=$3, resolved_by=$4, resolved_at=now() where id=$1 and project_id=$2 and status='pending' returning reconciliation_run_id, business_date::text",
    [input.itemId, input.projectId, input.note, input.actorUserId]
  );

  if (!itemQ.rows[0]) return null;

  const runId = itemQ.rows[0].reconciliation_run_id;
  const pendingQ = await dbQuery<{ c: number }>(
    "select count(*)::int as c from reconciliation_items where reconciliation_run_id=$1 and status='pending'",
    [runId]
  );
  const pending = Number(pendingQ.rows[0]?.c || 0);
  const status: ReconRun["status"] = pending === 0 ? "ok" : pending < 5 ? "warning" : "blocked";

  await dbQuery("update reconciliation_runs set pending_items=$2, status=$3 where id=$1", [runId, pending, status]);

  return { runId, pending, status, businessDate: itemQ.rows[0].business_date };
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

  const runId = q.rows[0]?.id;

  if (runId) {
    await dbQuery("delete from reconciliation_items where project_id=$1 and business_date=$2 and status='pending'", [projectId, businessDate]);

    if (pending > 0) {
      const perItem = Number((diff / pending).toFixed(2));
      for (let i = 0; i < pending; i++) {
        await dbQuery(
          "insert into reconciliation_items(reconciliation_run_id, project_id, business_date, title, amount, status) values($1,$2,$3,$4,$5,'pending')",
          [runId, projectId, businessDate, `Pagamento não conciliado #${i + 1}`, perItem]
        );
      }
    }
  }

  return { id: runId, status, matched, pending, details };
}
