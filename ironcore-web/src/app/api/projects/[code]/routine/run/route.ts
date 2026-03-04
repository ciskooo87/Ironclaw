import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { runDailyRoutine } from "@/lib/routine";
import { dbQuery } from "@/lib/db";
import { getUserByEmail } from "@/lib/users";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return NextResponse.redirect(new URL(`/projetos/${code}/rotina-diaria/?error=forbidden`, req.url));

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return NextResponse.redirect(new URL(`/projetos/${code}/rotina-diaria/?error=forbidden`, req.url));

  const form = await req.formData();
  const businessDate = String(form.get("business_date") || "");
  if (!businessDate) return NextResponse.redirect(new URL(`/projetos/${code}/rotina-diaria/?error=date`, req.url));

  const out = await runDailyRoutine(project.id, businessDate, project.code);
  const dbUser = await getUserByEmail(user.email);
  await dbQuery(
    "insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data) values($1,$2,$3,$4,$5,$6::jsonb)",
    [project.id, dbUser?.id || null, "routine.run", "routine_runs", out.id || null, JSON.stringify(out)]
  );

  return NextResponse.redirect(new URL(`/projetos/${code}/rotina-diaria/?saved=1`, req.url));
}
