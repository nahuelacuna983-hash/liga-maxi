-- Auditoria de cambios de resultados
-- No borra nada. Crea una tabla de historial y un trigger sobre public.partidos.
--
-- Guarda cada cambio futuro de resultado con:
-- - partido, categoria y equipos
-- - tanteador/estado anterior
-- - tanteador/estado nuevo
-- - actor aproximado segun cargado_por
-- - fecha del cambio

begin;

create table if not exists public.result_change_logs (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id) on delete cascade,
  categoria_id uuid,
  torneo_id uuid,
  categoria_nombre text,
  fase text,
  jornada integer,
  fecha date,
  local text,
  visitante text,
  puntos_local_anterior integer,
  puntos_visitante_anterior integer,
  estado_resultado_anterior text,
  cargado_por_anterior text,
  cargado_en_anterior timestamptz,
  puntos_local_nuevo integer,
  puntos_visitante_nuevo integer,
  estado_resultado_nuevo text,
  cargado_por_nuevo text,
  cargado_en_nuevo timestamptz,
  accion text not null,
  actor text,
  origen text not null default 'trigger_partidos',
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_result_change_logs_partido
  on public.result_change_logs(partido_id, created_at desc);

create index if not exists idx_result_change_logs_categoria
  on public.result_change_logs(categoria_id, created_at desc);

create index if not exists idx_result_change_logs_torneo
  on public.result_change_logs(torneo_id, created_at desc);

alter table public.result_change_logs enable row level security;

drop policy if exists result_change_logs_select_compat_app on public.result_change_logs;
create policy result_change_logs_select_compat_app
on public.result_change_logs
for select
to anon, authenticated
using (true);

create or replace function public.audit_partidos_result_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_categoria_nombre text;
  v_torneo_id uuid;
  v_accion text;
begin
  if tg_op = 'UPDATE' then
    if old.puntos_local is not distinct from new.puntos_local
      and old.puntos_visitante is not distinct from new.puntos_visitante
      and old.estado_resultado is not distinct from new.estado_resultado
      and old.cargado_por is not distinct from new.cargado_por
      and old.cargado_en is not distinct from new.cargado_en
    then
      return new;
    end if;

    if coalesce(new.estado_resultado, '') = 'pendiente'
      and (new.puntos_local is null and new.puntos_visitante is null)
    then
      v_accion := 'resultado_anulado';
    elsif coalesce(new.estado_resultado, '') in ('resolucion_local', 'resolucion_visitante') then
      v_accion := 'resolucion_administrativa';
    elsif old.puntos_local is null and old.puntos_visitante is null then
      v_accion := 'resultado_cargado';
    else
      v_accion := 'resultado_modificado';
    end if;
  elsif tg_op = 'INSERT' then
    if new.puntos_local is null
      and new.puntos_visitante is null
      and coalesce(new.estado_resultado, 'pendiente') = 'pendiente'
    then
      return new;
    end if;
    v_accion := 'resultado_insertado';
  else
    return old;
  end if;

  select c.nombre, c.torneo_id
    into v_categoria_nombre, v_torneo_id
  from public.categorias c
  where c.id = new.categoria_id;

  insert into public.result_change_logs (
    partido_id,
    categoria_id,
    torneo_id,
    categoria_nombre,
    fase,
    jornada,
    fecha,
    local,
    visitante,
    puntos_local_anterior,
    puntos_visitante_anterior,
    estado_resultado_anterior,
    cargado_por_anterior,
    cargado_en_anterior,
    puntos_local_nuevo,
    puntos_visitante_nuevo,
    estado_resultado_nuevo,
    cargado_por_nuevo,
    cargado_en_nuevo,
    accion,
    actor,
    detalle
  )
  values (
    new.id,
    new.categoria_id,
    v_torneo_id,
    v_categoria_nombre,
    new.fase,
    new.jornada,
    new.fecha,
    new.local,
    new.visitante,
    case when tg_op = 'INSERT' then null else old.puntos_local end,
    case when tg_op = 'INSERT' then null else old.puntos_visitante end,
    case when tg_op = 'INSERT' then null else old.estado_resultado end,
    case when tg_op = 'INSERT' then null else old.cargado_por end,
    case when tg_op = 'INSERT' then null else old.cargado_en end,
    new.puntos_local,
    new.puntos_visitante,
    new.estado_resultado,
    new.cargado_por,
    new.cargado_en,
    v_accion,
    coalesce(new.cargado_por, case when tg_op = 'INSERT' then null else old.cargado_por end, 'Sin identificar'),
    jsonb_build_object(
      'operacion', tg_op,
      'registrado_por', 'audit_partidos_result_changes',
      'registrado_en', now()
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_audit_partidos_result_changes on public.partidos;
create trigger trg_audit_partidos_result_changes
after insert or update on public.partidos
for each row
execute function public.audit_partidos_result_changes();

create or replace view public.v_result_change_logs_admin as
select
  rcl.id,
  rcl.created_at,
  rcl.partido_id,
  rcl.torneo_id,
  t.nombre as torneo_nombre,
  t.temporada,
  rcl.categoria_id,
  rcl.categoria_nombre,
  rcl.fase,
  rcl.jornada,
  rcl.fecha,
  rcl.local,
  rcl.visitante,
  rcl.puntos_local_anterior,
  rcl.puntos_visitante_anterior,
  rcl.estado_resultado_anterior,
  rcl.cargado_por_anterior,
  rcl.cargado_en_anterior,
  rcl.puntos_local_nuevo,
  rcl.puntos_visitante_nuevo,
  rcl.estado_resultado_nuevo,
  rcl.cargado_por_nuevo,
  rcl.cargado_en_nuevo,
  rcl.accion,
  rcl.actor,
  rcl.origen,
  rcl.detalle
from public.result_change_logs rcl
left join public.torneos t on t.id = rcl.torneo_id
order by rcl.created_at desc;

grant select on public.result_change_logs to anon, authenticated;
grant select on public.v_result_change_logs_admin to anon, authenticated;

select
  'OK_AUDITORIA_CAMBIOS_RESULTADOS' as control,
  count(*) as cambios_registrados_hasta_ahora
from public.result_change_logs;

commit;
