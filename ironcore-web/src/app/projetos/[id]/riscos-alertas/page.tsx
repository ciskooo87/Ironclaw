import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listProjectAlerts } from "@/lib/alerts";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Riscos e Alertas"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Riscos e Alertas"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const alerts = await listProjectAlerts(project.id);

  return (
    <AppShell user={user} title="Projeto · Riscos e Alertas" subtitle="Cadastro de alertas críticos e bloqueios">
      <section className="card mb-4">
        <h2 className="title">Novo alerta</h2>
        <form action={`/api/projects/${id}/alerts/create`} method="post" className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
          <input name="name" required placeholder="nome do alerta" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <select name="severity" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
          </select>
          <select name="block_flow" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="false">não bloqueia</option>
            <option value="true">bloqueia fluxo</option>
          </select>
          <input name="max_diff" type="number" step="0.01" placeholder="max_diff (R$)" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="max_pending" type="number" placeholder="max_pending" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <button type="submit" className="badge py-2 cursor-pointer">Salvar alerta</button>
        </form>
        {query.saved ? <div className="alert ok-bg mt-3">Alerta salvo.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}</div> : null}
      </section>

      <section className="card">
        <h2 className="title">Alertas cadastrados</h2>
        <div className="mt-3 space-y-2 text-sm">
          {alerts.length === 0 ? <div className="alert muted-bg">Sem alertas.</div> : null}
          {alerts.map((a) => (
            <div key={a.id} className="row !items-start">
              <div>
                <div className="font-medium">{a.name} · {a.severity.toUpperCase()} {a.block_flow ? "· BLOCK" : ""}</div>
                <div className="text-xs text-slate-400">{JSON.stringify(a.rule)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
