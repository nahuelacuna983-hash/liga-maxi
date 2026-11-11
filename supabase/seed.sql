-- Synthetic sports seed for the isolated migration only.
-- Auth identities are intentionally not created here. Use isolated Supabase Auth
-- and then bind the returned UUIDs to app_users/app_user_permissions.
insert into public.organizaciones (id, nombre, slug)
values
  ('10000000-0000-0000-0000-000000000001', 'APdB Test A', 'apdb-test-a'),
  ('10000000-0000-0000-0000-000000000002', 'APdB Test B', 'apdb-test-b');

insert into public.torneos (id, organizacion_id, nombre, temporada, estado)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Torneo sintético A', '2027-test', 'borrador'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Torneo sintético B', '2027-test', 'borrador');

insert into public.categorias (id, torneo_id, nombre, estado)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Categoría sintética A', 'borrador'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Categoría sintética B', 'borrador');

insert into public.equipos (id, categoria_id, nombre, orden_inicial)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Equipo sintético A', 1),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Equipo sintético B', 1);
