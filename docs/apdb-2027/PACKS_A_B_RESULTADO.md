# APdB 2027 - Packs A y B

## Estado de esta preparación

Rama de trabajo: `codex/apdb-2027-packs-ab`.

La revisión de solo lectura del staging autorizado confirmó 12 migraciones registradas, con última versión `20261123163609`. El entorno ya contiene las tablas documentales, las vistas protegidas y las RPC deportivas/documentales principales. No se aplicaron cambios.

Las cuatro migraciones candidatas no deben concatenarse ni ejecutarse sobre staging sin una comparación adicional: la tabla `apdb_player_eligibility_events` y sus RPC no aparecen instaladas, mientras que Storage ya tiene controles posteriores por organización/equipo. La migración diferencial queda bloqueada hasta validar las definiciones exactas del clon descartable.

## Pack A

**Implementado:** `tools/postgres-backup-restore.cjs` ahora compara contenido, columnas, restricciones, índices, políticas, funciones, estado RLS y privilegios efectivos de tablas. El dump, el destino y el manifiesto permanecen fuera del repositorio.

**Probado localmente:** contrato estático disponible. La restauración real requiere PostgreSQL descartable y se ejecutará en CI; no se presenta como respaldo real de staging.

**Pendiente:** generar el dump autorizado y restaurarlo en otro destino descartable. Los bytes de Storage requieren exportación separada. Los dos registros con rutas documentales sin objeto siguen siendo una incidencia de integridad no modificada.

### Validación sintética en CI

El workflow `apdb-document-rpc-static.yml` ejecuta `tools/postgres-backup-restore.cjs` sobre PostgreSQL 16 descartable con dos bases locales distintas: `apdb_synthetic_test` y `apdb_2027_restored`. La herramienta genera el dump fuera del repositorio, valida su catálogo con `pg_restore --list`, restaura también ACLs, y compara contenido completo, columnas, restricciones, índices, políticas, funciones, estado RLS y grants. El manifiesto incluye bytes, SHA-256 y `restoreVerified: true` sólo después de la comparación; luego se ejecuta nuevamente el aislamiento documental sobre la base restaurada.

La evidencia de CI debe contener `APDB_POSTGRES_BACKUP_RESTORE_OK` y `APDB_DOCUMENT_RPC_POSTGRES_ISOLATION_OK`. La ausencia de Docker y `pg_dump` en esta computadora impide ejecutar esa restauración localmente; no se presenta como prueba realizada aquí.

### Procedimiento autorizado para staging

1. Obtener del operador una cadena PostgreSQL de staging y un destino separado. Mantener credenciales fuera de comandos visibles, logs, Git y GitHub.
2. Ejecutar la herramienta con `APDB_BACKUP_SOURCE_URL`, `APDB_BACKUP_TARGET_URL` y `APDB_BACKUP_DIR` fuera del repositorio. Verificar el manifiesto y el SHA antes de aplicar cualquier cambio.
3. Tratar Auth por separado: un `pg_dump` no garantiza la restauración de configuración de proveedores, plantillas, secretos ni contraseñas administradas. Su exportación requiere procedimiento autorizado y nunca debe incluir secretos.
4. Tratar Storage por separado: PostgreSQL no contiene los bytes de los objetos. Exportar por API un inventario de rutas, tamaños y SHA-256, y restaurar objetos y permisos en un bucket descartable antes de cualquier uso.

La intervención humana imprescindible es proporcionar credenciales autorizadas, un destino de restauración separado y autorización para leer objetos/configuración de staging. Esta rama no ejecuta operaciones reales sobre staging.

## Pack B

**Implementado:** `tests/security/apdb_packs_ab_preflight.sql` realiza una comprobación de cierre fallido para impedir aplicar una diferencial cuando faltan tablas base, cuando Storage perdió su alcance o cuando las vistas documentales quedaron expuestas.

**Bloqueado:** no se creó una migración diferencial ejecutable a ciegas. Se necesita comparar cuerpos completos, dependencias y privilegios de las 12 migraciones instaladas con las cuatro candidatas en un clon descartable. No se modificó staging ni producción.

## Criterios de salida

- Implementado: guardas de respaldo, manifiesto de integridad y preflight diferencial.
- Probado y aprobado: contratos locales, sin operaciones destructivas.
- Pendiente de validación: dump/restauración real y pruebas completas Auth/HTTP/Storage.
- Bloqueado por dependencia externa: acceso autorizado para generar el respaldo real y destino descartable equivalente para resolver el drift de migraciones.
