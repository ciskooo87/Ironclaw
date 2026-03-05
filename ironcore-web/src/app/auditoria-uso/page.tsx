import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getUsageKpis } from "@/lib/kpis";

export default async function AuditoriaUsoPage() {
  const user = await requireUser();
  const k = await getUsageKpis();
  const successRate = k.routineTotal > 0 ? (k.routineSuccess / k.routineTotal) * 100 : 0;

  return (
    <AppShell user={user} title="Auditoria de Uso" subtitle="KPIs reais (últimos 30 dias)">
      <section className="grid md:grid-cols-7 gap-3 mb-4">
        <div className="metric"><div className="text-xs text-slate-400">Usuários ativos</div><div className="text-xl font-semibold mt-1">{k.activeUsers}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Projetos ativos</div><div className="text-xl font-semibold mt-1">{k.activeProjects}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Rotinas executadas</div><div className="text-xl font-semibold mt-1">{k.routineTotal}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Taxa sucesso rotina</div><div className="text-xl font-semibold mt-1">{successRate.toFixed(1)}%</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Inconsistências</div><div className="text-xl font-semibold mt-1">{k.inconsistencies}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Envios automáticos</div><div className="text-xl font-semibold mt-1">{k.deliverySent}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Conciliações manuais</div><div className="text-xl font-semibold mt-1">{k.manualReconciliations}</div></div>
      </section>

      <section className="card">
        <h2 className="title">Módulos mais usados</h2>
        <div className="mt-3 space-y-2 text-sm">
          {k.topModules.length === 0 ? <div className="alert muted-bg">Sem dados ainda.</div> : null}
          {k.topModules.map((m) => (
            <div key={m.entity} className="row"><span>{m.entity}</span><span className="badge">{m.c}</span></div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
