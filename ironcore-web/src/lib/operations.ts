import { dbQuery } from "@/lib/db";

export type FinancialOperation = {
  id: string;
  business_date: string;
  op_type: "desconto_duplicata" | "comissaria" | "fomento" | "intercompany";
  gross_amount: number;
  fee_percent: number;
  net_amount: number;
  fund_limit: number | null;
  receivable_available: number | null;
  notes: string | null;
  created_at: string;
};

export async function listOperations(projectId: string, limit = 50) {
  try {
    const q = await dbQuery<FinancialOperation>(
      "select id, business_date::text, op_type, gross_amount::float8, fee_percent::float8, net_amount::float8, fund_limit::float8, receivable_available::float8, notes, created_at::text from financial_operations where project_id=$1 order by created_at desc limit $2",
      [projectId, limit]
    );
    return q.rows;
  } catch {
    return [] as FinancialOperation[];
  }
}

export async function createOperation(input: {
  projectId: string;
  businessDate: string;
  opType: FinancialOperation["op_type"];
  grossAmount: number;
  feePercent: number;
  fundLimit: number;
  receivableAvailable: number;
  notes: string;
  createdBy: string | null;
}) {
  const net = Math.max(0, input.grossAmount * (1 - input.feePercent / 100));
  const q = await dbQuery<{ id: string }>(
    "insert into financial_operations(project_id,business_date,op_type,gross_amount,fee_percent,net_amount,fund_limit,receivable_available,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id",
    [input.projectId, input.businessDate, input.opType, input.grossAmount, input.feePercent, net, input.fundLimit, input.receivableAvailable, input.notes, input.createdBy]
  );
  return { id: q.rows[0]?.id, netAmount: net };
}

export async function sumNetOperations(projectId: string) {
  const q = await dbQuery<{ total: number }>("select coalesce(sum(net_amount),0)::float8 as total from financial_operations where project_id=$1", [projectId]);
  return Number(q.rows[0]?.total || 0);
}
