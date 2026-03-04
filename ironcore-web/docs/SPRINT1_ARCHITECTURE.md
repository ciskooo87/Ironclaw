# IronCore Sprint 1 — Arquitetura Base

## Banco sugerido
PostgreSQL 16

## Tabelas iniciais (DDL resumido)

```sql
create table users (
  id uuid primary key,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('consultor','head','diretoria','admin_master')),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key,
  code text unique not null,
  name text not null,
  cnpj text not null,
  legal_name text not null,
  partners jsonb not null default '[]',
  segment text not null,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);

create table project_permissions (
  user_id uuid not null references users(id),
  project_id uuid not null references projects(id),
  can_edit boolean not null default false,
  primary key (user_id, project_id)
);

create table project_risks (
  id uuid primary key,
  project_id uuid not null references projects(id),
  name text not null,
  weight numeric(8,2) not null,
  trigger_rule jsonb not null,
  critical boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table project_alerts (
  id uuid primary key,
  project_id uuid not null references projects(id),
  name text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  block_flow boolean not null default false,
  rule jsonb not null,
  created_at timestamptz not null default now()
);

create table daily_entries (
  id uuid primary key,
  project_id uuid not null references projects(id),
  business_date date not null,
  source_type text not null check (source_type in ('manual','upload')),
  payload jsonb not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique(project_id, business_date, source_type)
);

create table audit_log (
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
```

## Migrations

```bash
cd ironcore-web
export DATABASE_URL='postgres://user:pass@host:5432/ironcore'
npm run migrate
```

## Variáveis sugeridas de Fluxo de Caixa

1. prazo_medio_recebimento_dias
2. prazo_medio_pagamento_dias
3. inadimplencia_percentual
4. crescimento_receita_mensal_percentual
5. sazonalidade_receita (json por mês)
6. churn_clientes_percentual
7. reajuste_contratos_percentual
8. custo_fixo_mensal
9. custo_variavel_percentual_receita
10. folha_mensal
11. impostos_percentual_receita
12. limite_fundo_disponivel
13. custo_desconto_duplicata_percentual
14. custo_comissaria_percentual
15. custo_fomento_percentual
16. limite_intercompany
17. caixa_minimo_seguranca
18. capex_planejado_mensal
19. contingencias_previstas
20. data_corte_fechamento_mensal
