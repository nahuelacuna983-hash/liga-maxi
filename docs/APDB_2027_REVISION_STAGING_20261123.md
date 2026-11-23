# APdB 2027 — revisión de staging (23/11/2026)

Alcance: consultas **solo lectura** sobre el proyecto independiente `wffvmthdmmjwspnozyrv` ("APdB 2027 Staging"). No se modificaron permisos, RLS, datos, Storage ni cuentas. Ninguna observación debe extrapolarse al proyecto productivo 2026.

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

## Puertas de aceptación

- Vista y RPC documentales deben rechazar lectura ajena, anon y revocado; ensayar con identidades sintéticas.
- `documentos` debe permanecer privado; verificar upload/download con URLs firmadas y controles de organización/rol.
- Circuito delegado: solo equipos asignados, altas y recuperación; Asociación: revisión/habilitación; audit log persistente.
- Aceptación del paquete oficial `index_online.html` / `app_online.js` conectado a staging, sin referencias al backend ni al torneo productivo 2026.
- Backup/restauración del staging y reversión del despliegue antes de URL institucional.

**Estado**: diagnóstico de solo lectura realizado. No constituye certificación de permisos ni autorización de producción. Los cambios de esquema deben prepararse y probarse en entorno descartable antes de cualquier aplicación al staging.
