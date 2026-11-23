# APdB 2027 — PACK MAESTRO DE AVANCES Y CIERRE
Fecha de referencia: 2026-11-23 · Aplicación oficial Liga Maxi/APdB · Proyecto staging `wffvmthdmmjwspnozyrv`

> **Estado**: validación técnica integrada aprobada en descartable; staging permanente y entrega institucional NO-GO. No se reutilizan resultados de pruebas aisladas como si certificaran producción.

## Principio de trabajo
No rehacer la plataforma ya desarrollada. Un *pack* incluye: alcance acotado, artefactos concretos, evidencia reproducible, resultado GO/NO-GO y siguientes dependencias. Solo se marca **CERRADO** si sus criterios de salida son verdaderos, con fecha y link a la prueba. No se cierran issues por documentación solamente.

### Base verificada y reusable
- PR #19: `codex/apdb-2027-full-release-verification` integra desarrollo deportivo, jugadores, documentos y habilitaciones, con constructor institucional y RPC documentales seguras.
- CI deportivo/documental/Auth/Storage/Chromium/persistencia: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740050 (3/3 PASS).
- CI seguridad RPC/aislamiento PostgreSQL 16/restauración sintética: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740020 (3/3 PASS).
- CI constructor institucional: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740142 (PASS).
- Staging read-only: 12 migraciones, PostgreSQL 17, plan Free, 2 torneos, 2 categorías, 8 equipos, 7 partidos, 3 usuarios Auth; 0 jugadores, 2 documentos institucionales, 0 objetos Storage. Dos registros institucionales con `storage_path` sin objeto correspondiente (origen por determinar).
- Staging carece de la tabla y las RPC finales de habilitación/revisión/lectura; la alerta `security_definer_view` sigue presente allí. No se modificó producción ni staging permanente.

## PACK A — Recuperación e integridad de staging
**Estado: PENDIENTE / BLOQUEANTE**. Prioridad 1. Owner: operador autorizado de Supabase staging. Dependencia: credenciales seguras y destino aislado de restauración.
Trabajo:
- Clasificar las 2 rutas de `team_documents` sin objeto: registros sintéticos o archivos esperados. No asumir pérdida ni borrarlos.
- Obtener backup con credenciales autorizadas de PostgreSQL 17 de `public/auth/storage/supabase_migrations` según alcance permitido. Resguardar fuera de GitHub, cifrado y con hashes. Verificar contenido y restaurar en destino aislado.
- Inventariar/exportar los bytes de Storage si existieran al ejecutar el respaldo (el dump de DB no los incluye); registrar configuración de Auth/hosting recuperable sin secretos en repositorio.
Entregables: manifiesto sin datos sensibles, evidencia de prueba de restauración, acta de integridad documental, procedimiento de reversión.
Criterio de cierre: dump restaurado con éxito, recuentos/roles consistentes, Store reconciliado, recuperación repetible.
Evidencia de preparación: `tools/apdb-staging-backup-local.ps1`, `tests/security/apdb_staging_storage_integrity_readonly.sql`, `docs/apdb-2027/STAGING_BACKUP_MIGRACION_PREVIA.md`.
**NO-GO** si no existe respaldo restaurable. Issue #15.

## PACK B — Migración diferencial compatible
**Estado: PENDIENTE**. Prioridad 2. Owner: ingeniería. Dependencia: A para aplicación en staging; diseño en repositorio puede avanzar desde ahora.
Trabajo:
- Comparar definición por definición: 12 migraciones instaladas vs `20261123000000_apdb_player_eligibility_events.sql`, `20261124000000_apdb_private_storage_scope.sql`, `20261125000000_apdb_secure_document_circuit.sql` y parche RPC seguro.
- Mantener endurecimiento de `apdb_storage_team_path_allowed` y revocación de `rls_auto_enable`. No aplicar íntegramente migración `20261124000000` si sustituye políticas más estrictas.
- Producir archivo diferencial de migración *único y revisado*, tests positivos/negativos y rollback ordenado (incluidos frontend y vistas documentales).
- Repetir suite en base descartable preparada desde el respaldo de staging, sin datos personales en CI. Evitar usar datos reales en GitHub Actions.
Entregables: diff SQL revisado, matriz de permisos, manifest de migraciones y CI PASS en clon compatible.
Criterio de cierre: SQL idempotente/repetible o control de versión claro, cero regresiones y rollback probado. Issues #10, #12, #13.

## PACK C — Prueba integrada en staging hospedado
**Estado: PENDIENTE**. Prioridad 3. Dependencias: A+B y autorización específica para modificar staging.
Trabajo:
- Aplicar solo migración diferencial autorizada con respaldo y ventana de cambios.
- Alta de usuarios/equipos/documentos **sintéticos aislados de registros existentes**; comprobar Asociación/Delegados A/B/revocados, acceso cruzado, rutas y signed URLs, correcciones documentales e habilitación/suspensión.
- Probar fixture, resultados, tablas, playoffs, PDF, reinicio de sesión, persistencia y auditoría.
- Reejecutar Security Advisor (vista `security_definer_view`, funciones SECURITY DEFINER y RLS). No dar por corregidos warnings sin evidencia.
- Limpiar únicamente datos sintéticos identificados y con trazabilidad, preservando registros previos.
Entregables: evidencia HTTP/Chromium, Security Advisor antes/después, acta PASS/FAIL.
Criterio de cierre: pruebas positivas y negativas aprobadas, sin alertas críticas relevantes ni regresiones. Issues #10–#13.

## PACK D — URL institucional protegida
**Estado: PENDIENTE**. Prioridad 4. Dependencias: C y autorización de hosting/URL.
Trabajo:
- Generar paquete desde `index_online.html` / `app_online.js` usando constructor seguro, publishable key exclusiva de staging y sin referencias a producción 2026.
- Preparar HTTPS, ruta protegida, permisos de publicación, caché, rollback de archivos y no indexación del piloto.
- Validar PC y móvil, inicio/cierre de sesión y circuito completo con perfiles sintéticos.
Entregables: paquete versionado con hash, acta de publicación, check PC/móvil y rollback.
Criterio de cierre: URL funcional verificada, sin interferencia con Liga Maxi 2026. Issue #14.

## PACK E — Entrega APdB / conformidad
**Estado: PENDIENTE**. Prioridad 5. Dependencia: D y decisiones oficiales de la Asociación.
Trabajo:
- Acordar catálogo de requisitos, vencimientos y responsable humano de habilitación; roles/delegados, informes oficiales, calendario y coexistencia con GES.
- Hacer prueba de aceptación guiada sobre producto conocido por APdB. No presentar una demo paralela como plataforma final.
- Proporcionar manual operativo breve, responsables de soporte y acta de conformidad.
Entregables: checklist firmada/aprobada, guía de usuario, plan de operación y soporte.
Criterio de cierre: aceptación institucional explícita, incidencias bloqueantes cero, definición de operación real. Issue #16.

## Orden y paralelización
- Camino crítico: **A → B → C → D → E**.
- Mientras se obtiene el respaldo de A, la ingeniería puede **preparar B (diseño y revisión)**; jamás aplicarlo a staging antes de A.
- D puede preparar archivos y checklist durante C, pero no publicarse hasta C.
- E puede organizar requisitos/documentos de aceptación antes del despliegue, sin afirmar cierre.

## Entrega estándar de cada pack
Al cierre dejar en su propio subdirectorio o acta: (1) resultado y fecha, (2) commit/PR, (3) tests con links, (4) incidencias, (5) rollback/reversión, (6) decisión GO/NO-GO. Sin estimaciones de porcentaje basadas en cantidad de documentos. Reportar tiempo real solo si el sistema lo mide: no inventar acumulados.

## Riesgos que no deben perderse
1. Dos metadatos institucionales apuntan a objetos Storage inexistentes; clasificar sin atribuir pérdida.
2. Plan Free + Postgres 17: respaldo real no verificado y sin rama de staging disponible; respaldo de DB no equivale a respaldo de objetos.
3. Las migraciones antiguas podrían reintroducir permisos Storage excesivos si se aplican enteras.
4. Las correcciones del PR #19 pasaron en descartable, no en staging hospedado.
5. Usuarios reales, certificados médicos y producción 2026 fuera del alcance de pruebas.

**Estado general: GO para preparar A y B; NO-GO de modificación de staging, URL institucional y operación real.**
