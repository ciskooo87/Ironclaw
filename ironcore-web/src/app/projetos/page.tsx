import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { listProjectsForUser } from "@/lib/projects";

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const projects = await listProjectsForUser(user.email, user.role);
  const params = await searchParams;

  return (
    <AppShell user={user} title="Projetos" subtitle="Permissão por projeto e módulos operacionais">
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

      <section className="card">
        <h2 className="title">Projetos disponíveis</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          {projects.length === 0 ? <div className="alert muted-bg">Sem projetos no banco ainda.</div> : null}
          {projects.map((p) => (
            <Link key={p.id} href={`/projetos/${p.code}/cadastro/`} className="row hover:border-cyan-400">
              <span>{p.name}</span>
              <span className="badge">{p.code}</span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
