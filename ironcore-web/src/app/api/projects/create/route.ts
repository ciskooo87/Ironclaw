import { NextResponse } from "next/server";
import { createProject } from "@/lib/projects";
import { dbQuery } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const code = String(form.get("code") || "").trim().toLowerCase();
  const name = String(form.get("name") || "").trim();
  const cnpj = String(form.get("cnpj") || "").trim();
  const legalName = String(form.get("legal_name") || "").trim();
  const segment = String(form.get("segment") || "").trim();
  const timezone = String(form.get("timezone") || "America/Sao_Paulo").trim();
  const partners = String(form.get("partners") || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (!code || !name || !cnpj || !legalName || !segment) {
    return NextResponse.redirect(new URL("/projetos/?error=required", req.url));
  }

  try {
    const created = await createProject({ code, name, cnpj, legalName, segment, timezone, partners });
    const user = await getSessionUser();
    await dbQuery("insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1, null, $2, $3, $4, $5::jsonb)", [created.id, "project.create", "projects", created.id, JSON.stringify({ code, name, cnpj })]);
    if (user?.email) {
      // reserved for future user-id mapping
    }
    return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/projetos/?error=db", req.url));
  }
}
