import fs from "node:fs";
import path from "node:path";

type AnyObj = Record<string, any>;

function loadJson(filePath: string, fallback: AnyObj = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function metricDelta(current: number, previous?: number) {
  if (previous === undefined) return "-";
  const d = current - previous;
  return d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`;
}

export default function Home() {
  const projectId = "teste";
  const base = path.join(process.cwd(), "..", "projects", projectId);

  const comite = loadJson(path.join(base, "outputs", "comite.json"));
  const sla = loadJson(path.join(base, "outputs", "sla_alerts.json"), { alerts: [] });

  const summary = comite.summary || {};
  const clusters: AnyObj[] = comite.clusters || [];
  const topRisks: AnyObj[] = comite.top_risks || [];

  const dailyDir = path.join(base, "history", "daily");
  let prevSummary: AnyObj | undefined = undefined;
  try {
    const files = fs.readdirSync(dailyDir).filter((f) => f.endsWith(".json")).sort();
    if (files.length >= 2) {
      prevSummary = loadJson(path.join(dailyDir, files[files.length - 2])).summary;
    }
  } catch {
    // ignore
  }

  const trustScore = (sla.alerts || []).length === 0 ? 94 : Math.max(75, 94 - Math.min(20, sla.alerts.length * 3));
  const risks = Number(summary.risks || 0);
  const critical = Number(summary.critical_high || 0);

  const sortedClusters = [...clusters].sort((a, b) => (b.critical_high || 0) - (a.critical_high || 0));
  const actionInbox = sortedClusters.slice(0, 5).map((c, i) => ({
    priority: i < 2 ? "P1" : "P2",
    title: `Priorizar frente ${c.cluster}`,
    detail: `Críticos/altos: ${c.critical_high} · Impacto: ${c.impacto_estimado_cluster ?? 0}`,
  }));

  return (
    <main className="min-h-screen p-6 md:p-8">
      <header className="card mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">IronCore · Executive Boardroom</h1>
            <p className="text-sm text-slate-400 mt-1">Sistema nervoso operacional: risco, decisão e execução.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="pill">Projeto: {projectId}</span>
            <span className="pill">Run: {summary.run_id ?? "-"}</span>
            <span className="pill">Modo: {summary.analysis_mode ?? "-"}</span>
          </div>
        </div>
      </header>

      <section className="trust mb-4">
        <b>Trust Bar</b> · Encryption <span className="ok">ACTIVE</span> · Keys <span className="ok">Customer Owned</span> · Isolation <span className="ok">VERIFIED</span> · Region <span className="ok">BR/US/EU</span>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        <Metric title="Trust Score" value={`${trustScore}/100`} delta="-" />
        <Metric title="Riscos" value={risks} delta={metricDelta(risks, prevSummary?.risks)} />
        <Metric title="Críticos/Altos" value={critical} delta={metricDelta(critical, prevSummary?.critical_high)} />
        <Metric title="SLA Alerts" value={(sla.alerts || []).length} delta="-" />
        <Metric title="Issues" value={summary.issues ?? 0} delta="-" />
        <Metric title="Materialidade" value={summary.materiality_min_impact ?? 0} delta="-" />
      </section>

      <section className="grid lg:grid-cols-3 gap-4 mb-5">
        <div className="card lg:col-span-2">
          <h2 className="title">Command Center · Pressão por frente</h2>
          <div className="mt-3 grid md:grid-cols-2 gap-2">
            {sortedClusters.slice(0, 6).map((c, i) => (
              <div className="row" key={i}>
                <div>
                  <div className="font-medium">{c.cluster}</div>
                  <div className="text-xs text-slate-400">Impacto: {c.impacto_estimado_cluster ?? 0}</div>
                </div>
                <span className="badge">{c.critical_high}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="title">Ação imediata</h2>
          <div className="mt-3 space-y-2">
            {(sla.alerts || []).length === 0 ? (
              <div className="alert ok-bg">Sem alertas SLA ativos</div>
            ) : (
              <div className="alert bad-bg">{sla.alerts.length} alertas SLA ativos</div>
            )}
            <div className="alert muted-bg">Novos dados: {Number(summary.processed || 0) > 0 ? "SIM" : "NÃO"}</div>
            <div className="alert muted-bg">View atual: Executive</div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="card">
          <h2 className="title">Top riscos críticos</h2>
          <ul className="space-y-2 mt-3">
            {topRisks.slice(0, 8).map((r, i) => (
              <li key={i} className="row">
                <span className="truncate pr-3">{r.kpi} · {r.unidade}</span>
                <span className="badge">{r.score}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="title">Action Inbox</h2>
          <ul className="space-y-2 mt-3">
            {actionInbox.map((a, i) => (
              <li key={i} className="row !items-start">
                <div>
                  <div className="font-medium">[{a.priority}] {a.title}</div>
                  <div className="text-xs text-slate-400">{a.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <h2 className="title">Run Control (next step)</h2>
        <p className="text-sm text-slate-400 mt-1">
          Próxima entrega: controles reais de execução + login/session + ações persistentes no backend.
        </p>
      </section>
    </main>
  );
}

function Metric({ title, value, delta }: { title: string; value: string | number; delta: string }) {
  return (
    <div className="metric">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      <div className="text-xs text-cyan-300 mt-1">Δ {delta}</div>
    </div>
  );
}
