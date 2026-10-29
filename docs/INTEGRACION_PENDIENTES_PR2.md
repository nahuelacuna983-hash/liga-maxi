# Integración pendiente del PR #2

Fecha de corte: 29/10/2026. Revisión de sólo lectura posterior a `RLS local integration #5`. No se modificó `main`, Supabase real ni la auditoría 2026.

## Ejecutado y verificado

- Migración de resultados, fixtures, resolución y anulación: probado en PostgreSQL sintético mediante GitHub Actions.
- Asociación global: carga/corrección normal, publicación y resolución/anulación administrativas.
- Delegado: carga de su alcance y rechazo fuera de equipo/corrección administrativa.
- Anónimo: rechazo de RPC y escrituras directas.
- Fixtures: equipos válidos, libres impares, fechas bloqueadas, duplicados, equipos ajenos y estados inválidos.
- Aplicación: smoke de dominio, tablas, desempates, playoffs y validaciones de marcadores.

## Riesgos confirmados fuera de la migración de partidos

Las definiciones históricas de documentación y bajas contienen RPCs `SECURITY DEFINER` con `EXECUTE` para `anon` y/o parámetros de identidad suministrados por el cliente:

| Fuente | Funciones | Riesgo |
|---|---|---|
| `docs/ejecutar-en-supabase-documentacion-jugadores.sql` | `add_team_player`, `mark_player_document_uploaded`, `review_player_document` | No se ve comprobación de `auth.uid()`/alcance en los cuerpos; `p_created_by`, `p_uploaded_by`, `p_actor` son client-controlled; grants para `anon`. |
| `docs/ejecutar-en-supabase-documentacion-revision.sql` | `review_team_document` | `p_actor` proviene del cliente y el grant incluye `anon`; requiere matriz Asociación real antes de considerarse seguro. |
| `docs/ejecutar-en-supabase-documentacion-drive.sql` | `review_drive_player_document`, `create_player_from_drive_review` | Ambos tienen `SECURITY DEFINER`, actor enviado por cliente y grants para `anon`; pueden modificar revisión/identidad si la base ejecuta esas definiciones. |
| `docs/ejecutar-en-supabase-baja-jugadores.sql` | `request_team_player_deactivation`, `deactivate_team_player` | Grants para `anon` y actor/motivo enviados por cliente; no se observa comprobación de pertenencia de equipo ni Asociación en el cuerpo. |

Estos hallazgos no fueron ejercitados por `RLS local integration #5`, que sólo monta el esquema sintético de partidos y permisos. No deben confundirse con fallos de las cuatro RPC nuevas de resultados.

## Pendiente de prueba

1. Crear un esquema sintético de documentación con `app_users`, permisos, jugadores y documentos.
2. Probar cada RPC con anónimo, delegado propio, delegado ajeno y Asociación.
3. Derivar actor desde `auth.uid()` o restringir explícitamente los grants a `authenticated`, según el contrato legacy aprobado.
4. Verificar que las escrituras de Storage y sus RPC mantengan el mismo alcance.
5. Ejecutar dos sesiones concurrentes sobre el mismo partido. La migración usa `FOR UPDATE`, pero el workflow actual no abrió dos conexiones simultáneas.

## Compatibilidad funcional

No se observaron cambios en la lógica local de tablas, desempates, playoffs, fixtures o resultados administrativos. La aplicación ahora llama RPC para todos los writes de `partidos` cubiertos por la migración. La gestión documental y de jugadores sigue operando mediante RPCs existentes, pero su seguridad no está certificada por este PR.

## Decisión

El PR #2 **no está listo para fusión final** mientras no se resuelva o se acepte formalmente el contrato de seguridad de las RPC documentales/gestión. La autorización necesaria es definir si el sistema abandona grants `anon`/actores legacy y qué permisos concretos tendrá cada rol. No se recomienda cambiar esos grants sin esa decisión porque podría romper el circuito actual de delegados.

