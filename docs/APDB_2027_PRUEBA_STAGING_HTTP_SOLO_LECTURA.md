# APdB 2027 — aceptación Auth HTTP de staging (solo lectura)

**Objetivo:** comprobar identidades reales de Auth (JWT emitidos por Supabase) en el proyecto **APdB 2027 Staging**, sin modificar los dos documentos sintéticos ni utilizar datos personales reales. Esta prueba complementa los tests de PostgreSQL local y las matrices SQL con claims simulados.

## Regla de seguridad

- El único backend admitido por el script es `wffvmthdmmjwspnozyrv.supabase.co`.
- Usa la clave `sb_publishable_…` del staging, **nunca** `service_role` o claves secretas.
- Solo envía `POST /auth/v1/token?grant_type=password` (inicio de sesión) y `GET /rest/v1/v_team_documents_admin` (lectura). No ejecuta escrituras ni uploads.
- Requiere tres **cuentas sintéticas preexistentes**: Asociación, Delegado limitado al equipo de prueba y usuario sin alcance. Para evitar utilizar datos personales o cuentas reales, los emails deben terminar en `.invalid`.
- No contiene contraseñas en GitHub. No imprime contraseñas ni JWT. El archivo privado de credenciales no debe copiarse al repositorio, adjuntarse a tickets ni enviarse por chat.

## Ejecución cuando existan credenciales sintéticas aprobadas

Crear en un directorio privado **fuera del checkout** un archivo JSON como:

```json
{
  "association": { "email": "sociacion@apdb-test.invalid", "password": "<contraseña privada>" },
  "delegate": { "email": "delegado@apdb-test.invalid", "password": "<contraseña privada>" },
  "noAccess": { "email": "auditor@apdb-test.invalid", "password": "<contraseña privada>" }
}
```

Se deben usar emails que correspondan realmente a cuentas existentes, no inventar cuentas o resetear contraseñas. Evitar publicar el archivo.

En PowerShell, desde el checkout de la rama APdB:

```powershell
$env:APDB_STAGING_PUBLISHABLE_KEY = "<sb_publishable del staging>"
$env:APDB_STAGING_CREDS_FILE = "C:\ruta-privada\usuarios-sinteticos.json"
node tests/apdb-staging-http-readonly.cjs
Remove-Item Env:APDB_STAGING_PUBLISHABLE_KEY
Remove-Item Env:APDB_STAGING_CREDS_FILE
```

Resultado esperado: `APDB_STAGING_AUTH_HTTP_READONLY_OK association=2 delegate_scoped=true unscoped=0 anonymous=0 writes=0`.

Si falla, **no continuar a producción**. La prueba es deliberadamente de solo lectura, por lo que puede repetirse sin alterar el torneo.

## Alcances que NO cubre

Este ensayo no prueba subida ni recuperación de archivos reales de Storage, revocación de JWT, modificación administrativa ni soporte de cPanel. El bucket documental de staging seguía con cero objetos en la inspección anterior. Las pruebas de Storage con JWT reales ya están aprobadas **en un Supabase descartable**, pero **no** contra el staging persistente. La aceptación institucional requiere esas verificaciones y el despliegue controlado en la subruta privada.
