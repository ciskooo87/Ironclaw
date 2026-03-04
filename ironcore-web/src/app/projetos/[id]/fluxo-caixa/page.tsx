import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { dbQuery } from "@/lib/db";
import { sumNetOperations } from "@/lib/operations";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Fluxo de Caixa"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Fluxo de Caixa"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const daily = await dbQuery<{ total: number }>("select coalesce(sum((payload->>'faturamento')::numeric),0)::float8 as total from daily_entries where project_id=$1", [project.id]);
  const base = Number(daily.rows[0]?.total || 0);
  const ops = await sumNetOperations(project.id);
  const projected90d = base * 3 + ops;

  return (
    <AppShell user={user} title="Projeto · Fluxo de Caixa" subtitle="Visão 90 dias considerando operações financeiras">
      <section className="grid md:grid-cols-3 gap-3">
        <div className="metric"><div className="text-xs text-slate-400">Base diária acumulada</div><div className="text-xl font-semibold mt-1">{base.toFixed(2)}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Impacto líquido operações</div><div className="text-xl font-semibold mt-1">{ops.toFixed(2)}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Projeção 90d</div><div className="text-xl font-semibold mt-1">{projected90d.toFixed(2)}</div></div>
      </section>
    </AppShell>
  );
}
