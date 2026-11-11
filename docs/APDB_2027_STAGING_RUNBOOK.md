# APdB 2027 staging aislado

`tools/apdb-staging-config.example.json` es una plantilla y no contiene credenciales.

## Requisitos

- Un proyecto Supabase separado del proyecto productivo, autorizado por la APdB.
- URL y clave publica `anon` o `publishable` del proyecto staging.
- Un hosting independiente o una subcarpeta protegida para los archivos estaticos.

## Configuracion

1. Copiar la plantilla fuera de Git, por ejemplo `apdb-staging-config.local.json`.
2. Completar solo `supabaseUrl`, `supabaseAnonKey` y `publicBasePath`.
3. Ejecutar `node tools/validate-apdb-staging-config.cjs apdb-staging-config.local.json`.
4. Generar la configuracion de runtime mediante el mecanismo de despliegue autorizado; nunca incrustar una service-role key.
5. Aplicar migraciones y seeds sinteticos en el proyecto staging. No usar `db reset` al iniciar la aplicacion persistente.

El lanzador `tools/start-apdb-isolated-pilot.ps1` es solo descartable: usa Supabase local y `supabase db reset --local`.
No debe utilizarse contra staging persistente.

## URL propuesta

Cuando el hosting y el proyecto staging esten autorizados:

`https://HOST-DE-STAGING/apdb-2027-staging/index_online.html?secureResults=1`

La URL no existe todavia. La aplicacion solo debe publicarse despues de comprobar que el proyecto no contiene datos 2026.
