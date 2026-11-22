# APdB 2027 - Resultado del Bloque 1

Fecha: 2026-11-22  
Rama: `codex/apdb-2027-operational-hardening`

## Resultado

Se completó la implementación local del contrato de alta administrativa persistente para un escenario sintético. La capa existente de `PersistentSyntheticProvider` fue reutilizada y se añadieron operaciones idempotentes para crear o recuperar torneo, categoría y equipos.

No se escribieron datos en Supabase staging ni en producción.

## Cambios implementados

### `demo_2027_provider.js`

- `ensureTournament(actorId, input)`: recupera por organización, nombre y temporada; crea sólo si no existe.
- `ensureCategory(actorId, tournamentId, input)`: recupera por torneo y nombre; crea sólo si no existe.
- `ensureTeam(actorId, categoryId, name)`: recupera por nombre; crea sólo si no existe.
- Las tres operaciones conservan las comprobaciones de rol y organización existentes.
- Se mantiene separada la asignación de permisos mediante `setPermission` y su auditoría sintética.

### `tests/apdb-administrative-onboarding.cjs`

Escenario sintético repetible con:

- Asociación `asoc-demo`.
- Torneo APdB 2027 sintético.
- Categoría Femenino Sintético.
- Cuatro equipos ficticios.
- Delegado `delegado-a` limitado a un equipo y categoría.
- Persistencia en un repositorio JSON temporal fuera del repositorio.

## Pruebas efectivamente ejecutadas

Todas aprobaron:

- `node tests/apdb-administrative-onboarding.cjs`
  - `APDB_ADMIN_ONBOARDING_LOCAL_OK`
- `node tests/demo-persistence-restart.cjs`
  - `DEMO_PERSISTENCE_RESTART_OK`
- `node tests/demo-tournaments.cjs`
  - `DEMO_TOURNAMENTS_OK`
- `node --check demo_2027_provider.js`
- `node --check tests/apdb-administrative-onboarding.cjs`
- `git diff --check`

## Evidencia cubierta

- Asociación puede crear/recuperar el torneo sintético.
- Asociación puede crear/recuperar una categoría perteneciente al torneo.
- Se crean exactamente cuatro equipos.
- Repetir el procedimiento conserva los mismos identificadores y no duplica torneo, categoría ni equipos.
- El estado se guarda en un archivo temporal y se recupera desde una nueva instancia del proveedor.
- El torneo, categoría, equipos y permisos quedan disponibles después de recuperar el snapshot.
- Delegado no puede crear torneo, categoría o equipo.
- Delegado no puede asignar permisos a otro usuario.
- Las operaciones rechazadas se comprueban sin mutar el estado sintético.

## Limitaciones

Este bloque demuestra el contrato local y la recuperación de un repositorio sintético. No equivale todavía a certificación de Supabase Auth/RLS/RPC.

Para cerrar el bloque en staging falta ejecutar, con usuarios sintéticos reales:

1. Creación o selección del escenario mediante el mecanismo administrativo disponible en staging.
2. Asignación real de Asociación y Delegado.
3. Prueba negativa de Delegado ajeno, revocado y usuario autenticado sin permisos.
4. Recuperación tras logout, recarga y nuevo login contra Supabase.
5. Confirmación de que no se modifican partidos, resultados, playoffs ni auditorías existentes.

La interfaz principal todavía no expone un alta administrativa completa de torneo/categoría/equipos; el código preparado en este bloque pertenece al proveedor y contrato local, no habilita por sí mismo escrituras remotas.

## Próximo paso

Adaptar este contrato a las RPC administrativas reales disponibles en staging, o documentar las funciones remotas faltantes antes de crear datos. La ejecución debe conservar la misma semántica idempotente y el mismo snapshot de seguridad.
