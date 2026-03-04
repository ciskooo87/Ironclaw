import { dbQuery } from "@/lib/db";

export type ProjectAlert = {
  id: string;
  project_id: string;
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  block_flow: boolean;
  rule: Record<string, unknown>;
  created_at: string;
};

export async function listProjectAlerts(projectId: string) {
  try {
    const q = await dbQuery<ProjectAlert>(
      "select id, project_id, name, severity, block_flow, rule, created_at::text from project_alerts where project_id = $1 order by created_at desc",
      [projectId]
    );
    return q.rows;
  } catch {
    return [] as ProjectAlert[];
  }
}

export async function createProjectAlert(input: {
  projectId: string;
  name: string;
  severity: ProjectAlert["severity"];
  blockFlow: boolean;
  rule: Record<string, unknown>;
}) {
  const q = await dbQuery<{ id: string }>(
    "insert into project_alerts(project_id,name,severity,block_flow,rule) values($1,$2,$3,$4,$5::jsonb) returning id",
    [input.projectId, input.name, input.severity, input.blockFlow, JSON.stringify(input.rule)]
  );
  return q.rows[0]?.id;
}

export function evaluateAlerts(alerts: ProjectAlert[], context: { diff: number; pending: number }) {
  const hits = alerts.filter((a) => {
    const maxDiff = Number((a.rule?.max_diff as number | undefined) ?? Number.POSITIVE_INFINITY);
    const maxPending = Number((a.rule?.max_pending as number | undefined) ?? Number.POSITIVE_INFINITY);
    return context.diff > maxDiff || context.pending > maxPending;
  });

  const hasBlocking = hits.some((h) => h.block_flow || h.severity === "critical");
  return { hits, hasBlocking };
}
