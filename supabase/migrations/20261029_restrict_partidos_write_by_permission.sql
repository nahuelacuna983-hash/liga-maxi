-- Propuesta para aplicar únicamente en una base/branch aislada y validar antes de producción.
-- No fue ejecutada por este PR.

drop policy if exists "partidos escritura app" on public.partidos;
drop policy if exists "partidos update app" on public.partidos;

create policy "partidos escritura autorizada"
on public.partidos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_user_permissions p
    join public.categorias c on c.id = partidos.categoria_id
    where p.user_id = (select auth.uid())
      and p.categoria_id = partidos.categoria_id
      and p.torneo_id = c.torneo_id
      and (p.can_load_results or p.can_correct_results)
      and (
        p.equipo_nombre is null
        or lower(p.equipo_nombre) = lower(partidos.local)
        or lower(p.equipo_nombre) = lower(partidos.visitante)
      )
  )
);

create policy "partidos update autorizado"
on public.partidos
for update
to authenticated
using (
  exists (
    select 1
    from public.app_user_permissions p
    join public.categorias c on c.id = partidos.categoria_id
    where p.user_id = (select auth.uid())
      and p.categoria_id = partidos.categoria_id
      and p.torneo_id = c.torneo_id
      and (p.can_load_results or p.can_correct_results)
      and (
        p.equipo_nombre is null
        or lower(p.equipo_nombre) = lower(partidos.local)
        or lower(p.equipo_nombre) = lower(partidos.visitante)
      )
  )
)
with check (
  exists (
    select 1
    from public.app_user_permissions p
    join public.categorias c on c.id = partidos.categoria_id
    where p.user_id = (select auth.uid())
      and p.categoria_id = partidos.categoria_id
      and p.torneo_id = c.torneo_id
      and (p.can_load_results or p.can_correct_results)
      and (
        p.equipo_nombre is null
        or lower(p.equipo_nombre) = lower(partidos.local)
        or lower(p.equipo_nombre) = lower(partidos.visitante)
      )
  )
);
