# Paquete para cPanel

Fecha: 28/08/2026

Objetivo: tener claro que archivos subir al hosting y cuales no.

## Subir a public_html

- `index.html`
- `app_online.js`
- `style.css`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `assets/`

## No subir

- `.git/`
- `docs/`
- `private/`
- `informes/`
- archivos `.sql`
- archivos de descarga local
- claves o credenciales

## Checklist antes de subir

1. RLS revisado en Supabase.
2. AutoSSL activo.
3. `.htaccess` con redirect HTTPS.
4. `manifest.json` con `start_url` y `scope` correctos para `/`.
5. `urlPublicaApp()` usando dominio actual.
6. Backup del hosting si ya tiene contenido.
7. Prueba inicial en una carpeta temporal si no se quiere reemplazar la raiz.

## Checklist despues de subir

1. Abrir `https://maxibasquetlaplata.com.ar/`.
2. Revisar consola del navegador.
3. Probar login.
4. Probar lectura publica.
5. Probar una accion controlada.
6. Probar PWA desde celular.
7. Confirmar que `sw.js` no queda cacheado.

