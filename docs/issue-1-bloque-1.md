# Issue #1 - Bloque 1

Fecha de validación: 28/10/2026.

## Alcance

Se trabajó desde `main` en la rama `codex/issue-1-bloque-1`. La auditoría documental 2026 y los datos de Supabase no fueron modificados.

## Comprobaciones ejecutadas

- `node --check app_online.js`: correcto.
- `node --check tools/smoke-server.js`: correcto.
- Servidor local en `127.0.0.1:8790`: inició y respondió `HTTP 200` para `index_online.html`.
- Se comprobó que la página contiene los módulos públicos, Delegados, Asociación, fixture, tabla y playoffs.
- `git diff --check`: correcto.

## Cambio realizado

Se agregó `tools/smoke-server.js`, un servidor HTTP local mínimo para reproducir la carga de la aplicación sin publicar ni consultar rutas arbitrarias. Sirve únicamente archivos dentro del worktree y escucha en `127.0.0.1`.

## Prueba de navegador

La automatización de Microsoft Edge quedó bloqueada por la política de seguridad del entorno: no pudo determinar con suficiente confianza la URL de la ventana y detuvo la interacción. No se informó como prueba funcional superada.

## Hallazgos

No se detectó durante este bloque un error JavaScript bloqueante reproducible con las pruebas disponibles. Quedan pendientes las pruebas que requieren sesión real de Asociación y Delegado, persistencia contra Supabase y verificación visual/interactiva de fixture, resultados y playoffs.

## No realizado

- No se inició sesión ni se transmitieron credenciales.
- No se escribieron datos en Supabase.
- No se modificaron fixtures, resultados, habilitaciones ni auditoría documental.
- No se publicó a GitHub Pages.
