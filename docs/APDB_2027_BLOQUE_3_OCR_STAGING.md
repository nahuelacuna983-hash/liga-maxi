# APdB 2027 - Bloque 3: auditoria OCR autenticada

## Estado

Preparado en la rama `codex/apdb-2027-operational-hardening`. La migracion `20261120000000_apdb_automatic_document_audit_rpc.sql` implementa una RPC de insercion acotada para resultados automaticos. No fue aplicada a Supabase staging.

## Autorizacion

La RPC exige una sesion Supabase Auth y una fila activa en `app_users` con `role = 'auditor_ocr'`. No reutiliza una cuenta humana ni concede permisos de Asociacion o Delegado. `anon`, usuarios comunes y delegados quedan rechazados por la funcion y por `EXECUTE`.

La funcion es `SECURITY DEFINER`, propiedad de `postgres`, con `search_path = public, auth`, y no expone DML directo sobre documentos. Valida el documento, el contexto deportivo, la version activa de criterios y los campos permitidos. `team_documents`, `player_documents` y `document_ai_audits` no reciben permisos directos para el cliente.

## Persistencia

La operacion solo inserta en `document_ai_audits`. No modifica documentos, habilitaciones, estados humanos ni historiales de revision. Reintentos con el mismo documento, `source_file_id`, `source_hash` y `criteria_version` devuelven la auditoria existente; un hash diferente genera un nuevo resultado trazable.

## Validacion local

```powershell
node tests/document-ai-rpc-contract.cjs
node tests/document-ai-adapter.cjs
npm run test:document-audit
```

Resultados comprobados: contrato RPC aprobado, adaptador aprobado y las seis pruebas OCR del Bloque 1 aprobadas. No hay Docker, Supabase CLI ni `psql` disponibles en este entorno, por lo que no se pudo ejecutar PostgreSQL local descartable.

## Bloqueo de staging

No aplicar la migracion hasta disponer de una base aislada ejecutable o una ventana expresamente autorizada. La primera prueba debe crear únicamente un usuario sintético `auditor_ocr`, un documento sintético y una version activa de criterios; luego debe comprobar insercion, rechazo de anon/delegado, idempotencia, reanalisis y ausencia de cambios en el documento. No se debe usar `service_role` desde el procesador.
