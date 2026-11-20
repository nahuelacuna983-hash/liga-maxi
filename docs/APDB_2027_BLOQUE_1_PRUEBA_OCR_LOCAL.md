# APdB 2027 - Bloque 1: prueba real de OCR local gratuito

Fecha de ejecución: 20/11/2026

Rama: `codex/apdb-2027-operational-hardening`

Base: commit `91fe59c` e inventario [`APDB_2027_BLOQUE_0_INVENTARIO_OCR_LOCAL.md`](APDB_2027_BLOQUE_0_INVENTARIO_OCR_LOCAL.md).

## Resultado ejecutivo

La prueba es funcional y reproducible. Se ejecutaron las seis verificaciones obligatorias con documentos exclusivamente sintéticos y todas finalizaron correctamente. La solución combina extracción directa para PDFs con texto y OCR local para PDFs rasterizados, sin APIs pagas, Supabase ni credenciales.

El resultado es técnicamente compatible con `document_ai_audits`, pero todavía no debe conectarse al sistema. Antes se necesita probar documentos sintéticos con mayor variedad visual y definir el punto autenticado de persistencia.

## Herramientas seleccionadas

| Herramienta | Uso | Motivo |
|---|---|---|
| `pdfjs-dist` 5.4.530 | Leer texto y coordenadas de PDFs digitales. | Evita OCR innecesario y conserva evidencia posicional. Apache-2.0. |
| `Tesseract.js` 7.0.0 | OCR de páginas escaneadas. | Gratuito, ejecuta localmente y no envía documentos a servicios externos. Apache-2.0. |
| `@tesseract.js-data/spa` 1.0.0 | Modelo español local. | Evita descargar el idioma durante la ejecución. MIT. |
| `pdf-lib` 1.17.1 | Crear fixtures PDF. | Generación determinista sin software externo. MIT. |
| `sharp` 0.35.5 | Crear páginas rasterizadas sintéticas. | Permite comprobar el camino OCR con imágenes reales dentro del PDF. Apache-2.0. |
| Poppler `pdftoppm` | Rasterizar PDFs para OCR. | Ya estaba disponible en el entorno; no se instaló globalmente. |

`npm audit --audit-level=high` finalizó sin vulnerabilidades conocidas. La versión inicial considerada de `sharp` fue actualizada antes de la entrega porque el auditor de npm informó vulnerabilidades en su biblioteca de imágenes.

## Archivos creados

- `tools/document-audit-local/src/cli.cjs`: interfaz de consola.
- `tools/document-audit-local/src/audit.cjs`: selección de extracción y comparación.
- `tools/document-audit-local/src/pdf.cjs`: lectura directa y rasterización.
- `tools/document-audit-local/src/ocr.cjs`: OCR y coordenadas TSV.
- `tools/document-audit-local/src/fields.cjs`: normalización y extracción conservadora.
- `tools/document-audit-local/generate-fixtures.cjs`: generador de documentos ficticios.
- `tools/document-audit-local/document-audit-result.schema.json`: contrato de salida.
- `tools/document-audit-local/README.md`: instrucciones reproducibles.
- `tests/document-audit-local.cjs`: batería automatizada.
- `tests/fixtures/document-audit/`: certificado, ECG, variantes y valores esperados.

Se modificaron `package.json` y `package-lock.json` únicamente para declarar dependencias y comandos locales.

## Comandos

```powershell
npm ci
npm run test:document-audit
```

Comparación manual:

```powershell
node tools/document-audit-local/src/cli.cjs `
  tests/fixtures/document-audit/certificado-texto.pdf `
  tests/fixtures/document-audit/ecg-escaneado-multipagina.pdf `
  test-results/document-audit-local/manual.json
```

## Resultados reales

Ejecución medida en Windows x64 con Node.js 24.20.0:

| Prueba | Resultado comprobado |
|---|---|
| A. Misma persona | `PASS`: nombre y DNI coincidentes; estado consultivo `listo_aprobar`; decisión humana obligatoria. |
| B. Personas diferentes | `PASS`: DNI diferente detectado; identidad `inconsistente`; estado `revisar`. |
| C. Fecha ilegible | `PASS`: fecha `null`; duda explícita; no se inventó ningún valor. |
| D. PDF con texto | `PASS`: método `pdf_text`; no se ejecutó OCR. |
| E. Documento escaneado | `PASS`: método `local_ocr`; nombre, DNI y fecha extraídos con evidencia. |
| F. Multipágina | `PASS`: las tres evidencias identifican correctamente la página 2. |

La ejecución final completa de cuatro documentos demoró **6.351 segundos**. Desglose observado:

- Certificado con texto: 503 ms, incluyendo la inicialización de PDF.js.
- ECG escaneado de dos páginas: 2.172 s.
- ECG escaneado con DNI diferente: 3.662 s.
- Certificado con fecha ilegible y texto: 13 ms.

Los tiempos son orientativos y dependen de CPU, caché, resolución y cantidad de páginas. Las aserciones posteriores sobre resultados demoraron menos de 3 ms cada una.

## Evidencia producida

Cada campo extraído registra:

- documento;
- página;
- línea de texto reconocida;
- coordenadas de la línea;
- método (`pdf_text` o `local_ocr`);
- confianza cuando el motor la informa.

La salida incluye también hash SHA-256, texto por página, observaciones, dudas, controles comparativos y `human_decision_required: true`.

## Errores y limitaciones observados

La primera ejecución detectó correctamente texto mediante OCR, pero el adaptador agrupaba cada palabra TSV como una línea. Los extractores devolvieron `no_concluyente` en lugar de reconstruir campos por inferencia. Se corrigió el agrupamiento usando página, bloque, párrafo y línea, y se volvió a ejecutar toda la batería.

Limitaciones vigentes:

1. Los extractores esperan rótulos claros como `NOMBRE`, `DNI` y `FECHA`.
2. No se probaron manuscritos, fotos móviles, sellos superpuestos ni rotaciones severas.
3. El OCR puede confundir caracteres; por eso cualquier ausencia o discordancia termina en revisión.
4. No se interpreta el trazado del ECG ni ningún resultado clínico.
5. Poppler debe existir en el equipo de ejecución.
6. El piloto procesa secuencialmente; todavía no optimiza lotes ni reutiliza un worker OCR entre documentos.

## Hardware y operación

No requiere GPU. Para este piloto alcanza una PC Windows x64 con Node.js, CPU convencional, aproximadamente 250 MB libres para dependencias y espacio temporal proporcional a las páginas rasterizadas. Los temporales se crean en la carpeta del sistema y se eliminan después de cada documento.

No se utilizaron claves, variables de Supabase, documentos reales ni conexiones a producción.

## Compatibilidad con `document_ai_audits`

La salida puede mapearse sin crear tablas nuevas:

| Salida local | Campo existente |
|---|---|
| `audit_status` | `audit_status` |
| observaciones y dudas | `summary`, `findings`, `unresolved_reason` |
| texto por página | `extracted_text` |
| fecha detectada | `detected_dates` |
| comparación de identidad | `checks` |
| evidencia con página y coordenadas | `page_evidence` |
| hash SHA-256 | `source_hash` |
| versión del contrato/reglas | `criteria_version` o versión asociada |
| motor local | `model` / metadatos de origen |

No se implementó ese mapeo ni ninguna escritura. El estado `listo_aprobar` es una recomendación de preauditoría y no equivale a `aprobado`; las RPC humanas existentes deben seguir siendo el único mecanismo de decisión.

## Recomendación para el siguiente bloque

Realizar una segunda batería sintética con diseños variados y degradaciones controladas: baja resolución, inclinación, ruido, rótulos alternativos y campos parcialmente tapados. En paralelo, definir una operación autenticada y estrecha que reciba el JSON, valide permisos y documento objetivo, y registre una auditoría automática sin `service_role` en el procesador ni capacidad de modificar el estado humano.

No conviene integrar todavía el piloto con frontend o Storage hasta superar esa batería y verificar en staging las vistas y RPC documentales identificadas en el Bloque 0.
