# APdB 2027 — Entrega del frontend al cPanel existente

**Frente 2 / ChatGPT.** Fecha: 2026-11-23 (Argentina).
Base: PR #25 (`codex/apdb-2027-backup-differential-integration`).
**No se realizó ninguna publicación en el hosting ni modificación de staging.**

## Infraestructura ya facilitada por APdB
- Dominio: `maxibasquetlaplata.com.ar`
- Directorio de cPanel: `public_html/apdb-2027-prueba/`
- URL de prueba: `https://maxibasquetlaplata.com.ar/apdb-2027-prueba/`
- La carpeta tiene **Directory Privacy** administrada desde cPanel, usuario `apdb_pruebas`. Conservar protección y credenciales existentes.
- Proyecto Supabase **staging** autorizado: `wffvmthdmmjwspnozyrv`.
- No alterar `public_html/`, `.htaccess` ni la URL pública que APdB use para otro torneo.

## Qué se cambió en este frente
1. El ejemplo de configuración y ensayos usan `/apdb-2027-prueba/`, no la ruta ficticia anterior.
2. Se incluye un **`index.html` idéntico al `index_online.html` oficial** para que el DirectoryIndex estándar de Apache funcione sin editar `.htaccess`.
3. El verificador rechaza **archivos adicionales**, carpetas internas y symlinks, además de diferencias SHA-256 en los archivos esperados.
4. Se creó `tools/check-apdb-hosted-release.cjs` para validar, tras una publicación aprobada, los 9 archivos servidos por el cPanel con HTTP Basic, hashes SHA-256 y URLs sensibles negadas. Nunca muestra usuario/contraseña ni sigue redirecciones.
5. La CI prueba un servidor Basic local y verifica que una alteración de bytes invalida la aceptación.

## Construcción del paquete sin exponer credenciales
1. Crear un archivo JSON de configuración **FUERA del repositorio** usando `tools/apdb-staging-config.example.json` como modelo.
2. Conservar `environment: staging`, `resetDatabaseOnStart: false`, `supabaseUrl: https://wffvmthdmmjwspnozyrv.supabase.co` y `publicBasePath: /apdb-2027-prueba/`.
3. Proveer exclusivamente la **clave publishable pública** de staging. No usar `service_role`, clave secret, contraseña de cPanel ni tokens de administración.
4. Generar el paquete desde el repo que contenga este frente después de la integración autorizada:
   `node tools/build-apdb-staging.cjs RUTA-CONFIG-FUERA-DE-GIT.json dist/apdb-2027-prueba-release`
5. Verificar:
   `node tools/verify-apdb-release.cjs dist/apdb-2027-prueba-release`
6. Deben encontrarse exactamente estos **9 archivos** en la raíz del paquete:
   `index.html`, `index_online.html`, `app_online.js`, `apdb-administrative-adapter.js`,
   `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`, `release-integrity.json`.

## Publicación autorizada: operación con cPanel
**Prerequisitos:** Codex terminó el respaldo real y restauración en clon; el diferencial pasó pruebas sobre esa copia; staging se autorizó y actualizó; rollback del backend disponible; cuenta cPanel permitida.
1. En cPanel > File Manager, confirmar que la ruta es `public_html/apdb-2027-prueba/` y que continúa con Directory Privacy activo.
2. Resguardar **fuera de `public_html`**, mediante el mecanismo de copia seguro del administrador, todos los archivos anteriores, permisos y configuración de protección. Comprobar su recuperación antes de reemplazar.
3. Cargar únicamente los nueve archivos del paquete, **como archivos**, manteniendo la carpeta existente. Nunca subir el JSON de configuración, secretos, respaldos SQL ni archivos temporales; no borrar ni reemplazar `.htaccess` o `.htpasswd`.
4. No usar una ruta pública intermedia sin protección. Si se prueba en otro subdirectorio, crear y aprobar su propia protección.
5. Tras publicar, ejecutar desde el equipo autorizado con Node 22+ las comprobaciones. Configurar las credenciales HTTP Basic **en variables de entorno locales**, nunca en comando URL, repositorio, informes ni logs:
   `node tools/check-apdb-hosted-pilot.cjs https://maxibasquetlaplata.com.ar/apdb-2027-prueba/`
   `node tools/check-apdb-hosted-release.cjs https://maxibasquetlaplata.com.ar/apdb-2027-prueba/ dist/apdb-2027-prueba-release`
6. La prueba anónima verifica 401/403 para recursos privados; la prueba autenticada compara bytes reales con los locales y rechaza 200 en `.env`, `config.json`, `backup.dump` y `supabase/config.toml`.
7. Navegador PC y móvil: acceso con Directory Privacy, carga de `index.html`, entrada y salida del usuario Supabase, equipo autorizado, jugador/archivo sintético, permisos negativos de otros equipos, resultados y vista pública correspondiente. Comprobar que las vistas públicas requeridas no queden bloqueadas por el piloto privado al pasar a URL pública definitiva.

## Volver a la versión anterior
- Detener nuevas operaciones si la publicación falla.
- Restaurar **el paquete anterior resguardado**, y su configuración de acceso existente, por el administrador de cPanel.
- Comprobar el hash y acceso de la versión restaurada. Un rollback del frontend **no revierte automáticamente la base de datos**; validar compatibilidad de RPC y escalar si la versión anterior no la soporta.
- Nunca sobrescribir el staging DB como reacción automática ante un fallo visual.

## Criterio de entrega de este frente
**GO de preparación**: todas las pruebas de CI de este branch pasan.
**GO de publicación real**: backup real y clon fiel aprobados, autorización cPanel, paquete generado con publishable key correcta, 9/9 hashes remotos iguales, control anónimo + navegador PC/móvil aprobados.
En ausencia de claves cPanel o permiso explícito, **no publicar**; dejar el paquete y verificador disponibles para la persona autorizada.

**No ampliar alcance funcional ni migrar datos de GES.**
