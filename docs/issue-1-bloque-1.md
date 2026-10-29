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
- `node tools/issue1-smoke.cjs`: `ISSUE1_SMOKE_OK`.

## Cambio realizado

Se agregó `tools/smoke-server.js`, un servidor HTTP local mínimo para reproducir la carga de la aplicación sin publicar ni consultar rutas arbitrarias. Sirve únicamente archivos dentro del worktree y escucha en `127.0.0.1`.

También se agregó `tools/issue1-smoke.cjs`, que ejecuta aserciones reales sobre:

- carga de `index_online.html`;
- presencia de controles públicos, Delegados, Asociación, fixture y tabla;
- cálculo de tabla para victoria y empate;
- desempate olímpico para resolución administrativa;
- rechazo de URL malformada con HTTP 400;
- rechazo de traversal con HTTP 403;
- continuidad del servidor después de ambas solicitudes inválidas.

## Prueba de navegador

Se intentó Playwright mediante `npm exec`, pero el entorno no entregó un runtime utilizable. También se intentó Microsoft Edge headless; no produjo DOM ni captura verificable desde este proceso. La automatización de la ventana Edge quedó además bloqueada por la política de seguridad del entorno. Estas pruebas no se informan como superadas.

## Hallazgos

Se corrigió un fallo reproducible del servidor de smoke: `decodeURIComponent()` podía lanzar una excepción ante una URL malformada y terminar el proceso. Ahora responde HTTP 400 y continúa atendiendo solicitudes.

Quedan pendientes las pruebas que requieren sesión real de Asociación y Delegado, persistencia contra Supabase y verificación visual/interactiva de fixture, resultados y playoffs.

## No realizado

- No se inició sesión ni se transmitieron credenciales.
- No se escribieron datos en Supabase.
- No se modificaron fixtures, resultados, habilitaciones ni auditoría documental.
- No se publicó a GitHub Pages.

## Bloque siguiente validado

Se reforzó `tools/smoke-server.js` con una allowlist explícita de recursos públicos. Las rutas a `.git`, `.env`, `docs`, `tools`, directorios y traversal codificado devuelven 404; además se valida `realpath`, archivo regular y supervivencia después de errores.

Las pruebas quedaron separadas en tres grupos dentro de `tools/issue1-smoke.cjs`:

- Dominio: tabla normal, 0-0 `administrativo_sin_puntos` con cero puntos, desempate olímpico y rechazo de empate 60-60 en un resultado normal.
- Planificador/roles: fixture con tres equipos y fecha bloqueada, salto de fecha, siguiente fecha libre, reglas de roles y deduplicación de permisos.
- Interfaz/servidor: contrato estático de IDs HTML y HTTP local. Esto no se presenta como renderizado visual ni interacción real del navegador.

La validación del empate ejecuta la función real `validarMarcadorResultadoNormal` desde `app_online.js` y la aplican tanto el guardado de Delegado como el de Asociación. La vía administrativa permanece separada.

Resultado local del bloque: `node tools/issue1-smoke.cjs` -> `ISSUE1_SMOKE_OK`; `node --check` para los tres archivos y `git diff --check` correctos. No hubo acceso ni escritura en Supabase.

La captura visual y la prueba de navegador real siguen bloqueadas en este entorno; no se presentan como verificadas. CI headless queda como mejora posterior si se habilita un runner controlado.
