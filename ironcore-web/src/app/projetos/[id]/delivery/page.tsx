import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listDeliveryRuns } from "@/lib/delivery-runs";

export default async function DeliveryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string; channel?: string; status?: string; from?: string; to?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Delivery"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Delivery"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const runs = await listDeliveryRuns(project.id, 100, {
    channel: query.channel || undefined,
    status: query.status || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
  });

  const exportQs = new URLSearchParams();
  if (query.channel) exportQs.set("channel", query.channel);
  if (query.status) exportQs.set("status", query.status);
  if (query.from) exportQs.set("from", query.from);
  if (query.to) exportQs.set("to", query.to);

  return (
    <AppShell user={user} title="Projeto · Delivery" subtitle="Monitor de envio por canal + retry + export CSV">
      {query.saved ? <div className="alert ok-bg mb-3">Retry executado.</div> : null}
      {query.error ? <div className="alert bad-bg mb-3">Erro: {query.error}</div> : null}

      <section className="card mb-4">
        <form className="grid md:grid-cols-5 gap-2 text-sm" method="get">
          <select name="channel" defaultValue={query.channel || ""} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="">canal: todos</option>
            <option value="telegram">telegram</option>
            <option value="whatsapp">whatsapp</option>
            <option value="email">email</option>
          </select>
          <select name="status" defaultValue={query.status || ""} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="">status: todos</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
            <option value="skipped">skipped</option>
          </select>
          <input name="from" type="date" defaultValue={query.from || ""} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="to" type="date" defaultValue={query.to || ""} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <button className="badge py-2 cursor-pointer" type="submit">Filtrar</button>
        </form>
        <div className="mt-2 text-sm">
          <a className="pill" href={`/api/projects/${id}/delivery/export?${exportQs.toString()}`}>Exportar CSV</a>
        </div>
      </section>

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
