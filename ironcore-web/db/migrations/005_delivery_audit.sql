create table if not exists delivery_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  routine_run_id uuid references routine_runs(id),
  channel text not null check (channel in ('telegram','whatsapp','email')),
  target text,
  status text not null check (status in ('sent','failed','skipped')),
  provider_message text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
