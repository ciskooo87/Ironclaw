import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { todayInSaoPauloISO } from "@/lib/time";
import { getCashflowProjection90d, getTodayMovement } from "@/lib/cashflow";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

type ScenarioKey = "base" | "otimista" | "pessimista";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ scenario?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Fluxo de Caixa"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Fluxo de Caixa"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const scenario = (["base", "otimista", "pessimista"].includes(query.scenario || "") ? query.scenario : "base") as ScenarioKey;

  const today = todayInSaoPauloISO();
  const move = await getTodayMovement(project.id, today);
  const proj = await getCashflowProjection90d(project.id, today);
  const selected = proj.scenarios[scenario];

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

      <section className="card mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="title">Cenários de projeção</h2>
          <form method="get" className="flex gap-2">
            <select name="scenario" defaultValue={scenario} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm">
              <option value="base">Base</option>
              <option value="otimista">Otimista</option>
              <option value="pessimista">Pessimista</option>
            </select>
            <button className="badge py-2 cursor-pointer" type="submit">Aplicar</button>
          </form>
        </div>

        <div className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
          <div className="row"><span>Abertura inicial</span><b>{brl(proj.baseOpening)}</b></div>
          <div className="row"><span>Média entradas</span><b>{brl(proj.avgIn)}</b></div>
          <div className="row"><span>Média saídas</span><b>{brl(proj.avgOut)}</b></div>
        </div>

        <div className={`alert mt-3 ${selected.ruptureDate ? "bad-bg" : "ok-bg"}`}>
          {selected.ruptureDate
            ? `⚠ Ruptura de caixa prevista no cenário ${scenario} em ${selected.ruptureDate}`
            : `✅ Sem ruptura prevista em 90 dias no cenário ${scenario}`}
        </div>
      </section>

      <section className="card">
        <div className="row mb-3"><span>Projeção 90 dias · cenário {scenario}</span><span className="text-xs text-slate-400">Fluxo de caixa padrão</span></div>
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
              {selected.rows.map((r) => (
                <tr key={r.date} className={`odd:bg-slate-900/30 ${r.rupture ? "bg-red-950/30" : ""}`}>
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

      <section className="card mt-4">
        <div className="row mb-3"><span>Demonstração no formato matriz (como planilha)</span><span className="text-xs text-slate-400">visão executiva</span></div>
        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="min-w-[1400px] text-xs">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-3 py-2 border-b border-slate-800">conta</th>
                {selected.rows.slice(0, 20).map((d) => (
                  <th key={d.date} className="text-right px-2 py-2 border-b border-slate-800 whitespace-nowrap">{d.date.slice(5)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-3 py-2 border-b border-slate-900 font-semibold">entradas</td>{selected.rows.slice(0,20).map((d)=><td key={d.date+"e"} className="border-b border-slate-900" />)}</tr>
              {[
                { n: "entrada 1", f: 0.4 },
                { n: "entrada 2", f: 0.35 },
                { n: "entrada 3", f: 0.25 },
              ].map((r) => (
                <tr key={r.n}>
                  <td className="px-3 py-2 border-b border-slate-900">{r.n}</td>
                  {selected.rows.slice(0, 20).map((d) => (
                    <td key={d.date + r.n} className="px-2 py-2 border-b border-slate-900 text-right">{Math.round(d.inflow * r.f).toLocaleString("pt-BR")}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-slate-900/40">
                <td className="px-3 py-2 border-b border-slate-900 font-semibold">TOTAL de Entradas</td>
                {selected.rows.slice(0, 20).map((d) => (
                  <td key={d.date+"te"} className="px-2 py-2 border-b border-slate-900 text-right font-semibold">{Math.round(d.inflow).toLocaleString("pt-BR")}</td>
                ))}
              </tr>

              <tr><td className="px-3 py-2 border-b border-slate-900 font-semibold">saídas</td>{selected.rows.slice(0,20).map((d)=><td key={d.date+"s"} className="border-b border-slate-900" />)}</tr>
              {[
                { n: "folha", f: 0.28 },
                { n: "impostos", f: 0.18 },
                { n: "fornecedores", f: 0.22 },
                { n: "despesas fixas", f: 0.16 },
                { n: "outras saídas", f: 0.16 },
              ].map((r) => (
                <tr key={r.n}>
                  <td className="px-3 py-2 border-b border-slate-900">{r.n}</td>
                  {selected.rows.slice(0, 20).map((d) => (
                    <td key={d.date + r.n} className="px-2 py-2 border-b border-slate-900 text-right">{Math.round(d.outflow * r.f).toLocaleString("pt-BR")}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-slate-900/40">
                <td className="px-3 py-2 border-b border-slate-900 font-semibold">TOTAL de Saídas</td>
                {selected.rows.slice(0, 20).map((d) => (
                  <td key={d.date+"ts"} className="px-2 py-2 border-b border-slate-900 text-right font-semibold">{Math.round(d.outflow).toLocaleString("pt-BR")}</td>
                ))}
              </tr>

              <tr>
                <td className="px-3 py-2 border-b border-slate-900 font-semibold">saldo do dia</td>
                {selected.rows.slice(0, 20).map((d) => (
                  <td key={d.date+"sd"} className="px-2 py-2 border-b border-slate-900 text-right">{Math.round(d.inflow - d.outflow).toLocaleString("pt-BR")}</td>
                ))}
              </tr>
              <tr className="bg-slate-900/40">
                <td className="px-3 py-2 border-b border-slate-900 font-semibold">saldo final</td>
                {selected.rows.slice(0, 20).map((d) => (
                  <td key={d.date+"sf"} className={`px-2 py-2 border-b border-slate-900 text-right font-semibold ${d.closing < 0 ? "text-red-300" : ""}`}>{Math.round(d.closing).toLocaleString("pt-BR")}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
