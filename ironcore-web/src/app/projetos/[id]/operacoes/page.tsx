import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listOperations } from "@/lib/operations";
import { todayInSaoPauloISO } from "@/lib/time";
import { ensureCsrfCookie } from "@/lib/csrf";

type RiskLevel = "baixo" | "medio" | "alto";

function addDays(dateIso: string, days: number) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; q?: string; op_type?: string; risk?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Operações"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Operações"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const all = await listOperations(project.id, 500);
  const csrf = await ensureCsrfCookie();

  const q = (query.q || "").trim().toLowerCase();
  const opTypeFilter = (query.op_type || "").trim();
  const riskFilter = (query.risk || "").trim() as RiskLevel | "";
  const from = (query.from || "").trim();
  const to = (query.to || "").trim();
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = 10;

  const floatDays = Number(project.financial_profile?.float_days || 15);

  const enriched = all.map((o) => {
    const payment = o.gross_amount - o.net_amount;
    const overFund = (o.fund_limit || 0) > 0 && o.gross_amount > (o.fund_limit || 0);
    const overReceivable = (o.receivable_available || 0) > 0 && o.gross_amount > (o.receivable_available || 0);

    let risk: RiskLevel = "baixo";
    if (overFund || overReceivable || o.fee_percent >= 5 || o.gross_amount >= 250000) risk = "alto";
    else if (o.fee_percent >= 3 || o.gross_amount >= 100000) risk = "medio";

    return {
      ...o,
      payment,
      risk,
      dueDate: addDays(o.business_date, floatDays),
    };
  });

  const filtered = enriched.filter((o) => {
    if (q && !(o.id.toLowerCase().includes(q) || o.notes?.toLowerCase().includes(q) || o.op_type.toLowerCase().includes(q))) return false;
    if (opTypeFilter && o.op_type !== opTypeFilter) return false;
    if (riskFilter && o.risk !== riskFilter) return false;
    if (from && o.business_date < from) return false;
    if (to && o.business_date > to) return false;
    return true;
  });

  const withBalance = filtered.reduce<Array<(typeof filtered)[number] & { accumulated: number }>>((out, o) => {
    const prev = out.length > 0 ? out[out.length - 1].accumulated : 0;
    out.push({ ...o, accumulated: prev + o.net_amount });
    return out;
  }, []);

  const totalPages = Math.max(1, Math.ceil(withBalance.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = withBalance.slice(start, start + pageSize);

  return (
    <AppShell user={user} title="Projeto · Operações" subtitle="Painel de risco operacional com filtros, ações e visão tabular">
      <section className="card mb-4">
        <div className="section-head"><h2 className="title">Nova operação</h2><span className="kpi-chip">Risk panel</span></div>
        <form action={`/api/projects/${id}/operacoes/create`} method="post" className="grid md:grid-cols-3 gap-2 text-sm">
          <input type="hidden" name="csrf_token" value={csrf} />
          <input name="business_date" type="date" defaultValue={todayInSaoPauloISO()} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <select name="op_type" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="desconto_duplicata">desconto_duplicata</option>
            <option value="comissaria">comissaria</option>
            <option value="fomento">fomento</option>
            <option value="intercompany">intercompany</option>
          </select>
          <input name="gross_amount" type="number" step="0.01" placeholder="valor bruto" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="fee_percent" type="number" step="0.01" placeholder="taxa %" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="fund_limit" type="number" step="0.01" placeholder="limite fundo" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="receivable_available" type="number" step="0.01" placeholder="recebível disponível" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="notes" placeholder="observações" className="md:col-span-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <button type="submit" className="badge py-2 cursor-pointer">Registrar operação</button>
        </form>
        {query.saved ? <div className="alert ok-bg mt-3">Operação registrada.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}</div> : null}
      </section>

      <section className="card mb-4">
        <div className="section-head"><h2 className="title">Painel de risco das operações</h2><span className="kpi-chip">{withBalance.length} registros</span></div>

        <form method="get" className="grid md:grid-cols-6 gap-2 text-sm mb-3">
          <input name="q" defaultValue={q} placeholder="Pesquisar operação / nota / modalidade" className="md:col-span-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <select name="op_type" defaultValue={opTypeFilter} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="">Modalidade (todas)</option>
            <option value="desconto_duplicata">desconto_duplicata</option>
            <option value="comissaria">comissaria</option>
            <option value="fomento">fomento</option>
            <option value="intercompany">intercompany</option>
          </select>
          <select name="risk" defaultValue={riskFilter} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="">Risco (todos)</option>
            <option value="baixo">baixo</option>
            <option value="medio">medio</option>
            <option value="alto">alto</option>
          </select>
          <input name="from" type="date" defaultValue={from} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="to" type="date" defaultValue={to} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <div className="md:col-span-6 flex gap-2 flex-wrap">
            <button type="submit" className="badge py-2 cursor-pointer">Pesquisar</button>
            <Link className="pill" href={`/projetos/${id}/operacoes/`}>Limpar</Link>
          </div>
        </form>

        <div className="table-wrap">
          <table className="min-w-[1500px] text-xs">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-2 py-2 border-b border-slate-800">Ações</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Cód. Operação</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Instituição</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Projeto</th>
                <th className="text-right px-2 py-2 border-b border-slate-800">Valor</th>
                <th className="text-right px-2 py-2 border-b border-slate-800">Pagamento</th>
                <th className="text-right px-2 py-2 border-b border-slate-800">Saldo acumulado</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Data operação</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Vencimento</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Prazo</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Risco</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={11} className="px-2 py-3 text-center text-slate-400">Sem operações para o filtro.</td></tr>
              ) : rows.map((o) => (
                <tr key={o.id} className="odd:bg-slate-900/30">
                  <td className="px-2 py-1.5 border-b border-slate-900">👁️</td>
                  <td className="px-2 py-1.5 border-b border-slate-900">N. {o.id.slice(0, 8)}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900">{o.op_type.toUpperCase()}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900">{project.name}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900 text-right">{brl(o.gross_amount)}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900 text-right">{brl(o.payment)}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900 text-right">{brl(o.accumulated)}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900">{o.business_date}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900">{o.dueDate}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900">{floatDays}</td>
                  <td className="px-2 py-1.5 border-b border-slate-900">
                    <span className={`pill ${o.risk === "alto" ? "text-red-300" : o.risk === "medio" ? "text-amber-300" : "text-emerald-300"}`}>{o.risk}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 ? <Link className="pill" href={`?q=${encodeURIComponent(q)}&op_type=${opTypeFilter}&risk=${riskFilter}&from=${from}&to=${to}&page=${currentPage - 1}`}>Anterior</Link> : null}
            {currentPage < totalPages ? <Link className="pill" href={`?q=${encodeURIComponent(q)}&op_type=${opTypeFilter}&risk=${riskFilter}&from=${from}&to=${to}&page=${currentPage + 1}`}>Próxima</Link> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
