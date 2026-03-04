import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { todayInSaoPauloISO } from "@/lib/time";
import { getCashflowProjection90d, getTodayMovement } from "@/lib/cashflow";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Fluxo de Caixa"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Fluxo de Caixa"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const today = todayInSaoPauloISO();
  const move = await getTodayMovement(project.id, today);
  const proj = await getCashflowProjection90d(project.id, today);

  return (
    <AppShell user={user} title="Projeto · Fluxo de Caixa" subtitle="Movimento do dia + projeção padrão de 90 dias">
      <section className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="metric"><div className="text-xs text-slate-400">Entradas (dia)</div><div className="text-xl font-semibold mt-1">{brl((move.contas_receber || 0) + (move.duplicatas || 0))}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Saídas (dia)</div><div className="text-xl font-semibold mt-1">{brl(move.contas_pagar || 0)}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Saldo base do dia</div><div className="text-xl font-semibold mt-1">{brl((move.extrato_bancario || 0) + (move.net_ops || 0))}</div></div>
      </section>

      <section className="card mb-4">
        <h2 className="title">Movimento do dia ({today})</h2>
        <div className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
          <div className="row"><span>Faturamento</span><b>{brl(move.faturamento || 0)}</b></div>
          <div className="row"><span>Contas a receber</span><b>{brl(move.contas_receber || 0)}</b></div>
          <div className="row"><span>Contas a pagar</span><b>{brl(move.contas_pagar || 0)}</b></div>
          <div className="row"><span>Extrato bancário</span><b>{brl(move.extrato_bancario || 0)}</b></div>
          <div className="row"><span>Duplicatas</span><b>{brl(move.duplicatas || 0)}</b></div>
          <div className="row"><span>Operações líquidas</span><b>{brl(move.net_ops || 0)}</b></div>
        </div>
      </section>

      <section className="card">
        <div className="row mb-3"><span>Projeção padrão 90 dias</span><span className="text-xs text-slate-400">Média entradas: {brl(proj.avgIn)} · Média saídas: {brl(proj.avgOut)}</span></div>
        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-3 py-2 border-b border-slate-800">Data</th>
                <th className="text-right px-3 py-2 border-b border-slate-800">Saldo inicial</th>
                <th className="text-right px-3 py-2 border-b border-slate-800">Entradas</th>
                <th className="text-right px-3 py-2 border-b border-slate-800">Saídas</th>
                <th className="text-right px-3 py-2 border-b border-slate-800">Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {proj.rows.map((r) => (
                <tr key={r.date} className="odd:bg-slate-900/30">
                  <td className="px-3 py-2 border-b border-slate-900">{r.date}</td>
                  <td className="px-3 py-2 border-b border-slate-900 text-right">{brl(r.opening)}</td>
                  <td className="px-3 py-2 border-b border-slate-900 text-right">{brl(r.inflow)}</td>
                  <td className="px-3 py-2 border-b border-slate-900 text-right">{brl(r.outflow)}</td>
                  <td className="px-3 py-2 border-b border-slate-900 text-right">{brl(r.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
