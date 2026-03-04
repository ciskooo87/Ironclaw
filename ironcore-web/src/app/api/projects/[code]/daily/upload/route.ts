import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { getUserByEmail } from "@/lib/users";
import { insertDailyEntry } from "@/lib/daily";
import { dbQuery } from "@/lib/db";
import { parseUploadedFile } from "@/lib/upload";
import { diffDaysFromSaoPaulo } from "@/lib/time";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=forbidden`, req.url));

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=forbidden`, req.url));

  const form = await req.formData();
  const businessDate = String(form.get("business_date") || "");
  const uploadKind = String(form.get("upload_kind") || "base_diaria");
  const file = form.get("file");
  const notes = String(form.get("notes") || "");

  const daysAgo = diffDaysFromSaoPaulo(businessDate);
  if (Number.isNaN(daysAgo) || daysAgo < 0 || daysAgo > 5) {
    return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=date_limit`, req.url));
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=file_required`, req.url));
  }

  try {
    const parsed = await parseUploadedFile(file);
    const payload = {
      faturamento: uploadKind === "extrato" ? 0 : parsed.faturamento,
      contas_receber: uploadKind === "extrato" ? 0 : parsed.contas_receber,
      contas_pagar: uploadKind === "extrato" ? 0 : parsed.contas_pagar,
      extrato_bancario: uploadKind === "extrato" ? parsed.extrato_bancario || parsed.faturamento || parsed.contas_receber : parsed.extrato_bancario,
      duplicatas: uploadKind === "extrato" ? 0 : parsed.duplicatas,
      notes: `${notes} | upload_kind:${uploadKind} arquivo:${file.name} linhas:${parsed.lines}`.trim(),
    };

    const dbUser = await getUserByEmail(user.email);
    const id = await insertDailyEntry({
      projectId: project.id,
      businessDate,
      sourceType: "upload",
      payload,
      createdBy: dbUser?.id || null,
    });

    await dbQuery(
      "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
      [project.id, dbUser?.id || null, "daily.upload", "daily_entries", id || null, JSON.stringify({ uploadKind, file: file.name, payload })]
    );

    return NextResponse.redirect(new URL(`/projetos/${code}/diario/?saved=1`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`/projetos/${code}/diario/?error=upload_parse`, req.url));
  }
}
