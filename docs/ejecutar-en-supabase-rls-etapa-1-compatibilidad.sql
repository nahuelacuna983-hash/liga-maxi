-- Liga Maxi / Plataforma de Torneos
-- RLS etapa 1: compatibilidad operativa
--
-- IMPORTANTE:
-- Este SQL NO es el cierre de seguridad final.
-- Su objetivo es dejar de tener tablas criticas con RLS apagado sin romper la app actual.
-- La app todavia usa flujos legacy desde frontend con la key publica.
--
-- Antes de correr:
-- 1. Tener backup reciente de Supabase.
-- 2. Correr docs/verificar-grants-anon.sql y revisar vistas/RPC expuestas.
-- 3. Probar inmediatamente login, publico, delegado, asociacion, resultados y documentacion.

begin;

-- =========================================================
-- 1. Tablas publicas/deportivas: lectura publica
-- =========================================================

alter table if exists public.organizaciones enable row level security;
alter table if exists public.torneos enable row level security;
alter table if exists public.categorias enable row level security;
alter table if exists public.equipos enable row level security;
alter table if exists public.fechas enable row level security;
alter table if exists public.fixtures_publicos enable row level security;
alter table if exists public.partidos enable row level security;

drop policy if exists organizaciones_select_public on public.organizaciones;
create policy organizaciones_select_public
on public.organizaciones
for select
to anon, authenticated
using (true);

drop policy if exists torneos_select_public on public.torneos;
create policy torneos_select_public
on public.torneos
for select
to anon, authenticated
using (true);

drop policy if exists categorias_select_public on public.categorias;
create policy categorias_select_public
on public.categorias
for select
to anon, authenticated
using (true);

drop policy if exists equipos_select_public on public.equipos;
create policy equipos_select_public
on public.equipos
for select
to anon, authenticated
using (true);

drop policy if exists fechas_select_public on public.fechas;
create policy fechas_select_public
on public.fechas
for select
to anon, authenticated
using (true);

drop policy if exists fixtures_publicos_select_public on public.fixtures_publicos;
create policy fixtures_publicos_select_public
on public.fixtures_publicos
for select
to anon, authenticated
using (true);

drop policy if exists partidos_select_public on public.partidos;
create policy partidos_select_public
on public.partidos
for select
to anon, authenticated
using (true);

-- =========================================================
-- 2. Escritura transitoria por compatibilidad
-- =========================================================
--
-- Estas politicas mantienen funcionando los flujos actuales.
-- No son seguridad final.
-- Deben reemplazarse por RPC/Auth con roles reales.

drop policy if exists categorias_insert_legacy on public.categorias;
create policy categorias_insert_legacy
on public.categorias
for insert
to anon, authenticated
with check (true);

drop policy if exists categorias_update_legacy on public.categorias;
create policy categorias_update_legacy
on public.categorias
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists partidos_insert_legacy on public.partidos;
create policy partidos_insert_legacy
on public.partidos
for insert
to anon, authenticated
with check (true);

drop policy if exists partidos_update_legacy on public.partidos;
create policy partidos_update_legacy
on public.partidos
for update
to anon, authenticated
using (true)
with check (true);

-- =========================================================
-- 3. Tablas sensibles legacy: activar RLS sin abrir publico
-- =========================================================
--
-- No se crean politicas anon/authenticated.
-- Si algun flujo viejo dependia de acceso directo a estas tablas,
-- se debe migrar a RPC controlada o revisar caso por caso.

alter table if exists public.delegados enable row level security;
alter table if exists public.delegado_categorias enable row level security;
alter table if exists public.auditoria_resultados enable row level security;

commit;

-- Verificacion posterior sugerida:
-- Volver a correr docs/verificar-rls-antes-dominio.sql.
-- Luego probar desde la app:
-- - carga publica;
-- - carga de resultado delegado;
-- - correccion/anulacion asociacion;
-- - carga documental;
-- - aprobacion documental;
-- - playoff;
-- - programacion.
