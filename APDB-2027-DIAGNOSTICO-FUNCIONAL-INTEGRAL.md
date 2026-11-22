# APdB 2027 - Diagnostico funcional integral

Fecha: 2026-11-22  
Rama: `codex/apdb-2027-operational-hardening`  
Commit revisado: `a0293220da72b9e09caa3665040a9587649b4dd3`  
Staging consultado en modo lectura: `wffvmthdmmjwspnozyrv`

## 1. Resumen ejecutivo

La aplicación existente no es una demo vacía: conserva un circuito público deportivo, vistas diferenciadas para Delegados y Asociación, motores de tabla/desempate/playoffs, programación, documentación y un OCR local integrado mediante RPC. El circuito deportivo sintético y el circuito OCR sintético tienen evidencia de ejecución real y de pruebas locales; staging contiene un torneo sintético persistente con una categoría, cuatro equipos, partidos, programación, playoffs y auditorías OCR.

La preparación no equivale todavía a una entrega institucional completa. El principal faltante funcional es la administración inicial completa de torneos/categorías/equipos y la certificación de todos los recorridos con usuarios reales de APdB. El planner de Asociación simula y puede publicar un fixture en una categoría vacía mediante `apdb_publish_fixture`, pero no constituye un módulo completo de alta administrativa de torneo y categoría. La documentación institucional, Storage, permisos efectivos y operación de backups requieren decisiones y verificaciones adicionales antes de usar documentación real.

Conclusión: la plataforma está lista para una demostración institucional controlada y para un piloto deportivo sintético en staging. No está lista para reemplazar GES con datos oficiales sin cerrar la configuración institucional, la matriz de permisos, el procedimiento de backup/restauración y la certificación operativa de cada rol.

## 2. Criterio de clasificación

- **OPERATIVA:** existe implementación y hay una prueba funcional o evidencia de ejecución que cubre el comportamiento indicado.
- **PARCIAL:** hay implementación y alguna prueba, pero falta una parte del circuito, cobertura de rol, integración o certificación.
- **NO IMPLEMENTADA:** no se encontró una operación funcional en la aplicación principal.
- **BLOQUEADA:** existe código o procedimiento, pero la comprobación depende de credenciales, despliegue, decisión institucional o infraestructura que no está disponible.

La clasificación se refiere a la aplicación principal y a la evidencia disponible. Una prueba sintética no se trata como certificación productiva.

## 3. Inventario funcional verificable

| Funcionalidad | Estado | Evidencia | Límite actual |
|---|---|---|---|
| Lectura pública de torneo y categorías | OPERATIVA | `cargarTorneoActivo()`, `cargarCategorias()`, contratos `app-online-tournament-discovery` | Depende de datos y permisos públicos correctos en cada torneo |
| Fixture público | OPERATIVA | `cargarPartidosCategoria()`, `renderFixturePublico()`, pruebas deportivas y staging sintético | No prueba por sí sola la publicación de una temporada oficial |
| Resultados públicos | OPERATIVA | `renderPartidoResultadoHtml()`, `calcularTabla()` y pruebas de resultados | La carga autorizada debe seguir rutas RPC en modo seguro |
| Tablas y desempate olímpico | OPERATIVA | `calcularTabla()`, `compararEquiposTabla()`, `calcularMiniTablaOlimpica()`, pruebas demo deportivas | Falta matriz completa con datos oficiales por categoría |
| Playoffs Top 4/6/8 | OPERATIVA en sintético; PARCIAL en certificación visual | `generarPartidosPlayoff()`, `aplicarAvanceAutomaticoPlayoffs()`, `renderPlayoffsSimple()`, escenarios y contratos Top 4/6/8 | El motor está probado; la cobertura visual aislada histórica tuvo fallos Top 4 y debe considerarse pendiente hasta una ejecución exitosa vigente |
| Campeón | OPERATIVA en sintético | `obtenerCampeonPlayoff()`, escenarios de campeonato | Falta certificar el recorrido institucional con datos oficiales |
| Programación individual | OPERATIVA en staging sintético | `apdb_upsert_match_schedule`, `guardarProgramacionFila`, pruebas aisladas | Requiere usuarios y permisos de torneo definidos |
| Programación por lote y comunicación | PARCIAL | `renderProgramacionAsociacion()`, generación/copia de mensajes e integración de RPC | El envío real de correo/WhatsApp no es parte de la aplicación |
| Creación de torneo | PARCIAL | `cargarTorneoActivo()` y planner de preparación | No se encontró un alta persistente completa de torneo desde la interfaz principal |
| Creación/configuración de categoría | PARCIAL | planner y publicación asociada a categoría existente | La publicación busca una categoría existente; no reemplaza un alta institucional completa |
| Asociación de equipos | PARCIAL | lectura de `equipos`, carga de equipos del planner y datos sintéticos | Falta circuito administrativo completo de alta/asignación con RPC y UI certificada |
| Generación de fixture | OPERATIVA con categoría existente y vacía | `apdb_publish_fixture`, `armarPayloadFixtureSimulado`, guardas contra partidos existentes | Hay fallback de escritura directa cuando no está activo `secureResults=1`; debe eliminarse o bloquearse antes del piloto oficial |
| Protección de fixture publicado | OPERATIVA en pruebas aisladas | RPC segura y guardas de categoría con partidos existentes | Requiere repetir matriz completa para cada rol oficial |
| Registro de resultado por Delegado | OPERATIVA en staging/sintético | `apdb_save_result`, `guardarResultadoDelegado`, pruebas Chromium previas | Falta certificar con usuarios oficiales |
| Corrección/anulación por Asociación | OPERATIVA en sintético/staging | `apdb_association_update_result`, funciones de corrección/anulación y pruebas autenticadas | Debe mantenerse el modo seguro en toda instalación institucional |
| Resultados administrativos | PARCIAL | controles `0-0`, `20-0`, anulación y RPC implementadas | Cobertura operativa institucional y reportes finales pendientes |
| Usuarios y permisos | PARCIAL | `get_current_app_user_permissions`, `app_users`, `app_user_permissions`, pruebas negativas autenticadas | Falta cerrar usuario autenticado sin permisos en la matriz final y definir altas/revocaciones operativas |
| Vista Delegado | PARCIAL | desbloqueo, categoría, partido, resultados y documentación; contratos de autorización | La clave heredada aparece en frontend en parte del código y no es un modelo suficiente para operación institucional |
| Vista Asociación | PARCIAL | secciones Inicio, Competencia, Torneos, Documentación, Programación y Administración | Falta completar administración inicial y simplificar la superficie operativa |
| Lista de buena fe | PARCIAL | funciones de jugadores, exportaciones/listas y documentación existente | Falta confirmar el circuito completo persistente con reglas institucionales |
| Inscripción de jugadores | PARCIAL | `add_team_player`, `agregarJugadorDelegado`, `create_player_from_drive_review` | Falta recorrido de alta oficial y validación institucional |
| Requisitos documentales | OPERATIVA en sintético; PARCIAL en staging institucional | `cargarRequisitosDocumentales`, documentos por equipo/jugador y contratos documentales | Faltan decisiones APdB sobre catálogo y ciclo de vida |
| Carga documental Delegado | PARCIAL | `mark_player_document_uploaded`, Storage y controles de archivo | Storage/Auth real por tipo de archivo y alcance requiere certificación completa |
| Revisión humana | PARCIAL | `review_team_document`, `review_player_document`, estados y vistas administrativas | Debe probarse con dos equipos/organizaciones y registrar el procedimiento institucional |
| Habilitación deportiva | PARCIAL | `calcularEstadoHabilitacionJugador`, `calcularHabilitadosCategoria`, listas para árbitros | No debe confundirse con auditoría OCR; falta aceptación institucional del criterio final |
| OCR local | OPERATIVA con sintéticos | `tools/document-audit-local`, adaptador, RPC `apdb_record_automatic_document_audit`, pruebas 6/6 y staging | No procesa documentos reales; requiere procedimiento de worker y credencial técnica custodiada |
| Visualización OCR | OPERATIVA en código/staging preparado | `renderAuditoriasIAPanel`, RPC `apdb_list_document_ai_audits`, contenedor `#auditoria-ia-tabla` | Requiere desplegar la versión actual en el staging web y validar con sesión Asociación |
| Auditoría de resultados | PARCIAL | `v_result_change_logs_admin`, `cargarCambiosResultadosAuditoria`, `auditoria_resultados` | Falta matriz completa de lectura y retención institucional |
| Historial de uso | PARCIAL | `app_usage_events`, `registrarUso`, vista de uso Asociación | Falta política de retención, exportación y revisión operativa |
| Informes deportivos | OPERATIVA para descarga local | `generarActaCierreTorneo`, informes de categoría, CSV y controles de habilitados | No existe aún un circuito institucional de firma, archivo y publicación |
| Informes para árbitros | PARCIAL | programación, listas de habilitados y controles de cancha | Falta validar formato final y distribución con APdB |
| Backups PostgreSQL | OPERATIVA en sintético | `tools/postgres-backup-restore.cjs`, pruebas de backup/restore | No se ejecutó backup productivo ni restauración de infraestructura oficial |
| Backup Storage | PARCIAL | `tools/storage-backup-restore.cjs`, `tools/supabase-storage-backup.cjs`, contratos sintéticos | Falta exportación autorizada y restauración real del Storage staging |
| Publicación privada cPanel | PARCIAL | empaquetadores, protección Directory Privacy y pruebas de subruta | No hay acceso de despliegue automatizado; la carga sigue siendo manual |

## 4. Estado de los circuitos completos

### Circuito A - Delegado

**Recorrido cubierto:** autenticación/sesión -> permisos -> categoría/equipo -> partido -> carga de resultado mediante RPC -> recuperación tras recarga. También existen carga documental, jugadores y listas.

**Estado: PARCIAL.** La parte deportiva tiene evidencia real sintética y staging. La parte documental está implementada y protegida por permisos, pero la operación institucional requiere cerrar Storage, catálogo de requisitos, lista de buena fe y pruebas de revocación por equipo con usuarios oficiales. La vista Delegado aún convive con mecanismos heredados de clave en frontend.

Referencias: `app_online.js` (`iniciarSesionAuth`, `cargarPermisosUsuarioActual`, `guardarResultadoDelegado`, `subirDocumentoDelegado`, `agregarJugadorDelegado`), `supabase/migrations/20261111000001_apdb_isolated_auth_storage.sql`, `tests/apdb-isolated-browser.spec.cjs`, `tests/apdb-staging-permissions.cjs`.

### Circuito B - Asociación

**Recorrido cubierto:** autenticación -> permisos -> categoría -> consulta de documentación -> revisión humana -> corrección de resultados -> programación -> habilitados -> informes.

**Estado: PARCIAL.** Asociación puede operar correcciones, programación, playoffs y revisión en escenarios sintéticos. OCR se registra automáticamente pero sólo propone y mantiene `human_decision_required`; no habilita jugadores. Falta completar administración inicial de usuarios/equipos/categorías y validar el circuito documental completo sin depender de vistas históricas o configuraciones manuales.

Referencias: `inicializarAsociacion`, `renderAuditoriaDocumentalAsociacion`, `renderAuditoriasIAPanel`, `review_team_document`, `review_player_document`, `apdb_list_document_ai_audits`, `apdb_association_update_result`.

### Circuito C - Competencia

**Recorrido cubierto:** categoría existente -> simulación/generación de fixture -> publicación segura si está vacía -> programación -> resultados -> tabla/desempate -> playoffs -> campeón -> cierre/informe.

**Estado: PARCIAL con núcleo deportivo operativo.** Los motores de fixture, tabla, desempate y playoffs existen y fueron probados con datos sintéticos. La integración de persistencia de fixture, programación, resultados y playoffs fue ejercitada contra Supabase aislado. El punto faltante es el alta administrativa inicial de torneo/categoría/equipos y la eliminación del fallback de escritura directa para una operación oficial segura.

Referencias: `apdb_publish_fixture`, `apdb_upsert_match_schedule`, `apdb_save_result`, `apdb_upsert_playoff_match`, `generarPartidosPlayoff`, `calcularTabla`, `renderPlayoffsSimple`, `tests/apdb-championship-scenario.cjs`, `tests/apdb-championship-isolated-integration.cjs`.

### Circuito D - Control institucional

**Recorrido cubierto:** permisos -> acciones sensibles -> auditoría de resultados/uso -> historial documental/OCR -> informes y listas.

**Estado: PARCIAL.** Hay estructuras append-only, RPC protegidas, vistas administrativas y pruebas negativas. Falta definir responsables, retención, exportación, respaldo y procedimiento de revisión institucional. El OCR no debe confundirse con una decisión humana ni con habilitación.

Referencias: `auditoria_resultados`, `v_result_change_logs_admin`, `app_usage_events`, `document_ai_audits`, `docs/APDB_2027_STAGING_RUNBOOK.md`, `docs/CENTRO_CONTINUIDAD.md`.

## 5. Evidencia técnica y pruebas

### Ejecutado en este relevamiento

Se ejecutaron contratos locales no destructivos. Aprobaron los contratos demo deportivos, fixture, resultados, playoffs, programación, aislamiento, documentación, sesión, configuración online, OCR, lectura OCR y continuidad. También aprobaron `node --check app_online.js` y `git diff --check`.

`tests/private-package-safety.cjs` no aprobó porque falta el directorio generado `private/apdb-2027-prueba-update-stage`; es una ausencia de artefacto de prueba local, no evidencia de una regresión funcional de la aplicación.

### Evidencia previa incorporada

- `APDB_DOCUMENT_AI_ADAPTER_OK`: adaptador OCR local, evidencia y decisión humana obligatoria.
- `APDB_DOCUMENT_AI_RPC_INTEGRATION_OK`: RPC OCR sobre PostgreSQL descartable.
- `POSTGRES_DOCUMENTATION_E2E_OK`: circuito documental PostgreSQL/Chromium certificado en el entorno aislado histórico.
- Certificaciones previas de staging informadas en continuidad: Asociación, Delegado, programación, corrección/carga de resultados, Top 4 visible y recuperación tras recarga.
- En staging, consulta de solo lectura del 2026-11-22: 1 torneo, 1 categoría, 4 equipos, 7 partidos, 3 partidos de playoffs, 1 programación, 2 documentos de equipo y 4 auditorías OCR.
- En staging, las RPC OCR tienen `EXECUTE` para `authenticated` y no para `anon`.

### No certificado por este relevamiento

- No se volvió a ejecutar Chromium contra la URL web privada en esta etapa.
- No se ejecutó una nueva sesión Auth con credenciales; no se solicitaron secretos.
- No se ejecutó Storage real contra archivos médicos.
- No se ejecutó backup/restauración de producción.
- No se validaron todos los formatos Top 4/6/8 en una única operación institucional vigente.
- No se validó creación inicial completa de torneo/categoría desde la interfaz.

## 6. Riesgos y bloqueos

### Impedimentos para una demostración institucional

- El despliegue web puede quedar desactualizado respecto de la rama si no se suben los archivos construidos con configuración staging.
- La clave pública de staging no debe quedar en Git; el paquete debe generarse con el constructor aprobado.
- La protección Directory Privacy debe conservarse al reemplazar archivos.

### Impedimentos para un piloto controlado

- Falta cerrar la matriz de usuarios: Asociación, Delegados autorizados, Delegado ajeno, revocado y autenticado sin permisos.
- Falta procedimiento de carga y recuperación de Storage sintético y política de URLs firmadas.
- Falta validar el circuito completo documental desde Delegado hasta decisión humana y lista de buena fe.
- Falta definir quién administra altas, revocaciones, criterios documentales y backups.

### Impedimentos para operación real

- No hay migración de datos oficiales ni procedimiento aprobado de coexistencia con 2026.
- La creación administrativa de torneo/categoría/equipos no está cerrada como flujo persistente completo.
- El frontend conserva rutas heredadas de escritura directa cuando `secureResults=1` no está activo, especialmente publicación de fixture.
- Las claves heredadas de Delegado en frontend no son suficientes como modelo de seguridad institucional.
- No existe respaldo/restauración productiva comprobada ni runbook operativo aprobado.

## 7. Funciones listas para demostrar

1. Público: categoría, fixture, resultados, tabla, desempate y playoffs sintéticos.
2. Asociación: selección de categoría, corrección de resultado, programación, consulta de tabla/playoffs, informes y cierre previo.
3. Delegado: sesión sintética, selección de equipo/partido y carga de resultado autorizada.
4. Documentación sintética: requisitos, estados pendiente/completo, revisión humana e historial.
5. OCR: hallazgos sintéticos, evidencia por página, confianza, estado consultivo y reanálisis trazable.
6. Separación de permisos y rechazo de operaciones ajenas en staging/entornos aislados donde fue ejecutado.

## 8. Faltantes para un piloto

1. Crear una categoría piloto persistente mediante el procedimiento administrativo aprobado, sin reutilizar una categoría histórica.
2. Crear equipos, delegados y permisos con una matriz firmada por APdB.
3. Validar Auth, RLS, RPC y Storage con las identidades sintéticas definitivas.
4. Certificar carga documental sintética, lectura por Asociación, aislamiento por equipo y decisión humana.
5. Cerrar el flujo de lista de buena fe y habilitación deportiva.
6. Ejecutar Chromium contra la URL privada actualizada.
7. Ensayar backup y restauración del staging persistente.
8. Congelar el paquete de despliegue y preparar reversión.

## 9. Pendientes para operación institucional

- Definir torneo, categorías, equipos, calendario, reglas de desempate y formatos de playoffs oficiales.
- Definir roles, responsables y circuito de revocación.
- Aprobar catálogo de requisitos y tratamiento de documentos.
- Definir quién toma la decisión humana y cómo se archiva la evidencia.
- Definir informes obligatorios para árbitros, clubes y Asociación.
- Aprobar frecuencia de backups, custodios y prueba de restauración.
- Resolver hosting privado, HTTPS, Directory Privacy inicial y procedimiento de actualización.
- Definir migración o carga inicial sin modificar 2026.

## 10. Plan priorizado por bloques cerrados

### Bloque 1 - Staging reproducible y seguridad de acceso

Cerrar configuración de staging, identidad pública, Auth/RLS/Storage, matriz de roles y backup sintético. Salida: checklist de acceso y reversión aprobado.

### Bloque 2 - Alta administrativa 2027

Completar o implementar de forma segura alta de torneo, categoría, equipos, permisos y participantes. Salida: torneo sintético creado desde el circuito administrativo y recuperado después de recarga.

### Bloque 3 - Competencia persistente

Publicar fixture mediante RPC, programar, cargar resultados, verificar tabla/desempate, generar playoffs y cerrar campeonato. Salida: recorrido completo con Asociación, Delegado y Público.

### Bloque 4 - Documentación y habilitación

Completar documentos institucionales/de jugador, lista de buena fe, Storage privado, OCR consultivo, revisión humana e informes de cancha. Salida: una jugadora sintética atraviesa el circuito sin alterar habilitación automáticamente.

### Bloque 5 - Operación y continuidad

Backup/restore, auditoría, retención, informes, paquete cPanel y reversión. Salida: piloto repetible por otra persona sin conocimiento del repositorio.

## 11. Reducción de intervención manual

1. Mantener un único `apdb-staging-config.local.json` fuera de Git y validar URL, entorno y clave antes de construir.
2. Crear un comando único de preparación que ejecute validación de configuración, construcción, hashes y contratos locales.
3. Mantener seeds sintéticos idempotentes separados de migraciones y sin `db reset` contra staging persistente.
4. Generar un manifiesto de despliegue con SHA de cada archivo y una lista explícita de archivos que no deben reemplazarse (`.htaccess`, Directory Privacy, configuración externa).
5. Automatizar sólo la verificación posterior: URL, carga de HTML/JS, versión del commit, login sintético y lectura pública; mantener manual la aprobación de cambios de permisos y datos oficiales.
6. Usar una identidad técnica OCR separada, con contraseña introducida interactivamente y sin secretos en CI, Git o navegador.
7. Convertir el cierre del piloto en una checklist ejecutable: datos sintéticos, tres roles, prueba negativa, recarga, backup y reversión.

## 12. Decisión recomendada

Presentar ahora una demostración institucional privada del núcleo deportivo y del OCR sintético, aclarando qué es staging y qué requiere backend persistente. No presentar todavía la plataforma como reemplazo completo de GES.

El siguiente trabajo funcional debe ser cerrar el alta administrativa persistente de torneo/categoría/equipos y su recorrido con tres identidades. En paralelo, debe cerrarse el paquete de Storage documental y backup. No conviene ampliar el OCR: su integración, idempotencia, reanálisis, permisos de lectura y visualización ya tienen una base funcional; lo pendiente es operación y aceptación institucional.

## Referencias principales

- `app_online.js`
- `index_online.html`
- `supabase/migrations/`
- `tests/apdb-championship-isolated-integration.cjs`
- `tests/apdb-isolated-browser.spec.cjs`
- `tests/apdb-staging-permissions.cjs`
- `tests/apdb-staging-ocr.cjs`
- `docs/APDB_2027_STAGING_RUNBOOK.md`
- `docs/APDB_2027_ENTREGA_INSTITUCIONAL.md`
- `docs/CENTRO_CONTINUIDAD.md`
- `docs/control-proyecto.md`
