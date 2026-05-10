# Checklist Supabase - Modulo Documentacion

## Antes de ejecutar SQL

- Confirmar que la app publica abre correctamente.
- Confirmar que Delegados puede cargar resultados.
- Exportar o respaldar estructura actual si es posible.
- Revisar `supabase-documentacion.sql` completo.
- Revisar `supabase-documentacion-rpc.sql` completo.
- No habilitar RLS en esta primera etapa.

## Orden de ejecucion sugerido

1. Ejecutar `supabase-documentacion.sql`.
2. Verificar que se crearon:
   - `document_requirements`
   - `team_documents`
   - `document_events`
   - `v_team_documents_admin`
   - trigger `trg_team_documents_updated_at`
3. Ejecutar consultas de `supabase-documentacion-consultas.sql`.
4. Confirmar que las consultas no afectan tablas deportivas.
5. Crear bucket Storage `documentos`.
6. No conectar frontend todavia.

## Pruebas luego de crear tablas

### App deportiva

- Abrir Publico.
- Cambiar categoria.
- Abrir Delegados.
- Desbloquear con clave conocida.
- Confirmar que se listan partidos.
- No cargar resultado real salvo que sea necesario.

### Supabase documental

- Consultar requisitos activos.
- Consultar vista `v_team_documents_admin`.
- Consultar resumen por estado.
- Confirmar que puede devolver vacio sin error.

## Primera prueba de escritura futura

Solo despues de validar lectura:

1. Elegir equipo de prueba.
2. Subir un archivo de prueba a Storage.
3. Ejecutar `upsert_team_document_metadata`.
4. Verificar evento `uploaded`.
5. Ejecutar `review_team_document` con `observado`.
6. Verificar evento `observed`.
7. Ejecutar `review_team_document` con `aprobado`.

## No hacer todavia

- No conectar carga real a Delegados.
- No bloquear resultados por documentacion.
- No habilitar RLS sin politicas probadas.
- No borrar archivos de Storage.
- No modificar `partidos`, `categorias`, `equipos` ni `torneos`.

## Rollback simple

Si algo falla antes de conectar frontend:

- dejar tablas documentales sin uso;
- ocultar cualquier panel real;
- no tocar app deportiva;
- revisar errores desde Supabase.

Si fuera necesario retirar estructura documental:

```sql
drop view if exists public.v_team_documents_admin;
drop table if exists public.document_events;
drop table if exists public.team_documents;
drop table if exists public.document_requirements;
```

No ejecutar rollback sin confirmar que no hay datos documentales reales cargados.

