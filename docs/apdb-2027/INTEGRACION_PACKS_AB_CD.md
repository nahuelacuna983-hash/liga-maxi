# APdB 2027 — Integración de los Packs A/B con C/D
**Fecha:** 23/11/2026. **Estado:** protocolo de integración, sin merge ni cambio en staging o hosting.

## Procedencia y separación
- Base integral: PR #19 (`codex/apdb-2027-full-release-verification`).
- Codex A/B: PR #21 (`codex/apdb-2027-packs-ab`, último commit reportado `9ce467cb0b5c7a82324a3e8963ccbb761f0cf6a4`).
- ChatGPT C/D: PR #20 (`codex/apdb-2027-pack-cd-release-gates`).
Ambas ramas parten del candidato integral. Nunca mezclar mediante reemplazo ciego del directorio `tools/` o de workflows; integrar commits concretos con revisión del diff.

## A/B — Evidencia recibida, no confundible con el cierre
El PR #21 contiene mejoras a `tools/postgres-backup-restore.cjs`, SQL de preflight y contrato estático. Según el informe de Codex, **no existe todavía respaldo hospedado restaurado ni migración diferencial ejecutable**. Los tests locales y previos de CI no certifican hosting permanente. La ejecución #45285381735 se canceló con el inicio de nuevas ejecuciones, por lo que el cierre exige un CI definitivo del SHA final de PR #21, no el resultado de otro commit.

## C/D — Controles verificables en PR #20
- Construcción de sitio con manifiesto SHA-256, verificación de integridad y rutas permitidas.
- Prueba HTTP localhost de subdirectorio/estáticos/denegación de archivos sensibles.
- Reversión offline del paquete anterior, verificada byte por byte.
- Test sintético de protección anónima de URL futura: escenarios protegido, público, redirección sin aprobación, secreto servido y caché pública.
- `tools/check-apdb-hosted-pilot.cjs` requiere URL autorizada, HTTPS, respuestas 401/403 para activos públicos del piloto y rechazo de filtraciones; NO se ejecuta sobre Internet en CI. Su comportamiento es deliberadamente estricto: SSO 302 requiere evaluación manual del mecanismo y no se da por PASS.
- Las pruebas locales de URL y reversión NO acreditan reglas del servidor real.

## Puerta de integración (sin A/B completos)
1. No hacer merge de PR #20 ni #21 a `main`.
2. Comprobar el SHA actual y resultados de CI de ambos PR antes de integrar; no usar resultados de otros commits.
3. Conservar archivos y tests de A/B; C/D no modifica migraciones, `tools/postgres-backup-restore.cjs` ni SQL.
4. Cuando Codex aporte migración diferencial, documentar orden de aplicación, rollback y compatibilidad con `apdb_list_player_documents` / `apdb_list_team_documents`.
5. Probar el conjunto A+B+C+D primero en entorno descartable local/CI con datos sintéticos, después en clon fiel del staging hospedado con recuperación probada.
6. Solo tras respaldo y restauración reales, autorización de escritura de staging y pruebas negativas, realizar implantación controlada de C.
7. D requiere además URL HTTPS autorizada, protección real del servidor, compatibilidad de rollback frontend/backend y aceptación móvil/PC.

## Resultado exigido para cerrar C
PR combinado sin conflictos, HTTP/Auth/Storage/Chromium y negativos por rol PASS sobre staging hospedado, Advisor sin error crítico documental, inventario de documentos y reversión validada.

## Resultado exigido para cerrar D
Paquete institucional entregado a hosting autorizado, hashes verificables, URL protegida real, pruebas PC/móvil y rollback demostrado en hosting, sin acceder a producción 2026.

**Decisión:** GO para pruebas locales y preparación; NO-GO para staging/hosting hasta completar A/B.
