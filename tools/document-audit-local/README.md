# Auditor documental local - prueba de concepto

Prueba aislada y gratuita para extraer nombre, DNI y fecha desde documentos sintéticos. No se conecta a Supabase, no modifica auditorías y no interpreta información clínica.

## Herramientas

- `pdfjs-dist`: extracción directa de PDFs con capa de texto.
- `Tesseract.js` y `@tesseract.js-data/spa`: OCR local con modelo español incluido en el proyecto.
- `pdf-lib`: generación reproducible de PDFs sintéticos.
- `sharp`: generación de páginas rasterizadas que simulan un documento escaneado.
- Poppler `pdftoppm`: conversión de páginas PDF a PNG antes del OCR.

Todas las bibliotecas son gratuitas y se instalan localmente mediante npm. No se instala software global. Poppler ya forma parte del entorno de Codex; en otro equipo debe estar disponible en `PATH` o indicarse con `PDFTOPPM_PATH`.

## Requisitos

- Node.js 24 o compatible.
- Aproximadamente 250 MB libres para dependencias y archivos temporales.
- CPU x64; no requiere GPU.
- Poppler con `pdftoppm`.

## Ejecución

Instalar dependencias locales:

```powershell
npm ci
```

Generar nuevamente los documentos ficticios:

```powershell
npm run fixtures:document-audit
```

Ejecutar las seis pruebas:

```powershell
npm run test:document-audit
```

El detalle medido queda en `test-results/document-audit-local/test-results.json`. Esa carpeta está ignorada por Git porque los tiempos y la fecha cambian en cada equipo.

Ejecutar manualmente una comparación:

```powershell
node tools/document-audit-local/src/cli.cjs `
  tests/fixtures/document-audit/certificado-texto.pdf `
  tests/fixtures/document-audit/ecg-escaneado-multipagina.pdf `
  test-results/document-audit-local/manual.json
```

Si `pdftoppm` no está en `PATH`:

```powershell
$env:PDFTOPPM_PATH = "C:\ruta\a\pdftoppm.exe"
npm run test:document-audit
```

## Salida y límites

La salida JSON identifica el método utilizado, hash del archivo, campos, evidencia, página, texto, coordenadas y confianza. La comparación puede ser `coincidente`, `inconsistente` o `no_concluyente`.

`audit_status: listo_aprobar` significa únicamente que la preauditoría no detectó inconsistencias en los campos probados. `human_decision_required` permanece siempre en `true`: la herramienta no aprueba ni rechaza personas o documentos.

Esta prueba sólo reconoce campos rotulados de forma clara. Manuscritos, fotografías deficientes, diseños desconocidos o trazados médicos quedan fuera del alcance y deben resultar en revisión humana.
