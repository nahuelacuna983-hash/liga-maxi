# APdB 2027 - Bloque 0: inventario para auditor documental local

Fecha del relevamiento: 20/11/2026  
Rama: `codex/apdb-2027-operational-hardening`  
Alcance: análisis e integración propuesta. No se implementó OCR ni se modificaron datos, RLS, Storage o producción.

## Conclusión ejecutiva

La propuesta de OCR local, reglas configurables y revisión humana es compatible con APdB 2027. No hace falta crear una aplicación ni un circuito documental paralelo.

APdB ya dispone de requisitos documentales, documentos por equipo y jugador, archivos en Storage, estados, observaciones, historial de eventos, revisión humana y una tabla estructurada para resultados automáticos (`document_ai_audits`). La integración correcta consiste en reemplazar o complementar la etapa de extracción actualmente asociada a una API paga, conservando el contrato de auditoría y dejando la decisión final en manos de Asociación.

La primera prueba debe ejecutarse completamente en local, con documentos sintéticos, sin Supabase y sin credenciales. Después de validar precisión y evidencia, podrá diseñarse una incorporación autenticada y de privilegios mínimos.

## Inventario técnico real

### Modelo documental

| Componente | Función actual | Fuente principal |
|---|---|---|
| `document_requirements` | Requisitos por organización, torneo y categoría. Distingue equipo/jugador, obligatoriedad, vencimiento y múltiples archivos. | [`20261111000000_apdb_isolated_schema.sql`](../supabase/migrations/20261111000000_apdb_isolated_schema.sql) |
| `team_documents` | Documento de equipo, metadatos, estado, vencimiento, observación y revisión humana. | Mismo archivo |
| `player_documents` | Documento de jugador vinculado a persona y requisito. | Mismo archivo |
| `document_files` | Archivos adicionales de un documento de equipo. | Mismo archivo |
| `document_events` / `player_document_events` | Historial de cargas, revisiones, recordatorios y cambios documentales. | Mismo archivo |
| `team_audit_closure_events` | Cierre conforme, cierre con observaciones y reapertura de auditorías. | Mismo archivo |
| `document_ai_audits` | Resultado estructurado de auditorías automáticas: estado, confianza, hallazgos, texto extraído, fechas, controles y evidencia por página. | Mismo archivo |
| `document_audit_criteria_versions` | Versionado de criterios configurables de auditoría. | Mismo archivo |
| `document_audit_results` | Resultados importados desde fuentes externas; no reemplaza el circuito documental principal. | Mismo archivo |
| `drive_player_documents` | Puente con documentos alojados en Drive. | Mismo archivo |

### Relaciones

La jerarquía deportiva es `organización -> torneo -> categoría -> equipo`. Los jugadores se vinculan mediante `team_players` a organización, torneo, categoría y equipo.

Los requisitos se definen para equipo o jugador. Un documento de equipo referencia el requisito y su contexto deportivo; un documento de jugador referencia además a `team_players`. Una fila de `document_ai_audits` apunta a un documento de equipo o de jugador, nunca a ambos, y conserva copias de contexto para trazabilidad.

El OCR no debe modificar estas relaciones ni crear una segunda identidad documental. Su salida debe asociarse al documento ya existente.

### Funciones y RPC existentes

El frontend y los scripts documentales ya contemplan, entre otras, estas operaciones:

- `upsert_team_document_metadata`
- `mark_team_document_uploaded`
- `add_team_document_file`
- `review_team_document`
- `ensure_player_documents`
- `add_team_player`
- `mark_player_document_uploaded`
- `review_player_document`
- `review_drive_player_document`
- `create_document_reminder`

Las definiciones operativas están distribuidas en [`docs/ejecutar-en-supabase-documentacion.sql`](ejecutar-en-supabase-documentacion.sql) y los scripts complementarios de documentación. Antes de integrar el OCR debe verificarse en staging que la definición desplegada coincida con esos archivos: actualmente no todas las funciones aparecen consolidadas en la cadena principal de migraciones.

### RLS y vistas protegidas

Las tablas documentales tienen RLS habilitado y no poseen lectura pública amplia. La migración [`20261116000000_apdb_document_access_fix.sql`](../supabase/migrations/20261116000000_apdb_document_access_fix.sql) incorpora `apdb_document_access_allowed(...)` y reconstruye `v_team_documents_admin` para limitar el acceso por organización, categoría, equipo y permisos activos. [`20261116000001_apdb_document_access_authenticated_execute.sql`](../supabase/migrations/20261116000001_apdb_document_access_authenticated_execute.sql) limita la ejecución del helper a usuarios autenticados.

Antes de cualquier integración con documentos de jugadores debe verificarse el contrato efectivo de su vista protegida, propietario, privilegios y comportamiento RLS en staging. No corresponde ampliar permisos para facilitar el OCR.

### Storage

El bucket privado `documentos` admite PDF, JPEG y PNG, con límite de 10 MB. Las políticas restringen las operaciones a usuarios autenticados y validan la organización utilizando el primer segmento de la ruta. El frontend ya genera rutas por temporada y contexto documental.

Para una integración posterior, el procesador debe recibir el archivo mediante el permiso del usuario autenticado o una URL firmada de corta duración. No necesita acceso general al bucket.

## Funcionalidad reutilizable

1. El modelo `document_ai_audits` ya cubre casi toda la salida requerida por el OCR: texto, confianza, hallazgos, fechas, controles, evidencia y versión de criterios.
2. `document_audit_criteria_versions` permite almacenar reglas versionadas sin incrustarlas permanentemente en el código.
3. Las vistas administrativas con auditoría ya combinan el documento con su último análisis automático.
4. El frontend ya separa la preauditoría de la aprobación administrativa y conserva la confirmación humana.
5. Las RPC de revisión ya registran estado, observación, revisor y fecha.
6. Los eventos documentales y cierres proporcionan trazabilidad sin inventar otro historial.
7. [`supabase/functions/auditar-documento/index.ts`](../supabase/functions/auditar-documento/index.ts) contiene reglas y un contrato de respuesta aprovechables, aunque su proveedor y su modelo de privilegios no son apropiados para la prueba gratuita local.

## Compatibilidad con la propuesta de Grok

| Propuesta resumida | Compatibilidad | Adaptación necesaria |
|---|---|---|
| OCR local gratuito | Alta | Sustituir la extracción remota por un ejecutor local; no duplicar el circuito documental. |
| Reglas configurables | Alta | Expresarlas mediante versiones de criterios y extractores por tipo documental. |
| Revisión humana | Ya existe | El análisis automático debe ser consultivo; sólo las RPC de revisión humana cambian el estado administrativo. |
| Evidencia del hallazgo | Ya modelada | Completar `page_evidence`, hallazgos y controles con página, texto y coordenadas cuando estén disponibles. |
| Aplicación separada | Incompatible | Debe ser una herramienta interna del mismo sistema y utilizar sus documentos, permisos y auditorías. |
| Uso general de `service_role` | Innecesario y riesgoso | Usar sesión autenticada, RLS y una operación de escritura estrecha y validada. |

No se encontró en el repositorio el informe completo de Grok. Esta comparación se limita a la propuesta resumida en la misión. El documento original será necesario para validar dependencias, licencias y supuestos específicos antes de implementar.

## Riesgos de integración

1. **Deriva entre SQL documental y migraciones.** Algunas funciones están en scripts operativos de `docs`; debe comprobarse la definición real en staging antes de depender de ellas.
2. **Acceso a documentos de jugadores.** Debe certificarse que su vista protegida aplica el mismo aislamiento esperado que la vista de equipos.
3. **Falsos positivos.** Un nombre, DNI o fecha detectados no equivalen a validez documental. Los casos dudosos deben quedar en `revisar`.
4. **Calidad y orientación de escaneos.** Ruido, rotación, escritura manual y sellos pueden degradar el OCR. La evidencia debe permitir comprobar cada extracción.
5. **Datos sensibles.** Texto y temporales no deben quedar en logs ni carpetas compartidas. La prueba sólo utilizará identidades sintéticas.
6. **Duplicación de análisis.** Debe usarse un hash del archivo y la versión de criterios para lograr idempotencia.
7. **Dependencia local.** El equipo de ejecución necesita una instalación reproducible, fijada y verificable del motor OCR.
8. **Privilegios excesivos.** El procesador nunca debe poder aprobar documentos ni recorrer indiscriminadamente Storage.

## Primera prueba de concepto

### Alcance

Procesar localmente dos documentos totalmente sintéticos: un certificado y un ECG pertenecientes a una misma persona ficticia. Extraer nombre, DNI y fecha; ejecutar reglas deterministas; producir observaciones y evidencia estructurada.

### Flujo propuesto

1. Crear documentos sintéticos y un manifiesto con los valores esperados.
2. Rasterizar los PDF a 300 DPI con `pdftoppm`, ya disponible en el entorno de trabajo.
3. Preprocesar las páginas: escala de grises, corrección de inclinación, contraste y umbral.
4. Ejecutar OCR local en español.
5. Normalizar el texto y aplicar extractores para nombre, DNI y fechas.
6. Ejecutar reglas por tipo documental y comparación cruzada entre certificado y ECG.
7. Generar JSON compatible con un subconjunto de `document_ai_audits`, incluyendo página, fragmento o coordenadas y confianza.
8. Marcar los resultados únicamente como `listo_aprobar`, `revisar` o `error`; nunca como aprobación humana.
9. Repetir con variantes sintéticas: DNI diferente, fecha ausente y escaneo degradado.

### Dependencia a justificar

No hay un motor OCR instalado actualmente. Para la prueba se propone Tesseract OCR local con datos de idioma español, fijando versión, licencia y checksum. Se reutilizarán `pdftoppm` y las bibliotecas de imagen ya disponibles. No se instalará nada hasta aprobar esta dependencia.

### Seguridad y credenciales

La primera prueba no se conectará a Supabase, no leerá Storage y no necesitará claves.

En una segunda etapa, un usuario autenticado y autorizado podrá solicitar el documento concreto mediante RLS o URL firmada de corta duración. La devolución del análisis deberá pasar por una RPC o endpoint estrecho que valide identidad, permisos, documento y campos permitidos. El procesador local no recibirá `service_role` y no tendrá capacidad de cambiar la decisión humana.

## Archivos previstos para una etapa autorizada

Crear:

- `tools/document-audit-local/README.md`
- `tools/document-audit-local/src/cli.cjs`
- `tools/document-audit-local/src/ocr.cjs`
- `tools/document-audit-local/src/extractors.cjs`
- `tools/document-audit-local/src/rules.cjs`
- `tools/document-audit-local/document-audit-result.schema.json`
- `tests/fixtures/document-audit/certificado-sintetico.pdf`
- `tests/fixtures/document-audit/ecg-sintetico.pdf`
- `tests/fixtures/document-audit/expected.json`
- `tests/document-audit-local.cjs`

Modificar, sólo después de aprobar la prueba:

- `package.json`, para agregar comandos reproducibles de prueba, sin introducir el OCR como servicio pago.
- [`supabase/functions/auditar-documento/index.ts`](../supabase/functions/auditar-documento/index.ts), si se conserva como punto de orquestación, separando proveedor, autorización y persistencia.
- Una migración futura y acotada, únicamente si hace falta una RPC autenticada para registrar resultados automáticos. No se propone crear nuevas tablas.
- [`app_online.js`](../app_online.js), sólo para iniciar o mostrar la auditoría local dentro del flujo existente.

## Pruebas y criterios de aceptación

- Los dos documentos sintéticos limpios devuelven exactamente el nombre, DNI y fecha esperados.
- Cada campo incluye evidencia verificable: página y fragmento; coordenadas cuando el motor las provea.
- Un DNI discordante, una fecha ausente o baja confianza producen `revisar`, nunca aprobación automática.
- Dos ejecuciones del mismo archivo y criterios generan el mismo hash y resultado funcional.
- El JSON cumple el esquema acordado y puede mapearse a `document_ai_audits` sin perder evidencia.
- La prueba no realiza solicitudes de red ni contiene credenciales.
- No escribe en Supabase, Storage, auditorías existentes ni resultados deportivos.
- Los archivos temporales se eliminan al finalizar, salvo salidas de prueba expresamente conservadas.
- Antes de integrar, se ejecutan las pruebas documentales, RLS y Storage existentes del repositorio.
- En staging se valida con identidades sintéticas que Asociación puede auditar documentos permitidos y un delegado no puede acceder a otro equipo.

## Próximo paso concreto

1. Obtener el informe original de Grok para contrastar herramientas, licencias y arquitectura.
2. Verificar en staging, en modo lectura, las definiciones efectivas de RPC, vistas de equipo/jugador, propietarios y privilegios.
3. Aprobar Tesseract como única dependencia nueva de la prueba.
4. Ejecutar la prueba local aislada con los dos documentos sintéticos y medir precisión, evidencia, tiempo y comportamiento ante discrepancias.

Hasta completar esos cuatro puntos no corresponde modificar el motor existente ni el esquema documental.
