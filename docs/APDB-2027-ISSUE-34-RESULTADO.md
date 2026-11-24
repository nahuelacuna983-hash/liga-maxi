# APdB 2027 - Issue #34

## Alcance ejecutado

Se parte del candidato integrado de PR #33 y se trabaja exclusivamente sobre recuperación, comparación de datos y Auth/Storage. No se modifican staging, producción, cPanel, DNS ni `main`; el dump auténtico permanece fuera del repositorio.

## Implementación

- `tools/apdb-recovery-run.ps1`: flujo Windows de un comando, solo localhost, con `-ApproveRestore` obligatorio. Ejecuta preflight, restore existente y un reporte offline sin credenciales.
- `tools/apdb-compare-snapshots.cjs`: compara snapshots sanitizados de tablas, relaciones, índices, restricciones, RLS/políticas, funciones, extensiones, Auth y Storage; decide GO/NO-GO por diferencias reales.
- `tests/security/apdb_auth_storage_inventory_readonly.sql`: inventario separado y de solo lectura para Auth, roles efectivos, Storage, políticas y RLS.

## Evidencia local

- Comparación idéntica: GO.
- Fixture alterado: NO-GO detectado por diferencia en `tables`.
- El restaurador mantiene sus guardas contra destinos remotos, bases no descartables, bases no vacías, clientes distintos de PostgreSQL 17 y archivos inválidos.

## Estado de puertas

| Puerta | Estado |
|---|---|
| Herramienta Windows segura y aprobación explícita | GO local |
| Restore sintético PG17 en CI | GO heredado de PR #33; se debe repetir en esta rama |
| Comparación estructural y de contenido sanitizado | GO local |
| Auth/Storage real | NO-GO: requiere conexión autorizada y exportación separada |
| Restore auténtico | NO-GO: no se posee ni se usa el dump en CI |

La única intervención humana necesaria para el ensayo auténtico es proporcionar localmente el dump fuera del repositorio y las credenciales PostgreSQL mediante el mecanismo seguro del operador; el comando rechaza cualquier destino remoto. Luego deben generarse snapshots sanitizados de origen y destino para emitir GO/NO-GO.
