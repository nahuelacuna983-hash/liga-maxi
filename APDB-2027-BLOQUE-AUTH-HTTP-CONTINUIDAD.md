# APdB 2027 - Continuidad de validacion Auth/HTTP

Fecha: 2026-11-22
Rama: `codex/apdb-2027-operational-hardening`
Base: `67f8b1cc0b83fc435a96595ebad15de4feb26532`

## Resultado

No se modificaron staging ni producción. La validacion Auth/HTTP real permanece pendiente porque en esta sesion no hay Supabase CLI, Docker, PostgreSQL local ni una herramienta de ciclo de vida Auth administrativa conectada. La conexion Yani permite consultas y DDL de base, pero no ofrece un endpoint seguro para crear y eliminar usuarios Auth sintéticos.

No se insertaron filas en `auth.users`, no se usaron usuarios existentes y no se aplicaron migraciones.

## Mecanismos evaluados

- Workflow `.github/workflows/apdb-supabase-isolated.yml`: dispone de Supabase local descartable en un runner Linux, crea usuarios con el `service_role` efímero del entorno local, prueba sesiones por HTTP y limpia al finalizar.
- `tests/apdb-supabase-isolated-integration.cjs` y `tests/apdb-isolated-browser-setup.cjs`: ya contienen la preparación de identidades sintéticas para el entorno descartable.
- `supabase/config.toml`: Auth y Storage están habilitados para el proyecto local `apdb-2027-isolated`.
- Equipo local: no dispone de los ejecutables `docker`, `supabase` ni `psql`, por lo que no puede reproducir ese workflow fuera de CI.

El mecanismo disponible para crear y eliminar usuarios de forma automática es, por diseño, el `service_role` efímero del Supabase local de CI. No se debe trasladar ese secreto al navegador ni usarlo contra staging.

## Preflight de staging

La consulta de solo lectura confirmó nuevamente:

- Proyecto `APdB 2027 Staging`, ref `wffvmthdmmjwspnozyrv`, estado `ACTIVE_HEALTHY`.
- Migracion administrativa registrada como `apdb_2027_administrative_onboarding_rpc_secure`.
- Las tres RPC son `SECURITY DEFINER`, propiedad de `postgres`, con `search_path` `public, auth, pg_temp`.
- `anon` no tiene `EXECUTE`; `authenticated` sí.
- Conteos existentes observados: 2 torneos, 2 categorías, 8 equipos, 7 partidos y 3 playoffs.

## Pruebas locales ejecutadas

Aprobadas:

- `APDB_ADMINISTRATIVE_RECONCILIATION_CONTRACT_OK`
- `APDB_ADMINISTRATIVE_ADAPTER_CONTRACT_OK`
- `APDB_APP_ADMINISTRATIVE_ONBOARDING_CONTRACT_OK`
- `APDB_AUTHORIZATION_CONTRACT_OK`
- `APDB_SUPABASE_ISOLATED_CONTRACT_OK`
- `APDB_ISOLATED_MIGRATION_SOURCE_CONTRACT_OK`
- `APDB_APP_ONLINE_SECURE_RESULT_CONTRACT_OK`
- `APDB_APP_ONLINE_PUBLIC_PLAYOFFS_CONTRACT_OK`
- `DEMO_TOURNAMENTS_OK`
- `DEMO_END_TO_END_OK`
- `DEMO_PERSISTENCE_RESTART_OK`
- `node --check app_online.js`
- `node --check apdb-administrative-adapter.js`
- `git diff --check`

Estas pruebas son locales/estáticas y no certifican Auth/HTTP real en staging.

## Próximo bloque recomendado

Ejecutar el workflow `APdB Supabase isolated integration` en GitHub Actions, que ya arranca un Supabase descartable, crea identidades temporales, obtiene sesiones Auth reales por HTTP y limpia el entorno al finalizar. Mantener separada esa certificación de staging: para staging sólo debe utilizarse un procedimiento Auth administrativo autorizado que pueda eliminar por UUID exclusivamente las identidades creadas por la prueba.

Estado: **NO CERTIFICADO en staging; CI local descartable preparado**.
