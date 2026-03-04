import { dbQuery } from "@/lib/db";
import { integrationHealth } from "@/lib/integrations";

export async function getOpsStatus() {
  const integrations = integrationHealth();

  try {
    const [dbNow, failedDeliveries, blockedRoutines] = await Promise.all([
      dbQuery<{ now: string }>("select now()::text as now"),
      dbQuery<{ c: number }>("select count(*)::int as c from delivery_runs where status='failed' and created_at >= now() - interval '24 hour'"),
      dbQuery<{ c: number }>("select count(*)::int as c from routine_runs where status='blocked' and created_at >= now() - interval '24 hour'"),
    ]);

    return {
      db: { ok: true, now: dbNow.rows[0]?.now || "-" },
      integrations,
      failedDeliveries24h: Number(failedDeliveries.rows[0]?.c || 0),
      blockedRoutines24h: Number(blockedRoutines.rows[0]?.c || 0),
    };
  } catch {
    return {
      db: { ok: false, now: "-" },
      integrations,
      failedDeliveries24h: -1,
      blockedRoutines24h: -1,
    };
  }
}
