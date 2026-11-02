# Mision XXXL 01 - Resultado

## Estado

Rama: `codex/demo-2027-visual`

SHA final: `8432fc9edc001241d303637a42275bb08817cfb5`

No se modificaron `main`, workflows protegidos, Supabase, PR #2 ni datos 2026.

## Commits por bloque

- `b98e314`: endurecimiento de pertenencia organizacional, firmas manipuladas y prueba de concurrencia/revocacion.
- `d3c7e90`: prueba Chromium con login de desarrollo, token Bearer y logout.
- `17365c0`: prueba de recuperacion tras detener y reiniciar el proceso HTTP.
- `05f114f`: aserciones deterministas para carrera de revocacion y resultado.
- `1768d5c`: recuperación autenticada con IDs reconocidos por el servidor, timeouts y limpieza garantizada.
- `afc6d8b`: alineación final del UUID/rol/membresía de `dev-organizer` y corrección del `organizationId` del torneo.
- `fd79764`: verificación HMAC del token de recuperación indexada por el UUID de `sub`.
- `8432fc9`: contrato compartido de autenticación: login por alias y verificación por UUID.

## Implementado

- La verificacion de firmas HMAC valida longitud antes de `timingSafeEqual` y rechaza tokens malformados.
- La lectura privada de competencia exige acceso a la categoria cuando hay autenticacion.
- La creacion de torneos autenticada comprueba membresia efectiva de la organizacion.
- Revocacion de membresias y asignaciones comprueba pertenencia del organizador.
- Las asignaciones requieren que el delegado objetivo tenga membresia vigente y rol `delegate` en la organizacion de la categoria.
- Se agrego una prueba con conexiones independientes que usa `saveDelegateResult()` y `revokeMembership()`; cubre carrera concurrente y ambos ordenes efectivos (`tests/postgres-concurrency-revocation.cjs`).
- Se agrego una prueba de reinicio fisico del proceso con autenticacion, campeonato persistido, playoff, campeon e historial (`tests/postgres-process-recovery.cjs`).
- Se agrego una prueba Chromium autenticada que siembra usuarios/membresias UUID, valida Bearer, logout, anonimo y delegado sin permisos (`tests/postgres-auth-browser.spec.cjs`).
- Se mantuvieron las regresiones Top 4, Top 6 y Top 8 existentes.

## Pruebas ejecutadas

Superadas localmente:

- 24 pruebas sintéticas Node.
- `AUTH_CONTRACT_OK`.
- `AUTH_SERVER_CONTRACT_OK`, incluido token malformado.
- `POSTGRES_SERVER_CONTRACT_OK`.
- `DEMO_PLAYOFF_FORMATS_OK`.
- Sintaxis de los tres scripts de XXXL y `AUTH_SERVER_CONTRACT_OK` con token malformado.
- Sintaxis JavaScript de los módulos y pruebas nuevas.
- `git diff --check`.

No ejecutadas localmente por falta de PostgreSQL en `127.0.0.1:5432`:

- Integración del adaptador PostgreSQL.
- Integración HTTP PostgreSQL.
- Aislamiento multi-organizador real.
- Concurrencia y revocaciones reales.
- Recuperación tras reinicio con base persistente.
- Chromium autenticado contra PostgreSQL.
- Top 4, Top 6 y Top 8 contra PostgreSQL.

La ejecución directa de las pruebas PostgreSQL localmente devuelve `ECONNREFUSED`; no se informa ninguna como validada.

La prueba de recuperación ahora usa `/api/auth/dev-login` con `dev-organizer`, comprueba que la organización enviada por el cliente sea reemplazada por la de la sesión, compara partidos, historial, playoff y campeón antes/después del reinicio y garantiza el cierre de ambos procesos y del pool mediante `finally`.

La corrección adicional verifica antes del login que PostgreSQL contenga el UUID `00000000-0000-4000-8000-000000000201` con rol `organizer` y membresía en `00000000-0000-4000-8000-000000000101`; también valida localmente las claims emitidas y envía el mismo `organizationId` coherente al crear el torneo.

El contrato HTTP verifica ahora los tres roles sintéticos, usuario desconocido, token manipulado y resolución de `sub` UUID usando la misma instancia de autenticación que el servidor.

## Propuesta de CI (no aplicada)

Para validar los nuevos bloques se necesita ejecutar PostgreSQL 16 temporal, con el esquema aplicado y el backend levantado con `LM_REQUIRE_AUTH=1`. El workflow existente valida el adaptador, HTTP, aislamiento y campeonatos, pero todavía no incorpora automáticamente los scripts nuevos. No se modifico `main` ni se agregaron pasos al workflow protegido.

Pasos mínimos a agregar al workflow, previa autorización sobre `main`:

```yaml
- name: PostgreSQL concurrency and revocation
  run: node tests/postgres-concurrency-revocation.cjs
  env:
    DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/liga_maxi_security
- name: PostgreSQL process recovery
  run: node tests/postgres-process-recovery.cjs
  env:
    DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/liga_maxi_security
- name: Authenticated Chromium recovery and authorization
  run: npx playwright test tests/postgres-auth-browser.spec.cjs
  env:
    DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/liga_maxi_security
    LM_REQUIRE_AUTH: "1"
    LM_DEMO_AUTH_SECRET: ci-ephemeral-development-secret
    POSTGRES_AUTH_UI_BASE_URL: http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres
```

El backend debe iniciarse con `LM_REQUIRE_AUTH=1`, `LM_DEMO_AUTH_SECRET` y la misma `DATABASE_URL`; la base de seguridad debe ser nueva o limpiarse antes de la batería.

Variables mínimas para una futura ejecución aislada:

```text
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/<base-temporal>
LM_REQUIRE_AUTH=1
LM_DEMO_AUTH_SECRET=<secreto efimero de CI de al menos 16 caracteres>
POSTGRES_AUTH_UI_BASE_URL=http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres
```

## Riesgos pendientes

- El login de desarrollo sigue siendo sintético y no es autenticación de producción.
- La prueba Chromium autenticada requiere preparar usuarios y membresías sintéticas en la base antes de iniciar el backend.
- La concurrencia y la recuperación necesitan ejecución efectiva sobre PostgreSQL 16.
- La batería Top 4/6/8 sólo queda validada para esta misión cuando se repita Chromium con PostgreSQL real.
