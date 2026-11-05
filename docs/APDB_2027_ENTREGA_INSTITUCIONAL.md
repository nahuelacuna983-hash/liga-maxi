# APdB 2027 - entrega institucional privada

## Paquete

El ZIP histórico de septiembre no está disponible en este checkout. Se incorporó `tools/build-cpanel-private-package.ps1` para reconstruirlo de forma reproducible a partir de la aplicación vigente. El manifiesto de hashes se llama `FILE-MANIFEST.json` para no colisionar con el `manifest.json` PWA en sistemas de archivos Windows.

El paquete usa `index_online.html` como entrada `index.html` e incluye `app_online.js`, `style.css`, un `manifest.json` con `start_url: "./"` y `scope: "./"`, `sw.js`, iconos, `assets/`, `.htaccess` e instrucciones breves. No incluye SQL, documentación interna, `private/`, Node, credenciales ni datos.

Construcción en Windows:

```powershell
cd C:\Users\yanam\Documents\Codex\liga-maxi
powershell -ExecutionPolicy Bypass -File .\tools\build-cpanel-private-package.ps1
```

El ZIP queda en `private/`, que permanece excluido de Git.

## Evaluación funcional

La aplicación original declara y carga las categorías Maxi +35 A, Maxi +35 B, Maxi +48 y Femenino mediante Supabase en tiempo de ejecución. El contrato local verifica que las cuatro categorías estén representadas, pero no afirma que sus fixtures, tablas, resultados o inscripciones estén operativos sin consultar el entorno de datos correspondiente.

La versión PostgreSQL 2027 ya tiene circuito persistente aislado para torneos, categorías, equipos, programación, resultados, tablas, documentación sintética, historial y playoffs. No es un reemplazo directo del `app_online.js`: sus modelos, autenticación y contratos aún deben integrarse con la experiencia original antes de alojarla institucionalmente.

## Documentación y seguridad

Los módulos históricos de documentación, auditoría y Supabase se conservan como referencia. No se incluye carga de documentación médica en el paquete cPanel. Los documentos privados requieren Auth real, RLS revisado, Storage privado, auditoría append-only, control de archivos y backup antes de una prueba con datos reales.

## Prueba privada y reversión

1. Hacer backup del `public_html` actual en cPanel.
2. Crear una subcarpeta privada o subdominio de prueba, sin reemplazar la raíz.
3. Activar cPanel **Directory Privacy** sobre esa carpeta, con usuario temporal gestionado por cPanel. No guardar esa contraseña en el ZIP ni en Git.
4. Subir el contenido del ZIP, excluyendo cualquier archivo local no incluido en el manifiesto.
5. Abrir `https://maxibasquetlaplata.com.ar/apdb-2027-prueba/` y verificar que las rutas relativas carguen HTML, JS, CSS, iconos y service worker.
6. Verificar HTTPS, login, lectura pública, delegado, programación y consola.
7. Revertir eliminando sólo la carpeta de prueba y restaurando el backup si cualquier comprobación falla.

No se ejecutó despliegue ni se accedió al dominio institucional.

## Bloqueos concretos

- Validar en el entorno real los datos de las cuatro categorías.
- Confirmar HTTPS/AutoSSL y ruta privada de cPanel.
- Completar Auth/RLS/Storage para documentación real.
- Definir si el piloto usa la aplicación original o una migración progresiva al backend PostgreSQL 2027.
- Ejecutar pruebas de navegador y persistencia en la infraestructura aislada correspondiente.

## Prueba local de subcarpeta

Después de extraer el ZIP en una carpeta temporal:

```powershell
node tests/institutional-package-subpath.cjs C:\temp\apdb-2027-prueba
```

La prueba comprueba navegación bajo `/apdb-2027-prueba/`, HTML, JavaScript, CSS, manifiesto, service worker e iconos. No demuestra por sí sola que Supabase, fixtures, tablas, resultados o inscripciones funcionen en las cuatro categorías.

## Rutas institucionales

Las rutas canónicas verificadas son `/35-a/`, `/35-b/`, `/48/` y `/femenino/`. El enlace histórico `/liga/?categoria=Maxi+%2B35+B` no debe utilizarse: el parche concreto está en `docs/parche-enlaces-categorias-institucional.md`. La prueba reproducible de navegación es:

```powershell
node tools/verify-category-routes.cjs
```

La prueba valida HTTP, encabezado e iframe; no sustituye una validación autorizada de datos deportivos de Femenino.
