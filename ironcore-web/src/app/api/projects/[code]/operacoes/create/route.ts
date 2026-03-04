import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { createOperation } from "@/lib/operations";
import { getUserByEmail } from "@/lib/users";
import { dbQuery } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { num, str } from "@/lib/validation";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/operacoes/?error=forbidden`, req.url));
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/operacoes/?error=forbidden`, req.url));

  const ip = req.headers.get("x-forwarded-for") || user.email;
  const rl = checkRateLimit(`ops:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.redirect(new URL(`/projetos/${code}/operacoes/?error=rate`, req.url));

  const form = await req.formData();
  const businessDate = str(form.get("business_date"), 10, 10);
  const opType = String(form.get("op_type") || "desconto_duplicata") as "desconto_duplicata" | "comissaria" | "fomento" | "intercompany";
  const grossAmount = num(form.get("gross_amount"), 0.01, 1_000_000_000);
  const feePercent = num(form.get("fee_percent"), 0, 100);
  const fundLimit = num(form.get("fund_limit"), 0, 1_000_000_000);
  const receivableAvailable = num(form.get("receivable_available"), 0, 1_000_000_000);
  const notes = str(form.get("notes"), 0, 4000);

  if (!businessDate || grossAmount <= 0) return NextResponse.redirect(new URL(`/projetos/${code}/operacoes/?error=required`, req.url));
  if (fundLimit > 0 && grossAmount > fundLimit) return NextResponse.redirect(new URL(`/projetos/${code}/operacoes/?error=fund_limit`, req.url));
  if (receivableAvailable > 0 && grossAmount > receivableAvailable) return NextResponse.redirect(new URL(`/projetos/${code}/operacoes/?error=receivable_limit`, req.url));

  const dbUser = await getUserByEmail(user.email);
  const out = await createOperation({ projectId: project.id, businessDate, opType, grossAmount, feePercent, fundLimit, receivableAvailable, notes, createdBy: dbUser?.id || null });

  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
    [project.id, dbUser?.id || null, "operation.create", "financial_operations", out.id || null, JSON.stringify({ businessDate, opType, grossAmount, feePercent, net: out.netAmount })]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/operacoes/?saved=1`, req.url));
}
