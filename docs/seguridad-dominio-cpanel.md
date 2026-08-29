# Seguridad, dominio y cPanel

Fecha: 28/08/2026

Objetivo: preparar el paso de GitHub Pages a `maxibasquetlaplata.com.ar` sin exponer datos ni romper la PWA.

## Situacion actual

- La app funciona en GitHub Pages.
- El dominio `https://maxibasquetlaplata.com.ar/` responde con Apache.
- `http://maxibasquetlaplata.com.ar/` tambien responde, pero no redirige automaticamente a HTTPS.
- La app usa Supabase con una publishable/anon key visible en JavaScript.
- La proteccion real de datos depende de RLS, politicas y funciones RPC seguras.

## Cambios ya preparados en codigo

En `manifest.json`:

- `start_url` preparado para `/`;
- `scope` preparado para `/`.

En `app_online.js`:

- se elimino la URL fija de GitHub;
- el QR y acceso usan la ruta donde este abierta la app.

Importante: estos cambios convienen para dominio propio en raiz. No publicarlos a GitHub Pages como cambio final si la app sigue viviendo en `/liga-maxi/`.

## Verificacion RLS

Archivo preparado:

`docs/verificar-rls-antes-dominio.sql`

Uso:

1. Abrir Supabase.
2. Ir a SQL Editor.
3. Copiar el contenido del archivo.
4. Ejecutar.
5. Revisar columna `control`.

Lectura:

- `CRITICO`: tabla con RLS apagado. No avanzar al dominio sin revisar.
- `REVISAR: sin politicas`: RLS activo pero sin politicas. Puede estar bien si solo se usa por RPC segura, pero hay que entenderlo.
- `OK`: RLS activo con politicas.

Tablas sensibles a revisar:

- `partidos`
- `categorias`
- `torneos`
- `equipos`
- `documentos`
- `document_files`
- `document_requirements`
- `team_players`
- `playoff_matches`
- `match_schedules`
- `app_usage_events`
- tablas o vistas de permisos/usuarios

RPC sensibles a revisar:

- `get_current_app_user_permissions`
- `add_team_player`
- `request_team_player_deactivation`
- `deactivate_team_player`
- `mark_team_document_uploaded`
- `mark_player_document_uploaded`
- `review_team_document`
- `review_player_document`
- `review_drive_player_document`
- `create_player_from_drive_review`

## Archivos para subir a cPanel

Subir a `public_html`:

- `index.html`
- `app_online.js`
- `style.css`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- carpeta `assets/`

No subir:

- `docs/`
- `private/`
- `.git/`
- `informes/`
- archivos `.sql`
- archivos temporales o descargas locales

## .htaccess recomendado

Crear o editar `.htaccess` en `public_html`:

```apache
RewriteEngine On

# Forzar HTTPS
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Evitar cache agresivo del Service Worker
<Files "sw.js">
  Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
  Header set Pragma "no-cache"
  Header set Expires "0"
</Files>

# Cache moderado para assets estaticos
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 hour"
  ExpiresByType application/javascript "access plus 1 hour"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
</IfModule>
```

Si el hosting no permite `Header`, pedir habilitar `mod_headers` o dejar solo el redirect HTTPS.

## AutoSSL

Antes de instalar PWA:

1. Entrar a cPanel.
2. Ejecutar AutoSSL.
3. Esperar certificado activo para:
   - `maxibasquetlaplata.com.ar`
   - `www.maxibasquetlaplata.com.ar`
   - `cpanel.maxibasquetlaplata.com.ar` si corresponde.
4. Probar `https://maxibasquetlaplata.com.ar/`.
5. Probar que `http://...` redirige a `https://...`.

## Supabase Auth

En Supabase > Auth > URL Configuration:

- Site URL: `https://maxibasquetlaplata.com.ar`
- Redirect URLs:
  - `https://maxibasquetlaplata.com.ar`
  - `https://maxibasquetlaplata.com.ar/`
  - mantener GitHub Pages si durante la transicion se usan ambos entornos.

## Pruebas despues de subir

1. Abrir en navegador limpio.
2. Confirmar que carga sin pantalla negra prolongada.
3. Probar QR en Acceso si la pestaña vuelve a mostrarse.
4. Probar login.
5. Probar carga simple de resultado en entorno seguro.
6. Probar carga documental.
7. Probar abrir archivo documental desde Asociacion.
8. Probar PWA en celular.
9. Revisar consola del navegador.
10. Revisar Supabase Auth y eventos de uso.

## Aviso a usuarios instalados

Cuando se cambie de GitHub Pages a dominio propio:

- avisar que la app anterior instalada puede seguir apuntando a GitHub;
- pedir desinstalar icono anterior;
- entrar desde `https://maxibasquetlaplata.com.ar/`;
- instalar nuevamente.

## Mejoras de rendimiento pendientes

- Redimensionar `icon-192.png` a 192x192 real.
- Redimensionar `icon-512.png` a 512x512 real.
- Optimizar escudos pesados, especialmente `universal.png`, `mayo.png`, `banco-provincia.png`, `astillero.png`.
- Evaluar separar JS en modulos cuando la app crezca mas.

