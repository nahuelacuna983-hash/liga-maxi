-- APdB Liga Maxi - Lectura de estados documentales
-- Permite que la app lea estados de documentos ya cargados.
-- No habilita escrituras.

alter table public.team_documents enable row level security;

create policy "Leer estados documentales"
on public.team_documents
for select
using (true);

-- document_events no se expone todavia.
-- Storage no se expone todavia.

