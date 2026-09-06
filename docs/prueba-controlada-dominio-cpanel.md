# Prueba controlada en dominio propio

Dominio previsto: `https://maxibasquetlaplata.com.ar/`

Fecha de preparacion: 05/09/2026

## Objetivo

Probar la app en el hosting de la asociacion sin cortar el funcionamiento actual ni avisar todavia a delegados/jugadores.

La migracion definitiva queda pendiente hasta validar seguridad, login, roles y funcionamiento real desde celulares.

## Paquete preparado

Archivo:

`C:\liga-maxi\private\cpanel-maxibasquetlaplata-20260905-233727-con-htaccess.zip`

Contenido:

- `index.html`
- `app_online.js`
- `style.css`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `assets/`
- `.htaccess`

No incluye:

- `docs/`
- SQL
- backups
- archivos privados

## Cambios ya preparados para dominio raiz

- `manifest.json` usa `start_url: "/"`.
- `manifest.json` usa `scope: "/"`.
- `app_online.js` calcula la URL publica desde el dominio donde se abre la app.
- `sw.js` no cachea la aplicacion de forma agresiva.
- `.htaccess` fuerza HTTPS y evita cache fuerte del service worker.
- Los iconos PWA fueron optimizados:
  - `icon-192.png`: 192x192, aprox. 60 KB.
  - `icon-512.png`: 512x512, aprox. 416 KB.

## Checklist antes de subir

1. En cPanel, verificar que AutoSSL/HTTPS este activo.
2. Confirmar que el dominio abra con candado:
   `https://maxibasquetlaplata.com.ar/`
3. No tocar todavia GitHub Pages.
4. No borrar el sitio actual si existe algo en `public_html`; primero hacer backup desde cPanel.
5. Subir el contenido del zip a `public_html`.

## Checklist despues de subir

1. Abrir el dominio desde una ventana anonima.
2. Probar que no redirija a GitHub Pages.
3. Probar la pantalla publica.
4. Probar login/acceso delegado.
5. Probar carga de un dato no critico o de prueba.
6. Probar Asociacion.
7. Probar Documentacion.
8. Probar Habilitados/arbitros.
9. Probar Programacion.
10. Probar instalacion PWA desde celular.

## Supabase Auth

Cuando el dominio ya responda bien, actualizar en Supabase:

- Site URL:
  `https://maxibasquetlaplata.com.ar/`
- Redirect URLs:
  `https://maxibasquetlaplata.com.ar/`

Si se quiere mantener GitHub Pages durante la transicion, agregar tambien:

- `https://nahuelacuna983-hash.github.io/liga-maxi/`

## Seguridad pendiente

Antes de anunciar el dominio como definitivo hay que resolver RLS/grants.

Archivos relacionados:

- `docs/plan-seguridad-rls-por-etapas.md`
- `docs/verificar-rls-antes-dominio.sql`
- `docs/verificar-grants-anon.sql`
- `docs/ejecutar-en-supabase-rls-etapa-1-compatibilidad.sql`

## Decision recomendada

Usar el dominio primero como prueba privada.

No avisar cambio oficial a delegados hasta:

- validar HTTPS;
- validar carga desde celular;
- validar que el login funciona;
- validar que no quedaron datos sensibles visibles;
- definir si se ejecuta la etapa 1 de RLS.
