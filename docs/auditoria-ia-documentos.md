# Auditoria automatica de documentos

## Objetivo

Que la app lea documentos cargados en Supabase Storage privado y genere un dictamen automatico:

- `validado`
- `listo_aprobar`
- `revisar`
- `observado`
- `rechazado`
- `vencido`

La aprobacion final sigue siendo administrativa. La IA no reemplaza a la Asociacion; deja el expediente listo y explica por que.

## Arquitectura

1. El delegado sube PDF/JPG/PNG al bucket privado `documentos`.
2. La app guarda metadata en `team_documents` o `player_documents`.
3. Una Supabase Edge Function lee el archivo con `SUPABASE_SERVICE_ROLE_KEY`.
4. La funcion envia el archivo a OpenAI con `OPENAI_API_KEY`.
5. El dictamen vuelve como JSON y se guarda en `document_ai_audits`.
6. La app muestra el dictamen y Asociacion aprueba/observa/rechaza.

## Archivos agregados

- `docs/ejecutar-en-supabase-auditoria-ia-documentos.sql`
- `supabase/functions/auditar-documento/index.ts`

## SQL

Ejecutar:

```text
docs/ejecutar-en-supabase-auditoria-ia-documentos.sql
```

Crea:

- `document_ai_audits`
- `v_document_ai_audits_latest`
- `v_team_documents_admin_ai`
- `v_player_documents_admin_ai`

No toca fixtures, partidos, resultados ni documentos ya cargados.

## Secretos necesarios

En Supabase Edge Functions:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
DOCUMENT_AUDIT_MODEL
DOCUMENT_AUDIT_ADMIN_SECRET
```

`DOCUMENT_AUDIT_ADMIN_SECRET` es opcional pero recomendado. Si existe, la funcion exige header `x-admin-secret`.

## Deploy sugerido

Desde Supabase CLI:

```bash
supabase functions deploy auditar-documento
supabase secrets set OPENAI_API_KEY=...
supabase secrets set DOCUMENT_AUDIT_MODEL=...
supabase secrets set DOCUMENT_AUDIT_ADMIN_SECRET=...
```

## Prueba manual

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/auditar-documento" \
  -H "Authorization: Bearer <anon-or-service-key>" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <DOCUMENT_AUDIT_ADMIN_SECRET>" \
  -d '{"scope":"player","documentId":"<player_document_id>","actor":"ADMIN"}'
```

Para documento de equipo:

```json
{"scope":"team","documentId":"<team_document_id>","actor":"ADMIN"}
```

## Reglas que revisa

- Declaracion jurada / DJDR / deslinde: firma y fecha del anio corriente.
- Certificado medico / estudio medico: aptitud fisica, fechas compatibles y vigencia de 12 meses.
- Lista de buena fe: sello o recibido APdB.
- Seguro: poliza/certificado y nomina/listado, o aceptacion provisoria APdB.
- Pase: informativo, no bloqueante salvo traspaso.

## Pendiente para integracion visual

1. Ejecutar SQL.
2. Desplegar la Edge Function.
3. Agregar boton en Asociacion para `Auditar con IA`.
4. Cambiar las consultas de la app desde:
   - `v_team_documents_admin`
   - `v_player_documents_admin`

   hacia:
   - `v_team_documents_admin_ai`
   - `v_player_documents_admin_ai`
5. Mostrar `ai_audit_status`, `ai_summary`, `ai_confidence`, `ai_valid_until`.

## Seguridad

- Nunca poner `OPENAI_API_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` en `app_online.js`.
- No hacer publico el bucket `documentos`.
- No exponer `storage_path` como link publico.
- La funcion debe ejecutarse solo desde Asociacion/Admin.
