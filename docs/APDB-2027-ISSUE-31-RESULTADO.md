# APdB 2027 - Issue #31

## Alcance

Se preparo la aceptacion local del paquete institucional sin desplegarlo y sin conectarlo a staging, produccion ni cPanel. La rama deriva del candidato de hosting y no modifica el frente de respaldos de los PR #29/#30.

## Cambios

- `tools/verify-apdb-release.cjs` ahora rechaza entradas no previstas, nombres de backups, `.env`, mapas fuente y enlaces de source maps, ademas de URLs PostgreSQL o claves `sb_secret_` dentro de los artefactos ejecutables.
- `tests/apdb-institutional-package-browser.spec.cjs` agrega verificacion Chromium del paquete generado bajo `/apdb-2027-prueba/` en escritorio y movil. Comprueba los tres accesos visuales y ausencia de desborde horizontal sin ejecutar red ni Supabase.
- `.github/workflows/apdb-pack-cd-gates.yml` incorpora el test visual del paquete y la suite sintetica de la aplicacion oficial, instalando Chromium en el runner.

## Pruebas locales

- `node --check` de las herramientas, prueba y `app_online.js`: aprobado.
- Paquete institucional en Chromium desktop/mobile: `2 passed`.
- `tests/demo-circuit-browser.spec.cjs`: `3 passed`, incluyendo campeon y documentacion sinteticos.
- `tests/apdb-hosted-pilot-gate.cjs`: aprobado en escenarios loopback.
- Los contratos de build/http/rollback requieren Linux para ejecutar su caso de symlink: Windows devolvio `EPERM` al crear el symlink de prueba. No se modificaron permisos del sistema ni se sustituyo el caso por una falsa aprobacion.

## GO / NO-GO

| Control | Estado | Evidencia |
|---|---|---|
| Artefacto bajo subruta y assets relativos | GO local | smoke HTTP y manifiesto |
| Seguridad del paquete | GO local | verificador de integridad y contrato de build |
| Navegacion visual desktop/mobile | GO local | Chromium, 2 casos |
| Flujos sintéticos de Asociación/documentación/campeón | GO local | Chromium, 3 casos |
| Auth/Storage/Supabase staging real | NO-GO | no se desplego ni se usaron credenciales |
| cPanel y rollback real | NO-GO | pendiente de operador y respaldo autorizado |

El paquete queda preparado para revisión, no publicado. La certificación real de Auth, Storage y hosting requiere una ejecución posterior con el entorno autorizado.
