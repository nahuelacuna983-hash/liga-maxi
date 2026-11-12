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

La ejecucion aislada #48 aprobo autenticacion, programacion, resultados, Top 6 y Top 8; Top 4 agotaba el timeout porque el panel reemplazaba el boton de generacion mientras se asentaba la categoria. La prueba ahora resuelve el boton vigente en el momento del clic y registra la fase, sin relajar la espera de la respuesta RPC. Falta repetir CI para certificar Top 4.

En el Bloque 18 se agrego un indicador operativo en el panel de playoffs de Asociacion con fase actual, partidos pendientes, instruccion de avance y campeon cuando corresponde. La ejecucion #49 mantuvo Top 6/8 aprobados y reprodujo el fallo Top 4 sin RPC; la correccion ahora espera el estado `ready` del panel despues de completar la recarga de categoria antes de accionar Generar llave.

En la continuacion se comprobo en CI #50 que Top 4 tenia la categoria cargada, pero el estado `ready` se publicaba despues de refrescos documentales auxiliares. El panel ahora queda listo inmediatamente despues de renderizar sus propios datos, sin esperar cargas no deportivas. La suite local sigue aprobada; falta repetir CI para validar Top 4 en Supabase aislado.

La ejecucion #51 repitio el fallo porque el selector exigia tambien `data-category-name`; el estado real del boton no pudo verificarse con ese selector compuesto. La prueba ahora valida el valor seleccionado por separado y el panel `ready`, mientras el render del propio panel publica ambos atributos. Se preparo `private/apdb-2027-prueba-update.zip` para la instalacion privada: SHA-256 `C51A1FEE37290D72211DDB3E3A6871274B89A678FA437126AD4487F4B66B0850`. El ZIP no incluye `.htaccess`, SQL, credenciales ni archivos internos.

El paquete fue endurecido posteriormente: su `app_online.js` ya no contiene el fallback de Supabase productivo y `apdb-private-config.js` queda en modo offline hasta que se reemplace externamente por una configuracion publica de staging autorizada. La interfaz informa que las operaciones persistentes no estan disponibles sin backend. El ZIP regenerado queda en `private/apdb-2027-prueba-update.zip` con SHA-256 `08DE341F084285BBD0B6FB313711260198A989CA9865CAD5AE2749C0F569A5E8`.

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

## Paquete privado APdB actualizado

El constructor `tools/build-cpanel-private-package.ps1` genera ahora un ZIP
offline navegable: su entrada carga el circuito sintético existente y no carga
`app_online.js` ni contiene fallback hacia Supabase productivo. Las escrituras
que se muestran son de demostración en memoria y se identifican como no
oficiales; no se presentan como persistentes. El paquete conserva el archivo
`app_online.js` saneado como referencia para una futura configuración staging,
pero no puede conectarse sin una configuración externa autorizada.

ZIP: `private/apdb-2027-prueba-update.zip`
SHA-256: `8F09DA734D3E9C8E7B33129BB5345594BD8A334F679C0E30387C411748EA16E9`

Pruebas ejecutadas: `APDB_PRIVATE_PACKAGE_SAFETY_OK`,
`INSTITUTIONAL_PACKAGE_SUBPATH_OK` y Chromium offline del paquete. La
protección `.htaccess` de cPanel no se incluye ni se reemplaza. La corrección
de renderizado de playoffs marca `ready` sobre el nodo vigente después de
terminar las reconstrucciones de la categoría; Top 4 aún requiere una nueva
ejecución aislada para certificarse.

