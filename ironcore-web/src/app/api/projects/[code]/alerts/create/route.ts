import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { createProjectAlert } from "@/lib/alerts";
import { can } from "@/lib/rbac";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/riscos-alertas/?error=forbidden`, req.url));
  const allowed = await canAccessProject(user, project.id);
  if (!allowed || !can(user.role, "alert.manage")) return NextResponse.redirect(new URL(`/projetos/${code}/riscos-alertas/?error=forbidden`, req.url));

  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const severity = String(form.get("severity") || "medium") as "low" | "medium" | "high" | "critical";
  const blockFlow = String(form.get("block_flow") || "false") === "true";
  const maxDiff = Number(form.get("max_diff") || 0);
  const maxPending = Number(form.get("max_pending") || 0);

  if (!name) return NextResponse.redirect(new URL(`/projetos/${code}/riscos-alertas/?error=required`, req.url));

  await createProjectAlert({
    projectId: project.id,
    name,
    severity,
    blockFlow,
    rule: { max_diff: maxDiff, max_pending: maxPending },
  });

  return NextResponse.redirect(new URL(`/projetos/${code}/riscos-alertas/?saved=1`, req.url));
}
