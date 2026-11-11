# Migraciones Supabase APdB 2027

Este directorio permanece deliberadamente sin migraciones ejecutables hasta
recibir las definiciones completas del proyecto aislado. Los SQL de `docs/`
son fuentes versionadas, pero no forman todavía una cadena aplicable de manera
segura: algunos dependen de tablas, vistas, funciones, `auth.users` y
`storage.objects` que no están definidos en este checkout.

No copiar estos archivos como migraciones productivas. El orden requerido,
pendientes y procedencia están registrados en
`docs/APDB_2027_MIGRACIONES_AISLADAS.md`.
