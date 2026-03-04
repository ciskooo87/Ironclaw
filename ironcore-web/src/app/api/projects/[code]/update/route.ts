import { NextResponse } from "next/server";
import { getProjectByCode, updateProjectByCode } from "@/lib/projects";
import { dbQuery } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessProject } from "@/lib/permissions";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=forbidden`, req.url));
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=forbidden`, req.url));

  const form = await req.formData();

  const name = String(form.get("name") || "").trim();
  const cnpj = String(form.get("cnpj") || "").trim();
  const legalName = String(form.get("legal_name") || "").trim();
  const segment = String(form.get("segment") || "").trim();
  const timezone = String(form.get("timezone") || "America/Sao_Paulo").trim();
  const partners = String(form.get("partners") || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (!name || !cnpj || !legalName || !segment) {
    return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=required`, req.url));
  }

  try {
    const before = await getProjectByCode(code);
    await updateProjectByCode(code, { name, cnpj, legalName, segment, timezone, partners });
    const after = await getProjectByCode(code);
    if (after) {
      await dbQuery(
        "insert into audit_log(project_id, action, entity, entity_id, before_data, after_data) values($1,$2,$3,$4,$5::jsonb,$6::jsonb)",
        [after.id, "project.update", "projects", after.id, JSON.stringify(before), JSON.stringify(after)]
      );
    }
    return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?saved=1`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=db`, req.url));
  }
}
