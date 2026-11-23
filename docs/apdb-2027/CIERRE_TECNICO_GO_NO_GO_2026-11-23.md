# APdB 2027 — cierre técnico y puerta de entrega institucional
Fecha de control: 2026-11-23. Estado: **candidato de integración**, no despliegue ni aceptación de APdB.

## Evidencia verificable
- CI aislado: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45272123472 — 3/3 trabajos SUCCESS.
  1. Sintaxis de app_online.js y contrato de RPC documentales.
  2. Construcción del paquete institucional en entorno de pruebas, sin referencias de backend/torneo/clave de producción 2026.
  3. PostgreSQL 16 sintético: migración de lectura documental compilada, casos autorizados y negativos por organización/equipo, delegado desactivado, anónimo y acceso directo a vista antigua bloqueado. Respaldo pg_dump (formato custom) y restauración en segunda base sintética, con repetición de pruebas.
- Código candidato: PR #18 (borrador): https://github.com/nahuelacuna983-hash/liga-maxi/pull/18
- Corrección documental aislada: PR #17 (borrador): https://github.com/nahuelacuna983-hash/liga-maxi/pull/17
- Circuito deportivo/documental avanzado ya probado en descartable (referencia anterior): PR #3 / GitHub Actions #45113904201.

## Matriz de cierre
| Bloque | Comprobado | Pendiente para cierre operativo |
|---|---|---|
| 1. Persistencia administrativa | Implementación y pruebas previas en descartable; inventario parcial de 12 migraciones de staging | Reconciliar migraciones, permisos y HTTP persistente con identidades de prueba |
| 2. Deportivo | Fixture, programación, resultados y playoffs probados en entorno aislado anterior | Prueba íntegra en staging y navegador real, con persistencia tras reinicio |
| 3. Jugadores/documentos/habilitación | Contratos de lectura documental aislados y pruebas SQL negativas; circuito integral probado en descartable previo | Migraciones finales de habilitación + Storage privado/URLs firmadas y navegador sobre staging |
| 4. Seguridad | RPC de documentos por categoría/equipo; vista privilegiada anulada para API en parche candidato; CI PostgreSQL 16 PASS | Aplicar parche **después** de revisión/backup, probar permisos HTTP y reejecutar Security Advisor; revisar restantes 15 advertencias de funciones privilegiadas |
| 5. URL institucional | Constructor institucional y pruebas de sanitización de origen aprobadas | HTTPS, protección de URL, publicación autorizada y aceptación en móvil/PC |
| 6. Respaldo | pg_dump/pg_restore sintéticos aprobados, incluido control de permisos tras restaurar | Respaldo y restauración de staging real; bytes de objetos privados Storage, Auth, secretos/hosting por vías seguras |
| 7. Aceptación APdB | Matriz funcional definida en Issue #16 | Identidades oficiales, requisitos/vencimientos, autoridad de habilitación, informes, coexistencia GES, prueba presencial y visto bueno formal |

## Puertas que siguen BLOQUEADAS
1. No ejecutar `supabase/patches/apdb_2027_team_documents_secure_rpc_draft.sql` en staging sin preflight/revisión y respaldo restaurable. La versión compatible con el frontend debe entregarse como una unidad (RPC nuevas + eliminación de acceso a vistas).
2. Reconciliar las migraciones finales de jugadores/documentos/habilitación del PR #3 con el staging, sin copiar íntegramente migraciones antiguas que reduzcan revocaciones existentes.
3. Verificar Storage/Auth de extremo a extremo: la prueba SQL sintética NO demuestra rutas de archivos, JWT, URL firmadas ni políticas de sesión en Supabase real.
4. El plan actual de la organización que aloja staging figura como `free` en la consulta del 23/11; NO asumir disponibilidad de PITR ni copia automática de archivos. Definir respaldo/exportación permitidos y restauración comprobable.
5. El hosting institucional todavía no ha sido operado ni autorizado aquí. No publicar en su URL ni tocar producción 2026.
6. Los PR #3, #8, #17 y #18 permanecen sin mergear/desplegar a producción.

## Procedimiento de autorización de paso a staging
- Aprobación de seguridad de migraciones y revisión de las funciones SECURITY DEFINER.
- Copia verificable de esquema/datos de staging y objetos privados, con plan de restauración y custodia.
- Prueba de reversión en descartable con las mismas versiones de PostgreSQL.
- Cambio versionado y atómico en staging con identidades y documentos sintéticos, sin modificar registros existentes.
- Contratos HTTP y navegador de Delegado A/B, Asociación, anon, revocado; volver a ejecutar Security Advisor.
- Ante falla, detener y revertir; nunca abrir SELECT general ni apagar RLS como atajo.

## Decisión de entrega
**NO-GO para URL institucional con datos reales**, hasta cumplir puertas anteriores.
**GO para continuar validación técnica descartable** usando PR #18 y su CI.
