create table if not exists financial_operations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  business_date date not null,
  op_type text not null check (op_type in ('desconto_duplicata','comissaria','fomento','intercompany')),
  gross_amount numeric(14,2) not null,
  fee_percent numeric(8,4) not null default 0,
  net_amount numeric(14,2) not null,
  fund_limit numeric(14,2),
  receivable_available numeric(14,2),
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists monthly_closures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  period_ym text not null,
  status text not null check (status in ('closed','reopened')),
  snapshot_version int not null,
  snapshot jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique(project_id, period_ym, snapshot_version)
);
