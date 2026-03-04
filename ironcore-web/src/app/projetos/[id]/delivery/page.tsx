import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listDeliveryRuns } from "@/lib/delivery-runs";

export default async function DeliveryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Delivery"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Delivery"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const runs = await listDeliveryRuns(project.id, 100);

  return (
    <AppShell user={user} title="Projeto · Delivery" subtitle="Monitor de envio por canal + retry">
      {query.saved ? <div className="alert ok-bg mb-3">Retry executado.</div> : null}
      {query.error ? <div className="alert bad-bg mb-3">Erro: {query.error}</div> : null}

      <section className="card">
        <h2 className="title">Histórico de entregas</h2>
        <div className="mt-3 space-y-2 text-sm">
          {runs.length === 0 ? <div className="alert muted-bg">Sem envios ainda.</div> : null}
          {runs.map((r) => (
            <div key={r.id} className="row !items-start">
              <div>
                <div className="font-medium">{r.channel.toUpperCase()} · {r.status.toUpperCase()}</div>
                <div className="text-xs text-slate-400">{r.provider_message || "-"}</div>
              </div>
              <form action={`/api/projects/${id}/delivery/${r.id}/retry`} method="post">
                <button className="pill" type="submit">Retry</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
