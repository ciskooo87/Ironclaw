import { dbQuery } from "@/lib/db";

export type Project = {
  id: string;
  code: string;
  name: string;
  cnpj: string;
  legal_name: string;
  partners: string[];
  segment: string;
  timezone: string;
};

export async function listProjects() {
  try {
    const q = await dbQuery<Project>("select id, code, name, cnpj, legal_name, partners, segment, timezone from projects order by created_at desc");
    return q.rows;
  } catch {
    return [] as Project[];
  }
}

export async function listProjectsForUser(email: string, role: string) {
  if (role === "admin_master" || role === "diretoria") return listProjects();
  try {
    const q = await dbQuery<Project>(
      "select p.id, p.code, p.name, p.cnpj, p.legal_name, p.partners, p.segment, p.timezone from projects p join project_permissions pp on pp.project_id = p.id join users u on u.id = pp.user_id where u.email = $1 order by p.created_at desc",
      [email.toLowerCase()]
    );
    return q.rows;
  } catch {
    return [] as Project[];
  }
}

export async function getProjectByCode(code: string) {
  try {
    const q = await dbQuery<Project>("select id, code, name, cnpj, legal_name, partners, segment, timezone from projects where code = $1", [code]);
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
}) {
  const q = await dbQuery(
    "insert into projects(code,name,cnpj,legal_name,segment,partners,timezone) values($1,$2,$3,$4,$5,$6::jsonb,$7) returning id",
    [input.code, input.name, input.cnpj, input.legalName, input.segment, JSON.stringify(input.partners), input.timezone]
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
}) {
  await dbQuery(
    "update projects set name=$2, cnpj=$3, legal_name=$4, segment=$5, partners=$6::jsonb, timezone=$7, updated_at=now() where code=$1",
    [code, input.name, input.cnpj, input.legalName, input.segment, JSON.stringify(input.partners), input.timezone]
  );
}
