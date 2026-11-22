# APdB 2027 - Resultado del Bloque 1B

Fecha: 2026-11-22  
Base: `8646f79c34df2f1390284c7e3f6f56ac3b5d6cff`  
Rama: `codex/apdb-2027-operational-hardening`

## Integración preparada

Se preparó la integración administrativa oficial sin escribir en staging:

- `supabase/migrations/20261122000000_apdb_administrative_onboarding_rpc.sql`
- `apdb-administrative-adapter.js`
- `tests/apdb-administrative-adapter-contract.cjs`

La migración añade tres RPC preparadas para revisión aislada:

- `apdb_ensure_tournament_category_teams(text,text,text,jsonb)`
- `apdb_set_delegate_scope(uuid,uuid,uuid,uuid,boolean,boolean)`
- `apdb_revoke_delegate_scope(uuid)`

No modifica migraciones históricas ni se aplicó remotamente.

## Controles de seguridad preparados

- Identidad derivada de `auth.uid()`; no se acepta un actor enviado por el navegador.
- Asociación o administrador activo requerido.
- Alta idempotente limitada a la organización del actor.
- Asignación/revocación limitada a actores con `can_manage_users`.
- El usuario objetivo debe existir, estar activo y pertenecer a la misma organización.
- Torneo, categoría y equipo deben formar una relación válida dentro de la organización.
- `SECURITY DEFINER` con `search_path = public, auth, pg_temp`.
- `EXECUTE` revocado de `public`, `anon` y `authenticated` antes de concederlo sólo a `authenticated`.
- El adaptador no utiliza `.from()` ni tiene fallback de escritura directa.

La migración reutiliza las tablas existentes `organizaciones`, `torneos`, `categorias`, `equipos`, `app_users` y `app_user_permissions`. No crea un modelo administrativo paralelo.

## Pruebas ejecutadas

Aprobadas:

- `node --check apdb-administrative-adapter.js`
- `node tests/apdb-administrative-adapter-contract.cjs`
  - `APDB_ADMINISTRATIVE_ADAPTER_CONTRACT_OK`
- `node tests/apdb-administrative-onboarding.cjs`
  - `APDB_ADMIN_ONBOARDING_LOCAL_OK`
- `node tests/demo-persistence-restart.cjs`
  - `DEMO_PERSISTENCE_RESTART_OK`
- `node tests/demo-tournaments.cjs`
  - `DEMO_TOURNAMENTS_OK`
- `git diff --check`

Las pruebas de onboarding local comprobaron creación/recuperación, ausencia de duplicados, persistencia, aislamiento de organización y rechazos de Delegado. El contrato del adaptador comprobó que las escrituras administrativas pasan únicamente por RPC.

## Limitaciones reales

- No hay `psql` instalado en este entorno, por lo que no se ejecutó la migración contra PostgreSQL local.
- No se ejecutó Auth/RLS/RPC real; staging permaneció intacto por restricción del bloque.
- No se integró todavía una pantalla de alta en `index_online.html`; el adaptador está listo para ser invocado desde la vista Asociación una vez validado el contrato SQL.
- No se puede afirmar aún que las RPC sean compatibles con el esquema efectivo de staging hasta ejecutarlas en PostgreSQL descartable y contrastar privilegios/RLS.

## Cambios que requerirían autorización para staging

1. Aplicar la migración nueva exclusivamente en el proyecto staging.
2. Usar una identidad Asociación sintética con `can_manage_tournaments` y `can_manage_users`.
3. Crear o reutilizar sólo datos sintéticos aislados.
4. Ejecutar pruebas Auth/RLS positivas y negativas, incluyendo usuario ajeno, revocado y sin permisos.
5. Comparar antes/después partidos, resultados, playoffs y auditorías existentes.

No se requiere modificar RLS de tablas deportivas ni conceder escrituras directas para este diseño.

## Conclusión

El contrato local y el adaptador seguro están preparados y probados. El bloque todavía no está certificado para staging: falta validación SQL real y ejecución autenticada contra el entorno descartable. El siguiente paso técnico es incorporar la migración a la matriz PostgreSQL/Supabase aislada, sin aplicarla al proyecto persistente hasta que todas las pruebas pasen.
