import { dbQuery } from "@/lib/db";

export async function getUsageKpis() {
  try {
    const [users, projects, routines, inconsistencies, modules] = await Promise.all([
      dbQuery<{ c: number }>("select count(distinct actor_user_id)::int as c from audit_log where created_at >= now() - interval '30 day'"),
      dbQuery<{ c: number }>("select count(distinct project_id)::int as c from audit_log where created_at >= now() - interval '30 day'"),
      dbQuery<{ total: number; ok: number }>("select count(*)::int as total, count(*) filter (where status='success')::int as ok from routine_runs where created_at >= now() - interval '30 day'"),
      dbQuery<{ c: number }>("select count(*)::int as c from reconciliation_runs where status in ('warning','blocked') and created_at >= now() - interval '30 day'"),
      dbQuery<{ entity: string; c: number }>("select entity, count(*)::int as c from audit_log where created_at >= now() - interval '30 day' group by entity order by c desc limit 5"),
    ]);

    return {
      activeUsers: Number(users.rows[0]?.c || 0),
      activeProjects: Number(projects.rows[0]?.c || 0),
      routineTotal: Number(routines.rows[0]?.total || 0),
      routineSuccess: Number(routines.rows[0]?.ok || 0),
      inconsistencies: Number(inconsistencies.rows[0]?.c || 0),
      topModules: modules.rows,
    };
  } catch {
    return {
      activeUsers: 0,
      activeProjects: 0,
      routineTotal: 0,
      routineSuccess: 0,
      inconsistencies: 0,
      topModules: [] as Array<{ entity: string; c: number }>,
    };
  }
}
