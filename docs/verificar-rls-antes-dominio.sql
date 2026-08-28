-- Verificacion de seguridad antes de mover la app a dominio propio.
-- Solo lectura: no modifica tablas, politicas ni datos.

select
  n.nspname as schema,
  c.relname as tabla,
  case
    when c.relrowsecurity then 'RLS activo'
    else 'RLS APAGADO - revisar antes de publicar'
  end as estado_rls,
  case
    when c.relforcerowsecurity then 'Forzado'
    else 'No forzado'
  end as rls_forzado,
  count(p.polname) as politicas,
  case
    when not c.relrowsecurity then 'CRITICO'
    when count(p.polname) = 0 then 'REVISAR: sin politicas'
    else 'OK'
  end as control
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
group by n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
order by
  case
    when not c.relrowsecurity then 0
    when count(p.polname) = 0 then 1
    else 2
  end,
  c.relname;

-- Lectura rapida:
-- 1. Si aparece "CRITICO", esa tabla tiene RLS apagado.
-- 2. Si aparece "REVISAR: sin politicas", RLS esta activo pero no hay reglas definidas.
-- 3. Para publicar con la key visible en frontend, no deberia quedar ninguna tabla sensible con RLS apagado.
