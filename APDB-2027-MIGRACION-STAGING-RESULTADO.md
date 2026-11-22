# APdB 2027 - Migracion administrativa en staging

Fecha: 2026-11-22
Rama: `codex/apdb-2027-operational-hardening`

## Conclusion

La migracion local `20261122000000_apdb_administrative_onboarding_rpc.sql` **no se aplico**. El preflight demostro que las tres RPC administrativas ya estan instaladas en el proyecto staging y que la migracion local no es una migracion pendiente equivalente: su definicion de `apdb_revoke_delegate_scope` es menos restrictiva que la definicion actualmente instalada.

Aplicarla habria reemplazado funciones existentes y podia degradar una comprobacion de seguridad. Se detuvo la ejecucion antes de cualquier escritura.

## Entorno comprobado

- Proyecto: `APdB 2027 Staging`
- Project ref: `wffvmthdmmjwspnozyrv`
- URL API: `https://wffvmthdmmjwspnozyrv.supabase.co`
- Conexion utilizada: `Yani`
- Estado: `ACTIVE_HEALTHY`
- PostgreSQL remoto: 17.11
- Produccion identificada en el codigo: `eshbydpsmypflfxpmhyk`; no se utilizo esa conexion.

La URL y el project ref fueron obtenidos mediante la conexion Yani. Las consultas posteriores fueron de solo lectura.

## Preflight

Se verifico:

- Las tablas administrativas requeridas existen: `organizaciones`, `torneos`, `categorias`, `equipos`, `app_users` y `app_user_permissions`.
- Hay 28 tablas publicas con RLS habilitado, consistente con el staging previamente instalado.
- El bucket `documentos` existe y permanece privado.
- Las tres RPC administrativas existen y tienen `SECURITY DEFINER`.
- Las tres RPC tienen `search_path = public, auth, pg_temp`.
- El propietario de las tres RPC es `postgres`.
- `anon` no tiene `EXECUTE`; `authenticated` si lo tiene.
- La migracion de onboarding ya figura en `supabase_migrations.schema_migrations` como `apdb_2027_administrative_onboarding_rpc_secure`.
- No se ejecutaron `DROP`, `CASCADE`, `DELETE`, `db reset` ni cambios de datos.

## Diferencia que impide reaplicar

La migracion local crea o reemplaza:

`public.apdb_revoke_delegate_scope(uuid)`

La funcion instalada en staging incluye comprobaciones adicionales antes de revocar: valida que el permiso pertenezca a un usuario con rol `delegado` y que tenga torneo, categoria y equipo completos. La version local del archivo no contiene esas comprobaciones y solo valida la organizacion.

Por tanto, aunque ambas versiones conceden `EXECUTE` solamente a `authenticated`, la migracion local no puede considerarse compatible ni segura para sobrescribir la funcion existente.

## Compatibilidad del frontend

La aplicacion oficial usa `apdb-administrative-adapter.js` y llama las operaciones administrativas mediante RPC; no se agregaron escrituras directas. Las pruebas locales del contrato administrativo y del adaptador ya aprobadas siguen siendo compatibles con las firmas instaladas.

## Pruebas locales disponibles

Se conservaron como evidencia previa del mismo commit:

- `APDB_APP_ADMINISTRATIVE_ONBOARDING_CONTRACT_OK`
- `APDB_ADMINISTRATIVE_ADAPTER_CONTRACT_OK`
- `APDB_ADMIN_ONBOARDING_LOCAL_OK`
- `node --check app_online.js`
- `node --check apdb-administrative-adapter.js`
- CI `RLS local integration #19`: exitoso, incluyendo la etapa administrativa aislada.

Estas pruebas no sustituyen una prueba Auth/HTTP real en staging.

## Estado final y siguiente paso

Staging queda sin modificaciones en esta intervencion. No hay una migracion administrativa pendiente que sea seguro aplicar desde el archivo local actual.

Antes de cualquier nueva escritura se debe versionar una migracion de reconciliacion que reproduzca exactamente las definiciones ya instaladas, o confirmar por una consulta de solo lectura que el estado remoto es el estado objetivo y cerrar la migracion como ya aplicada. Luego pueden ejecutarse las pruebas autenticadas sinteticas de alta idempotente, alcance de delegado, revocacion y aislamiento entre organizaciones.

Produccion, Liga Maxi 2026, Pago cuotas, cPanel, DNS y otros proyectos no fueron modificados.
