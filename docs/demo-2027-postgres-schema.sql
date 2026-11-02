-- PostgreSQL 16 aislado para el adaptador Liga Maxi 2027. Nunca ejecutar en producción.
create table if not exists lm_demo_organizations (id uuid primary key, name text not null unique);
-- Fixture estable para los recorridos visuales locales; no representa una organización real.
insert into lm_demo_organizations(id, name)
values ('00000000-0000-4000-8000-000000000101', 'Liga Maxi 2027 - organización visual sintética')
on conflict (id) do nothing;
create table if not exists lm_demo_users (id uuid primary key, username text not null unique, role text not null check (role in ('platform_admin','organizer','delegate')));
create table if not exists lm_demo_memberships (user_id uuid not null references lm_demo_users(id), organization_id uuid not null references lm_demo_organizations(id), primary key (user_id, organization_id));
create table if not exists lm_demo_tournaments (id uuid primary key, organization_id uuid not null references lm_demo_organizations(id), name text not null, season integer not null, state text not null check (state in ('draft','active','closed')));
create table if not exists lm_demo_categories (id uuid primary key, tournament_id uuid not null references lm_demo_tournaments(id), name text not null, state text not null default 'open' check (state in ('open','closed')), unique (tournament_id, name));
create table if not exists lm_demo_teams (id uuid primary key, category_id uuid not null references lm_demo_categories(id), name text not null, unique (category_id, name), unique (category_id, id));
create table if not exists lm_demo_delegate_assignments (user_id uuid not null references lm_demo_users(id), category_id uuid not null references lm_demo_categories(id), team_id uuid references lm_demo_teams(id), primary key (user_id, category_id, team_id));
create table if not exists lm_demo_security_history (id bigserial primary key, actor_id uuid not null, action text not null, payload jsonb not null, created_at timestamptz not null default now());
create table if not exists lm_demo_matches (id uuid primary key, category_id uuid not null references lm_demo_categories(id), round_no integer not null, home_team_id uuid not null, away_team_id uuid not null, scheduled_at timestamptz, court text, home_score integer, away_score integer, result_state text not null default 'pending' check (result_state in ('pending','played','administrative_without_points')), check (home_score is null or away_score is not null), check (away_score is null or home_score is not null), foreign key (category_id, home_team_id) references lm_demo_teams(category_id, id), foreign key (category_id, away_team_id) references lm_demo_teams(category_id, id), check (home_team_id <> away_team_id));
create table if not exists lm_demo_match_history (id bigserial primary key, match_id uuid not null references lm_demo_matches(id), actor_id uuid not null, action text not null, payload jsonb not null, created_at timestamptz not null default now());
create table if not exists lm_demo_playoffs (category_id uuid primary key references lm_demo_categories(id), format text not null check (format in ('top4','top6','top8')), state text not null, champion text, payload jsonb not null, updated_at timestamptz not null default now());
create table if not exists lm_demo_playoff_history (id bigserial primary key, category_id uuid not null references lm_demo_categories(id), actor_id uuid not null, action text not null, payload jsonb not null, created_at timestamptz not null default now());
create index if not exists lm_demo_matches_category on lm_demo_matches(category_id, round_no);
