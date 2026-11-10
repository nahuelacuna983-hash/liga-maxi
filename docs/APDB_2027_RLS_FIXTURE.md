# Fixture RLS APdB 2027

## Alcance

`docs/apdb-2027-rls-fixture.sql` es una fixture de catálogo para PostgreSQL 16
descartable. Su propósito es ejecutar `tests/apdb-2027-rls-gate.cjs` sin tocar
Supabase. No es un dump ni una copia operativa del proyecto productivo.

## Procedencia

- Los nombres de tablas y vistas provienen de `app_online.js` y de las
  auditorías RLS documentadas.
- La necesidad de RLS en tablas sensibles proviene de
  `docs/APDB_2027_CONTRATO_COMPATIBILIDAD_RLS.md`.
- La exposición de funciones `SECURITY DEFINER` y las vistas administrativas
  proviene de `docs/APDB_2027_HALLAZGOS_SEGURIDAD_REAL.md`.
- Las expresiones productivas de organización, Auth, Storage y RPC no se
  reconstruyen aquí porque no están disponibles como definición completa
  verificable en el repositorio.

## Qué valida

- Existencia de objetos críticos.
- RLS habilitada.
- Grants de escritura de `anon`.
- Lectura anónima de vistas administrativas.
- Ejecución anónima de funciones `SECURITY DEFINER`.
- `search_path` fijado en la función de muestra.

## Qué no valida

- Supabase Auth real.
- JWT reales y membresías de producción.
- Storage, URLs firmadas o aislamiento de archivos.
- Corrección de RPC productivas.
- Reglas deportivas o documentación médica.

## CI propuesto

El workflow `RLS local integration` mantiene la matriz `lm_*` existente y crea
una segunda base, `liga_maxi_gate`, para esta fixture. El `ref` está restringido
a `codex/apdb-2027-operational-hardening`; cualquier otro valor falla antes de
ejecutar pruebas.
