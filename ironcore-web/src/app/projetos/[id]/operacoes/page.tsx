import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listOperations } from "@/lib/operations";
import { todayInSaoPauloISO } from "@/lib/time";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Operações"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Operações"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const ops = await listOperations(project.id, 50);

  return (
    <AppShell user={user} title="Projeto · Operações" subtitle="Desconto, comissária, fomento e intercompany com impacto em caixa">
      <section className="card mb-4">
        <form action={`/api/projects/${id}/operacoes/create`} method="post" className="grid md:grid-cols-3 gap-2 text-sm">
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

      <section className="card">
        <h2 className="title">Histórico de operações</h2>
        <div className="mt-3 space-y-2 text-sm">
          {ops.length === 0 ? <div className="alert muted-bg">Sem operações.</div> : null}
          {ops.map((o) => (
            <div key={o.id} className="row !items-start">
              <div>
                <div className="font-medium">{o.business_date} · {o.op_type}</div>
                <div className="text-xs text-slate-400">bruto: {o.gross_amount.toFixed(2)} · taxa: {o.fee_percent.toFixed(2)}% · líquido: {o.net_amount.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
