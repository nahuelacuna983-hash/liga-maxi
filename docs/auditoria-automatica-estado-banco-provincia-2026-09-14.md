# Auditoria automatica documental - estado y prueba Banco Provincia

Fecha: 2026-09-14

## Objetivo

Procesar documentos originales, aplicar criterios APdB Maxi Basquet 2026, conservar originales y resultados, vincular cada conclusion con archivo/pagina, versionar criterios y permitir reprocesar solo lo afectado.

La aprobacion final sigue siendo humana/administrativa. Los casos no resueltos quedan como `pendiente` o `revisar`; no deben convertirse automaticamente en incumplimientos.

## Estado actual de la app

Funciona:

- Carga de documentos de equipo y jugador en tablas `team_documents` y `player_documents`.
- Conservacion de archivos privados cuando existe `storage_path` en bucket `documentos`.
- Revision administrativa con `review_team_document` y `review_player_document`.
- Pantallas de Delegados/Asociacion para ver carga, estados y preauditoria.
- Tabla `document_ai_audits` y vistas `v_team_documents_admin_ai` / `v_player_documents_admin_ai` previstas para dictamen automatico.
- Edge Function `auditar-documento` scaffold local.

Falta o esta incompleto:

- Banco Provincia tiene documentos de equipo pendientes en Supabase, pero sin `storage_path`.
- No se observaron documentos por jugador de Banco vinculados en `v_player_documents_admin`.
- Los originales de Banco estan en Drive, no ingestados todavia en Storage privado de la app.
- La Edge Function actual solo audita documentos ya subidos a Storage privado; no lee Drive directo.
- No habia versionado formal de criterios ni evidencia por pagina. Se agrego en este cambio.
- Falta UI para disparar auditoria IA, ver evidencia por pagina y reprocesar por criterio/archivo.

## Banco Provincia - referencia de prueba

Fuente original: carpeta Drive `BANCO PROVINCIA`.

La carpeta contiene:

- Lista de buena fe.
- Pago/habilitaciones y seguro.
- 18 PDFs nominales de jugadores.
- Planilla `01 - BANCO PROVINCIA HABILITADOS.xlsx`.

Referencia de planilla maestra:

- Jugadores auditados: 18.
- Control individual conforme: 13.
- Observados: 5.
- Este dato se usa como contraste, no como verdad a forzar.

## Casos indispensables verificados contra originales

### Raffa Mariano

Original revisado: `RAFFA MARIANO.pdf`.

Hallazgo:

- El texto extraido muestra una ergometria del 17/03/2026.
- La planilla de referencia marca que paginas 14-16 contienen ECG + certificado APTO del 16/03/2026, mismo dia, y que la ergometria posterior es adicional.
- Regla requerida: el sistema debe poder aceptar ECG + certificado APTO del mismo dia como complemento alternativo y no invalidar por una ergometria adicional posterior.

Riesgo tecnico:

- El fetch textual no mostro el certificado APTO de paginas posteriores; se necesita lectura visual/PDF completa por pagina.

### Suppes Carlos Federico

Original revisado: `SUPPES FEDERICO.pdf`.

Hallazgo:

- La DJDR extraida contiene texto corrupto en fecha: mezcla mes/anio con caracteres raros y no sostiene 2026 con claridad.
- El medico muestra datos de estudio 19/03/2025, con texto/metadatos impresos donde aparece 18/03/2026.
- La referencia indica medico validado pero DJDR vencido 22/02/2024.

Regla requerida:

- Distinguir fechas visibles reales del documento contra texto extraido/metadatos impresos.
- Si hay conflicto no resuelto, dejar `revisar`/`pendiente`, no incumplimiento automatico.

### Barragan Matias

Original revisado: `BARRAGAN MATIAS.pdf`.

Hallazgo:

- La DJDR contiene nombre y datos, pero el area de firma queda como linea/plantilla; no se observa firma del jugador en el texto.
- El medico tiene estudios del 25/02/2026.
- La referencia valida medico y observa DJDR sin firma.

Regla requerida:

- Nombre escrito/datos completados no equivalen a firma visible.
- Si la firma no puede verificarse visualmente, `revisar`/`observado` segun evidencia, con pagina.

## Cambios aplicados en codigo

- Edge Function `auditar-documento`:
  - agrega version de criterios `APDB_MAXI_2026_V1`;
  - exige `page_evidence`;
  - agrega `unresolved_reason`;
  - protege contra desplazamiento entre jugadores;
  - incorpora reglas de regresion Banco: Raffa, Suppes y Barragan;
  - permite `pendiente` como estado de duda/no resolucion automatica.

- SQL `ejecutar-en-supabase-auditoria-ia-documentos.sql`:
  - agrega `document_audit_criteria_versions`;
  - agrega columnas a `document_ai_audits`: `criteria_version`, `unresolved_reason`, `page_evidence`, `source_kind`, `source_file_id`, `source_file_url`, `source_modified_at`, `source_hash`;
  - expone esos campos en vistas IA.

## Bloqueos reales para auditar 21 clubes

1. Ingestion:
   - Los originales estan en Drive, pero la funcion audita Storage privado.
   - Hace falta copiar/subir o registrar los originales en `player_documents`/`team_documents` con `storage_path`.

2. Identidad y no desplazamiento:
   - Debe existir vinculo correcto jugador-documento.
   - Si un PDF contiene varios documentos, la evidencia debe citar paginas.

3. Vision por pagina:
   - El texto extraido no alcanza para firma, sello, paginas faltantes, ni fechas visuales conflictivas.
   - La auditoria debe usar PDF completo en modelo con vision o render por paginas.

4. UI / operacion:
   - Falta boton de disparo y pantalla de resultados IA con evidencias.
   - Falta modo batch por club/categoria y reproceso por version.

5. Edge Function:
   - Debe estar deployada con Secrets configurados.
   - No se pudo confirmar desde codigo local que este deploy ya exista.

## Alcance posible en una jornada

Estimacion si los secretos y deploy funcionan:

- 1 a 2 horas: ejecutar SQL actualizado, deployar Edge Function, probar un documento cargado en Storage.
- 2 a 4 horas: ingestar Banco Provincia a Storage privado y vincular 18 jugadores + 2 documentos de plantel.
- 2 a 3 horas: correr auditoria Banco, revisar los 3 casos de regresion y ajustar prompt/salida.
- 1 hora: generar informe Banco con conteo conforme/observado/pendiente y evidencias.

Total realista para una jornada:

- Banco Provincia completo, con informe de contraste.
- Motor listo para repetir club por club.
- No es realista cerrar automaticamente los 21 clubes en una jornada sin ingestion masiva estable y control de errores.

Alcance de 21 clubes en una jornada si se acepta modo semiautomatico:

- Inventario Drive + mapeo de archivos por club.
- Auditoria automatica parcial de los clubes con originales legibles.
- Cola de pendientes explicitos para los casos con firma/sello/fecha dudosa.

## Proximo paso tecnico recomendado

1. Ejecutar/actualizar SQL de auditoria IA.
2. Deployar Edge Function `auditar-documento`.
3. Crear flujo de ingestion Banco: Drive -> Storage privado -> `team_documents` / `player_documents`.
4. Correr Banco y comparar contra 18/13/5.
5. Recien despues escalar a los otros clubes.
