# Propuesta de ejecución CI de seguridad

No se modifica `main` ni el workflow existente en esta rama. La ejecución mínima propuesta para `postgres-adapter-local.yml`, después de autorización, es agregar un paso posterior al esquema y antes de cerrar PostgreSQL:

```yaml
- name: PostgreSQL auth and organization isolation
  env:
    DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/liga_maxi_auth
  run: node tests/postgres-auth-isolation-integration.cjs
```

El job debe usar PostgreSQL 16 temporal, `LM_REQUIRE_AUTH=1`, un secreto sintético generado dentro del job y una base vacía exclusiva. No debe utilizar secretos de producción ni tocar `main`.

La salida esperada es `POSTGRES_AUTH_ISOLATION_INTEGRATION_OK`. Cualquier `ECONNREFUSED`, error de esquema, respuesta HTTP inesperada o fallo de transacción debe dejar el job en rojo.

Pendiente adicional para CI: una prueba Chromium autenticada y una prueba de reinicio físico del proceso HTTP conservando PostgreSQL. Ambas deben ejecutarse como pasos separados para distinguir seguridad de recuperación.
