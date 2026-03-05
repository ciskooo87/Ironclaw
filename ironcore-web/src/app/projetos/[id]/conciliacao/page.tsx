import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listPendingReconItems, listReconRuns } from "@/lib/conciliacao";
import { todayInSaoPauloISO } from "@/lib/time";
import { ensureCsrfCookie } from "@/lib/csrf";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string; business_date?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);
  const query = await searchParams;

  if (!project) return <AppShell user={user} title="Projeto · Conciliação"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Conciliação"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const selectedDate = query.business_date || todayInSaoPauloISO();
  const runs = await listReconRuns(project.id, 25);
  const pendingItems = await listPendingReconItems(project.id, selectedDate);
  const csrf = await ensureCsrfCookie();

  return (
    <AppShell user={user} title="Projeto · Conciliação" subtitle="Conciliação automática + tratamento manual de não conciliados em tabela">
      <section className="card mb-4">
        <div className="section-head"><h2 className="title">Motor de conciliação</h2><span className="kpi-chip">Auto + Manual</span></div>
        <form action={`/api/projects/${id}/conciliacao/run`} method="post" className="flex gap-2 items-center flex-wrap">
          <input name="business_date" type="date" defaultValue={selectedDate} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <button className="badge py-2 px-3 cursor-pointer" type="submit">Rodar conciliação</button>
        </form>
        {query.saved ? <div className="alert ok-bg mt-3">Conciliação executada.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}</div> : null}
      </section>

      <section className="card mb-4">
        <div className="row mb-3"><span>Pagamentos não conciliados ({selectedDate})</span><span className="badge">{pendingItems.filter((i) => i.status === "pending").length} pendentes</span></div>
        <div className="table-wrap">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-2 py-2 border-b border-slate-800">Item</th>
                <th className="text-right px-2 py-2 border-b border-slate-800">Valor</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Status</th>
                <th className="text-left px-2 py-2 border-b border-slate-800">Conciliação manual</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.length === 0 ? (
                <tr><td colSpan={4} className="px-2 py-3 text-center text-slate-400">Sem itens para esta data.</td></tr>
              ) : (
                pendingItems.map((item) => (
                  <tr key={item.id} className="odd:bg-slate-900/30">
                    <td className="px-2 py-1.5 border-b border-slate-900">{item.title}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900 text-right">{item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">{item.status}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">
                      {item.status === "pending" ? (
                        <form action={`/api/projects/${id}/conciliacao/item/${item.id}/resolve`} method="post" className="flex gap-2">
                          <input type="hidden" name="csrf_token" value={csrf} />
                          <input type="hidden" name="business_date" value={selectedDate} />
                          <input name="note" required placeholder="motivo da conciliação manual" className="w-full bg-slate-950/40 border border-slate-700 rounded px-2 py-1" />
                          <button type="submit" className="pill">Conciliar</button>
                        </form>
                      ) : (
                        <span className="text-slate-400">{item.resolution_note || "resolvido"}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="title">Histórico</h2>
        <div className="mt-3 space-y-2 text-sm">
          {runs.length === 0 ? <div className="alert muted-bg">Sem execuções.</div> : null}
          {runs.map((r) => {
            const d = r.details as Record<string, unknown>;
            return (
              <div key={r.id} className="card !p-3">
                <div className="font-medium">{r.business_date} · {r.status.toUpperCase()}</div>
                <div className="mt-2 grid md:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="row"><span>Match</span><b>{r.matched_items}</b></div>
                  <div className="row"><span>Pendências</span><b>{r.pending_items}</b></div>
                  <div className="row"><span>Extrato</span><b>{Number(d.extrato || 0).toFixed(2)}</b></div>
                  <div className="row"><span>Receber + Duplicatas</span><b>{(Number(d.receber || 0) + Number(d.duplicatas || 0)).toFixed(2)}</b></div>
                  <div className="row md:col-span-2"><span>Diferença (sem tolerância)</span><b>{Number(d.diff || 0).toFixed(2)}</b></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
