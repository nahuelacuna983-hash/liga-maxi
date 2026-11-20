# APdB 2027 - Bloque 2: contrato del adaptador OCR local

## Estado

Implementado y probado localmente en `codex/apdb-2027-operational-hardening`, sin conexión a Supabase.

## Contrato

`tools/document-audit-local/src/document-ai-adapter.cjs` transforma el resultado `apdb-local-document-audit/1.0` en filas compatibles con `document_ai_audits`. Genera una fila por archivo analizado y conserva:

- `scope`, IDs de documento y contexto organización/torneo/categoría/equipo;
- `audit_status`, siempre dentro del CHECK existente;
- observaciones, dudas, comparación de identidad y `human_decision_required` dentro de `findings`;
- texto por página en `extracted_text`;
- fechas detectadas en `detected_dates`;
- controles en `checks`;
- método OCR en `model`;
- respuesta local completa en `raw_response`;
- página, fragmento, coordenadas, método y confianza en `page_evidence`;
- hash combinado de los archivos en `source_hash`, versión en `criteria_version` y origen `local_file`.

El adaptador no produce `approved`, no cambia estados documentales y no llama a Supabase. `listo_aprobar` sigue siendo consultivo; la decisión humana continúa en las RPC existentes.

## Reanálisis

Cada ejecución devuelve un payload de inserción independiente. No ejecuta `UPDATE` ni sobrescribe decisiones. El hash de entrada permite identificar el mismo análisis y la aplicación futura debe insertar una nueva auditoría, conservando el historial append-only.

## Pruebas

```powershell
npm run test:document-audit
npm run test:document-ai-adapter
```

La primera conserva las seis pruebas del Bloque 1. La segunda verifica dos filas, evidencia, compatibilidad de estados, hash estable, decisión humana obligatoria y rechazos de entradas inválidas.

## Bloque 3 propuesto

En staging, una RPC estrecha debería recibir el `document_id`, contexto y payload validado, comprobar la identidad y el alcance del usuario mediante RLS, y hacer únicamente `INSERT` en `document_ai_audits`. El procesador local usaría una sesión autenticada o una URL firmada de corta duración; nunca `service_role`. La RPC no debe modificar `team_documents`, `player_documents`, habilitaciones ni decisiones humanas.

Antes de implementarla deben confirmarse en staging los permisos efectivos de las vistas de equipo y jugador y la versión activa de `document_audit_criteria_versions`.
