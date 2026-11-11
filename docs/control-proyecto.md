# APdB Liga Maxi - Control del proyecto

## Continuidad vigente - 2026-11-11

- Rama de trabajo: `codex/apdb-2027-operational-hardening`.
- Ultimo commit publicado: `eaface9caf9a42327c5f091545cc053eea23a65a`.
- Piloto local aislado: `tools/start-apdb-isolated-pilot.ps1`; usa Supabase local descartable y puede ejecutar `db reset --local`.
- Staging persistente: no creado. La plantilla y el procedimiento estan en `tools/apdb-staging-config.example.json` y `docs/APDB_2027_STAGING_RUNBOOK.md`.
- No hay URL de staging habilitada ni credenciales persistentes en el repositorio.
- La ejecucion GitHub Actions #47 (`bed16ad`) permanece en estado `Queued`; no se considera una certificacion visual.

### Estado del ultimo bloque

El Bloque 13 dejo publicado el servidor aislado con lista explicita de archivos publicos y validacion de configuracion staging. Las regresiones demo locales aprobaron contratos deportivos, autorizacion, aislamiento, programacion, playoffs y tres pruebas Chromium sinteticas.

El siguiente trabajo es destrabar la validacion visual aislada de playoffs Top 4, Top 6 y Top 8. Debe comprobar generacion, avance, campeon y recuperacion desde `index_online.html`; las pruebas Node/RPC no sustituyen esa evidencia.

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

