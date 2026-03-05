import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { listProjectsForUser } from "@/lib/projects";

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ error?: string; segment?: string }> }) {
  const user = await requireUser();
  const projects = await listProjectsForUser(user.email, user.role);
  const params = await searchParams;

  const segments = Array.from(new Set(projects.map((p) => p.segment).filter(Boolean))).sort();
  const segmentFilter = (params.segment || "all").trim();
  const filteredProjects = segmentFilter === "all" ? projects : projects.filter((p) => p.segment === segmentFilter);

  return (
    <AppShell user={user} title="Projetos" subtitle="Permissão por projeto, segmentação e resumo operacional por carteira">
      {(user.role === "admin_master" || user.role === "head") ? (
        <section className="card mb-4">
          <h2 className="title">Novo projeto</h2>
          <form action="/api/projects/create" method="post" className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
            <input name="code" required placeholder="codigo (ex: elicon)" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="name" required placeholder="nome" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="cnpj" required placeholder="cnpj" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="legal_name" required placeholder="razão social" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="segment" required placeholder="segmento" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="timezone" defaultValue="America/Sao_Paulo" placeholder="timezone" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="partners" placeholder="sócios (separar por vírgula)" className="md:col-span-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <textarea name="account_plan" required placeholder="plano de contas (obrigatório, 1 conta por linha)" className="md:col-span-3 min-h-28 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <button className="badge py-2 cursor-pointer" type="submit">Criar projeto</button>
          </form>
          {params.error ? <div className="alert bad-bg mt-3">Erro ao criar projeto ({params.error}). Verifique DB e campos obrigatórios.</div> : null}
        </section>
      ) : null}

      <section className="card mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="title">Segmentação de projetos disponíveis</h2>
          <form method="get" className="flex gap-2">
            <select name="segment" defaultValue={segmentFilter} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm">
              <option value="all">Todos os segmentos</option>
              {segments.map((segment) => (
                <option key={segment} value={segment}>{segment}</option>
              ))}
            </select>
            <button className="badge py-2 cursor-pointer" type="submit">Filtrar</button>
          </form>
        </div>
      </section>

      <section className="card">
        <h2 className="title">Projetos disponíveis</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          {filteredProjects.length === 0 ? <div className="alert muted-bg">Sem projetos neste filtro.</div> : null}
          {filteredProjects.map((p) => {
            const finance = p.financial_profile || {};
            return (
              <Link key={p.id} href={`/projetos/${p.code}/cadastro/`} className="block rounded-xl border border-slate-800 p-3 hover:border-cyan-400">
                <div className="row mb-2"><span className="font-medium">{p.name}</span><span className="badge">{p.code}</span></div>
                <div className="text-xs text-slate-400 mb-2">Segmento: {p.segment}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="row"><span>Plano de contas</span><b>{(p.account_plan || []).length}</b></div>
                  <div className="row"><span>Fornecedores classif.</span><b>{(p.supplier_classes || []).length}</b></div>
                  <div className="row"><span>TX</span><b>{Number(finance.tx_percent || 0).toFixed(2)}%</b></div>
                  <div className="row"><span>Float</span><b>{Number(finance.float_days || 0)}d</b></div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
