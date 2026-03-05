import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { todayInSaoPauloISO } from "@/lib/time";
import { getCashflowProjection90d, getOperationalMovementRows, getTodayMovement } from "@/lib/cashflow";

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
  const opRows = await getOperationalMovementRows(project.id, today);
  const totalEntradas = opRows.filter((r) => r.movimentacao.includes("ENTRADA")).reduce((s, r) => s + r.valor, 0);
  const totalSaidas = opRows.filter((r) => r.movimentacao.includes("SAÍDA")).reduce((s, r) => s + r.valor, 0);

  const firstNegative = selected.rows.find((r) => r.closing < 0);
  const finance = project.financial_profile || {};
  const txDesconto = Number(finance.tx_percent || 2.5) / 100;
  const floatDias = Number(finance.float_days || 15);
  const recebiveisCarteira = Math.max(totalEntradas * 3, 0);
  const gap = Math.abs(firstNegative?.closing || 0);
  const custoDesconto = gap * txDesconto + Number(finance.tac || 0) + Number(finance.cost_per_boleto || 0);
  const impactoProrrogacao = gap * 0.012;

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

        {firstNegative ? (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="font-semibold">Sugestão automática para fluxo negativo</div>
            <div className="mt-1">Gap estimado: <b>{brl(gap)}</b> · Float médio: <b>{floatDias} dias</b> · TX desconto: <b>{(txDesconto * 100).toFixed(2)}%</b></div>
            <div className="mt-2 grid md:grid-cols-2 gap-2">
              <div className="rounded border border-slate-700 p-2">
                <div className="font-medium">Opção 1 · Prorrogar títulos</div>
                <div className="text-slate-300">Impacto financeiro estimado: {brl(impactoProrrogacao)}</div>
              </div>
              <div className="rounded border border-slate-700 p-2">
                <div className="font-medium">Opção 2 · Desconto de duplicatas</div>
                <div className="text-slate-300">Recebíveis em carteira estimados: {brl(recebiveisCarteira)}</div>
                <div className="text-slate-300">Custo projetado da operação: {brl(custoDesconto)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="row mb-3"><span>Movimento do dia · modelo operacional</span><span className="text-xs text-slate-400">layout estilo planilha</span></div>
        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="min-w-[1300px] text-xs">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-2 py-2 border-b border-slate-800">FLUXO</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">MOVIMENTAÇÃO</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">CLASSIFICAÇÃO</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">SUBCLASSIFICAÇÃO</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">NATUREZA</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">LANÇAMENTO</th>
                <th className="text-right px-2 py-2 border-b border-slate-800">VALORES (R$)</th>
              </tr>
            </thead>
            <tbody>
              {opRows.length === 0 ? (
                <tr>
                  <td className="px-2 py-2 border-b border-slate-900 text-center text-slate-400" colSpan={7}>Sem lançamentos diários para {today}</td>
                </tr>
              ) : (
                opRows.map((r, i) => (
                  <tr key={`${r.classificacao}-${i}`} className="odd:bg-slate-900/30">
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.fluxo}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.movimentacao}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.classificacao}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.subclassificacao}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.natureza}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.lancamento}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900 text-right">{brl(r.valor)}</td>
                  </tr>
                ))
              )}

              <tr className="bg-slate-900/40 font-semibold">
                <td className="px-2 py-1.5 border-b border-slate-900">TOTAL ENTRADAS</td>
                <td className="px-2 py-1.5 border-b border-slate-900" colSpan={5}>Consolidado automático dos relatórios diários</td>
                <td className="px-2 py-1.5 border-b border-slate-900 text-right">{brl(totalEntradas)}</td>
              </tr>
              <tr className="bg-slate-900/40 font-semibold">
                <td className="px-2 py-1.5 border-b border-slate-900">TOTAL SAÍDAS</td>
                <td className="px-2 py-1.5 border-b border-slate-900" colSpan={5}>Consolidado automático dos relatórios diários</td>
                <td className="px-2 py-1.5 border-b border-slate-900 text-right">{brl(totalSaidas)}</td>
              </tr>
              <tr className="bg-slate-800/60 font-semibold">
                <td className="px-2 py-1.5 border-b border-slate-900">RESULTADO DO DIA</td>
                <td className="px-2 py-1.5 border-b border-slate-900" colSpan={5}>Entradas - Saídas</td>
                <td className="px-2 py-1.5 border-b border-slate-900 text-right">{brl(totalEntradas - totalSaidas)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-4">
        <div className="row mb-3"><span>Fluxo de 90 dias · template matriz</span><span className="text-xs text-slate-400">dados automáticos dos relatórios diários</span></div>
        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="min-w-[1800px] text-xs">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-3 py-2 border-b border-slate-800">conta</th>
                {selected.rows.map((d) => (
                  <th key={d.date} className="text-right px-2 py-2 border-b border-slate-800 whitespace-nowrap">{d.date.slice(5)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border-b border-slate-900 font-semibold">entradas</td>
                {selected.rows.map((d) => <td key={d.date+"e"} className="border-b border-slate-900" />)}
              </tr>
              <tr>
                <td className="px-3 py-2 border-b border-slate-900">total de entradas</td>
                {selected.rows.map((d) => (
                  <td key={d.date+"te"} className="px-2 py-2 border-b border-slate-900 text-right">{Math.round(d.inflow).toLocaleString("pt-BR")}</td>
                ))}
              </tr>

              <tr>
                <td className="px-3 py-2 border-b border-slate-900 font-semibold">saídas</td>
                {selected.rows.map((d) => <td key={d.date+"s"} className="border-b border-slate-900" />)}
              </tr>
              <tr>
                <td className="px-3 py-2 border-b border-slate-900">total de saídas</td>
                {selected.rows.map((d) => (
                  <td key={d.date+"ts"} className="px-2 py-2 border-b border-slate-900 text-right">{Math.round(d.outflow).toLocaleString("pt-BR")}</td>
                ))}
              </tr>

              <tr>
                <td className="px-3 py-2 border-b border-slate-900">saldo do dia</td>
                {selected.rows.map((d) => (
                  <td key={d.date+"sd"} className="px-2 py-2 border-b border-slate-900 text-right">{Math.round(d.inflow - d.outflow).toLocaleString("pt-BR")}</td>
                ))}
              </tr>

              <tr className="bg-slate-900/40">
                <td className="px-3 py-2 border-b border-slate-900 font-semibold">saldo final</td>
                {selected.rows.map((d) => (
                  <td key={d.date+"sf"} className={`px-2 py-2 border-b border-slate-900 text-right font-semibold ${d.closing < 0 ? "text-red-300" : ""}`}>
                    {Math.round(d.closing).toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
