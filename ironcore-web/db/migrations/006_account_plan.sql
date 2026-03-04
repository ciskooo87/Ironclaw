alter table if exists projects
  add column if not exists account_plan jsonb not null default '[]'::jsonb;
