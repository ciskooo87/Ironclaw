create table if not exists reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  reconciliation_run_id uuid not null references reconciliation_runs(id) on delete cascade,
  project_id uuid not null references projects(id),
  business_date date not null,
  title text not null,
  amount numeric(14,2) not null,
  status text not null check (status in ('pending','resolved_manual','resolved_auto')) default 'pending',
  resolution_note text,
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reconciliation_items_project_date on reconciliation_items(project_id, business_date, status);
