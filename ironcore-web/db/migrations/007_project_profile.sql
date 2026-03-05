alter table if exists projects
  add column if not exists project_summary text not null default '',
  add column if not exists financial_profile jsonb not null default '{}'::jsonb,
  add column if not exists supplier_classes jsonb not null default '[]'::jsonb;
