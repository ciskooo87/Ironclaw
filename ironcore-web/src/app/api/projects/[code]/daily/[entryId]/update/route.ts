import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { getUserByEmail } from "@/lib/users";
import { getDailyEntryById, updateDailyEntryById } from "@/lib/daily";
import { diffDaysFromSaoPaulo } from "@/lib/time";
import { dbQuery } from "@/lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ code: string; entryId: string }> }) {
  const { code, entryId } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=forbidden`, req.url));

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=forbidden`, req.url));

  const before = await getDailyEntryById(entryId);
  if (!before || before.project_id !== project.id) {
    return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=entry_not_found`, req.url));
  }

  const daysAgo = diffDaysFromSaoPaulo(before.business_date);
  if (Number.isNaN(daysAgo) || daysAgo < 0 || daysAgo > 5) {
    return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=date_limit`, req.url));
  }

  const form = await req.formData();
  const payload = {
    faturamento: Number(form.get("faturamento") || 0),
    contas_receber: Number(form.get("contas_receber") || 0),
    contas_pagar: Number(form.get("contas_pagar") || 0),
    extrato_bancario: Number(form.get("extrato_bancario") || 0),
    duplicatas: Number(form.get("duplicatas") || 0),
    notes: String(form.get("notes") || ""),
  };

  await updateDailyEntryById(entryId, payload);
  const dbUser = await getUserByEmail(user.email);
  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, before_data, after_data) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)",
    [project.id, dbUser?.id || null, "daily.update", "daily_entries", entryId, JSON.stringify(before.payload), JSON.stringify(payload)]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/diario/?saved=1`, req.url));
}
