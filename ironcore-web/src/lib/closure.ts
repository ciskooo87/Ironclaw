import { dbQuery } from "@/lib/db";

export type MonthlyClosure = {
  id: string;
  period_ym: string;
  status: "closed" | "reopened";
  snapshot_version: number;
  snapshot: Record<string, unknown>;
  created_at: string;
};

export async function listClosures(projectId: string, limit = 24) {
  try {
    const q = await dbQuery<MonthlyClosure>(
      "select id, period_ym, status, snapshot_version, snapshot, created_at::text from monthly_closures where project_id=$1 order by period_ym desc, snapshot_version desc limit $2",
      [projectId, limit]
    );
    return q.rows;
  } catch {
    return [] as MonthlyClosure[];
  }
}

export async function closeMonth(input: {
  projectId: string;
  periodYm: string;
  snapshot: Record<string, unknown>;
  createdBy: string | null;
}) {
  const v = await dbQuery<{ v: number }>(
    "select coalesce(max(snapshot_version),0)+1 as v from monthly_closures where project_id=$1 and period_ym=$2",
    [input.projectId, input.periodYm]
  );
  const version = Number(v.rows[0]?.v || 1);
  const q = await dbQuery<{ id: string }>(
    "insert into monthly_closures(project_id,period_ym,status,snapshot_version,snapshot,created_by) values($1,$2,'closed',$3,$4::jsonb,$5) returning id",
    [input.projectId, input.periodYm, version, JSON.stringify(input.snapshot), input.createdBy]
  );
  return { id: q.rows[0]?.id, version };
}
