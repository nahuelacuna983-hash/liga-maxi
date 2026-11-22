# APdB 2027 - Plan de cierre operativo

Fecha: 2026-11-22  
Rama: `codex/apdb-2027-operational-hardening`  
Fuente: `APDB-2027-DIAGNOSTICO-FUNCIONAL-INTEGRAL.md`  
Commit de referencia: `b9fb5ab5e85aec23d41b7c5906bd7eb439147460`

## 1. Decisión de trabajo

El núcleo deportivo, el OCR local, la lectura pública y los circuitos sintéticos de Asociación y Delegado ya existen. El bloqueo que más impacta la continuidad de un torneo no es volver a desarrollar esos motores: es completar el alta administrativa persistente de un torneo 2027 y recuperar ese estado con permisos reales.

El primer bloque de cierre será, por lo tanto, **Alta administrativa 2027 y recuperación segura**. No incluye migración de datos oficiales, documentos reales, cambios de RLS en staging ni despliegue.

## 2. Estado real de partida

### Ya existente, sujeto a verificación final

- Lectura pública de categorías, fixture, resultados, tablas, desempate y playoffs.
- Programación individual mediante `apdb_upsert_match_schedule`.
- Resultados de Delegado mediante `apdb_save_result`.
- Correcciones administrativas mediante `apdb_association_update_result`.
- Publicación de fixture mediante `apdb_publish_fixture` cuando la categoría ya existe y está vacía.
- Playoffs Top 4/6/8 y determinación de campeón con datos sintéticos.
- Auth, permisos, revisión documental y OCR consultivo mediante RPC.
- Persistencia y recuperación de varios recorridos sintéticos en staging/entornos aislados.

### No debe tratarse como resuelto

- Alta completa de torneo, categoría y equipos desde la interfaz principal.
- Asignación y revocación operativa de Asociación y Delegados.
- Recorrido documental completo con Storage real y decisión humana institucional.
- Backup/restauración de infraestructura oficial.
- Certificación vigente de todos los recorridos visuales Top 4/6/8 en una única operación institucional.
- Reemplazo de GES o migración de datos 2026.

## 3. Orden de pendientes por dependencia, riesgo e impacto

| Orden | Pendiente | Dependencia | Riesgo | Impacto |
|---|---|---|---|---|
| 1 | Alta persistente de torneo, categoría y equipos | Contrato de tablas/RPC y rol Asociación | Alto | Crítico |
| 2 | Asignación, revocación y aislamiento de permisos | Alta del bloque 1 | Alto | Crítico |
| 3 | Recuperación tras logout, recarga y nuevo ingreso | Bloques 1 y 2 | Medio-alto | Alto |
| 4 | Fixture, programación y resultados sobre el torneo creado | Bloques 1-3 | Alto | Crítico |
| 5 | Playoffs, cierre y campeón | Fixture y resultados persistidos | Medio | Alto |
| 6 | Documentación, Storage, OCR y habilitación | Usuarios/equipos y catálogo APdB | Alto | Alto |
| 7 | Backup, restauración, informes y reversión | Esquema operativo estable | Alto | Crítico |
| 8 | Paquete privado y aceptación institucional | Todo lo anterior | Medio | Alto |

## 4. Primer bloque preparado

### Alcance funcional

Preparar una operación administrativa segura que permita:

1. Crear o seleccionar un torneo 2027 sintético.
2. Crear o seleccionar una categoría perteneciente a ese torneo.
3. Asociar cuatro equipos sintéticos a la categoría.
4. Asignar un usuario Asociación con alcance al torneo.
5. Asignar un Delegado a un equipo o categoría concreta.
6. Recuperar torneo, categoría, equipos y permisos después de cerrar sesión, recargar y volver a ingresar.
7. Rechazar al Delegado ajeno, al usuario revocado y al usuario sin permisos.
8. Dejar el torneo listo para que el bloque siguiente publique fixture mediante la RPC existente.

No se reutilizarán categorías históricas ni se tocarán partidos, resultados, playoffs o auditorías ya certificados.

### Límites de implementación

- Reutilizar las tablas y RPC existentes; no crear un segundo modelo administrativo.
- No aceptar `organizacion_id`, `torneo_id`, `categoria_id` o `equipo_id` como autorización confiable desde el navegador.
- Las escrituras deberán quedar protegidas por RLS/RPC y por validaciones de pertenencia.
- Mantener `secureResults=1` como requisito para el piloto; el fallback directo de publicación de fixture debe quedar bloqueado o señalado antes de usar datos oficiales.
- No incluir claves privilegiadas ni credenciales en frontend, Git o logs.

### Preparación técnica

La preparación consiste en dejar listas, sin ejecutarlas contra staging:

- Una matriz de datos sintéticos idempotente para organización, torneo, categoría, cuatro equipos y dos identidades.
- Un contrato de creación/selección que compruebe relaciones y no duplique por nombre fuera de la organización.
- Un ejecutor de pruebas que capture identificadores creados sin imprimir secretos.
- Asserts de aislamiento por organización, torneo, categoría y equipo.
- Un snapshot de conteos y hashes lógicos antes/después para asegurar que nada fuera del escenario cambia.
- Un procedimiento de reversión limitado al escenario sintético, sin `db reset` ni borrados generales.

## 5. Criterios de aceptación del primer bloque

### Asociación autorizada

- Puede consultar el torneo sintético de su organización.
- Puede recuperar la categoría y sus cuatro equipos.
- Puede ejecutar la operación administrativa prevista por el contrato.
- La misma información aparece después de logout, recarga y nuevo login.

### Delegado autorizado

- Puede consultar únicamente su alcance.
- Puede ver el equipo asignado y los partidos que le corresponden cuando existan.
- No puede crear/modificar torneo, categoría, equipos, permisos, fixture o playoffs.

### Delegado ajeno/revocado/sin permisos

- Obtiene rechazo efectivo en la API/RPC, no sólo controles ocultos en la interfaz.
- No cambia conteos, relaciones, estados ni timestamps del escenario.
- No puede inferir documentos, permisos ni datos de otra organización.

### Recuperación

- Se conserva el mismo ID de torneo, categoría, equipo y permiso.
- No se crea una segunda categoría por recargar.
- No se regeneran fixtures ni playoffs al reingresar.
- La caché de la sesión anterior no queda visible tras logout.

## 6. Pruebas locales no destructivas realizadas

Se reutiliza la batería ya ejecutada en el diagnóstico, sin repetir una auditoría general:

- Contratos de descubrimiento de torneo y categorías.
- Contratos de resultados seguros y permisos.
- Escenarios deportivos, fixture, tablas, desempate, programación y playoffs.
- Persistencia/reinicio sintético y protecciones de persistencia.
- Autenticación y ciclo de sesión.
- Adaptador OCR, RPC OCR, lectura OCR y continuidad.
- `node --check app_online.js`.
- `git diff --check`.

Resultado: aprobados los contratos existentes. La prueba `tests/private-package-safety.cjs` sigue pendiente porque falta el artefacto local `private/apdb-2027-prueba-update-stage`; no se fabricó ese directorio ni se lo trató como aprobado.

No se ejecutaron escrituras en staging ni producción durante este bloque.

## 7. Recuperación ante errores

1. Validar destino y modo antes de cualquier escritura.
2. Crear sólo un identificador de escenario sintético y registrar su manifiesto fuera de Git.
3. Ejecutar cada operación en transacción o mediante RPC idempotente.
4. Detenerse ante cualquier error de pertenencia, RLS o duplicación.
5. Comparar el snapshot antes/después.
6. Si una etapa falla, conservar el error y revertir sólo las filas creadas por el escenario mediante el procedimiento autorizado.
7. No borrar tablas, no usar `CASCADE` y no restaurar dumps sobre staging persistente.

## 8. Bloques posteriores

### Bloque 2 - Competencia persistente

Usar el torneo creado en el bloque 1 para publicar fixture, programar partidos, cargar resultados, recalcular tabla/desempate y generar playoffs. Aceptación: recorrido de principio a fin con Asociación, Delegado y Público, incluyendo recarga.

### Bloque 3 - Documentación y habilitación

Probar Storage sintético, requisitos, carga por Delegado, lectura por Asociación, OCR consultivo, revisión humana y lista de buena fe. Aceptación: una persona sintética atraviesa el circuito sin que el OCR modifique habilitaciones.

### Bloque 4 - Continuidad institucional

Comprobar backup/restore de staging, informes, auditoría, retención, paquete privado, reversión y actualización sin tocar `.htaccess` ni Directory Privacy.

## 9. Automatización y menor intervención manual

- Un comando local valida rama, commit, destino, URL de Supabase y ausencia de referencias productivas.
- Seeds sintéticos idempotentes separados de migraciones.
- Pruebas CI descartables para esquema, RLS, Auth, RPC, Storage y Chromium.
- Artefactos de CI con trazas/capturas sin credenciales.
- Manifiesto de despliegue con hashes y lista de archivos protegidos.
- Entrada interactiva de contraseñas sólo en ejecutores locales; nunca variables persistidas.
- Checklist automática posterior: carga, login sintético, aislamiento, recarga y lectura pública.
- Aprobación humana sólo para datos oficiales, permisos institucionales, backup productivo y despliegue cPanel.

## 10. Decisiones pendientes de APdB

- Nombre y responsable del torneo piloto.
- Organización, categorías y equipos iniciales.
- Usuarios responsables y procedimiento de revocación.
- Catálogo documental y responsable de decisión humana.
- Formatos de informes y distribución a árbitros.
- Frecuencia y custodio de backups.
- Fecha de coexistencia o eventual reemplazo de GES.

## 11. Conclusión operativa

El piloto institucional puede avanzar sobre un torneo sintético privado, pero no debe presentarse todavía como reemplazo completo de GES. El siguiente trabajo funcional concreto es cerrar el alta administrativa persistente y su recuperación con tres perfiles. Una vez aprobado ese contrato, el núcleo deportivo existente puede reutilizarse sin reconstruir tablas, resultados, desempates ni playoffs.

La intervención manual se reduce a tres decisiones: autorizar el escenario de staging, proporcionar credenciales mediante entrada local segura cuando sean imprescindibles y aprobar datos/despliegue institucionales. El resto debe ejecutarse mediante seeds idempotentes, contratos automáticos y workflows descartables.

## Referencias

- `APDB-2027-DIAGNOSTICO-FUNCIONAL-INTEGRAL.md`
- `app_online.js`
- `index_online.html`
- `supabase/migrations/`
- `.github/workflows/apdb-supabase-isolated.yml`
- `.github/workflows/rls-local.yml`
- `tests/apdb-championship-isolated-integration.cjs`
- `tests/apdb-staging-permissions.cjs`
- `tests/apdb-staging-ocr.cjs`
- `docs/APDB_2027_STAGING_RUNBOOK.md`
- `docs/CENTRO_CONTINUIDAD.md`
