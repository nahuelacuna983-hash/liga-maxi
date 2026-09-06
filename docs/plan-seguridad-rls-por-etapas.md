# Plan de seguridad RLS por etapas

Fecha: 29/08/2026

## Situacion detectada

El chequeo de Supabase marco tablas criticas con RLS apagado:

- `auditoria_resultados`
- `categorias`
- `delegado_categorias`
- `delegados`
- `equipos`
- `fechas`
- `fixtures_publicos`
- `organizaciones`
- `partidos`
- `torneos`

Tambien marco tablas con RLS activo pero sin politicas:

- `app_user_permissions`
- `app_users`
- `document_audit_results`
- `document_events`
- `document_files`
- `drive_player_documents`
- `player_document_events`
- `player_documents`
- `team_players`

## Lectura

RLS apagado en una tabla significa que la seguridad depende de los permisos/grants de la base. Como la app usa la key publica de Supabase en el navegador, esto es riesgoso para una plataforma que maneja documentos, usuarios, permisos y auditoria.

RLS activo sin politicas suele bloquear acceso directo, pero hay que revisar tambien vistas, funciones RPC y grants. Una tabla puede estar cerrada y, aun asi, exponer datos por una vista o una funcion `security definer`.

## Riesgo de tocar todo de golpe

La app todavia tiene partes legacy que escriben desde frontend con la key publica:

- carga de resultados;
- correccion administrativa;
- carga documental;
- revision documental;
- playoffs;
- programacion;
- generacion/publicacion de fixtures.

Si cerramos `anon` de golpe, podemos dejar de poder cargar resultados o documentos durante el torneo.

## Etapa 1: compatibilidad

Objetivo: activar RLS en las tablas criticas sin romper la app actual.

Esta etapa no es la seguridad final. Sirve para dejar de tener RLS apagado y ordenar que datos son publicos, cuales son operativos y cuales son sensibles.

Criterio:

- Tablas publicas deportivas: permitir lectura publica.
- Tablas operativas que la app legacy escribe hoy: mantener escritura transitoria si hace falta.
- Tablas sensibles legacy: activar RLS sin politicas publicas.

Archivo sugerido:

- `docs/ejecutar-en-supabase-rls-etapa-1-compatibilidad.sql`

## Etapa 2: seguridad final

Objetivo: vender/publicar como plataforma con permisos reales.

Pendientes antes de esta etapa:

- login real con Supabase Auth;
- roles: admin general, asociacion, delegado, arbitro/consulta;
- RPC validadas por usuario autenticado;
- quitar grants `EXECUTE` a `anon` en funciones administrativas;
- quitar `SELECT` a `anon` sobre vistas admin/documentales;
- separar lo publico de lo privado.

## Decision recomendada

Para pruebas y simulacros: se puede avanzar con etapa 1.

Para venta formal/dominio definitivo: no presentar como seguridad cerrada hasta completar etapa 2.

## Proximo chequeo necesario

Antes de ejecutar cambios de seguridad, conviene correr tambien:

- `docs/verificar-grants-anon.sql`

Ese resultado muestra que funciones, tablas y vistas siguen expuestas a `anon` o `authenticated`.
