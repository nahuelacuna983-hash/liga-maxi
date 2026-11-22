# APdB 2027 - Reconciliacion administrativa y pruebas Auth/HTTP

Fecha: 2026-11-22
Rama: `codex/apdb-2027-operational-hardening`
Staging: `wffvmthdmmjwspnozyrv` mediante la conexion `Yani`

## Resultado ejecutivo

La reconciliacion fue preparada localmente y no se aplico en staging. El proyecto ya contiene la migracion registrada como `apdb_2027_administrative_onboarding_rpc_secure`. Las tres RPC instaladas cumplen el contrato de seguridad comprobado por consultas de solo lectura.

Las pruebas Auth/HTTP no se ejecutaron: no hay sesiones ni contrasenas sinteticas disponibles en el entorno local y no se reutilizaron identidades existentes ni se escribieron registros para fabricar un escenario. Por ello, la validacion administrativa integral permanece pendiente.

## Tabla comparativa

| RPC | Firma | Staging | Repositorio local | Evaluacion |
|---|---|---|---|---|
| Alta | `apdb_ensure_tournament_category_teams(text,text,text,jsonb)` | SECURITY DEFINER, owner `postgres`, `search_path` seguro, EXECUTE sólo `authenticated` | Misma firma y contrato; migracion original sobrescribe con `CREATE OR REPLACE` | Compatible en firma y controles observables |
| Alcance | `apdb_set_delegate_scope(uuid,uuid,uuid,uuid,boolean,boolean)` | SECURITY DEFINER, owner `postgres`, `search_path` seguro, EXECUTE sólo `authenticated` | Misma firma y controles observables | Compatible en firma y controles observables |
| Revocacion | `apdb_revoke_delegate_scope(uuid)` | Incluye validacion de rol `delegado` y alcance completo torneo/categoria/equipo | La migracion `20261122000000` no incluia esas tres validaciones | Staging es más restrictivo; no sobrescribir |

## Seguridad comprobada en staging

- Las tres funciones existen.
- Las tres son `SECURITY DEFINER` y pertenecen a `postgres`.
- Las tres fijan `search_path` a `public, auth, pg_temp`.
- `anon`: `EXECUTE = false`.
- `authenticated`: `EXECUTE = true`.
- La revocacion exige que el permiso apunte a un usuario `delegado` y tenga torneo, categoria y equipo.
- Las tablas administrativas requeridas existen y sus relaciones FK están presentes.
- El bucket documental permanece privado.
- Conteos de integridad observados sin modificación: 2 torneos, 2 categorias, 8 equipos, 7 partidos y 3 partidos de playoff.

## Migracion de reconciliacion preparada

Archivo: `supabase/migrations/20261122000001_apdb_administrative_onboarding_reconcile.sql`

Es una migracion de validacion no destructiva. Comprueba existencia, propietario, `SECURITY DEFINER`, `search_path`, `EXECUTE`, ausencia de ejecucion para `anon` y las defensas específicas de revocacion. No reemplaza funciones, no toca datos y falla ante deriva de seguridad.

No fue ejecutada por falta de autorización para desplegar la reconciliacion.

## Pruebas

Aprobadas localmente:

- `APDB_ADMINISTRATIVE_RECONCILIATION_CONTRACT_OK`
- `APDB_ADMINISTRATIVE_ADAPTER_CONTRACT_OK`
- `APDB_APP_ADMINISTRATIVE_ONBOARDING_CONTRACT_OK`
- `node --check apdb-administrative-adapter.js`
- `git diff --check`

Consulta remota de solo lectura aprobada: RPC, privilegios efectivos, owner, `search_path`, migracion registrada y conteos de integridad.

Bloqueadas:

- Auth/HTTP anonimo contra RPC.
- Asociación autenticada: alta idempotente y recuperación.
- Delegado: rechazo de alcance y revocacion.
- Aislamiento entre organizaciones.
- Concurrencia real vía HTTP.
- Verificacion desde `index_online.html` y `app_online.js`.

## Conclusión

El sistema está preparado para continuar hacia la validación administrativa integral, pero todavía no está certificado en Auth/HTTP real. La intervención mínima pendiente es disponer de sesiones sintéticas controladas para Asociación, Delegado y una organización ajena, o un ejecutor local seguro que las obtenga sin registrar secretos. No se modificaron staging, producción, datos existentes, `main`, cPanel ni DNS.
