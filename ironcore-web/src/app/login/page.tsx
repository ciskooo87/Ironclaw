import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="min-h-screen p-6 md:p-8 flex items-center justify-center">
      <section className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold">IronCore Login</h1>
        <p className="text-sm text-slate-400 mt-1">Acesso por email + senha</p>

        <form action="/api/auth/login" method="post" className="mt-4 space-y-3">
          <input name="email" type="email" placeholder="email" required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <input name="password" type="password" placeholder="senha" required className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="w-full badge py-2 cursor-pointer">Entrar</button>
        </form>

        {params.error ? <div className="alert bad-bg mt-3">Credenciais inválidas.</div> : null}
        <p className="text-xs text-slate-500 mt-3">Usuários demo: admin/head/diretoria/consultor @ironcore.lat · senha: ironcore123</p>
      </section>
    </main>
  );
}
