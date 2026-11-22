# APdB 2027 - Resultado del Bloque 1C

Fecha: 2026-11-22  
Base: `9a99f3b22808aec3623b19a1107474238888f712`  
Rama: `codex/apdb-2027-operational-hardening`

## Preparación de certificación

Se reutilizó `.github/workflows/rls-local.yml`, que ya crea un servicio PostgreSQL 16 descartable. Se añadió una base independiente `liga_maxi_admin` y una etapa identificable:

`Run administrative onboarding RPC integration`

La etapa ejecuta `tests/postgres-administrative-rpc.cjs` después de las matrices RLS/RPC y OCR existentes. No se creó un segundo workflow ni se conectó a Supabase staging.

## Prueba preparada

La prueba aplica en una base descartable:

1. `20261111000000_apdb_isolated_schema.sql`.
2. `20261122000000_apdb_administrative_onboarding_rpc.sql`.
3. Organizaciones, torneos, categorías, equipos, Asociación, Delegado y usuario de otra organización sintéticos.

La sesión PostgreSQL usa roles `authenticated` y `anon` y simula el claim `request.jwt.claim.sub`, que es consumido por `auth.uid()`.

## Controles que ejecutará CI

- Anónimo rechazado por falta de `EXECUTE`.
- Asociación con `can_manage_tournaments` crea el conjunto administrativo.
- Repetición devuelve los mismos identificadores y mantiene un solo torneo, categoría y cuatro equipos.
- Delegado y usuario de otra organización rechazados.
- Asociación asigna un alcance de Delegado.
- Asociación revoca ese alcance.
- Un intento sobre torneo/categoría/equipo de otra organización es rechazado.
- `SECURITY DEFINER`, `search_path`, `EXECUTE` y ausencia de ejecución anónima comprobados.
- La prueba se detiene ante errores; no usa `DROP`, `CASCADE` ni permisos adicionales para hacerla pasar.

## Verificaciones locales ejecutadas

Aprobadas:

- `node --check tests/postgres-administrative-rpc.cjs`
- `node tests/apdb-administrative-adapter-contract.cjs`
  - `APDB_ADMINISTRATIVE_ADAPTER_CONTRACT_OK`
- `node tests/apdb-administrative-onboarding.cjs`
  - `APDB_ADMIN_ONBOARDING_LOCAL_OK`
- `node tests/demo-persistence-restart.cjs`
  - `DEMO_PERSISTENCE_RESTART_OK`
- `node tests/demo-tournaments.cjs`
  - `DEMO_TOURNAMENTS_OK`
- `node tests/apdb-rls-gate-contract.cjs`
  - `APDB_RLS_GATE_CONTRACT_OK`
- `node tests/apdb-rls-fixture-contract.cjs`
  - `APDB_RLS_FIXTURE_CONTRACT_OK`
- `node tests/apdb-rls-gate-negative-contract.cjs`
  - `APDB_RLS_GATE_NEGATIVE_CONTRACT_OK`
- `git diff --check`

## Resultado real y limitación

La certificación PostgreSQL real no se ejecutó en esta computadora: `docker` y `psql` no están disponibles. Por lo tanto, no se declara aprobada la integración RPC ni la equivalencia de Auth.

La rama fue publicada en `codex/apdb-2027-operational-hardening` con el SHA de este commit. Se intentó acceder al workflow `RLS local integration`; GitHub mostró la página de la acción manual con `Sign in`, sin una sesión autenticada disponible para iniciar `workflow_dispatch`. No se modificó `main`, no se agregó un disparador temporal y no se repitió la acción por otra vía.

La simulación de `auth.uid()` mediante `current_setting` valida el comportamiento de la función y sus privilegios dentro de PostgreSQL, pero no prueba emisión, expiración, firma o transporte de JWT de Supabase Auth. Esa parte queda pendiente del runner CI y, posteriormente, de una prueba Auth/HTTP aislada si se requiere.

## Cambios que eventualmente requerirían autorización para staging

- Aplicar únicamente `supabase/migrations/20261122000000_apdb_administrative_onboarding_rpc.sql` en staging.
- Ejecutar la prueba con identidades sintéticas y datos sintéticos.
- Comparar antes/después partidos, resultados, playoffs y auditorías existentes.

No se modificó staging, producción, RLS existente ni el despliegue web.

## Conclusión

La certificación quedó integrada al CI existente y lista para ejecutarse en PostgreSQL 16 descartable. El bloque permanece **NO CERTIFICADO**: no existe URL de ejecución nueva ni evidencia PostgreSQL real de esta versión. La limitación concreta es la falta de una sesión GitHub autorizada para `workflow_dispatch`, además de la ausencia local de Docker/`psql`; no se observó una falla de implementación porque la etapa no llegó a ejecutarse.
