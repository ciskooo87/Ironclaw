import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";

const projetos = [
  { id: "padrao", nome: "Projeto Padrão" },
  { id: "elicon", nome: "ELICON" },
];

export default async function ProjetosPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} title="Projetos" subtitle="Permissão por projeto e módulos operacionais">
      <section className="card">
        <h2 className="title">Projetos disponíveis</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          {projetos.map((p) => (
            <Link key={p.id} href={`/projetos/${p.id}/cadastro`} className="row hover:border-cyan-400">
              <span>{p.nome}</span>
              <span className="badge">abrir</span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
