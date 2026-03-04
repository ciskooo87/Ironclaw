import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getOpsStatus } from "@/lib/ops-status";

export default async function AdminStatusPage() {
  const user = await requireUser();
  const s = await getOpsStatus();

  return (
    <AppShell user={user} title="Admin · Status Operacional" subtitle="Banco, integrações e erros recentes">
      <section className="grid md:grid-cols-4 gap-3">
        <div className={`metric ${s.db.ok ? "" : "border-red-500"}`}><div className="text-xs text-slate-400">Database</div><div className="text-xl font-semibold mt-1">{s.db.ok ? "OK" : "DOWN"}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Falhas delivery 24h</div><div className="text-xl font-semibold mt-1">{s.failedDeliveries24h}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">Rotinas bloqueadas 24h</div><div className="text-xl font-semibold mt-1">{s.blockedRoutines24h}</div></div>
        <div className="metric"><div className="text-xs text-slate-400">DB horário</div><div className="text-sm font-semibold mt-1">{s.db.now}</div></div>
      </section>

      <section className="card mt-4">
        <h2 className="title">Integrações</h2>
        <div className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
          <div className={`alert ${s.integrations.telegram ? "ok-bg" : "bad-bg"}`}>Telegram: {s.integrations.telegram ? "OK" : "MISSING ENV"}</div>
          <div className={`alert ${s.integrations.whatsapp ? "ok-bg" : "bad-bg"}`}>WhatsApp: {s.integrations.whatsapp ? "OK" : "MISSING ENV"}</div>
          <div className={`alert ${s.integrations.email ? "ok-bg" : "bad-bg"}`}>Email: {s.integrations.email ? "OK" : "MISSING ENV"}</div>
        </div>
      </section>
    </AppShell>
  );
}
