# Issue #38: entrega al administrador de alojamiento

Fecha: 25/11/2026. Base verificada: PR #37, `6152d97414ab2a637d15fa3720e3ebaae541f547`.
Rama independiente: `codex/apdb-issue38-cpanel-release`. No incorpora ni modifica PR #39.

**PREPARADO, NO INSTALADO. NO-GO operativo.** No se accedió al hosting, Staging, DNS ni producción. Esta guía reemplaza la suposición `public_html` de la guía anterior; aquella ubicación y Directory Privacy eran antecedentes documentados, no evidencia verificada en esta intervención.

## 1. Preflight privado del administrador (antes de subir archivos)

Registrar en un acta FUERA del repo y de cualquier webroot:

| Comprobación | Evidencia / condición para continuar |
|---|---|
| Autorización | Responsable, fecha y alcance: solo piloto protegido; instalación y ensayo de rollback expresamente autorizados |
| Dominio | cPanel > Domains: `maxibasquetlaplata.com.ar`, document-root absoluto real; dominio principal/addon y aliases revisados |
| Ruta | Directorio resuelto `<document-root>/apdb-2027-prueba/`; no enlace simbólico a otra ruta, nunca raíz ni `/liga/` |
| Herramientas | File Manager habilitado (mostrar archivos ocultos), Directory Privacy disponible; capacidad de descargar respaldo, subir nueve archivos y restaurarlos |
| Servidor | Proveedor confirma Apache 2.4 o LiteSpeed compatible, Basic Auth, mod_headers/equivalente, AllowOverride de AuthConfig/FileInfo/Indexes/Options; PHP y versión registrar si existe, pero esta aplicación no requiere PHP |
| TLS | Certificado válido para el dominio, HTTPS sin advertencias; no aceptar `-k` ni desactivar validación TLS |
| HTTP sin TLS | Proveedor garantiza que no sirve el piloto ni solicita Basic Auth en HTTP; nunca enviar credenciales por HTTP. No cambiar redirecciones globales por cuenta propia |
| Reglas heredadas | Revisar rewrites, DirectoryIndex, errores personalizados, CDN/caché y SW de raíz que puedan interceptar el piloto; cualquier cambio fuera del piloto requiere otra autorización |
| Recuperación | Espacio/cuota suficiente sin ampliar plan, backup anterior fuera de TODOS los webroots, inventario de hashes/permisos/protección y responsable que puede restaurarlo |
| Dependencias | Configuración publishable autorizada; Staging y RPC ya preparados por su responsable; aceptación de roles y recuperación backend pendientes si no hay evidencia |

Si falta una capacidad, no instalar: el proveedor debe confirmarla. No subir `phpinfo`, diagnósticos con secretos ni scripts ejecutables al dominio. No adquirir servicios.

## 2. Paquete definitivo desde Windows, sin red

Node 22+ y Git disponibles. Checkout limpio del SHA exacto del PR de esta entrega. El empaquetador extrae los bytes comprometidos con `git show`, independientemente de CRLF en Windows: el mismo SHA y configuración producen el mismo ZIP.

El administrador proporciona localmente la configuración aprobada fuera del repo y de todos los webroots. Debe tener SOLO estas cinco propiedades:

```json
{
  "environment": "staging",
  "resetDatabaseOnStart": false,
  "publicBasePath": "/apdb-2027-prueba/",
  "supabaseUrl": "https://wffvmthdmmjwspnozyrv.supabase.co",
  "supabaseAnonKey": "REEMPLAZAR_LOCALMENTE_CON_PUBLISHABLE_AUTORIZADA"
}
```

El ejemplo se rechaza deliberadamente. El operador debe cotejar proyecto/clave con el responsable de Staging; una clave publishable opaca no permite demostrar offline a qué proyecto pertenece. No se obtiene ni se comprueba una clave contra Staging en este flujo. `-ApprovePublishableConfiguration` confirma esa procedencia, **no autoriza instalación**.

```powershell
$config = 'C:\APDB-Privado\staging.json'
$configHash = (Get-FileHash -LiteralPath $config -Algorithm SHA256).Hash.ToLowerInvariant()
# Cotejar este hash con la configuración aprobada antes de continuar.
.\tools\prepare-apdb-cpanel.ps1 -ConfigPath $config `
  -OutputDirectory 'C:\APDB-Privado\entrega-nueva' `
  -ExpectedCommit '<SHA exacto del PR>' -ApprovedConfigSha256 $configHash `
  -ApprovePublishableConfiguration
```

El padre del destino debe existir y el destino debe ser nuevo. No usar OneDrive compartido, carpetas del servidor ni rutas publicadas. El comando no hace conexiones ni despliega. Rechaza árbol Git sucio, SHA diferente, configuración extra, test/secret/service_role, producción y cualquier subruta distinta. Los errores no imprimen la configuración. Si falla, conservar como fallido y usar un destino nuevo tras corregir; no instalar un resultado parcial.

Salida: `package/` con los nueve archivos oficiales; ZIP STORE determinista sin fechas variables; `receipt/` separado con recibo de nueve hashes, SHA de fuente, hash de configuración, tamaño y SHA256 de ZIP. Ningún recibo, configuración, ZIP, SQL o dump pertenece al webroot. El ZIP no contiene `.htaccess`: la protección del servidor es administrada separadamente y no debe sobrescribirse.

Verificar el ZIP descargado con `Get-FileHash`, compararlo con `receipt/ZIP-RECEIPT.json`, extraerlo en otra carpeta privada y ejecutar `node tools/verify-apdb-release.cjs <carpeta-extraida>`. El manifiesto detecta corrupción; su autenticidad depende del recibo conservado por un canal confiable. No confiar solo en el manifiesto que devuelve el servidor.

## 3. Instalación protegida (solo administrador autorizado)

1. Confirmar preflight. Descargar copia anterior completa del piloto, incluidos archivos ocultos, permisos y configuración de privacidad, a almacenamiento privado fuera de todos los webroots. Registrar hashes y comprobar que abre. Si no existía piloto, registrar estado anterior vacío. No copiar ni modificar `/liga/`.
2. Crear o conservar **la misma carpeta** `apdb-2027-prueba`. Activar Directory Privacy con cuenta de piloto antes de introducir contenido. Conservar su `.htaccess` y referencia `.htpasswd`; nunca alojar el archivo de contraseñas en el paquete. No reemplazar ni renombrar esta carpeta: la protección puede depender de su ruta.
3. Incorporar manualmente SOLO dentro del `.htaccess` del piloto las directivas de `cpanel-pilot-headers.htaccess`, conservando las líneas Basic Auth de cPanel. Revisar con proveedor antes de aplicar. Si produce 500, restaurar el `.htaccess` anterior y detenerse; no retirar la autenticación para solucionar el error. No hay `<IfModule>` que silencie la ausencia de protección de caché.
4. Con carpeta vacía/protegida, comprobar GET anónimo 401/403 con `Cache-Control: private, no-store` para la URL y rutas de los nueve archivos. Una respuesta 404 no demuestra protección. Confirmar HTTPS y bloqueo HTTP sin enviar credenciales. Si falla, no subir nada.
5. Mantener el acceso limitado al operador durante la carga. Extraer ZIP localmente y subir **solo los nueve archivos** por File Manager al piloto. No cargar el ZIP al webroot, no usar carpetas temporales públicas. Conservar `.htaccess`; quitar archivos de versiones anteriores solo dentro del piloto y después del respaldo. Permisos orientativos archivos 0644/directorios 0755 según proveedor, nunca 0777; contraseñas según permisos privados del hosting.
6. Ejecutar los controles del apartado siguiente antes de distribuir acceso. Registrar estado HTTP, nueve hashes y recibo privado. Si hay error, aplicar rollback; no declarar éxito parcial.

## 4. Validación real pendiente

Desde equipo autorizado, contra la URL institucional exacta, sin parámetros, userinfo ni redirecciones:

```powershell
node tools/check-apdb-hosted-pilot.cjs https://maxibasquetlaplata.com.ar/apdb-2027-prueba/
if ($LASTEXITCODE -ne 0) { throw 'Protección anónima no verificada' }
$credential = Get-Credential -Message 'Cuenta Directory Privacy del piloto (no Supabase ni cPanel)'
try {
  $env:APDB_HOST_BASIC_USER = $credential.UserName
  $env:APDB_HOST_BASIC_PASSWORD = $credential.GetNetworkCredential().Password
  node tools/check-apdb-hosted-release.cjs https://maxibasquetlaplata.com.ar/apdb-2027-prueba/ 'C:\APDB-Privado\entrega-nueva\package'
  if ($LASTEXITCODE -ne 0) { throw 'Integridad HTTP no verificada' }
} finally {
  Remove-Item Env:APDB_HOST_BASIC_USER -ErrorAction SilentlyContinue
  Remove-Item Env:APDB_HOST_BASIC_PASSWORD -ErrorAction SilentlyContinue
  $credential = $null
}
```

No ejecutar con transcripción/debug de entorno. Basic Auth y sesión Supabase son controles distintos. El verificador anónimo exige 401/403 para portada y nueve archivos; el autenticado exige portada 200 idéntica al index, nueve archivos 200 con tamaño/hash exactos, MIME correcto, no-store y SW sin scope ampliado. Ninguno sigue redirects. Archivos sensibles deben ser 403/404 aun autenticado.

La app conserva el SW del candidato: no implementa caché de fetch. Probar con perfil limpio y luego actualización del SW en desktop/móvil. Revisar que no haya un SW de raíz controlando la ruta; no desregistrar SW ni borrar almacenamiento de todo el dominio porque podría afectar `/liga/`. Cerrar pestañas del piloto tras rollback y reabrir con recarga; Basic Auth puede permanecer en memoria del navegador. No usar `Clear-Site-Data` global.

Finalmente validar Público, Delegados y Asociación con sesiones y datos autorizados, llamadas a Staging, permisos negativos y ausencia de errores JS. Este paso no está acreditado por hashes HTTP ni por los ensayos sintéticos del PR #39. La aplicación depende del CDN de Supabase JS ya presente en #37, de red y de backend preparado: el ZIP no certifica esas dependencias ni modifica sus versiones.

## 5. Rollback dentro del piloto

Disparadores: fuga anónima, redirección inesperada, 500, hashes/MIME/caché incorrectos, fallo de roles o dependencia incompatible. Suspender uso y mantener acceso restringido. Si falla la protección, el administrador retira los nueve archivos del piloto a zona privada antes de repararla; nunca los mueve a otra carpeta pública.

Restaurar los archivos anteriores en la misma carpeta protegida; conservar o restaurar la configuración de privacidad respaldada y comprobar sus permisos. No reemplazar document-root, `.htaccess` raíz ni `/liga/`. Para primer despliegue, retirar solo los nueve archivos y dejar carpeta protegida vacía (401/403 anónimo, 404 autenticado en assets). Para versión anterior, comparar con su inventario privado y ejecutar controles HTTP contra ese paquete si es compatible con el verificador. Registrar tiempo de inicio/fin, hashes antes/después y responsable.

Ensayar este retorno y reinstalación del candidato con autorización antes de aceptar el piloto; conservar ambos recibos. El ensayo local automatizado valida bytes/restauración en directorios descartables, **no** Directory Privacy real. El rollback frontend no restaura datos, Auth, Storage ni migraciones; no ejecutar rollback de base desde este procedimiento. Si la versión anterior es incompatible con RPC actuales, mantener el piloto cerrado y escalar al responsable del backend.

## 6. Estado y paso mínimo externo

| Entregable | Estado de esta intervención |
|---|---|
| Generador de nueve archivos, recibos y ZIP determinista Windows | Implementado, ensayos locales/CI sintéticos; reutiliza build/verificador/recibo de #37 |
| Configuración final autorizada | Pendiente de suministro/cotejo local por responsable de Staging; no se inventó clave real |
| ZIP operativo definitivo con esa configuración | Pendiente de ejecutar el comando anterior con clave autorizada; artefactos sintéticos no son instalables |
| Protección, instalación, HTTP y rollback | Procedimiento y controles preparados; NO ejecutados en alojamiento |
| URL institucional funcionando y tres roles | NO comprobado; NO-GO operativo |
| Recuperación real/Auth/Storage/backend | Sin cambios; dependencias de aceptación heredadas de #37 |

**Única intervención externa solicitada:** el administrador autorizado confirma el document-root y opera esta guía en una ventana aprobada, con configuración publishable cotejada. No hace falta entregar contraseñas a Codex ni publicarlas en GitHub. Devolver solamente acta sanitizada con SHA/ZIP, estados HTTP, hashes, ensayo de retorno y aceptación por roles. Hasta entonces se entrega preparación técnica, no plataforma publicada.

Referencias consultadas: [Directory Privacy](https://docs.cpanel.net/cpanel/files/directory-privacy/), [Apache mod_headers](https://httpd.apache.org/docs/2.4/mod/mod_headers.html), [claves Supabase](https://supabase.com/docs/guides/api/api-keys). Directory Privacy modifica configuración de autenticación; las claves publishable son para clientes públicos y no sustituyen autorización/RLS.
