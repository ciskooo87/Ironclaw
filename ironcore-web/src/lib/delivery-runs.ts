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

export async function listDeliveryRuns(projectId: string, limit = 100, filter?: { channel?: string; status?: string; from?: string; to?: string }) {
  try {
    const where: string[] = ["project_id = $1"];
    const args: unknown[] = [projectId];

    if (filter?.channel) {
      args.push(filter.channel);
      where.push(`channel = $${args.length}`);
    }
    if (filter?.status) {
      args.push(filter.status);
      where.push(`status = $${args.length}`);
    }
    if (filter?.from) {
      args.push(filter.from);
      where.push(`created_at >= $${args.length}::date`);
    }
    if (filter?.to) {
      args.push(filter.to);
      where.push(`created_at < ($${args.length}::date + interval '1 day')`);
    }
    args.push(limit);

    const q = await dbQuery<DeliveryRun>(
      `select id, project_id, routine_run_id, channel, target, status, provider_message, payload, created_at::text from delivery_runs where ${where.join(" and ")} order by created_at desc limit $${args.length}`,
      args
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
