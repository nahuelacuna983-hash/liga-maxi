# Matriz de seguridad Supabase

Fecha: 05/09/2026

## Objetivo

Separar que debe quedar publico, que puede quedar transitorio por compatibilidad y que debe cerrarse antes de vender la plataforma como sistema seguro.

## Publico necesario

Estas lecturas pueden estar disponibles para `anon`, siempre que no expongan datos sensibles:

- `organizaciones`: lectura basica.
- `torneos`: torneos publicados/activos.
- `categorias`: categorias visibles.
- `equipos`: nombres/escudos/equipos deportivos.
- `partidos`: fixture, resultados y tablas.
- `playoff_matches`: llaves y resultados visibles.
- `match_schedules`: programacion visible, si no contiene datos privados.

Riesgo: bajo si son solo datos deportivos publicados.

## Publico con cuidado

Estas lecturas pueden servir para la app, pero hay que revisar columnas:

- `document_requirements`: requisitos documentales generales.
- `fixtures_publicos`: fixture publicado, si se usa como vista publica.
- `fechas`: fechas deportivas sin datos privados.
- `app_usage_events`: no deberia ser publico si registra uso, dispositivo, rutas o identificadores.

Riesgo: medio.

## Sensible: no publico

Estas tablas/vistas no deberian quedar disponibles para `anon` en version final:

- `delegados`
- `delegado_categorias`
- `auditoria_resultados`
- `app_users`
- `app_user_permissions`
- `team_players`
- `player_documents`
- `player_document_events`
- `document_files`
- `document_events`
- `document_audit_results`
- `drive_player_documents`
- `v_team_documents_admin`
- `v_player_documents_admin`
- `v_drive_player_documents_admin`
- `v_document_audit_results_admin`
- `v_app_user_permissions`

Riesgo: alto.

## RPC sensibles detectadas

Estas funciones no deberian quedar ejecutables por `anon` en la version final:

- `ensure_app_user`
- `set_user_permission`
- `add_team_player`
- `request_team_player_deactivation`
- `deactivate_team_player`
- `mark_player_document_uploaded`
- `review_player_document`
- `review_team_document`
- `review_drive_player_document`
- `create_player_from_drive_review`
- `add_team_document_file`

Motivo: crean, modifican, aprueban o administran datos sensibles.

## Escrituras deportivas transitorias

Hoy la app puede necesitar escritura anon/authenticated por compatibilidad en:

- `partidos`: carga/correccion/anulacion de resultados.
- `categorias`: publicacion/configuracion de torneo.
- `playoff_matches`: carga de playoffs.
- `match_schedules`: programacion.

Esto debe reemplazarse por RPC con validacion real de usuario:

- delegado: solo su equipo/categoria y acciones permitidas;
- asociacion: correcciones, publicaciones, programacion;
- admin general: todo;
- arbitros/consulta: lectura de habilitados.

## Orden de cierre recomendado

1. Mantener publico solo lo deportivo publicado.
2. Sacar de `anon` vistas admin y permisos.
3. Pasar aprobaciones documentales a usuario autenticado.
4. Pasar alta/baja de jugadores a usuario autenticado.
5. Pasar programacion y playoffs a usuario autenticado.
6. Pasar carga de resultados a delegado autenticado.
7. Quitar grants legacy a `anon`.

## No ejecutar a ciegas

No conviene ejecutar `revoke` masivo todavia. Hay que probar cada cierre contra:

- Publico.
- Fecha.
- Delegados.
- Asociacion.
- Documentacion.
- Habilitados.
- Torneos.
- Programacion.
- Informes.
- Auditoria.
