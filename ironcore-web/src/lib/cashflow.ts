import { dbQuery } from "@/lib/db";

type DayMove = {
  faturamento: number;
  contas_receber: number;
  contas_pagar: number;
  extrato_bancario: number;
  duplicatas: number;
  net_ops: number;
};

export async function getTodayMovement(projectId: string, dateISO: string) {
  const q = await dbQuery<DayMove>(
    `select
      coalesce(sum((payload->>'faturamento')::numeric),0)::float8 as faturamento,
      coalesce(sum((payload->>'contas_receber')::numeric),0)::float8 as contas_receber,
      coalesce(sum((payload->>'contas_pagar')::numeric),0)::float8 as contas_pagar,
      coalesce(sum((payload->>'extrato_bancario')::numeric),0)::float8 as extrato_bancario,
      coalesce(sum((payload->>'duplicatas')::numeric),0)::float8 as duplicatas,
      coalesce((select sum(net_amount) from financial_operations where project_id=$1 and business_date=$2),0)::float8 as net_ops
    from daily_entries
    where project_id=$1 and business_date=$2`,
    [projectId, dateISO]
  );
  return q.rows[0] || {
    faturamento: 0,
    contas_receber: 0,
    contas_pagar: 0,
    extrato_bancario: 0,
    duplicatas: 0,
    net_ops: 0,
  };
}

export async function getCashflowProjection90d(projectId: string, dateISO: string) {
  const avg = await dbQuery<{ avg_in: number; avg_out: number }>(
    `select
      coalesce(avg((payload->>'contas_receber')::numeric),0)::float8 as avg_in,
      coalesce(avg((payload->>'contas_pagar')::numeric),0)::float8 as avg_out
    from (
      select payload
      from daily_entries
      where project_id=$1
      order by business_date desc
      limit 15
    ) x`,
    [projectId]
  );

  const m = await getTodayMovement(projectId, dateISO);
  const avgIn = Number(avg.rows[0]?.avg_in || 0);
  const avgOut = Number(avg.rows[0]?.avg_out || 0);

  const baseOpening = Number(m.extrato_bancario || 0) + Number(m.net_ops || 0);

  const scenarios = {
    base: { inFactor: 1, outFactor: 1 },
    otimista: { inFactor: 1.12, outFactor: 0.93 },
    pessimista: { inFactor: 0.88, outFactor: 1.1 },
  } as const;

  function buildRows(inFactor: number, outFactor: number) {
    let balance = baseOpening;
    const rows: Array<{ date: string; opening: number; inflow: number; outflow: number; closing: number; rupture: boolean }> = [];

    for (let i = 0; i < 90; i++) {
      const d = new Date(`${dateISO}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const ds = d.toISOString().slice(0, 10);

      const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
      const inflowBase = weekend ? avgIn * 0.5 : avgIn;
      const outflowBase = weekend ? avgOut * 0.8 : avgOut;
      const inflow = inflowBase * inFactor;
      const outflow = outflowBase * outFactor;

      const opening = balance;
      const closing = opening + inflow - outflow;
      const rupture = closing < 0;

      rows.push({ date: ds, opening, inflow, outflow, closing, rupture });
      balance = closing;
    }
    return rows;
  }

  const baseRows = buildRows(scenarios.base.inFactor, scenarios.base.outFactor);
  const optimisticRows = buildRows(scenarios.otimista.inFactor, scenarios.otimista.outFactor);
  const pessimisticRows = buildRows(scenarios.pessimista.inFactor, scenarios.pessimista.outFactor);

  const firstRupture = (rows: { date: string; rupture: boolean }[]) => rows.find((r) => r.rupture)?.date || null;

  return {
    avgIn,
    avgOut,
    baseOpening,
    scenarios: {
      base: { rows: baseRows, ruptureDate: firstRupture(baseRows) },
      otimista: { rows: optimisticRows, ruptureDate: firstRupture(optimisticRows) },
      pessimista: { rows: pessimisticRows, ruptureDate: firstRupture(pessimisticRows) },
    },
  };
}
