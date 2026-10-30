-- Liga Maxi 2027: esquema de prueba aislado.
-- Este archivo no se ejecuta contra Supabase productivo.
create table if not exists lm_organizations (
  id uuid primary key,
  name text not null
);
create table if not exists lm_tournaments (
  id uuid primary key,
  organization_id uuid not null references lm_organizations(id),
  name text not null,
  season integer not null,
  state text not null check (state in ('draft','active','closed'))
);
create table if not exists lm_categories (
  id uuid primary key,
  tournament_id uuid not null references lm_tournaments(id),
  name text not null,
  unique (tournament_id, name)
);
create table if not exists lm_players (
  id uuid primary key,
  organization_id uuid not null references lm_organizations(id),
  tournament_id uuid not null references lm_tournaments(id),
  category_id uuid not null references lm_categories(id),
  team_name text not null,
  name text not null
);
create table if not exists lm_document_reviews (
  id bigserial primary key,
  player_id uuid not null references lm_players(id),
  requirement text not null,
  status text not null check (status in ('pending','loaded','observed','approved','rejected')),
  evidence text,
  actor_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists lm_document_reviews_player_requirement on lm_document_reviews(player_id, requirement, created_at desc);

-- En una base aislada, el JWT debe aportar organization_id y role.
alter table lm_tournaments enable row level security;
alter table lm_categories enable row level security;
alter table lm_players enable row level security;
alter table lm_document_reviews enable row level security;
create policy lm_tournament_org_scope on lm_tournaments using (organization_id::text = current_setting('request.jwt.claim.organization_id', true));
create policy lm_category_tournament_scope on lm_categories using (exists (select 1 from lm_tournaments t where t.id = tournament_id and t.organization_id::text = current_setting('request.jwt.claim.organization_id', true)));
create policy lm_player_org_scope on lm_players using (organization_id::text = current_setting('request.jwt.claim.organization_id', true));
create policy lm_document_player_scope on lm_document_reviews using (exists (select 1 from lm_players p where p.id = player_id and p.organization_id::text = current_setting('request.jwt.claim.organization_id', true)));

-- RPCs y concurrencia deben probarse en el entorno aislado antes de adaptar este esquema.
