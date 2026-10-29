# Revisión RLS del PR #2

Fecha: 29/10/2026.

## Evidencia read-only

La consulta a `pg_policies` del proyecto real mostró:

- `partidos`: INSERT para `anon,authenticated` con `with_check=true`; UPDATE para `anon,authenticated` con `qual=true` y `with_check=true`.
- `delegados`, `delegado_categorias` y `equipos`: política `ALL` para `authenticated` con `qual=true` y `with_check=true`.
- `app_user_permissions`: RLS habilitado, pero privilegios de tabla de escritura concedidos a clientes; no se debe confiar en el navegador para administrar permisos.

También se confirmó que `partidos` tiene `categoria_id`, nombres de equipos, tanteadores, estado, fecha y metadata de carga; `app_user_permissions` tiene `user_id`, torneo, categoría, equipo y capacidades separadas.

## Riesgos corregidos en la propuesta

La migración propuesta, aún no aplicada, revoca INSERT/UPDATE/DELETE de clientes y otorga UPDATE únicamente sobre los campos de resultado. La política de UPDATE exige `auth.uid()`, torneo/categoría coincidentes y:

- Delegado: `can_load_results` y equipo asignado coincidente con local o visitante.
- Asociación: `can_correct_results` explícito; alcance global solo con `equipo_id IS NULL`.

Se impide editar permisos propios y escribir directamente tablas de delegados, relaciones o equipos. La creación de fixtures queda fuera del navegador hasta definir un RPC administrativo separado.

## Pruebas preparadas

`tools/rls-policy-smoke.cjs` verifica localmente la matriz estructural: anon sin escritura, delegado acotado, Asociación global explícita, usuario ligado por `auth.uid()`, campos de UPDATE limitados y ausencia de INSERT/DELETE cliente.

No es una prueba RLS efectiva. Para cerrarla hace falta una branch/base aislada de Supabase con roles de prueba; crearla puede generar coste y no se realizó sin autorización.
