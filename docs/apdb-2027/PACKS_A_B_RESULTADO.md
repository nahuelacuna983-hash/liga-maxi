# APdB 2027 - Packs A y B

## Estado de esta preparación

Rama de trabajo: `codex/apdb-2027-packs-ab`.

La revisión de solo lectura del staging autorizado confirmó 12 migraciones registradas, con última versión `20261123163609`. El entorno ya contiene las tablas documentales, las vistas protegidas y las RPC deportivas/documentales principales. No se aplicaron cambios.

Las cuatro migraciones candidatas no deben concatenarse ni ejecutarse sobre staging sin una comparación adicional: la tabla `apdb_player_eligibility_events` y sus RPC no aparecen instaladas, mientras que Storage ya tiene controles posteriores por organización/equipo. La migración diferencial queda bloqueada hasta validar las definiciones exactas del clon descartable.

## Pack A

**Implementado:** `tools/postgres-backup-restore.cjs` ahora compara contenido, columnas, restricciones, índices, políticas, funciones, estado RLS y privilegios efectivos de tablas. El dump, el destino y el manifiesto permanecen fuera del repositorio.

**Probado localmente:** contrato estático disponible. La restauración real requiere PostgreSQL descartable y se ejecutará en CI; no se presenta como respaldo real de staging.

**Pendiente:** generar el dump autorizado y restaurarlo en otro destino descartable. Los bytes de Storage requieren exportación separada. Los dos registros con rutas documentales sin objeto siguen siendo una incidencia de integridad no modificada.

## Pack B

**Implementado:** `tests/security/apdb_packs_ab_preflight.sql` realiza una comprobación de cierre fallido para impedir aplicar una diferencial cuando faltan tablas base, cuando Storage perdió su alcance o cuando las vistas documentales quedaron expuestas.

**Bloqueado:** no se creó una migración diferencial ejecutable a ciegas. Se necesita comparar cuerpos completos, dependencias y privilegios de las 12 migraciones instaladas con las cuatro candidatas en un clon descartable. No se modificó staging ni producción.

## Criterios de salida

- Implementado: guardas de respaldo, manifiesto de integridad y preflight diferencial.
- Probado y aprobado: contratos locales, sin operaciones destructivas.
- Pendiente de validación: dump/restauración real y pruebas completas Auth/HTTP/Storage.
- Bloqueado por dependencia externa: acceso autorizado para generar el respaldo real y destino descartable equivalente para resolver el drift de migraciones.
