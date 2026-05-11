-- APdB Liga Maxi - Paso 2 documental
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
-- Objetivo:
-- 1) permitir lectura publica de estados documentales;
-- 2) crear registros "pendiente" por equipo activo y requisito activo.
--
-- No toca partidos, resultados, fixtures, categorias, delegados ni claves.
-- Si se ejecuta dos veces, no duplica pendientes existentes.

alter table public.team_documents enable row level security;

drop policy if exists "Leer estados documentales" on public.team_documents;

create policy "Leer estados documentales"
on public.team_documents
for select
using (true);

insert into public.team_documents (
  requirement_id,
  organizacion_id,
  torneo_id,
  categoria_id,
  equipo_id,
  equipo_nombre,
  status,
  observacion
)
select
  dr.id as requirement_id,
  coalesce(dr.organizacion_id, t.organizacion_id) as organizacion_id,
  c.torneo_id,
  e.categoria_id,
  e.id as equipo_id,
  e.nombre as equipo_nombre,
  'pendiente' as status,
  'Pendiente de carga' as observacion
from public.equipos e
join public.categorias c on c.id = e.categoria_id
join public.torneos t on t.id = c.torneo_id
join public.document_requirements dr
  on dr.activo = true
  and dr.torneo_id = c.torneo_id
  and (
    dr.categoria_id is null
    or dr.categoria_id = e.categoria_id
  )
where e.activo = true
  and c.torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid
  and not exists (
    select 1
    from public.team_documents td
    where td.requirement_id = dr.id
      and td.equipo_id = e.id
  );

select
  status,
  count(*) as cantidad
from public.team_documents
group by status
order by status;

select
  c.nombre as categoria,
  count(*) as pendientes
from public.team_documents td
join public.categorias c on c.id = td.categoria_id
where td.status = 'pendiente'
group by c.nombre
order by c.nombre;
