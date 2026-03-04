create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('consultor','head','diretoria','admin_master')),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  cnpj text not null,
  legal_name text not null,
  partners jsonb not null default '[]'::jsonb,
  segment text not null,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_permissions (
  user_id uuid not null references users(id),
  project_id uuid not null references projects(id),
  can_edit boolean not null default false,
  primary key (user_id, project_id)
);

create table if not exists project_alerts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  name text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  block_flow boolean not null default false,
  rule jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  business_date date not null,
  source_type text not null check (source_type in ('manual','upload')),
  payload jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  project_id uuid,
  actor_user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
