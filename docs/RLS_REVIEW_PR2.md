# Revisión RLS del PR #2

Fecha: 29/10/2026.

## Evidencia read-only

La consulta a `pg_policies` del proyecto real mostró:

- `partidos`: INSERT para `anon,authenticated` con `with_check=true`; UPDATE para `anon,authenticated` con `qual=true` y `with_check=true`.
- `delegados`, `delegado_categorias` y `equipos`: política `ALL` para `authenticated` con `qual=true` y `with_check=true`.
- `app_user_permissions`: RLS habilitado, pero privilegios de tabla de escritura concedidos a clientes; no se debe confiar en el navegador para administrar permisos.

También se confirmó que `partidos` tiene `categoria_id`, nombres de equipos, tanteadores, estado, fecha y metadata de carga; `app_user_permissions` tiene `user_id`, torneo, categoría, equipo y capacidades separadas.

## Riesgos corregidos en la propuesta

La migración propuesta, aún no aplicada, revoca INSERT/UPDATE/DELETE directos de clientes. Las RPC validan `auth.uid()`, torneo/categoría coincidentes y:

- Delegado: `can_load_results` y equipo asignado coincidente con local o visitante.
- Asociación: `can_correct_results` explícito; alcance global solo con `equipo_id IS NULL`.

Se impide editar permisos propios y escribir directamente tablas de delegados, relaciones o equipos. La creación de fixtures se concentra en un RPC administrativo separado con permiso global de Asociación.

La aplicación ya no hace UPDATE directo para cargar/corregir resultados normales: Delegado y Asociación invocan `cargar_resultado_partido`. La RPC es `SECURITY DEFINER` con `search_path` fijo, valida marcador no empatado, existencia del partido, `auth.uid()` y alcance de permisos, y sólo actualiza campos de resultado. La publicación de fixture usa `publicar_fixture_categoria` en una transacción única.

La publicación valida en base los equipos de la categoría, parejas duplicadas, repetición de equipos por jornada, fechas bloqueadas, jornadas inválidas, límite de volumen y estado de categoría. La corrección de un resultado bloquea la fila con `FOR UPDATE` y aplica el mismo alcance equipo/categoría que la carga inicial.

## Pruebas preparadas

`tools/rls-policy-smoke.cjs` verifica localmente la matriz estructural: anon sin escritura, delegado acotado, Asociación global explícita, usuario ligado por `auth.uid()`, campos de UPDATE limitados y ausencia de INSERT/DELETE cliente.

No es una prueba RLS efectiva. En esta ejecución se comprobó el entorno local: `docker`, `psql`, `supabase`, `pg_isready`, `initdb`, `postgres`, `podman` y WSL no están disponibles. Por lo tanto no fue posible levantar PostgreSQL local ni ejecutar la migración con roles ficticios. No se instalaron componentes del sistema ni se tocó Supabase remoto.

La migración también elimina explícitamente la sobrecarga histórica `cargar_resultado_partido(uuid, integer, integer, text)` y valida las fechas bloqueadas de la configuración enviada, además de las fechas ya almacenadas. El siguiente paso para certificar RLS es ejecutar una copia sintética de esquema con PostgreSQL local o CI, con clientes anónimo, delegado propio, delegado ajeno y Asociación; los smoke actuales no sustituyen esa prueba.
