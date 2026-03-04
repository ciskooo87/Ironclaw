import { dbQuery } from "../src/lib/db";

async function getUserId(email: string) {
  const q = await dbQuery<{ id: string }>("select id from users where email=$1", [email]);
  return q.rows[0]?.id || null;
}

async function upsertProject(code: string, name: string) {
  await dbQuery(
    `insert into projects(code,name,cnpj,legal_name,partners,segment,timezone)
     values($1,$2,$3,$4,$5::jsonb,$6,$7)
     on conflict(code) do update set name=excluded.name, updated_at=now()`,
    [
      code,
      name,
      "12.345.678/0001-90",
      `${name} LTDA`,
      JSON.stringify(["Paulo", "Sócio 2"]),
      "Serviços",
      "America/Sao_Paulo",
    ]
  );

  const q = await dbQuery<{ id: string }>("select id from projects where code=$1", [code]);
  return q.rows[0]?.id as string;
}

async function main() {
  const adminId = await getUserId("admin@ironcore.lat");
  const headId = await getUserId("head@ironcore.lat");
  const consultorId = await getUserId("consultor@ironcore.lat");

  const projectId = await upsertProject("elicon", "ELICON");

  await dbQuery("delete from project_permissions where project_id=$1", [projectId]);
  if (headId) await dbQuery("insert into project_permissions(user_id, project_id, can_edit) values($1,$2,true)", [headId, projectId]);
  if (consultorId) await dbQuery("insert into project_permissions(user_id, project_id, can_edit) values($1,$2,true)", [consultorId, projectId]);

  await dbQuery("delete from project_alerts where project_id=$1", [projectId]);
  await dbQuery(
    "insert into project_alerts(project_id,name,severity,block_flow,rule) values($1,$2,'critical',true,$3::jsonb),($1,$4,'high',false,$5::jsonb)",
    [
      projectId,
      "Diferença de conciliação acima do limite",
      JSON.stringify({ max_diff: 10000, max_pending: 8 }),
      "Pendências acima do limite diário",
      JSON.stringify({ max_diff: 5000, max_pending: 5 }),
    ]
  );

  await dbQuery("delete from daily_entries where project_id=$1", [projectId]);
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const d = date.toISOString().slice(0, 10);
    const faturamento = 30000 + i * 1500;
    const receber = 20000 + i * 900;
    const pagar = 12000 + i * 700;
    const extrato = receber + (i % 3 === 0 ? 3000 : 0);
    const duplicatas = 5000 + i * 250;

    await dbQuery(
      "insert into daily_entries(project_id,business_date,source_type,payload,created_by) values($1,$2,$3,$4::jsonb,$5)",
      [
        projectId,
        d,
        i % 2 === 0 ? "manual" : "upload",
        JSON.stringify({
          faturamento,
          contas_receber: receber,
          contas_pagar: pagar,
          extrato_bancario: extrato,
          duplicatas,
          notes: `seed day ${i}`,
        }),
        adminId,
      ]
    );
  }

  await dbQuery("delete from financial_operations where project_id=$1", [projectId]);
  await dbQuery(
    `insert into financial_operations(project_id,business_date,op_type,gross_amount,fee_percent,net_amount,fund_limit,receivable_available,notes,created_by)
     values
     ($1,current_date,'desconto_duplicata',80000,2.5,78000,120000,100000,'seed desconto', $2),
     ($1,current_date,'fomento',50000,3.2,48400,90000,70000,'seed fomento', $2),
     ($1,current_date,'intercompany',30000,1.0,29700,50000,50000,'seed intercompany', $2)
    `,
    [projectId, adminId]
  );

  await dbQuery("delete from reconciliation_runs where project_id=$1", [projectId]);
  await dbQuery(
    `insert into reconciliation_runs(project_id,business_date,status,matched_items,pending_items,details)
     values
     ($1,current_date,'warning',8,2,$2::jsonb),
     ($1,current_date - interval '1 day','ok',10,0,$3::jsonb)
    `,
    [
      projectId,
      JSON.stringify({ extrato: 42000, receber: 38000, duplicatas: 3000, diff: 1000, noTolerance: true }),
      JSON.stringify({ extrato: 41000, receber: 39000, duplicatas: 2000, diff: 0, noTolerance: true }),
    ]
  );

  await dbQuery("delete from routine_runs where project_id=$1", [projectId]);
  const routine = await dbQuery<{ id: string }>(
    `insert into routine_runs(project_id,business_date,status,summary)
     values($1,current_date,'warning',$2::jsonb)
     returning id`,
    [
      projectId,
      JSON.stringify({
        movementProcessed: true,
        aiAnalysis: { explainability: true, riskLevel: "medio", recommendation: "Revisar pendências e validar títulos" },
        cashflow90d: { basedOn: "daily+projected", note: "Há impacto potencial por pendências de conciliação" },
        reconciliation: { pending: 2 },
        delivery: { summaryText: "Projeto: elicon | Data: hoje | Status: warning" },
      }),
    ]
  );
  const routineId = routine.rows[0]?.id || null;

  await dbQuery("delete from delivery_runs where project_id=$1", [projectId]);
  await dbQuery(
    `insert into delivery_runs(project_id,routine_run_id,channel,target,status,provider_message,payload)
     values
     ($1,$2,'telegram','6782150929','sent','seed ok',$3::jsonb),
     ($1,$2,'email','diretoria@ironcore.lat','failed','SMTP timeout',$3::jsonb),
     ($1,$2,'whatsapp',null,'skipped','webhook ausente',$3::jsonb)
    `,
    [projectId, routineId, JSON.stringify({ summaryText: "Seed delivery summary" })]
  );

  await dbQuery("delete from monthly_closures where project_id=$1", [projectId]);
  await dbQuery(
    `insert into monthly_closures(project_id,period_ym,status,snapshot_version,snapshot,created_by)
     values
     ($1,to_char(current_date,'YYYY-MM'),'closed',1,$2::jsonb,$3),
     ($1,to_char(current_date - interval '1 month','YYYY-MM'),'closed',1,$4::jsonb,$3)
    `,
    [
      projectId,
      JSON.stringify({ period: "atual", netOperations: 156100, notes: "seed fechamento" }),
      adminId,
      JSON.stringify({ period: "anterior", netOperations: 132000, notes: "seed fechamento" }),
    ]
  );

  await dbQuery(
    `insert into audit_log(project_id, actor_user_id, action, entity, entity_id, after_data)
     values($1,$2,'seed.e2e','system','seed', $3::jsonb)`,
    [projectId, adminId, JSON.stringify({ ok: true, at: new Date().toISOString() })]
  );

  console.log("E2E seed completed for project code: elicon");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
