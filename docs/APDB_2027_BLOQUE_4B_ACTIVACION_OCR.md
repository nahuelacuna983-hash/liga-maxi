# APdB 2027 - activación OCR en staging

## Preflight verificado

Destino autorizado: `wffvmthdmmjwspnozyrv` mediante la conexión Yani.

El esquema de staging coincide con las columnas requeridas por `document_ai_audits` y `document_audit_criteria_versions`. La RPC OCR todavía no existe. La restricción actual de `app_users.role` sólo admite roles humanos:

`admin_general`, `asociacion`, `delegado`, `jugador`, `publico`.

No hay triggers adicionales sobre `app_users`, no existe ninguna fila `auditor_ocr` y staging no contiene auditorías automáticas previas en esta consulta.

## Activación autorizada pendiente

1. Aplicar exclusivamente `20261120000000_apdb_automatic_document_audit_rpc.sql`.
2. Crear una identidad Auth sintética exclusiva para el worker, sin usar `service_role`.
3. Insertar una fila `app_users` con esa identidad, organización sintética, `active=true` y `role='auditor_ocr'`.
4. Crear o reutilizar sólo un documento sintético y una versión activa de criterios.
5. Ejecutar la RPC con la sesión del worker.
6. Repetir la misma solicitud y comprobar que devuelve el mismo UUID.
7. Cambiar el hash de origen y comprobar que crea una segunda auditoría sin modificar la primera.
8. Probar `anon`, delegado y usuario común; todos deben ser rechazados.
9. Comparar antes/después documentos, revisiones, habilitaciones, partidos, resultados y playoffs.

## Reversión sin borrar datos

Si la activación falla, revocar `EXECUTE` de la RPC para `authenticated` y retirar la función. No borrar filas de `document_ai_audits` ni documentos existentes. La reversión debe conservar cualquier auditoría sintética para investigación y requiere una migración explícita posterior.

## Estado actual

La Etapa 2 no fue ejecutada: falta autorización expresa para aplicar la migración y crear la identidad técnica. Producción, staging y datos deportivos permanecen sin cambios.
