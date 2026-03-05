import { NextResponse } from "next/server";
import { getProjectByCode, updateProjectByCode } from "@/lib/projects";
import { dbQuery } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessProject } from "@/lib/permissions";
import { can } from "@/lib/rbac";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=forbidden`, req.url));
  const allowed = await canAccessProject(user, project.id);
  if (!allowed || !can(user.role, "project.edit")) return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=forbidden`, req.url));

  const form = await req.formData();

  const name = String(form.get("name") || "").trim();
  const cnpj = String(form.get("cnpj") || "").trim();
  const legalName = String(form.get("legal_name") || "").trim();
  const segment = String(form.get("segment") || "").trim();
  const timezone = String(form.get("timezone") || "America/Sao_Paulo").trim();
  const partners = String(form.get("partners") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const accountPlan = String(form.get("account_plan") || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const projectSummary = String(form.get("project_summary") || "").trim();

  const txPercent = Number(form.get("tx_percent") || 0);
  const floatDays = Number(form.get("float_days") || 0);
  const tac = Number(form.get("tac") || 0);
  const costPerBoleto = Number(form.get("cost_per_boleto") || 0);

  const supplierClasses = String(form.get("supplier_classes") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [supplier, account] = line.split("|").map((s) => s.trim());
      return { supplier: supplier || "", account: account || "" };
    })
    .filter((row) => row.supplier && row.account);

  if (!name || !cnpj || !legalName || !segment || accountPlan.length === 0) {
    return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=required`, req.url));
  }

  if (txPercent < 0 || floatDays < 0 || tac < 0 || costPerBoleto < 0) {
    return NextResponse.redirect(new URL(`/projetos/${code}/cadastro/?error=finance`, req.url));
  }

  try {
    const before = await getProjectByCode(code);
    await updateProjectByCode(code, {
      name,
      cnpj,
      legalName,
      segment,
      timezone,
      partners,
      accountPlan,
      projectSummary,
      financialProfile: { tx_percent: txPercent, float_days: floatDays, tac, cost_per_boleto: costPerBoleto },
      supplierClasses,
    });
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
