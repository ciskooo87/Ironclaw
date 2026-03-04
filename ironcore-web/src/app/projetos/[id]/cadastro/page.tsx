import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);
  const query = await searchParams;

  return (
    <AppShell user={user} title="Projeto · Cadastro" subtitle="Dados-base e governança do projeto">
      <section className="card">
        {!project ? (
          <div className="alert bad-bg">Projeto não encontrado no banco. Crie em /projetos.</div>
        ) : (
          <form action={`/api/projects/${id}/update`} method="post" className="grid md:grid-cols-2 gap-2 text-sm">
            <label className="space-y-1"><span className="text-slate-400">Nome</span><input name="name" defaultValue={project.name} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">CNPJ</span><input name="cnpj" defaultValue={project.cnpj} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">Razão social</span><input name="legal_name" defaultValue={project.legal_name} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">Segmento</span><input name="segment" defaultValue={project.segment} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">Timezone</span><input name="timezone" defaultValue={project.timezone} className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-slate-400">Sócios (vírgula)</span><input name="partners" defaultValue={(project.partners || []).join(", ")} className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <button className="badge py-2 cursor-pointer md:col-span-2" type="submit">Salvar cadastro</button>
          </form>
        )}

        {query.saved ? <div className="alert ok-bg mt-3">Cadastro salvo com sucesso.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Falha ao salvar ({query.error}).</div> : null}
      </section>
    </AppShell>
  );
}
