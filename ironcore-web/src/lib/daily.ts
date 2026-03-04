import { dbQuery } from "@/lib/db";

export type DailyEntry = {
  id: string;
  project_id: string;
  business_date: string;
  source_type: "manual" | "upload";
  payload: Record<string, unknown>;
  created_at: string;
};

export async function listDailyEntries(projectId: string, limit = 20) {
  try {
    const q = await dbQuery<DailyEntry>(
      "select id, project_id, business_date::text, source_type, payload, created_at::text from daily_entries where project_id = $1 order by business_date desc, created_at desc limit $2",
      [projectId, limit]
    );
    return q.rows;
  } catch {
    return [] as DailyEntry[];
  }
}

export async function insertDailyEntry(input: {
  projectId: string;
  businessDate: string;
  sourceType: "manual" | "upload";
  payload: Record<string, unknown>;
  createdBy: string | null;
}) {
  const q = await dbQuery<{ id: string }>(
    "insert into daily_entries(project_id, business_date, source_type, payload, created_by) values($1,$2,$3,$4::jsonb,$5) returning id",
    [input.projectId, input.businessDate, input.sourceType, JSON.stringify(input.payload), input.createdBy]
  );
  return q.rows[0]?.id;
}
