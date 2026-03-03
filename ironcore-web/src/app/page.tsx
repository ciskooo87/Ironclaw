import fs from "node:fs";
import path from "node:path";

type AnyObj = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const txt = (v: unknown) => String(v ?? "-");

function loadJson<T = AnyObj>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function metricDelta(current: number, previous?: unknown) {
  if (previous === undefined || previous === null) return "-";
  const d = current - num(previous);
  return d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`;
}

function findLatestReconciliation(base: string) {
  try {
    const outDir = path.join(base, "outputs");
    const files = fs
      .readdirSync(outDir)
      .filter((f) => /^reconciliation_\d+\.json$/.test(f))
      .sort();
    if (!files.length) return null;
    const file = files[files.length - 1];
    return loadJson(path.join(outDir, file), null);
  } catch {
    return null;
  }
}

export default function Home() {
  const projectId = process.env.IRONCORE_PROJECT_ID || "teste";
  const base = path.join(process.cwd(), "..", "projects", projectId);

  const comite = loadJson(path.join(base, "outputs", "comite.json"), {} as AnyObj);
  const sla = loadJson(path.join(base, "outputs", "sla_alerts.json"), { alerts: [] });
  const cashflow = loadJson(path.join(base, "outputs", "cashflow_90d.json"), {} as AnyObj);
  const reconciliation = (findLatestReconciliation(base) || {}) as AnyObj;

  const summary = (comite.summary as AnyObj) || {};
  const clusters: AnyObj[] = Array.isArray(comite.clusters) ? (comite.clusters as AnyObj[]) : [];
  const topRisks: AnyObj[] = Array.isArray(comite.top_risks) ? (comite.top_risks as AnyObj[]) : [];

  const dailyDir = path.join(base, "history", "daily");
  let prevSummary: AnyObj | undefined = undefined;
  try {
    const files = fs.readdirSync(dailyDir).filter((f) => f.endsWith(".json")).sort();
    if (files.length >= 2) {
      const prev = loadJson(path.join(dailyDir, files[files.length - 2]), {} as AnyObj);
      prevSummary = (prev.summary as AnyObj) || undefined;
    }
  } catch {
    // ignore
  }

  const trustScore = (sla.alerts || []).length === 0 ? 94 : Math.max(75, 94 - Math.min(20, sla.alerts.length * 3));
  const risks = num(summary.risks);
  const critical = num(summary.critical_high);

  const sortedClusters = [...clusters].sort((a, b) => num(b.critical_high) - num(a.critical_high));
  const actionInbox = sortedClusters.slice(0, 5).map((c, i) => ({
    priority: i < 2 ? "P1" : "P2",
    title: `Priorizar frente ${txt(c.cluster)}`,
    detail: `Críticos/altos: ${num(c.critical_high)} · Impacto: ${num(c.impacto_estimado_cluster)}`,
  }));

  const rupture = ((cashflow["rupture"] as AnyObj | undefined) || {}) as AnyObj;
  const cfRupture = Boolean(rupture["has_rupture"]);
  const cfRuptureDate = txt(rupture["first_date"]);
  const cfDaysToRupture = num(rupture["days_to_rupture"]);
  const cfOpening = num(cashflow["opening_balance"]);
  const cfMin = num(cashflow["min_projected_balance"]);
  const cfEnding = num(cashflow["ending_projected_balance"]);

  const reconTotals = ((reconciliation["totals"] as AnyObj | undefined) || {}) as AnyObj;
  const expected = Math.max(1, Number(reconTotals.ap_expected_count || 0));
  const matched = Number(reconTotals.matched_count || 0);
  const apUnmatched = Number(reconTotals.ap_unmatched_count || 0);
  const bankUnmatched = Number(reconTotals.bank_unmatched_count || 0);
  const matchRate = matched / expected;
  const reconStatus = matchRate >= 0.95 && apUnmatched === 0 && bankUnmatched <= 1
    ? "VERDE"
    : matchRate >= 0.8 && apUnmatched <= 3
      ? "AMARELO"
      : "VERMELHO";

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
            <span className="pill">Run: {txt(summary.run_id)}</span>
            <span className="pill">Modo: {txt(summary.analysis_mode)}</span>
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
        <Metric title="Issues" value={num(summary.issues)} delta="-" />
        <Metric title="Materialidade" value={num(summary.materiality_min_impact)} delta="-" />
      </section>

      <section className="grid lg:grid-cols-3 gap-4 mb-5">
        <div className="card lg:col-span-2">
          <h2 className="title">Command Center · Pressão por frente</h2>
          <div className="mt-3 grid md:grid-cols-2 gap-2">
            {sortedClusters.slice(0, 6).map((c, i) => (
              <div className="row" key={i}>
                <div>
                  <div className="font-medium">{txt(c.cluster)}</div>
                  <div className="text-xs text-slate-400">Impacto: {num(c.impacto_estimado_cluster)}</div>
                </div>
                <span className="badge">{num(c.critical_high)}</span>
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
            <div className="alert muted-bg">Novos dados: {num(summary.processed) > 0 ? "SIM" : "NÃO"}</div>
            <div className="alert muted-bg">View atual: Executive</div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="card">
          <h2 className="title">Fluxo de Caixa 90D</h2>
          {Boolean(cashflow["generated_at"]) ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="row"><span>Saldo inicial</span><b>{brl(cfOpening)}</b></div>
              <div className="row"><span>Menor saldo projetado</span><b>{brl(cfMin)}</b></div>
              <div className="row"><span>Saldo final projetado</span><b>{brl(cfEnding)}</b></div>
              {cfRupture ? (
                <div className="alert bad-bg">🚨 Ruptura prevista em {cfRuptureDate} (D+{cfDaysToRupture})</div>
              ) : (
                <div className="alert ok-bg">✅ Sem ruptura no horizonte de 90 dias</div>
              )}
            </div>
          ) : (
            <div className="alert muted-bg mt-3">cashflow_90d.json ainda não gerado para este projeto.</div>
          )}
        </div>

        <div className="card">
          <h2 className="title">Conciliação D-1</h2>
          {Boolean(reconciliation["reconciled_day"] || reconciliation["totals"]) ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="row"><span>Status</span><b>{reconStatus}</b></div>
              <div className="row"><span>Dia conciliado</span><b>{txt(reconciliation["reconciled_day"])}</b></div>
              <div className="row"><span>% conciliado</span><b>{(matchRate * 100).toFixed(1)}%</b></div>
              <div className="row"><span>Pendências AP</span><b>{apUnmatched}</b></div>
              <div className="row"><span>Débitos sem par</span><b>{bankUnmatched}</b></div>
            </div>
          ) : (
            <div className="alert muted-bg mt-3">Nenhum arquivo reconciliation_*.json encontrado.</div>
          )}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="card">
          <h2 className="title">Top riscos críticos</h2>
          <ul className="space-y-2 mt-3">
            {topRisks.slice(0, 8).map((r, i) => (
              <li key={i} className="row">
                <span className="truncate pr-3">{txt(r.kpi)} · {txt(r.unidade)}</span>
                <span className="badge">{num(r.score)}</span>
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
