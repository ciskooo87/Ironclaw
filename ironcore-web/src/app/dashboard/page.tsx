import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} title="IronCore · Dashboard" subtitle="Visão geral da operação e prioridades do rollout">
      <section className="grid md:grid-cols-4 gap-3 mb-4">
        <div className="metric"><div className="text-xs text-slate-400">Fase atual</div><div className="text-xl font-semibold mt-1">A</div><div className="text-xs text-cyan-300 mt-1">Cadastro + Diário</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Horizonte</div><div className="text-xl font-semibold mt-1">90 dias</div><div className="text-xs text-cyan-300 mt-1">Fluxo projetado</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Conciliação</div><div className="text-xl font-semibold mt-1">0 tolerância</div><div className="text-xs text-cyan-300 mt-1">Regra rígida</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Perfis</div><div className="text-xl font-semibold mt-1">4+1</div><div className="text-xs text-cyan-300 mt-1">+ Admin Master</div></div>
      </section>

      <section className="card">
        <h2 className="title">Roadmap confirmado</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <div className="row !justify-start">• Fase A: Cadastro projeto, riscos, painel diário, conciliação, operações e rotina</div>
          <div className="row !justify-start">• Fase B: Fechamento mensal com snapshot imutável</div>
          <div className="row !justify-start">• Fase C: Auditoria de uso para Head/Diretoria/Admin Master</div>
        </div>
      </section>
    </AppShell>
  );
}
