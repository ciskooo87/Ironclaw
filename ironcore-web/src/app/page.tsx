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

export default function Home() {
  const projectId = "teste";
  const base = path.join(process.cwd(), "..", "projects", projectId);
  const comite = loadJson(path.join(base, "outputs", "comite.json"));
  const sla = loadJson(path.join(base, "outputs", "sla_alerts.json"), { alerts: [] });

  const summary = comite.summary || {};
  const clusters: AnyObj[] = comite.clusters || [];
  const topRisks: AnyObj[] = comite.top_risks || [];

  const trustScore = (sla.alerts || []).length === 0 ? 94 : Math.max(75, 94 - Math.min(20, sla.alerts.length * 3));

  return (
    <main className="min-h-screen p-6 md:p-10">
      <section className="card mb-5">
        <h1 className="text-2xl font-semibold">IronCore Command Center</h1>
        <p className="text-sm text-slate-400 mt-1">Executive view · risk, action and operational trust.</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        <Metric title="Trust Score" value={`${trustScore}/100`} />
        <Metric title="Riscos" value={summary.risks ?? 0} />
        <Metric title="Críticos/Altos" value={summary.critical_high ?? 0} />
        <Metric title="Issues" value={summary.issues ?? 0} />
        <Metric title="Run" value={summary.run_id ?? "-"} />
        <Metric title="Modo" value={summary.analysis_mode ?? "-"} />
      </section>

      <section className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="card">
          <h2 className="title">Pressão por frente</h2>
          <ul className="space-y-2 mt-3">
            {clusters.slice(0, 6).map((c, i) => (
              <li key={i} className="row">
                <span>{c.cluster}</span>
                <span className="badge">{c.critical_high}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="title">Top riscos críticos</h2>
          <ul className="space-y-2 mt-3">
            {topRisks.slice(0, 6).map((r, i) => (
              <li key={i} className="row">
                <span>{r.kpi} · {r.unidade}</span>
                <span className="badge">{r.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <h2 className="title">Action Inbox (preview)</h2>
        <p className="text-sm text-slate-400 mt-1">Next step: persistent actions + assignment workflow.</p>
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="metric">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
