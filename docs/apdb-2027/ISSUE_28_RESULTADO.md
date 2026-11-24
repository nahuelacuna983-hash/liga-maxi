# APdB 2027 — Resultado issue #28

## Estado

**GO para el procedimiento sintético descartable.**

**NO-GO para restaurar todavía el dump real de staging.** El dump real no se incorporó al repositorio ni a GitHub Actions.

## Implementación

- `tools/apdb-supabase-restore-local.ps1`: ejecutor Windows de una corrida, con modos `preflight` y `restore`.
- Rechaza destinos remotos, nombres de producción/staging y bases no vacías.
- Requiere PostgreSQL 17, inspecciona `supabase_vault`, `auth` y `storage`, valida el catálogo con `pg_restore --list` y genera manifiesto SHA-256 fuera del repositorio.
- Usa `PGPASSFILE`/`PGPASSWORD` o entrada interactiva oculta; no imprime contraseñas ni tokens.
- `tests/security/apdb_pg17_restore_fixture.sql` y `apdb_pg17_restore_verify.sql` prueban datos, estructura, RLS, política, función, esquemas administrados y vault.

## Evidencia CI

[Ejecución PG17 Supabase descartable](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45493977007), SHA `b34177d848948669c4c01c114706706b27da430e`:

- `APDB_SUPABASE_PG17_ENV_READY_SYNTHETIC_ONLY`
- `APDB_SUPABASE_PG17_RESTORE_OK`
- `APDB_SUPABASE_PG17_ACL_LIMITATION_NO_ACL`
- Dump sintético: `ce582c2813225b9a0b088c4789dee5fea33fbb42ace453715829eb5fd028f90f`
- El ensayo diferencial aislado y los guardrails del mismo frente también se ejecutaron sobre servicios descartables, sin staging hospedado.

La prueba excluye únicamente `vault.secrets` y usa `--no-acl`: la extensión `supabase_vault` se conserva y se verifica, pero los secretos administrados y ACLs no se presentan como restaurados. Esto es una limitación deliberada y visible, no una aprobación silenciosa.

## Pasos pendientes para el respaldo real

1. Ejecutar el script Windows con la credencial PostgreSQL autorizada y un destino local/hosted descartable compatible PG17 + vault.
2. Mantener el dump, catálogo y manifiesto fuera de GitHub y cifrados.
3. Exportar por separado la configuración/Auth administrada y los objetos Storage con inventario y SHA-256.
4. Restaurar y verificar el dump real antes de aplicar cualquier diferencial a staging.

No se modificaron Supabase staging, producción 2026, `main`, cPanel ni DNS.
