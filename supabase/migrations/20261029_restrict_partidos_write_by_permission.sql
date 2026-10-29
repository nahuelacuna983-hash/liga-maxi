-- Propuesta reversible para una base/branch aislada. NO fue ejecutada.
-- No habilita escritura de fixtures desde clientes: esa operación debe usar un
-- flujo administrativo/RPC revisado por separado.

-- El cliente solo puede cambiar los campos de resultado, nunca equipos,
-- categoría, torneo, fecha, fase u otra metadata del partido.
revoke insert, update, delete on public.partidos from public, anon, authenticated;
grant update (puntos_local, puntos_visitante, estado_resultado, cargado_por, cargado_en)
  on public.partidos to authenticated;

drop policy if exists "partidos escritura app" on public.partidos;
drop policy if exists "partidos update app" on public.partidos;

create policy "partidos update por alcance"
on public.partidos
for update
to authenticated
using (
  exists (
    select 1
    from public.app_user_permissions p
    join public.categorias c on c.id = partidos.categoria_id
    left join public.equipos e_local
      on e_local.categoria_id = partidos.categoria_id
     and lower(e_local.nombre) = lower(partidos.local)
    left join public.equipos e_visitante
      on e_visitante.categoria_id = partidos.categoria_id
     and lower(e_visitante.nombre) = lower(partidos.visitante)
    where p.user_id = (select auth.uid())
      and p.categoria_id = partidos.categoria_id
      and p.torneo_id = c.torneo_id
      and (
        (p.can_correct_results and p.equipo_id is null)
        or (p.can_load_results and p.equipo_id in (e_local.id, e_visitante.id))
        or (p.can_correct_results and p.equipo_id in (e_local.id, e_visitante.id))
      )
  )
)
with check (
  exists (
    select 1
    from public.app_user_permissions p
    join public.categorias c on c.id = partidos.categoria_id
    left join public.equipos e_local
      on e_local.categoria_id = partidos.categoria_id
     and lower(e_local.nombre) = lower(partidos.local)
    left join public.equipos e_visitante
      on e_visitante.categoria_id = partidos.categoria_id
     and lower(e_visitante.nombre) = lower(partidos.visitante)
    where p.user_id = (select auth.uid())
      and p.categoria_id = partidos.categoria_id
      and p.torneo_id = c.torneo_id
      and (
        (p.can_correct_results and p.equipo_id is null)
        or (p.can_load_results and p.equipo_id in (e_local.id, e_visitante.id))
        or (p.can_correct_results and p.equipo_id in (e_local.id, e_visitante.id))
      )
  )
);

-- Un usuario no puede crear, editar ni eliminar su propia autorización.
revoke insert, update, delete on public.app_user_permissions from public, anon, authenticated;
grant select on public.app_user_permissions to authenticated;
drop policy if exists "app permissions own read" on public.app_user_permissions;
create policy "app permissions own read"
on public.app_user_permissions
for select
to authenticated
using (user_id = (select auth.uid()));

-- Las tablas de delegados son administradas por el backend/proceso de
-- administración, no por el navegador del delegado.
revoke insert, update, delete on public.delegados, public.delegado_categorias, public.equipos
  from public, anon, authenticated;
