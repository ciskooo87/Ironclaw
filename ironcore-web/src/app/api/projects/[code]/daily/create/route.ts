import { NextResponse } from "next/server";
import { getProjectByCode } from "@/lib/projects";
import { insertDailyEntry } from "@/lib/daily";
import { dbQuery } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users";
import { canAccessProject } from "@/lib/permissions";
import { diffDaysFromSaoPaulo } from "@/lib/time";
import { parseUploadedFile } from "@/lib/upload";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const project = await getProjectByCode(code);
  const user = await getSessionUser();
  if (!project || !user) return NextResponse.redirect(new URL("/login/", req.url));

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=forbidden`, req.url));

  const form = await req.formData();
  const businessDate = String(form.get("business_date") || "");
  const sourceType = String(form.get("source_type") || "manual") as "manual" | "upload";

  const daysAgo = diffDaysFromSaoPaulo(businessDate);
  if (Number.isNaN(daysAgo) || daysAgo < 0 || daysAgo > 5) {
    return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=date_limit`, req.url));
  }

  const file = form.get("file");

  let payload = {
    faturamento: Number(form.get("faturamento") || 0),
    contas_receber: Number(form.get("contas_receber") || 0),
    contas_pagar: Number(form.get("contas_pagar") || 0),
    extrato_bancario: Number(form.get("extrato_bancario") || 0),
    duplicatas: Number(form.get("duplicatas") || 0),
    notes: String(form.get("notes") || ""),
  };

  if (file instanceof File && file.size > 0) {
    try {
      const parsed = await parseUploadedFile(file);
      payload = {
        ...payload,
        faturamento: parsed.faturamento,
        contas_receber: parsed.contas_receber,
        contas_pagar: parsed.contas_pagar,
        extrato_bancario: parsed.extrato_bancario,
        duplicatas: parsed.duplicatas,
        notes: `${payload.notes} | upload:${file.name} linhas:${parsed.lines}`.trim(),
      };
    } catch {
      return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=upload_parse`, req.url));
    }
  }

  const dbUser = await getUserByEmail(user.email);
  const id = await insertDailyEntry({
    projectId: project.id,
    businessDate,
    sourceType,
    payload,
    createdBy: dbUser?.id || null,
  });

  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
    [project.id, dbUser?.id || null, "daily.create", "daily_entries", id || null, JSON.stringify({ businessDate, sourceType, payload })]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/diario/?saved=1`, req.url));
}
