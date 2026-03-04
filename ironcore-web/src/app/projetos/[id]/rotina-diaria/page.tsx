import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listRoutineRuns } from "@/lib/routine";
import { todayInSaoPauloISO } from "@/lib/time";
import { ensureCsrfCookie } from "@/lib/csrf";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);
  const query = await searchParams;

  if (!project) return <AppShell user={user} title="Projeto · Rotina Diária"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Rotina Diária"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const runs = await listRoutineRuns(project.id, 25);
  const csrf = await ensureCsrfCookie();

  return (
    <AppShell user={user} title="Projeto · Rotina Diária" subtitle="Execução síncrona: movimento + IA + fluxo + conciliação">
      <section className="card mb-4">
        <form action={`/api/projects/${id}/routine/run`} method="post" className="flex gap-2 items-center flex-wrap">
          <input type="hidden" name="csrf_token" value={csrf} />
          <input name="business_date" type="date" defaultValue={todayInSaoPauloISO()} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <button className="badge py-2 px-3 cursor-pointer" type="submit">Rodar rotina diária</button>
        </form>
        {query.saved ? <div className="alert ok-bg mt-3">Rotina executada.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}</div> : null}
      </section>

      <section className="card">
        <h2 className="title">Histórico</h2>
        <div className="mt-3 space-y-2 text-sm">
          {runs.length === 0 ? <div className="alert muted-bg">Sem execuções.</div> : null}
          {runs.map((r) => {
            const s = r.summary as Record<string, unknown>;
            const ai = (s.aiAnalysis as Record<string, unknown>) || {};
            const cf = (s.cashflow90d as Record<string, unknown>) || {};
            const rec = (s.reconciliation as Record<string, unknown>) || {};
            const delivery = (s.delivery as Record<string, unknown>) || {};

            return (
              <div key={r.id} className="card !p-3">
                <div className="font-medium">{r.business_date} · {r.status.toUpperCase()}</div>
                <div className="mt-2 grid md:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="row"><span>Risco IA</span><b>{String(ai.riskLevel || "-")}</b></div>
                  <div className="row"><span>Pendências conciliação</span><b>{String((rec.pending as number | undefined) ?? "-")}</b></div>
                  <div className="row"><span>Recomendação</span><b>{String(ai.recommendation || "-")}</b></div>
                  <div className="row"><span>Fluxo 90d</span><b>{String(cf.note || "-")}</b></div>
                  <div className="row md:col-span-2"><span>Payload envio</span><b className="truncate pl-2">{String(delivery.summaryText || "-")}</b></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
