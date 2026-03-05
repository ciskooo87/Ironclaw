import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);
  const query = await searchParams;

  const allowed = project ? await canAccessProject(user, project.id) : false;

  return (
    <AppShell user={user} title="Projeto · Cadastro" subtitle="Dados-base e governança do projeto">
      <section className="card">
        <div className="section-head"><h2 className="title">Dados mestres e parâmetros financeiros</h2><span className="kpi-chip">Setup crítico</span></div>
        {!project ? (
          <div className="alert bad-bg">Projeto não encontrado no banco. Crie em /projetos.</div>
        ) : !allowed ? (
          <div className="alert bad-bg">Sem permissão para este projeto.</div>
        ) : (
          <form action={`/api/projects/${id}/update`} method="post" className="grid md:grid-cols-2 gap-2 text-sm">
            <label className="space-y-1"><span className="text-slate-400">Nome</span><input name="name" defaultValue={project.name} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">CNPJ</span><input name="cnpj" defaultValue={project.cnpj} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">Razão social</span><input name="legal_name" defaultValue={project.legal_name} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">Segmento</span><input name="segment" defaultValue={project.segment} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">Timezone</span><input name="timezone" defaultValue={project.timezone} className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-slate-400">Resumo do projeto</span><textarea name="project_summary" defaultValue={project.project_summary || ""} className="w-full min-h-24 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" placeholder="Resumo executivo com foco em KPI e risco" /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-slate-400">Sócios (vírgula)</span><input name="partners" defaultValue={(project.partners || []).join(", ")} className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-slate-400">Plano de contas (obrigatório, 1 por linha)</span><textarea name="account_plan" required defaultValue={(project.account_plan || []).join("\n")} className="w-full min-h-32 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">TX (%)</span><input type="number" step="0.01" min="0" name="tx_percent" defaultValue={Number(project.financial_profile?.tx_percent || 0)} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">FLOAT (dias)</span><input type="number" min="0" name="float_days" defaultValue={Number(project.financial_profile?.float_days || 0)} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">TAC (R$)</span><input type="number" step="0.01" min="0" name="tac" defaultValue={Number(project.financial_profile?.tac || 0)} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-slate-400">Custo por boleto (R$)</span><input type="number" step="0.01" min="0" name="cost_per_boleto" defaultValue={Number(project.financial_profile?.cost_per_boleto || 0)} required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-slate-400">Classificação de fornecedores (formato: fornecedor|conta, 1 por linha)</span><textarea name="supplier_classes" defaultValue={(project.supplier_classes || []).map((r) => `${r.supplier}|${r.account}`).join("\n")} className="w-full min-h-24 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" /></label>
            <button className="badge py-2 cursor-pointer md:col-span-2" type="submit">Salvar cadastro</button>
          </form>
        )}

        {project && (project.supplier_classes || []).length > 0 ? (
          <div className="mt-4 table-wrap">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/70">
                <tr>
                  <th className="text-left px-2 py-2 border-b border-slate-800">Fornecedor</th>
                  <th className="text-left px-2 py-2 border-b border-slate-800">Conta classificada</th>
                </tr>
              </thead>
              <tbody>
                {(project.supplier_classes || []).map((r, i) => (
                  <tr key={`${r.supplier}-${i}`} className="odd:bg-slate-900/30">
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.supplier}</td>
                    <td className="px-2 py-1.5 border-b border-slate-900">{r.account}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {query.saved ? <div className="alert ok-bg mt-3">Cadastro salvo com sucesso.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Falha ao salvar ({query.error}).</div> : null}
      </section>
    </AppShell>
  );
}
