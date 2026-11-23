# Migraciones Supabase APdB 2027

Este directorio contiene el esquema y las políticas **solo para APdB 2027** en el entorno aislado/desarrollo. Nunca se debe usar `supabase db reset` o estas migraciones contra Liga Maxi 2026 productivo.

## Storage privado por equipo

- `20261123155458_apdb_storage_team_scope_staging_20261123.sql`: política de archivos por organización, temporada, categoría y equipo, con denegación de accesos cruzados y de borrados por delegado.
- Registrada en `APdB 2027 Staging` el 23/11/2026 con versión `20261123155458`. El número coincide con el historial del proyecto de staging; **no** volver a aplicarla manualmente si ya consta en `supabase_migrations.schema_migrations`.
- En Supabase local descartable, `tests/apdb-isolated-storage-team-scope.cjs` usa sesiones Auth reales y verifica permisos sobre Storage HTTP, incluyendo revocación con JWT preexistente.
- El SQL de prueba previo está también en `tests/fixtures/apdb-storage-team-scoped-candidate.sql`; no se debe desplegar como migración adicional.
- Reversión de emergencia **deny-all**: `docs/APDB_2027_STORAGE_FAIL_CLOSED_ROLLBACK.sql`. Su ejecución dejaría los documentos temporalmente inaccesibles para usuarios normales, sin exponer archivos a otros clubes.

## Regla de despliegue

1. Comprobar rama y proyecto exactos antes de aplicar cambios. No crear ni modificar datos de producción 2026.
2. Comprobar historial de migraciones y que no haya versiones duplicadas o divergentes.
3. Validar scripts, contratos, RLS, Auth y Storage en Supabase descartable.
4. Verificar matriz de usuarios sintéticos en staging y el circuito de navegador con un archivo real de prueba.
5. Confirmar backup, restauración y reversión institucional antes de publicar en dominio propio.

La política aplicada al staging está **validada a nivel de predicados con identidades simuladas**; todavía falta ejecutar subida/descarga y URLs firmadas con JWT reales contra ese staging persistente. No declarar certificación operativa integral antes de esa comprobación.
