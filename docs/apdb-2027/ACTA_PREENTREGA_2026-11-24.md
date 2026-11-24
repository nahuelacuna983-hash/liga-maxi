# APdB 2027 — Acta de preentrega técnica y aceptación institucional

**Corte:** 24 de noviembre de 2026 · **Candidato:** `843599fb993eec0dbebe4f2e4117c524979ad6eb` · [PR draft #33](https://github.com/nahuelacuna983-hash/liga-maxi/pull/33)

## 1. Decisión documentada

**GO — candidato técnico sintético y preparación de entrega.**
**NO-GO — publicación, alta de usuarios reales, restauración de datos auténticos o modificaciones de Staging/producción.**

No equivale a puesta en servicio: las pruebas de CI usan entornos descartables y datos sintéticos. Los datos reales del operador permanecen fuera de GitHub.

## 2. Evidencia cerrada en el mismo commit

| Puerta de calidad | Ejecución | Resultado |
|---|---|---|
| Paquete cPanel, integridad, rollback simulado, navegador desktop/móvil | [#45501591363](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45501591363) | SUCCESS |
| Restauración sintética con script PowerShell, PG17, vault y rechazos | [#45501591267](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45501591267) | SUCCESS |
| Diferencial Supabase aislado, preservación de políticas | [#45501591114](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45501591114) | SUCCESS |
| Seguridad documental, autorizaciones y contratos | [#45501591229](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45501591229) | SUCCESS |

Se eliminó la ejecución PG17 duplicada dentro del diferencial, que había producido el conflicto de puerto Docker `54324`. El control completo PG17 permanece en su workflow específico.

## 3. Entregables a preparar para APdB

1. **Paquete web privado para revisión:** generado con `tools/build-apdb-staging.cjs` con `publicBasePath=/apdb-2027-prueba/` y la **publishable key auténtica autorizada de Staging**, nunca datos sintéticos. El constructor rechazará sobrescrituras y el verificador `tools/verify-apdb-release.cjs` permitirá solo los nueve archivos públicos esperados.
2. **Acta de recepción:** versión SHA, fecha, integridad del paquete y responsable de alojamiento; no incluye contraseñas ni exportaciones privadas.
3. **Guía de uso por rol:** Público consulta; Delegado carga y consulta únicamente datos permitidos; Asociación administra. La aceptación con identidades reales/autorizadas no está realizada.
4. **Plan reversible de instalación:** carpeta nueva protegida, copia íntegra de la carpeta previa, comprobación HTTP 401/403 para recursos del piloto protegido, prueba de cada rol, reversión inmediata ante fallas. Ningún paso afecta la URL activa de 2026.
5. **Informe privado de recuperación:** autenticación, documentos, roles y backups se validan fuera del material público.

## 4. Secuencia de aceptación real (sin ejecutar desde CI)

**Puerta A — Resguardo.** Confirmar que el respaldo original en equipo del operador sigue intacto, comparar su SHA256 esperado `8074d05758b2ca40a625ffd1634f013b0f0db93bb3bc9ea5b1380a364296ac11` y disponer de copia cifrada fuera de hosting público. No subirlo a GitHub.

**Puerta B — Recuperación compatible.** Probar la recuperación del respaldo auténtico únicamente sobre una nueva base *dentro de Supabase PG17 local descartable*, con `supabase_vault` disponible y sin túnel remoto. La recuperación sintética no reemplaza esta prueba. El archivo crudo de `pg_dump` podría no ser portable: si falla, seguir la exportación compatible de Supabase roles/schema/data, sin forzar un restore parcial.

**Puerta C — Auth/Storage.** Verificar inventario de objetos, bytes, referencias documentales, roles, permisos/RLS y configuración de autenticación por canales separados. El conteo histórico `storage.objects=0` no acredita por sí solo un respaldo de archivos.

**Puerta D — Alojamiento privado.** Con acceso cPanel autorizado, preparar `/apdb-2027-prueba/` protegido y reversible, usar la publishable key de Staging autorizado, revisar HTTPS, permisos, rutas y cabeceras, verificar artefactos por hash. **No desplegar sin aprobación específica de este paso.**

**Puerta E — Aceptación de APdB.** Validar tres roles con identidades de prueba autorizadas en navegador móvil y escritorio, verificar acceso documental y comportamiento público, sin publicar información sensible ni alterar los torneos 2026. Aprobar expresamente la apertura posterior de acceso Público.

## 5. Criterios de abortar

Cualquier fallo de integridad/hash, acceso inesperado a documentación, RLS excesiva, endpoint de producción, error no explicado de restore, discrepancia de conteos/estructura/funciones, dependencia ausente de Storage o imposibilidad de revertir el hosting => **NO-GO**.

La base real no se ha recuperado todavía, y tampoco se ha cambiado cPanel, DNS, producción, `main` ni Supabase Staging.

## 6. Primer requisito concreto del operador

La siguiente intervención humana imprescindible no es repetir auditorías SQL. Es **autorizar y habilitar un entorno Supabase PG17 descartable y separado para la restauración del respaldo auténtico**, o proporcionar a un operador técnico acceso a ese entorno. Solo después corresponde pedir autorización independiente para colocar el paquete web en la ruta de prueba institucional.

Ninguna clave, archivo de backup o documento de jugadores debe enviarse por chat ni publicarse en repositorios.
