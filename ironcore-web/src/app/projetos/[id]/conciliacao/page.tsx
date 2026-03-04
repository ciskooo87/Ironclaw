import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listReconRuns } from "@/lib/conciliacao";
import { todayInSaoPauloISO } from "@/lib/time";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);
  const query = await searchParams;

  if (!project) return <AppShell user={user} title="Projeto · Conciliação"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Conciliação"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const runs = await listReconRuns(project.id, 25);

  return (
    <AppShell user={user} title="Projeto · Conciliação" subtitle="Conciliação automática sem tolerância">
      <section className="card mb-4">
        <form action={`/api/projects/${id}/conciliacao/run`} method="post" className="flex gap-2 items-center flex-wrap">
          <input name="business_date" type="date" defaultValue={todayInSaoPauloISO()} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <button className="badge py-2 px-3 cursor-pointer" type="submit">Rodar conciliação</button>
        </form>
        {query.saved ? <div className="alert ok-bg mt-3">Conciliação executada.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}</div> : null}
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
