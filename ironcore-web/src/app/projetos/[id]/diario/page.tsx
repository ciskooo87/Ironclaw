import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listDailyEntries } from "@/lib/daily";
import { todayInSaoPauloISO } from "@/lib/time";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectByCode(id);
  const query = await searchParams;

  if (!project) {
    return (
      <AppShell user={user} title="Projeto · Painel Diário">
        <div className="alert bad-bg">Projeto não encontrado.</div>
      </AppShell>
    );
  }

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) {
    return (
      <AppShell user={user} title="Projeto · Painel Diário">
        <div className="alert bad-bg">Sem permissão para este projeto.</div>
      </AppShell>
    );
  }

  const entries = await listDailyEntries(project.id, 30);

  return (
    <AppShell user={user} title="Projeto · Painel Diário" subtitle="Entrada manual/upload com limite de edição retroativa de 5 dias">
      <section className="card mb-4">
        <h2 className="title">Lançar movimento diário (manual)</h2>
        <form action={`/api/projects/${id}/daily/create`} method="post" encType="multipart/form-data" className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
          <input name="business_date" type="date" defaultValue={todayInSaoPauloISO()} required className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <select name="source_type" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2">
            <option value="manual">manual</option>
            <option value="upload">upload</option>
          </select>
          <input name="faturamento" type="number" step="0.01" placeholder="faturamento" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="contas_receber" type="number" step="0.01" placeholder="contas a receber" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="contas_pagar" type="number" step="0.01" placeholder="contas a pagar" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="extrato_bancario" type="number" step="0.01" placeholder="extrato bancário" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="duplicatas" type="number" step="0.01" placeholder="duplicatas" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="notes" placeholder="observações" className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <input name="file" type="file" accept=".csv,.xlsx,.xls" className="md:col-span-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
          <button type="submit" className="badge py-2 cursor-pointer">Salvar dia</button>
        </form>

        {query.saved ? <div className="alert ok-bg mt-3">Movimento salvo.</div> : null}
        {query.error ? <div className="alert bad-bg mt-3">Erro: {query.error}.</div> : null}
      </section>

      <section className="card mb-4">
        <h2 className="title">Enviar bases diárias direto pela plataforma</h2>
        <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
          <form action={`/api/projects/${id}/daily/upload`} method="post" encType="multipart/form-data" className="card !p-3">
            <div className="font-medium mb-2">Upload Base Diária</div>
            <input type="hidden" name="upload_kind" value="base_diaria" />
            <input name="business_date" type="date" defaultValue={todayInSaoPauloISO()} required className="mb-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="file" type="file" accept=".csv,.xlsx,.xls" required className="mb-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="notes" placeholder="observações" className="mb-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <button type="submit" className="badge py-2 cursor-pointer">Enviar base diária</button>
          </form>

          <form action={`/api/projects/${id}/daily/upload`} method="post" encType="multipart/form-data" className="card !p-3">
            <div className="font-medium mb-2">Upload Extrato Bancário</div>
            <input type="hidden" name="upload_kind" value="extrato" />
            <input name="business_date" type="date" defaultValue={todayInSaoPauloISO()} required className="mb-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="file" type="file" accept=".csv,.xlsx,.xls" required className="mb-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <input name="notes" placeholder="observações" className="mb-2 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
            <button type="submit" className="badge py-2 cursor-pointer">Enviar extrato</button>
          </form>
        </div>
      </section>

      <section className="card">
        <h2 className="title">Últimos lançamentos</h2>
        <div className="mt-3 space-y-2 text-sm">
          {entries.length === 0 ? <div className="alert muted-bg">Sem lançamentos ainda.</div> : null}
          {entries.map((e) => {
            const p = e.payload as Record<string, unknown>;
            return (
              <form key={e.id} action={`/api/projects/${id}/daily/${e.id}/update`} method="post" className="card !p-3">
                <div className="text-xs text-slate-400 mb-2">{e.business_date} · {e.source_type}</div>
                <div className="grid md:grid-cols-3 gap-2">
                  <input name="faturamento" type="number" step="0.01" defaultValue={Number(p.faturamento || 0)} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
                  <input name="contas_receber" type="number" step="0.01" defaultValue={Number(p.contas_receber || 0)} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
                  <input name="contas_pagar" type="number" step="0.01" defaultValue={Number(p.contas_pagar || 0)} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
                  <input name="extrato_bancario" type="number" step="0.01" defaultValue={Number(p.extrato_bancario || 0)} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
                  <input name="duplicatas" type="number" step="0.01" defaultValue={Number(p.duplicatas || 0)} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
                  <input name="notes" defaultValue={String(p.notes || "")} className="bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2" />
                </div>
                <div className="mt-2">
                  <button className="pill" type="submit">Atualizar lançamento</button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
