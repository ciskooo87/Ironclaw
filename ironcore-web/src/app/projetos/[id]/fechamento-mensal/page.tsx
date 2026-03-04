import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listClosures } from "@/lib/closure";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Fechamento Mensal"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Fechamento Mensal"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const closures = await listClosures(project.id, 24);

  return (
    <AppShell user={user} title="Projeto · Fechamento Mensal" subtitle="Snapshot imutável com versionamento por período">
      <section className="card mb-4">
        <form action={`/api/projects/${id}/fechamento/close`} method="post" className="flex gap-2 items-center flex-wrap">
          <input name="period_ym" placeholder="YYYY-MM" pattern="\d{4}-\d{2}" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <button className="badge py-2 px-3 cursor-pointer" type="submit">Fechar mês</button>
        </form>
        {query.saved ? <div className="alert ok-bg mt-3">Fechamento realizado.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}</div> : null}
      </section>

      <section className="card">
        <h2 className="title">Histórico de snapshots</h2>
        <div className="mt-3 space-y-2 text-sm">
          {closures.length === 0 ? <div className="alert muted-bg">Sem fechamentos.</div> : null}
          {closures.map((c) => (
            <div key={c.id} className="row !items-start">
              <div>
                <div className="font-medium">{c.period_ym} · v{c.snapshot_version} · {c.status}</div>
                <div className="text-xs text-slate-400">{JSON.stringify(c.snapshot)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
