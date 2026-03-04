import { dbQuery } from "@/lib/db";

export type DeliveryRun = {
  id: string;
  project_id: string;
  routine_run_id: string | null;
  channel: "telegram" | "whatsapp" | "email";
  target: string | null;
  status: "sent" | "failed" | "skipped";
  provider_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function listDeliveryRuns(projectId: string, limit = 100) {
  try {
    const q = await dbQuery<DeliveryRun>(
      "select id, project_id, routine_run_id, channel, target, status, provider_message, payload, created_at::text from delivery_runs where project_id=$1 order by created_at desc limit $2",
      [projectId, limit]
    );
    return q.rows;
  } catch {
    return [] as DeliveryRun[];
  }
}

export async function getDeliveryRun(id: string) {
  const q = await dbQuery<DeliveryRun>(
    "select id, project_id, routine_run_id, channel, target, status, provider_message, payload, created_at::text from delivery_runs where id=$1",
    [id]
  );
  return q.rows[0] || null;
}
