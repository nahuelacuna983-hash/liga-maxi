# Pruebas PostgreSQL/RLS aisladas 2027

## Estado

Se corrigieron dos falsos positivos de `docs/synthetic-persistence-tests.sql`:

- Las mutaciones del historial ahora se rechazan con SQLSTATE `55000`, mientras que `P0001` queda reservado para aserciones de la prueba.
- La vinculación cruzada usa UUID válidos de organizaciones distintas y se comprueba mediante la FK compuesta `(category_id, team_id)`.
- El mismo cruce se intenta luego como `lm_app`: la prueba espera `insufficient_privilege` por RLS y verifica que no haya mutación. Así no se confunde una denegación de autorización con una violación FK.

También se eliminó la recursión de la política de membresías. `lm_is_admin()` es una función `SECURITY DEFINER` con `search_path` fijo y la política de membresías consulta identidad directa o esa función. El rol `lm_app` recibe sólo los privilegios de tablas necesarios para el harness; no tiene propiedad ni bypass de RLS.

## Ejecución preparada

`.github/workflows/synthetic-postgres-local.yml` ejecuta PostgreSQL 16 como servicio descartable, hace checkout del `ref` indicado manualmente y aplica esquema, roles y pruebas con `ON_ERROR_STOP=1`. El script carga datos como el usuario del job y cambia a `lm_app` antes de las comprobaciones de autorización.

## Verificaciones locales

Superadas:

- `SYNTHETIC_POSTGRES_CONTRACT_OK`.
- Regresión deportiva, proveedor, aislamiento, torneos, playoffs, fixture, equivalencia y UI sintética.
- `git diff --check`.

No ejecutada localmente: la batería SQL contra PostgreSQL real. En el entorno actual no están instalados `docker`, `psql` ni Supabase CLI. Playwright tampoco está instalado en este checkout.

## Alcance y pendientes

El workflow permite validar el motor PostgreSQL/RLS en GitHub Actions sin tocar Supabase productivo. Hasta que ese workflow termine correctamente, la seguridad RLS/Auth debe considerarse preparada y no certificada. La concurrencia queda como prueba posterior, porque requiere dos sesiones PostgreSQL coordinadas.
