import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getUsageKpis } from "@/lib/kpis";
import { listProjectsForUser } from "@/lib/projects";

export default async function DashboardPage() {
  const user = await requireUser();
  const usage = await getUsageKpis();
  const projects = await listProjectsForUser(user.email, user.role);

  return (
    <AppShell user={user} title="IronCore · Dashboard" subtitle="Resumo e KPIs por projeto + mensuração de uso da ferramenta">
      <section className="grid md:grid-cols-5 gap-3 mb-4">
        <div className="metric"><div className="text-xs text-slate-400">Projetos visíveis</div><div className="text-xl font-semibold mt-1">{projects.length}</div><div className="text-xs text-cyan-300 mt-1">Segmentados por permissão</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Usuários ativos 30d</div><div className="text-xl font-semibold mt-1">{usage.activeUsers}</div><div className="text-xs text-cyan-300 mt-1">Uso real da plataforma</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Rotinas com sucesso</div><div className="text-xl font-semibold mt-1">{usage.routineSuccess}/{usage.routineTotal}</div><div className="text-xs text-cyan-300 mt-1">Saúde operacional</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Inconsistências 30d</div><div className="text-xl font-semibold mt-1">{usage.inconsistencies}</div><div className="text-xs text-cyan-300 mt-1">Conciliação e bloqueios</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Envios automáticos</div><div className="text-xl font-semibold mt-1">{usage.deliverySent}</div><div className="text-xs text-cyan-300 mt-1">Falhas: {usage.deliveryFailed} · Skip: {usage.deliverySkipped}</div></div>
      </section>

      <section className="card mb-4">
        <h2 className="title">Resumo por projeto</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          {projects.length === 0 ? <div className="alert muted-bg">Sem projetos disponíveis.</div> : null}
          {projects.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-800 p-3">
              <div className="row mb-2"><span className="font-medium">{p.name}</span><span className="badge">{p.code}</span></div>
              <div className="text-xs text-slate-400">{p.segment} · {p.timezone}</div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div className="row"><span>Plano contas</span><b>{(p.account_plan || []).length}</b></div>
                <div className="row"><span>Fornec. classif.</span><b>{(p.supplier_classes || []).length}</b></div>
                <div className="row"><span>TX</span><b>{Number(p.financial_profile?.tx_percent || 0).toFixed(2)}%</b></div>
                <div className="row"><span>Float</span><b>{Number(p.financial_profile?.float_days || 0)}d</b></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="title">Módulos mais usados (30 dias)</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          {usage.topModules.length === 0 ? <div className="alert muted-bg">Sem dados de uso ainda.</div> : null}
          {usage.topModules.map((m) => (
            <div key={m.entity} className="row"><span>{m.entity}</span><b>{m.c}</b></div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
