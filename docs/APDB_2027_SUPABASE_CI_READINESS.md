# APdB 2027 — Viabilidad de Supabase aislado en CI

## Conclusión

Un runner Ubuntu de GitHub Actions puede disponer de Docker y ejecutar la
Supabase CLI, pero este checkout **todavía no está listo para declarar una
validación Supabase fiel**. No existe `supabase/config.toml`, ni un conjunto de
migraciones versionadas que reconstruya conjuntamente Auth, `storage` y las
funciones/RLS que consume `app_online.js`. Las definiciones disponibles están
dispersas en `docs/ejecutar-en-supabase-*.sql` y algunas son compatibilidad
legacy o conceden `anon`/`authenticated` de forma amplia.

Levantar sólo PostgreSQL o una fixture reducida produciría una prueba de RLS,
no una prueba de Supabase Auth, JWT, Storage o RPC efectiva. Por eso no se
agrega todavía un workflow Supabase ni se intenta sustituir silenciosamente el
esquema productivo.

## Infraestructura reutilizable

- `.github/workflows/rls-local.yml`: PostgreSQL 16 descartable y gate de
  catálogo RLS.
- `docs/apdb-2027-rls-fixture.sql`: fixture mínima, sin Auth ni Storage.
- `tests/apdb-rls-negative.sql`: denegaciones conductuales de la fixture.
- `docs/ejecutar-en-supabase-permisos-base.sql` y sus seeds: contratos de
  usuarios/membresías, pendientes de ordenar como migraciones aisladas.
- Scripts documentales, playoffs y programación: fuentes de definición, no una
  migración única reproducible.

## Requisitos antes de un workflow Supabase

1. Consolidar migraciones versionadas en un directorio `supabase/migrations`
   aislado, sin datos 2026 ni archivos médicos.
2. Añadir configuración local de Auth y Storage con claves efímeras de CI.
3. Definir seeds sintéticos para dos organizaciones, Asociación, dos delegados,
   revocación y un usuario anónimo.
4. Confirmar que las RPC validan `auth.uid()` y la organización vigente.
5. Crear pruebas HTTP con JWT reales para resultados, programación, playoffs,
   documentación y URLs firmadas.
6. Ejecutar el workflow sólo después de comprobar que la instancia no apunta a
   ninguna URL `supabase.co` externa ni usa secretos del repositorio productivo.

## Riesgo principal

Copiar todos los SQL documentales al arranque del job puede fallar por orden,
dependencias o redefiniciones y, peor aún, puede aprobar una configuración que
no coincide con producción. La siguiente etapa debe ser una consolidación
revisada de migraciones, no otro parche sobre la fixture PostgreSQL.

## Estado actual

El preflight local `tests/apdb-supabase-isolated-preflight.cjs` confirma las
fuentes necesarias y reporta las herramientas disponibles. En esta máquina no
se detectan Supabase CLI, Docker ni `psql`; no se ejecutaron servicios ni CI.
