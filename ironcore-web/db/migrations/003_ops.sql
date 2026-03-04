create table if not exists reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  business_date date not null,
  status text not null check (status in ('ok','warning','blocked')),
  matched_items int not null default 0,
  pending_items int not null default 0,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists routine_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  business_date date not null,
  status text not null check (status in ('success','warning','blocked')),
  summary jsonb not null,
  created_at timestamptz not null default now()
);
