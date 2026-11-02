# Mision XXXL 01 - Resultado

## Estado

Rama: `codex/demo-2027-visual`

SHA final: `17365c0e494d21797913cbaec9ea0a62b42e11f7`

No se modificaron `main`, workflows protegidos, Supabase, PR #2 ni datos 2026.

## Commits por bloque

- `b98e314`: endurecimiento de pertenencia organizacional, firmas manipuladas y prueba de concurrencia/revocacion.
- `d3c7e90`: prueba Chromium con login de desarrollo, token Bearer y logout.
- `17365c0`: prueba de recuperacion tras detener y reiniciar el proceso HTTP.

## Implementado

- La verificacion de firmas HMAC valida longitud antes de `timingSafeEqual` y rechaza tokens malformados.
- La lectura privada de competencia exige acceso a la categoria cuando hay autenticacion.
- La creacion de torneos autenticada comprueba membresia efectiva de la organizacion.
- Revocacion de membresias y asignaciones comprueba pertenencia del organizador.
- Las asignaciones requieren que el delegado objetivo tenga membresia vigente y rol `delegate` en la organizacion de la categoria.
- Se agrego una prueba de orden transaccional entre resultado y revocacion (`tests/postgres-concurrency-revocation.cjs`).
- Se agrego una prueba de reinicio fisico del proceso (`tests/postgres-process-recovery.cjs`).
- Se agrego una prueba Chromium autenticada (`tests/postgres-auth-browser.spec.cjs`).
- Se mantuvieron las regresiones Top 4, Top 6 y Top 8 existentes.

## Pruebas ejecutadas

Superadas localmente:

- 24 pruebas sintéticas Node.
- `AUTH_CONTRACT_OK`.
- `AUTH_SERVER_CONTRACT_OK`, incluido token malformado.
- `POSTGRES_SERVER_CONTRACT_OK`.
- `DEMO_PLAYOFF_FORMATS_OK`.
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

## CI pendiente

Para validar los nuevos bloques se necesita ejecutar PostgreSQL 16 temporal, con el esquema aplicado y el backend levantado con `LM_REQUIRE_AUTH=1`. El workflow existente valida el adaptador, HTTP, aislamiento y campeonatos, pero todavía no incorpora automáticamente los scripts nuevos. No se modifico `main` ni se agregaron pasos al workflow protegido.

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
