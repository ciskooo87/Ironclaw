import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listProjectAlerts } from "@/lib/alerts";
import { getCashflowProjection90d } from "@/lib/cashflow";
import { todayInSaoPauloISO } from "@/lib/time";

const AUTO_CHECKS = [
  "Ruptura de caixa em 90 dias",
  "Pendências de conciliação acima do limite",
  "Alerta crítico bloqueando fluxo",
  "Pico de saída nos próximos vencimentos",
  "Desvio relevante DRE x DFC",
] as const;

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectByCode(id);

  if (!project) return <AppShell user={user} title="Projeto · Riscos e Alertas"><div className="alert bad-bg">Projeto não encontrado.</div></AppShell>;
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return <AppShell user={user} title="Projeto · Riscos e Alertas"><div className="alert bad-bg">Sem permissão.</div></AppShell>;

  const alerts = await listProjectAlerts(project.id);
  const today = todayInSaoPauloISO();
  const projection = await getCashflowProjection90d(project.id, today);

  return (
    <AppShell user={user} title="Projeto · Riscos e Alertas" subtitle="Relato operacional + checklist de risco com ação e bloqueio">
      <section className="card mb-4">
        <div className="section-head"><h2 className="title">Novo alerta</h2><span className="kpi-chip">Risk control</span></div>
        <form action={`/api/projects/${id}/alerts/create`} method="post" className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
          <input name="name" required placeholder="nome do alerta" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <select name="severity" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
          </select>
          <select name="block_flow" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="false">não bloqueia</option>
            <option value="true">bloqueia fluxo</option>
          </select>

          <label className="md:col-span-3 space-y-1">
            <span className="text-slate-400">Relato breve do projeto (base para leitura de risco)</span>
            <textarea name="project_report" placeholder="Contexto atual, gargalos e sinais de risco" className="w-full min-h-20 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          </label>

          <label className="md:col-span-3 space-y-1">
            <span className="text-slate-400">Oportunidade identificada</span>
            <input name="opportunity" placeholder="Ex.: renegociação de vencimentos ou redução de custo financeiro" className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          </label>

          <input name="max_diff" type="number" step="0.01" placeholder="max_diff (R$)" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="max_pending" type="number" placeholder="max_pending" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="upload_ref" placeholder="referência de upload (url/id)" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />

          <div className="md:col-span-3 rounded-lg border border-slate-800 p-3">
            <div className="text-slate-300 text-sm mb-2">Checklist automático (selecionar os riscos/oportunidades detectados)</div>
            <div className="grid md:grid-cols-2 gap-1 text-sm">
              {AUTO_CHECKS.map((item) => (
                <label key={item} className="flex items-center gap-2"><input type="checkbox" name="auto_checks" value={item} /> {item}</label>
              ))}
            </div>
          </div>

          <button type="submit" className="badge py-2 cursor-pointer">Salvar alerta ✦</button>
        </form>
        {query.saved ? <div className="alert ok-bg mt-3">Alerta salvo.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}</div> : null}
      </section>

      <section className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="card">
          <h2 className="title">Resumo do projeto</h2>
          <div className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{project.project_summary || "Sem resumo preenchido em Cadastro."}</div>
        </div>
        <div className="card">
          <h2 className="title">Resumo executivo automático</h2>
          <div className="space-y-2 mt-2 text-sm">
            <div className="row"><span>Alertas abertos</span><b>{alerts.length}</b></div>
            <div className="row"><span>Ruptura no cenário base</span><b>{projection.scenarios.base.ruptureDate || "não"}</b></div>
            <div className="row"><span>Próximos vencimentos</span><b>D+7 monitorado</b></div>
            <div className="row"><span>KPI DRE/DFC</span><b>visão consolidada no módulo DRE/DFC</b></div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="title">Alertas cadastrados</h2>
        <div className="mt-3 space-y-2 text-sm">
          {alerts.length === 0 ? <div className="alert muted-bg">Sem alertas.</div> : null}
          {alerts.map((a) => (
            <div key={a.id} className="row !items-start">
              <div>
                <div className="font-medium">{a.name} · {a.severity.toUpperCase()} {a.block_flow ? "· BLOCK" : ""}</div>
                <div className="text-xs text-slate-400 whitespace-pre-wrap">{JSON.stringify(a.rule, null, 2)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
