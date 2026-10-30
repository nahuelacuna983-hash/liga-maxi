-- Liga Maxi 2027: PostgreSQL aislado de pruebas.
-- No ejecutar contra Supabase productivo. Requiere PostgreSQL 14+.
create extension if not exists pgcrypto;

create table lm_organizations (id uuid primary key, name text not null);
create table lm_users (id uuid primary key, display_name text not null);
create table lm_memberships (
  user_id uuid not null references lm_users(id) on delete cascade,
  organization_id uuid not null references lm_organizations(id) on delete cascade,
  role text not null check (role in ('platform_admin','association','delegate','public')),
  primary key (user_id, organization_id)
);
create table lm_tournaments (
  id uuid primary key, organization_id uuid not null references lm_organizations(id),
  name text not null, season integer not null,
  state text not null check (state in ('draft','active','closed')),
  unique (id, organization_id)
);
create table lm_categories (
  id uuid primary key, tournament_id uuid not null, organization_id uuid not null references lm_organizations(id),
  name text not null, unique (tournament_id, name),
  unique (id, organization_id),
  foreign key (tournament_id, organization_id) references lm_tournaments(id, organization_id)
);
create table lm_teams (
  id uuid primary key, organization_id uuid not null references lm_organizations(id), name text not null,
  unique (organization_id, name), unique (id, organization_id)
);
create table lm_category_teams (
  organization_id uuid not null references lm_organizations(id),
  category_id uuid not null,
  team_id uuid not null,
  primary key (category_id, team_id),
  unique (category_id, team_id, organization_id),
  foreign key (category_id, organization_id) references lm_categories(id, organization_id) on delete cascade,
  foreign key (team_id, organization_id) references lm_teams(id, organization_id) on delete restrict
);
create table lm_delegate_assignments (
  user_id uuid not null, organization_id uuid not null,
  category_id uuid not null,
  team_id uuid not null,
  primary key (user_id, category_id, team_id),
  foreign key (user_id, organization_id) references lm_memberships(user_id, organization_id),
  foreign key (category_id, organization_id) references lm_categories(id, organization_id) on delete cascade,
  foreign key (team_id, organization_id) references lm_teams(id, organization_id) on delete restrict
);
create table lm_players (
  id uuid primary key, organization_id uuid not null references lm_organizations(id),
  name text not null, dni_hash text, unique (id, organization_id)
);
create table lm_registrations (
  id uuid primary key default gen_random_uuid(), player_id uuid not null references lm_players(id),
  organization_id uuid not null references lm_organizations(id),
  tournament_id uuid not null, category_id uuid not null, team_id uuid not null,
  unique (player_id, tournament_id, category_id),
  foreign key (player_id, organization_id) references lm_players(id, organization_id),
  foreign key (tournament_id, organization_id) references lm_tournaments(id, organization_id),
  foreign key (category_id, organization_id) references lm_categories(id, organization_id),
  foreign key (team_id, organization_id) references lm_teams(id, organization_id),
  foreign key (category_id, team_id, organization_id) references lm_category_teams(category_id, team_id, organization_id)
);
create table lm_document_events (
  id bigserial primary key, registration_id uuid not null references lm_registrations(id) on delete restrict,
  requirement text not null, status text not null check (status in ('pending','loaded','observed','approved','rejected')),
  evidence_ref text, actor_id uuid not null references lm_users(id), created_at timestamptz not null default now()
);
create index lm_document_events_latest on lm_document_events(registration_id, requirement, created_at desc, id desc);

-- El contexto de pruebas debe ser definido por el harness de sesión/JWT.
create or replace function lm_uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function lm_org_scope() returns setof uuid language sql stable as $$
  select organization_id from lm_memberships where user_id = lm_uid()
$$;
create or replace function lm_is_admin() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from lm_memberships where user_id = lm_uid() and role = 'platform_admin')
$$;

alter table lm_organizations enable row level security;
alter table lm_memberships enable row level security;
alter table lm_tournaments enable row level security;
alter table lm_categories enable row level security;
alter table lm_teams enable row level security;
alter table lm_category_teams enable row level security;
alter table lm_delegate_assignments enable row level security;
alter table lm_players enable row level security;
alter table lm_registrations enable row level security;
alter table lm_document_events enable row level security;

create policy lm_org_read on lm_organizations for select using (id in (select lm_org_scope()));
-- No consultar lm_org_scope() desde la propia política: eso recursaría sobre RLS.
create policy lm_membership_read on lm_memberships for select using (user_id = lm_uid() or lm_is_admin());
create policy lm_tournament_read on lm_tournaments for select using (organization_id in (select lm_org_scope()));
create policy lm_tournament_write on lm_tournaments for all using (lm_is_admin() or organization_id in (select lm_org_scope()));
create policy lm_category_scope on lm_categories for all using (exists (select 1 from lm_tournaments t where t.id = tournament_id and (lm_is_admin() or t.organization_id in (select lm_org_scope()))));
create policy lm_team_scope on lm_teams for all using (lm_is_admin() or organization_id in (select lm_org_scope()));
create policy lm_category_team_scope on lm_category_teams for all using (exists (select 1 from lm_categories c join lm_tournaments t on t.id = c.tournament_id join lm_teams tm on tm.id = team_id where c.id = category_id and (lm_is_admin() or t.organization_id in (select lm_org_scope())) and tm.organization_id = t.organization_id));
create policy lm_delegate_scope on lm_delegate_assignments for all using (organization_id in (select lm_org_scope()));
create policy lm_player_scope on lm_players for all using (lm_is_admin() or organization_id in (select lm_org_scope()));
create policy lm_registration_scope on lm_registrations for all using (exists (select 1 from lm_players p join lm_tournaments t on t.id = tournament_id join lm_categories c on c.id = category_id join lm_teams tm on tm.id = team_id where p.id = player_id and p.organization_id = t.organization_id and c.tournament_id = t.id and tm.organization_id = t.organization_id and (lm_is_admin() or t.organization_id in (select lm_org_scope()))));
create policy lm_document_read on lm_document_events for select using (exists (select 1 from lm_registrations r join lm_players p on p.id = r.player_id where r.id = registration_id and (lm_is_admin() or p.organization_id in (select lm_org_scope()))));
create policy lm_document_insert on lm_document_events for insert with check (exists (select 1 from lm_registrations r join lm_players p on p.id = r.player_id where r.id = registration_id and (lm_is_admin() or p.organization_id in (select lm_org_scope())) and actor_id = lm_uid()));
-- Permitir que el trigger de historial sea el rechazo observable, sin abrir el alcance.
create policy lm_document_mutation_scope on lm_document_events for update using (exists (select 1 from lm_registrations r join lm_players p on p.id = r.player_id where r.id = registration_id and (lm_is_admin() or p.organization_id in (select lm_org_scope()))));
create policy lm_document_delete_scope on lm_document_events for delete using (exists (select 1 from lm_registrations r join lm_players p on p.id = r.player_id where r.id = registration_id and (lm_is_admin() or p.organization_id in (select lm_org_scope()))));

-- El historial no admite UPDATE/DELETE mediante políticas. Las aplicaciones deben insertar eventos nuevos.
create or replace function lm_reject_history_mutation() returns trigger language plpgsql as $$ begin raise exception using errcode = '55000', message = 'document history is append-only'; end $$;
create trigger lm_document_events_immutable before update or delete on lm_document_events for each row execute function lm_reject_history_mutation();
