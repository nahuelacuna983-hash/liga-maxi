# APdB Liga Maxi - Control del proyecto

## Continuidad vigente - 2026-11-11

- Rama de trabajo: `codex/apdb-2027-operational-hardening`.
- Ultimo commit publicado: `eaface9caf9a42327c5f091545cc053eea23a65a`.
- Piloto local aislado: `tools/start-apdb-isolated-pilot.ps1`; usa Supabase local descartable y puede ejecutar `db reset --local`.
- Staging persistente: no creado. La plantilla y el procedimiento estan en `tools/apdb-staging-config.example.json` y `docs/APDB_2027_STAGING_RUNBOOK.md`.
- No hay URL de staging habilitada ni credenciales persistentes en el repositorio.
- La ejecucion GitHub Actions #47 (`bed16ad`) permanece en estado `Queued`, sin jobs ni logs; no se considera una certificacion visual. Referencia: `https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/43096368429`.

### Estado del ultimo bloque

El Bloque 13 dejo publicado el servidor aislado con lista explicita de archivos publicos y validacion de configuracion staging. Las regresiones demo locales aprobaron contratos deportivos, autorizacion, aislamiento, programacion, playoffs y tres pruebas Chromium sinteticas.

El recorrido visual aislado ya contiene pruebas separadas para Top 4, Top 6 y Top 8, con generacion, avance, campeon y recuperacion desde `index_online.html`. En local, la prueba falla de forma explicita cuando faltan `APDB_ISOLATED_BROWSER_URL`, `SUPABASE_ANON_KEY` y el archivo temporal de credenciales; no se omite ni se marca como aprobada. El siguiente bloqueo es ejecutar el workflow en un runner con Supabase local.

El Bloque 16 agrego ajustes responsive acotados en `index_online.html`: controles tactiles de 44px, formularios a una columna, navegacion de Asociacion adaptable, acciones apiladas y tablas con desplazamiento horizontal contenido. No toca persistencia, permisos, tests ni workflows. La regresion Chromium movil existente continua aprobada; quedan pendientes pruebas visuales autenticadas en dispositivos reales.

### Referencias

- Persistencia y continuidad: `docs/APDB_2027_PERSISTENCIA_CONTINUIDAD.md`.
- Staging: `docs/APDB_2027_STAGING_RUNBOOK.md`.
- Demostracion institucional: `docs/APDB_2027_DEMOSTRACION_INSTITUCIONAL.md`.
- Paquetes y cPanel: `docs/paquete-cpanel.md` y `docs/prueba-controlada-dominio-cpanel.md`.

## Regla principal

La app esta en uso real. Los cambios deben ser incrementales y reversibles.

Hoy la prioridad operativa es que los delegados puedan cargar resultados sin interrupciones.

## Areas en produccion

- Publico: consulta de tablas, fixture, resultados y playoffs visuales.
- Delegados: desbloqueo por clave y carga de resultados.
- Asociacion: correccion manual, auditoria y planner en reconstruccion.

## No tocar sin prueba previa

- Escritura de resultados en Supabase.
- Nombres de categorias existentes.
- IDs de partidos existentes.
- Claves de delegados mientras siga el sistema actual.
- Estructura de tablas en Supabase.
- Fixture de torneos ya iniciados.

## Forma segura de trabajo

1. Leer estado actual.
2. Simular en pantalla o documentar.
3. Probar sin escribir datos reales.
4. Recien despues habilitar escritura.
5. Mantener cambios chicos por etapa.

## Prioridad alta

- Estabilizar la vista Asociacion.
- Reconstruir el planner como simulador de fixture.
- Separar calculos puros de render HTML.
- Definir permisos reales en Supabase antes de crecer el uso administrativo.

## Prioridad media

- Playoffs persistentes y dinamicos.
- Auditoria mas clara para correcciones.
- Mejoras mobile para carga rapida.
- Documentacion por equipo/jugador.

## Riesgos actuales conocidos

- Las claves de delegados estan en el frontend.
- `app_online.js` concentra demasiadas responsabilidades.
- Hay codigo heredado del planner viejo.
- La app depende de GitHub Pages y Supabase en vivo.

## Proxima mejora recomendada

Crear un motor de fixture en modo simulacion dentro de Asociacion:

- no escribe en Supabase;
- usa equipos reales de la categoria;
- respeta ruedas, dia de juego y fechas bloqueadas;
- muestra calendario propuesto;
- avisa si no entra en el rango de fechas.

