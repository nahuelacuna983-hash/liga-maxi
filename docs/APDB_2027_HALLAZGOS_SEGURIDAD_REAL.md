# APdB 2027 — Hallazgos reales de seguridad (solo lectura)

**Origen:** consultas de solo lectura y Supabase Security Advisors del proyecto `liga-maxi` (2026-11-09). No se han exportado contenidos personales o documentos. No hay cambios de producción.

## Advertencias vigentes comunicadas por Supabase

| Advisor | Total | Severidad comunicada | Referencia |
|---|---:|---|---|
| RLS enabled no policy | 12 | INFO | https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy |
| Security definer view | 9 | ERROR | https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view |
| Function search path mutable | 3 | WARN | https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable |
| Anon executable SECURITY DEFINER functions | 17 | WARN | https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable |
| Authenticated executable SECURITY DEFINER functions | 20 | WARN | https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable |
| Leaked password protection off | 1 | WARN | https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection |

*Los contadores de funciones incluyen firmas concretas; categorías de avisos pueden solaparse. No sumar como fallos independientes.*

## Vistas concretas señaladas

`v_team_documents_admin`, `v_app_user_permissions`, `v_document_ai_audits_latest`, `v_player_documents_admin`, `v_player_documents_admin_ai`, `v_drive_player_documents_admin`, `v_team_documents_admin_ai`, `v_document_audit_results_admin`, `v_result_change_logs_admin`.

Ninguna debe ser cambiada a `security_invoker` indiscriminadamente: primero verificar sus tablas base, RLS, grants y las consultas que hace `app_online.js`.

## Funciones sin search_path fijado señaladas

`upsert_team_document_metadata`, `create_document_reminder`, `set_updated_at`.

## Secuencia segura de corrección

1. Sacar una copia restaurable en entorno aislado de **esquema, funciones y políticas**; no copiar archivos médicos. Validar rollback.
2. Priorizar comprobaciones de exposición de vistas administrativas y lecturas de Storage.
3. Modificar RLS/RPC en el clon **junto con** el consumidor del frontend, especialmente `partidos`, `categorias`, `playoff_matches` y `match_schedules`; no cerrar escrituras legacy por separado.
4. Realizar pruebas efectivas como `anon`, Delegado A, Delegado B y Asociación (identidades de prueba). Comprobar lectura pública y denegaciones cruzadas.
5. Sólo luego preparar scripts productivos revisados, con backup y ventana de cambio autorizada.

## Alcance y bloqueos

- **Confirmado:** exposición administrativa potencial relevante y acoplamiento del frontend vigente a escrituras directas.
- **No comprobado:** que un usuario anónimo pueda materialmente modificar o leer cada registro mediante HTTP; requiere JWT y pruebas de políticas combinadas.
- **No disponible en este bloque:** clon Supabase aislado. La creación de una rama Supabase puede incurrir cargos; no se abrió ninguna rama ni se modificó un proyecto.

**Puerta de salida:** ningún despliegue hasta tener regresiones de operaciones reales y resultado de seguridad del clon, con documentos privados y datos históricos protegidos.
