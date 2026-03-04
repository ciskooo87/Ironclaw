import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listRoutineRuns } from "@/lib/routine";
import { todayInSaoPauloISO } from "@/lib/time";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);
  const query = await searchParams;

  if (!project) return <AppShell user={user} title="Projeto · Rotina Diária"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Rotina Diária"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const runs = await listRoutineRuns(project.id, 25);

  return (
    <AppShell user={user} title="Projeto · Rotina Diária" subtitle="Execução síncrona: movimento + IA + fluxo + conciliação">
      <section className="card mb-4">
        <form action={`/api/projects/${id}/routine/run`} method="post" className="flex gap-2 items-center flex-wrap">
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
          {runs.map((r) => (
            <div key={r.id} className="row !items-start">
              <div>
                <div className="font-medium">{r.business_date} · {r.status.toUpperCase()}</div>
                <div className="text-xs text-slate-400">{JSON.stringify(r.summary)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
