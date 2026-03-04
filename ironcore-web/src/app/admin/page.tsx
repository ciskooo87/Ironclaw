import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { integrationHealth } from "@/lib/integrations";

export default async function AdminPage() {
  const user = await requireUser();
  const h = integrationHealth();

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
