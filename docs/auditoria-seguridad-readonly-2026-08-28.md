# Auditoria de seguridad read-only

Fecha: 28/08/2026

Objetivo: registrar hallazgos de seguridad antes de migrar a dominio propio.

## Alcance

Se hizo una prueba de lectura externa usando solamente:

- URL publica de Supabase;
- publishable/anon key incluida en `app_online.js`;
- consultas `GET` con `limit=1`;
- sin inserts, updates ni deletes.

## Resultado resumido

Responden lectura con anon:

- `torneos`
- `categorias`
- `partidos`
- `equipos`
- `document_requirements`
- `document_files`
- `team_players`
- `playoff_matches`
- `match_schedules`
- `app_usage_events`
- `v_team_documents_admin`
- `v_player_documents_admin`
- `v_drive_player_documents_admin`
- `v_document_audit_results_admin`
- `v_app_user_permissions`

No respondio:

- `documentos`: no existe como tabla expuesta con ese nombre; la app usa vistas/RPC relacionadas.

## Lectura del hallazgo

Esto no prueba por si solo que todos los datos esten expuestos de forma incorrecta, pero si muestra que el proyecto todavia esta en una etapa donde varias lecturas administrativas funcionan con la key publica.

El punto mas sensible no es que el publico pueda leer tabla/fixture, porque eso es parte del producto. Lo sensible es:

- vistas admin con documentos;
- archivos documentales;
- jugadores/documentos;
- permisos/usuarios;
- auditoria;
- funciones `security definer` concedidas a `anon`.

## Grants sensibles detectados en SQL historico

Archivos revisados:

- `ejecutar-en-supabase-permisos-base.sql`
- `ejecutar-en-supabase-auth-usuarios.sql`
- `ejecutar-en-supabase-documentacion-jugadores.sql`
- `ejecutar-en-supabase-documentacion-drive.sql`
- `ejecutar-en-supabase-playoffs.sql`
- `ejecutar-en-supabase-programacion.sql`

Grants a revisar antes de venta:

- `ensure_app_user` a `anon`
- `set_user_permission` a `anon`
- `add_team_player` a `anon`
- `mark_player_document_uploaded` a `anon`
- `review_player_document` a `anon`
- `review_drive_player_document` a `anon`
- `create_player_from_drive_review` a `anon`
- `playoff_matches insert/update` a `anon`
- `match_schedules insert/update` a `anon`
- vistas admin concedidas a `anon`

## Riesgo practico

Mientras la app depende de claves legacy dentro del frontend, cortar `anon` de golpe puede romper:

- carga de resultados por delegado;
- carga documental;
- revision de Asociacion;
- programacion;
- playoffs;
- permisos legacy.

Por eso no se recomienda ejecutar revokes sin migrar primero el flujo a Auth/RPC validada.

## Recomendacion

Antes de publicar dominio definitivo:

1. Ejecutar `verificar-rls-antes-dominio.sql`.
2. Ejecutar una auditoria de grants y politicas en Supabase.
3. Decidir si se permite una etapa transitoria con dominio propio pero flujo legacy.
4. Si se vende como plataforma seria, priorizar Auth real y permisos por rol.
5. Retirar `anon` de funciones administrativas cuando la app ya no dependa de claves legacy.

## Decision operativa sugerida

Para simulacros internos:

- se puede seguir con el esquema actual;
- no compartir links sensibles;
- no subir documentacion medica real innecesaria;
- usar archivos de prueba cuando sea posible.

Para produccion comercial:

- cerrar RLS/grants;
- separar vista de arbitros;
- autenticar delegados/asociacion;
- limitar vistas admin a usuarios autenticados.

