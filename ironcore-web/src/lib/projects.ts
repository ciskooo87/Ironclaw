import { dbQuery } from "@/lib/db";

export type SupplierClass = {
  supplier: string;
  account: string;
};

export type FinancialProfile = {
  tx_percent: number;
  float_days: number;
  tac: number;
  cost_per_boleto: number;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  cnpj: string;
  legal_name: string;
  partners: string[];
  segment: string;
  timezone: string;
  account_plan: string[];
  project_summary: string;
  financial_profile: Partial<FinancialProfile>;
  supplier_classes: SupplierClass[];
};

const BASE_SELECT = "id, code, name, cnpj, legal_name, partners, segment, timezone, account_plan, project_summary, financial_profile, supplier_classes";

export async function listProjects() {
  try {
    const q = await dbQuery<Project>(`select ${BASE_SELECT} from projects order by created_at desc`);
    return q.rows;
  } catch {
    return [] as Project[];
  }
}

export async function listProjectsForUser(email: string, role: string) {
  if (role === "admin_master" || role === "diretoria") return listProjects();
  try {
    const q = await dbQuery<Project>(
      `select p.${BASE_SELECT} from projects p
       join project_permissions pp on pp.project_id = p.id
       join users u on u.id = pp.user_id
       where u.email = $1
       order by p.created_at desc`,
      [email.toLowerCase()]
    );
    return q.rows;
  } catch {
    return [] as Project[];
  }
}

export async function getProjectByCode(code: string) {
  try {
    const q = await dbQuery<Project>(`select ${BASE_SELECT} from projects where code = $1`, [code]);
    return q.rows[0] || null;
  } catch {
    return null;
  }
}

export async function createProject(input: {
  code: string;
  name: string;
  cnpj: string;
  legalName: string;
  segment: string;
  partners: string[];
  timezone: string;
  accountPlan: string[];
}) {
  const q = await dbQuery(
    "insert into projects(code,name,cnpj,legal_name,segment,partners,timezone,account_plan) values($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb) returning id",
    [input.code, input.name, input.cnpj, input.legalName, input.segment, JSON.stringify(input.partners), input.timezone, JSON.stringify(input.accountPlan)]
  );
  return q.rows[0];
}

export async function updateProjectByCode(code: string, input: {
  name: string;
  cnpj: string;
  legalName: string;
  segment: string;
  partners: string[];
  timezone: string;
  accountPlan: string[];
  projectSummary: string;
  financialProfile: FinancialProfile;
  supplierClasses: SupplierClass[];
}) {
  await dbQuery(
    `update projects
     set name=$2, cnpj=$3, legal_name=$4, segment=$5, partners=$6::jsonb, timezone=$7,
         account_plan=$8::jsonb, project_summary=$9, financial_profile=$10::jsonb, supplier_classes=$11::jsonb,
         updated_at=now()
     where code=$1`,
    [
      code,
      input.name,
      input.cnpj,
      input.legalName,
      input.segment,
      JSON.stringify(input.partners),
      input.timezone,
      JSON.stringify(input.accountPlan),
      input.projectSummary,
      JSON.stringify(input.financialProfile),
      JSON.stringify(input.supplierClasses),
    ]
  );
}
