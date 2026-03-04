import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { integrationHealth } from "@/lib/integrations";
import { ensureCsrfCookie } from "@/lib/csrf";
import { can } from "@/lib/rbac";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const q = await searchParams;
  const h = integrationHealth();
  const csrf = await ensureCsrfCookie();

  if (!can(user.role, "admin.status")) {
    return <AppShell user={user} title="Admin Master"><div className="alert bad-bg">Sem permissão administrativa.</div></AppShell>;
  }

  return (
    <AppShell user={user} title="Admin Master" subtitle="Gestão e saúde das integrações">
      <section className="card mb-4">
        <h2 className="title">Healthcheck integrações</h2>
        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
          <div className={`alert ${h.telegram ? "ok-bg" : "bad-bg"}`}>Telegram: {h.telegram ? "OK" : "MISSING ENV"}</div>
          <div className={`alert ${h.whatsapp ? "ok-bg" : "bad-bg"}`}>WhatsApp: {h.whatsapp ? "OK" : "MISSING ENV"}</div>
          <div className={`alert ${h.email ? "ok-bg" : "bad-bg"}`}>Email SMTP: {h.email ? "OK" : "MISSING ENV"}</div>
        </div>
      </section>

      {user.role === "admin_master" ? (
        <section className="card mb-4">
          <h2 className="title">Reset de senha</h2>
          <form action="/api/admin/users/reset-password" method="post" className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
            <input type="hidden" name="csrf_token" value={csrf} />
            <input name="email" type="email" placeholder="email do usuário" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" required />
            <input name="new_password" type="text" placeholder="nova senha (min 8)" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" required />
            <button className="badge py-2 cursor-pointer" type="submit">Resetar senha</button>
          </form>
          {q.saved ? <div className="alert ok-bg mt-3">Senha atualizada.</div> : null}
          {q.error ? <div className="alert bad-bg mt-3">Erro: {q.error}</div> : null}
        </section>
      ) : null}

      <section className="card mb-4">
        <h2 className="title">Operação</h2>
        <div className="mt-3">
          <a className="pill" href="/admin/status/">Abrir status operacional</a>
        </div>
      </section>

      <section className="card">
        <h2 className="title">Governança</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <div className="row !justify-start">• Permissões por projeto ativas</div>
          <div className="row !justify-start">• Auditoria de ações crítica ativada</div>
          <div className="row !justify-start">• Snapshot mensal versionado</div>
        </div>
      </section>
    </AppShell>
  );
}
