# Supabase Storage - Bucket documentos

## Bucket

Nombre sugerido:

```text
documentos
```

## Uso

Guardar archivos documentales de equipos y jugadores.

## Ruta recomendada

```text
{organizacion_slug}/{temporada}/{categoria}/{equipo_id}/{requirement_id}/{timestamp}-{file_name}
```

Ejemplo:

```text
apdb/2026/maxi-35-a/7d56c26a-3c31-42f8-9879-f61fda51efe8/certificado-medico/20260510-certificado.pdf
```

## Reglas iniciales

Primera etapa:

- crear bucket privado;
- subir archivos solo desde flujo controlado;
- guardar `storage_path` en `team_documents`;
- mostrar o descargar mediante URL firmada en etapa posterior.

## Tipos de archivo permitidos sugeridos

- PDF
- JPG
- PNG

## Tamano maximo sugerido

Primera version:

- 10 MB por archivo.

## No hacer todavia

- No hacer bucket publico.
- No permitir borrado desde delegado.
- No bloquear resultados deportivos por archivo faltante.
- No activar politicas complejas sin prueba.

## Politica futura

Cuando delegados migren a permisos reales:

- delegado sube solo a sus equipos;
- asociacion lee todo;
- asociacion aprueba/observa desde metadata;
- auditoria queda en `document_events`.

