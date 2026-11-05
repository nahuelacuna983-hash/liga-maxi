# APdB 2027 - entrega institucional privada

## Paquete

El ZIP histórico de septiembre no está disponible en este checkout. Se incorporó `tools/build-cpanel-private-package.ps1` para reconstruirlo de forma reproducible a partir de la aplicación vigente.

El paquete usa `index_online.html` como entrada `index.html` e incluye `app_online.js`, `style.css`, `manifest.json`, `sw.js`, iconos, `assets/` y `.htaccess`. No incluye SQL, documentación interna, `private/`, Node, credenciales ni datos.

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
3. Subir el contenido del ZIP, excluyendo cualquier archivo local no incluido en el manifiesto.
4. Verificar HTTPS, login, lectura pública, delegado, programación y consola.
5. Revertir eliminando sólo la carpeta de prueba y restaurando el backup si cualquier comprobación falla.

No se ejecutó despliegue ni se accedió al dominio institucional.

## Bloqueos concretos

- Validar en el entorno real los datos de las cuatro categorías.
- Confirmar HTTPS/AutoSSL y ruta privada de cPanel.
- Completar Auth/RLS/Storage para documentación real.
- Definir si el piloto usa la aplicación original o una migración progresiva al backend PostgreSQL 2027.
- Ejecutar pruebas de navegador y persistencia en la infraestructura aislada correspondiente.
