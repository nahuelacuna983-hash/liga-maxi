# APdB 2027 — revisión de staging (23/11/2026)

Alcance: revisión inicial **solo lectura** del proyecto independiente `wffvmthdmmjwspnozyrv` ("APdB 2027 Staging"). **Actualización posterior:** se modificaron exclusivamente las políticas de Storage en este staging sintético, tras certificarlas primero en Supabase descartable. No se modificó el proyecto productivo 2026, ni resultados, cuentas o archivos.

## Actualización operativa — política de Storage aplicada

- **Migración aplicada a staging:** versión Supabase `20261123155458`, nombre `apdb_storage_team_scope_staging_20261123`.
- **Fuente versionada:** `supabase/migrations/20261123155458_apdb_storage_team_scope_staging_20261123.sql`. La misma versión se encuentra registrada en el historial de migraciones de staging.
- **Permisos de archivos:** las cuatro políticas sobre `storage.objects` (`INSERT`, `SELECT`, `UPDATE`, `DELETE`) usan `apdb_storage_team_path_allowed`, validando organización, temporada, categoría y equipo. La validación de ruta rechaza UUID de equipo mal formado. El delegado solo puede leer/cargar en el equipo autorizado, sin borrar ni sobrescribir.
- **Matriz verificada en staging con claims sintéticos (consultas SQL, sin emitir JWT):** Asociación permitida en dos equipos; Delegado permitido solo en el suyo, sin borrado; identidad sin permisos denegada en ambos; ruta inválida denegada.
- **Prueba HTTP/JWT en Supabase descartable:** SUCCESS, junto con los contratos previos, Chromium y recuperación tras reinicio. [GitHub Actions #45211625508](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45211625508).
- **Frontend:** `app_online.js` consulta el `slug` real de la organización en staging para generar rutas documentales válidas. Se comprobó que el staging utiliza `apdb-staging-sintetica`, y no el valor fijo histórico `apdb`.
- **Estado de objetos:** bucket privado `documentos` con **0 objetos** al aplicar la política. No se afirma recuperabilidad de documentos a partir de las dos filas sintéticas de `team_documents`.
- **Reversión segura:** `docs/APDB_2027_STORAGE_FAIL_CLOSED_ROLLBACK.sql` deja el acceso documental de usuarios normales bloqueado, sin restaurar la política anterior de alcance excesivo.

**Pendiente crítico:** ejecutar una subida, descarga y generación de URL firmada con identidades Auth reales y documentos ficticios sobre el **staging persistente**, además de prueba de cuenta revocada. La matriz simulada no reemplaza esos ensayos; el sitio institucional tampoco fue desplegado.

## Evidencia de inventario

- Proyecto: **ACTIVE_HEALTHY**.
- 28 tablas base en esquema `public` (las 28 con RLS activo).
- 9 políticas RLS en `public`; el analizador reporta 19 tablas sin políticas.
- 15 funciones `SECURITY DEFINER` en `public` (requieren verificación de autorización efectiva, no son automáticamente vulnerabilidades).
- 1 bucket `storage.buckets`: `documentos`, `public = false`.
- Datos sintéticos existentes (según tablas): 2 torneos, 2 categorías, 8 equipos, 7 partidos, 3 partidos de playoff, 2 documentos de equipo y 4 auditorías de IA. No se consultaron nombres ni contenidos de documentos.

## Hallazgos a atender antes de utilizar documentación real

1. **Vista `public.v_team_documents_admin`**: el linter reporta `security_definer_view` (ERROR). Tiene `security_barrier=true` pero no `security_invoker=true`. Revisar dependencias, acceso y seguridad de lectura; preferir `security_invoker` si es compatible con los contratos, comprobando denegaciones por club y rol antes de aplicarlo.
   - Referencia Supabase: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
2. **Función `public.rls_auto_enable()`**: `SECURITY DEFINER` con permiso `EXECUTE` heredado por `PUBLIC`. Es una función `event_trigger` para habilitar RLS en nuevas tablas; no se necesita exposición directa a `anon` para su función como trigger. Comprobar primero dependencias y luego restringir su ejecución.
   - Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
3. **Funciones `SECURITY DEFINER` para `authenticated`**: 15 avisos según el linter; revisar individualmente condiciones `auth.uid()`, organización, categoría, equipo, revocación, `search_path`, concesiones y pruebas negativas. No revocar indiscriminadamente las RPC necesarias a la aplicación.
   - Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
4. **19 tablas con RLS sin políticas**: determinar cuáles deben permanecer inaccesibles mediante Data API y cuáles requieren RPC seguras o políticas específicas para el circuito oficial. No añadir políticas permisivas generales.
   - Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Permisos efectivos observados (solo lectura)

- `anon` **no** tiene `SELECT` sobre `v_team_documents_admin`; `authenticated` **sí**. La alerta de la vista no demuestra por sí sola una exposición pública anónima; resta validar accesos cruzados entre usuarios autenticados.
- Tanto `anon` como `authenticated` heredan `EXECUTE` para `rls_auto_enable()`. La función es de tipo `event_trigger`; su capacidad de invocación práctica vía RPC debe verificarse antes de calificar el impacto. El permiso heredado debe revisarse y restringirse si no es requerido.

## Configuración de frontend disponible

- Se confirmó a través del acceso conectado a Supabase que el staging tiene una clave **publishable** activa, además de una clave anónima legacy activa.
- No se copiaron valores de claves al repositorio ni a informes.
- Para generar el paquete institucional se usará solo la publishable de staging inyectada desde configuración segura local o de CI; nunca la clave secreta ni un fallback productivo.
- Disponibilidad de la clave **no** equivale a aprobación de publicación; primero faltan las pruebas de permisos reales y el despliegue protegido.

## Matriz de alcance documental — comprobación de predicados

Comprobación el 23/11/2026 en staging mediante `execute_sql` de **solo lectura** y simulación de `request.jwt.claim.sub`. La prueba invoca `public.apdb_document_access_allowed` con identidades sintéticas existentes y dos equipos que tienen un documento de prueba cada uno. Se confirmó que `auth.uid()` recibió el identificador simulado en cada consulta.

| Identidad simulada | Documento de equipo asignado | Documento de otro equipo | Esperado |
|---|---|---|---|
| Asociación activa | permitida | permitida | ✅ |
| Delegado activo, con alcance a un equipo | permitida | denegada | ✅ |
| Auditor OCR, sin permisos administrativos | denegada | denegada | ✅ |

El proyecto tiene tres `app_users` sintéticos: Asociación con permiso de gestión y revisión, Delegado asignado a un equipo y Auditor OCR sin `app_user_permissions`. Se verificó además que los dos torneos staging son **borradores 2027**: uno conserva siete partidos y uno aún no tiene partidos. La aplicación debe seleccionar el primero por contenido y no asumir que hay un torneo activo.

**Límite de esta prueba:** la conexión SQL de administración no emite JWT ni adopta efectivamente el rol HTTP `authenticated`. Este resultado prueba la lógica del predicado **con una identidad simulada**, pero **no** certifica acceso real por API, revocación de sesiones ni URLs firmadas. La ejecución autenticada `tests/apdb-staging-permissions.cjs` sigue pendiente de credenciales sintéticas temporales introducidas de forma oculta.

## Puertas de aceptación

- Vista y RPC documentales deben rechazar lectura ajena, anon y revocado; ensayar con identidades sintéticas.
- `documentos` debe permanecer privado; verificar upload/download con URLs firmadas y controles de organización/rol.
- Circuito delegado: solo equipos asignados, altas y recuperación; Asociación: revisión/habilitación; audit log persistente.
- Aceptación del paquete oficial `index_online.html` / `app_online.js` conectado a staging, sin referencias al backend ni al torneo productivo 2026.
- Backup/restauración del staging y reversión del despliegue antes de URL institucional.

**Estado**: diagnóstico de solo lectura realizado. No constituye certificación de permisos ni autorización de producción. Los cambios de esquema deben prepararse y probarse en entorno descartable antes de cualquier aplicación al staging.
