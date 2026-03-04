alter table if exists daily_entries
  add column if not exists updated_at timestamptz not null default now();
