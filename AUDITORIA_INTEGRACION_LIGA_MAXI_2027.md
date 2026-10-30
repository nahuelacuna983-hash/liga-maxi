# Auditoría de integración Liga Maxi/APdB 2027

Fecha: 2026-10-29  
Rama de auditoría: `codex/audit-integration-2027`  
Base revisada: `codex/demo-2027-visual` (`b2bef9e`)  
Alcance: lectura de `index_online.html`, `app_online.js`, `style.css`, demo 2027 y pruebas locales. No se modificó la aplicación ni se accedió a Supabase.

## 1. Resumen ejecutivo

La aplicación actual sigue siendo una aplicación monolítica de navegador con cuatro recorridos principales: Público, Fecha, Delegados y Asociación. `app_online.js` contiene 367 funciones declaradas y 107 referencias a Supabase/Storage. La demo 2027 es un entorno aislado útil para validar reglas y navegación, pero todavía no es una versión sucesora de la aplicación: no autentica usuarios, no carga datos administrativos, no persiste y mantiene varias acciones simuladas o deshabilitadas.

El planificador local ya cubre una primera parte funcional: selección sintética de categoría, equipos, round-robin, ruedas, localías, día semanal, fechas bloqueadas y regeneración en memoria. La integración de pantallas reales debe comenzar por extraer funciones puras y por inyectar un proveedor de datos local, sin cargar `app_online.js` completo ni crear un segundo conjunto de reglas deportivas.

## 2. Inventario funcional actual

### Público

Pantalla `#vista-publico`, seleccionada por `#tab-publico`.

- Selección de categoría.
- Fixture por jornada y fecha.
- Tabla con PJ, PG, PP, PF, PC, DIF y PTS.
- Resultados normales.
- Resultados administrativos, incluido `administrativo_sin_puntos`.
- Playoffs, promociones/descensos y estados de competencia.
- Carga pública inicial, caché local y actualización de URL por categoría.

Funciones relevantes: `cargarTorneoActivo`, `cargarCategorias`, `cargarPartidosCategoria`, `cargarResultadosPlayoffCategoria`, `renderPublicoCategoria`, `renderFixturePublico`, `renderTablaSimple`, `renderPlayoffsSimple`, `calcularTabla`, `calcularMiniTablaOlimpica`, `ganadorPartidoPlayoff`, `ganadorSeriePlayoff`.

### Fecha

Pantalla `#vista-fecha`, asociada a `#tab-fecha`.

- Vista destacada de jornada/fecha y acceso contextual a la competencia.
- Depende de categorías, fixture y resultados cargados.

La cobertura de la demo 2027 para esta vista es inexistente.

### Delegados

Pantalla `#vista-delegados`, con clave legacy y controles de edición.

- Desbloqueo de delegado y reconciliación de categorías/equipos.
- Selección de categoría y partido.
- Carga de resultado normal.
- Gestión de plantel: alta, lista, CSV y póliza.
- Carga de documentos de equipo/jugador hacia Storage.
- Solicitud de baja/corrección.
- Alertas de vencimiento y documentación observada.

Funciones relevantes: `validarDelegado`, `validarDelegadoConPermisos`, `cargarPermisosPorClave`, `renderDocumentacionDelegado`, `guardarResultadoDelegado`, `agregarJugadorDelegado`, `subirDocumentoDelegado`, `subirDocumentoJugadorDelegado`, `solicitarBajaJugadorDelegado`, `validarListaEquipoDelegado`, `exportarListaEquipoDelegadoCsv`.

La demo no implementa Delegados. Esto es intencional hasta validar la integración de Asociación y el contrato de permisos.

### Asociación

Pantalla `#vista-asociacion` con acceso y subnavegación:

- Inicio.
- Competencia/resultados.
- Documentación.
- Torneos.
- Programación.
- Administración/permisos.
- Auditoría de uso y cierres.

Controles visibles relevantes: `asociacion-categoria`, selección de partido, carga/corrección de resultado, 0-0 administrativo sin puntos, anulación, resolución administrativa 20-0, playoffs, programación e informes.

Funciones relevantes: `puedeAccederAsociacion`, `mostrarPanelAsociacion`, `renderInicioAsociacion`, `guardarResultadoAsociacion`, `guardarResultadoAdministrativoSinPuntos`, `resolverPartidoAdministrativamente`, `anularResultadoAsociacion`, `renderPlayoffsAsociacion`, `guardarResultadoPlayoffAsociacion`, `renderProgramacionAsociacion`, `guardarProgramacionFila`, `renderDocumentacionAsociacion`, `renderDocumentacionJugadoresAsociacion`, `renderAuditoriaDocumentalAsociacion`, `renderCierreAsociacion`.

La demo contiene un panel visual con los seis nombres de sección y una competencia sintética, pero no replica aún la documentación administrativa ni los permisos.

## 3. Comparación con la demo 2027

| Área | Aplicación actual | Demo 2027 | Estado |
|---|---|---|---|
| Público fixture | Supabase + render real | Fixture sintético | Parcial |
| Tabla | Tabla completa y desempates | Módulo deportivo aislado | Equivalencia probada en casos preparados |
| Resultados | Lectura/escritura/RPC | Lectura sintética | Escritura simulada/deshabilitada |
| Playoffs | Configuración y persistencia | Ganador de partido/serie en módulo | Parcial |
| Asociación | Panel completo conectado | Navegación local y competencia | Visual parcial |
| Categorías | Consulta Supabase | Selector sintético | Simulado |
| Equipos | Consulta Supabase | Listas sintéticas | Simulado |
| Planificador | Planner original en `app_online.js` | Adaptador local | Parcial; equivalencia completa pendiente |
| Delegados | Login legacy/Auth, planteles y documentos | No implementado | Pendiente |
| Documentación | Supabase, Storage, Drive/OCR y auditoría | Panel informativo | Pendiente |
| Permisos | Clave legacy y Auth/RLS en transición | Deshabilitados | Pendiente |

## 4. Dependencias a aislar

### Supabase y Storage

`app_online.js` crea el cliente Supabase durante la carga del archivo. Además, sus recorridos usan consultas `.from(...)`, RPC, `auth`, Storage y URLs firmadas. Por eso no es seguro importar el archivo completo en una demo local para obtener sólo una función: la carga puede iniciar operaciones remotas.

La solución recomendada es un proveedor de datos con la misma forma de respuesta:

```text
DataProvider
  getTorneos()
  getCategorias(torneoId)
  getEquipos(categoriaId)
  getPartidos(categoriaId)
  getPlayoffs(categoriaId)
  getDocumentos(categoriaId)
```

La demo debe inyectar `SyntheticDataProvider`; la aplicación real debe inyectar `SupabaseDataProvider`. Los métodos de escritura deben estar ausentes o lanzar explícitamente en modo demo.

### Estado global

La aplicación usa un objeto global `estado`, caches locales y listeners de DOM. La integración gradual debe extraer primero funciones puras y dejar la coordinación de pantalla en un adaptador, evitando duplicar el estado completo.

### Identidad y permisos

Delegados y Asociación tienen recorridos legacy y nuevos RPC/RLS en transición. La demo no debe intentar simular autenticación como si fuera seguridad real. Debe mostrar un aviso de modo local y mantener deshabilitadas las acciones de escritura.

## 5. Identidad visual a conservar

- Navegación por pestañas y paneles con estados activo/inactivo.
- Tarjetas de trabajo con bordes suaves y jerarquía compacta.
- Paleta institucional azul, blanco y acentos de estado.
- Tablas de lectura rápida para resultados y posiciones.
- Fixture agrupado por jornada/fecha.
- Mensajes de estado para carga, éxito y error.
- Diseño responsive existente: grids que colapsan cerca de 720/900 px y tablas con desplazamiento horizontal cuando corresponde.
- Lenguaje operativo en español y etiquetas de Asociación/Delegados ya conocidas por los usuarios.

No se recomienda reemplazar la identidad por una aplicación nueva ni introducir una segunda navegación incompatible.

## 6. Problemas y riesgos

### Confirmados por inspección

1. `app_online.js` no es modular: cargar una función pura implica cargar configuración y cliente Supabase.
2. La demo y la aplicación real todavía tienen dos adaptadores de fixture; la equivalencia completa del planificador original sigue pendiente.
3. Delegados no tiene una superficie demo aislada.
4. Documentación, Storage, Drive/OCR y permisos no están representados funcionalmente en la demo.
5. La interfaz real tiene muchas rutas de escritura; no deben conectarse al proveedor sintético por accidente.

### Riesgos de interfaz

- Tablas anchas en celular: conservar wrappers con `overflow-x:auto` y probar encabezados/celdas.
- Paneles ocultos por reglas globales: usar selectores específicos y pruebas de visibilidad efectiva.
- Formularios con acciones de escritura: mantener disabled y un aviso de sólo lectura en demo.
- Fechas: conservar formato ISO interno y presentación local; probar fechas bloqueadas y zona horaria.
- Estados administrativos: no representar una lectura sintética como aprobación real.

### No comprobado en este diagnóstico

- Navegación completa del `index_online.html` con datos reales.
- Permisos de Supabase en navegador.
- Flujo real de Storage y URLs firmadas.
- Carga de documentos, informes y auditoría.
- Playoffs completos con todos los formatos de categorías.

## 7. Pruebas actuales y faltantes

### Ejecutadas en ramas anteriores

- `DEMO_2027_SPORTS_OK`.
- `DEMO_2027_EQUIVALENCE_OK` para casos preparados de tabla, mini tabla y playoffs.
- `DEMO_FIXTURE_OK` para 4, 6 y 10 equipos, ruedas y bloqueos.
- `DEMO_ASSOCIATION_UI_STATIC_OK`.
- Navegación visual real de demo Público y Asociación en Edge.

### Necesarias

1. Equivalencia exhaustiva del planificador original con cantidades pares/impares, libres, ruedas, día de juego, especiales y límite de calendario.
2. Tabla: empate de puntos, triple empate, administrativo sin puntos, resolución 20-0, partido incompleto y equipos sin partidos.
3. Playoffs: top 4/top 6/top 8, repechaje, mejor de 3, global, tercer partido y avance automático.
4. Fixtures: equipos duplicados, categoría vacía, fechas bloqueadas consecutivas y regeneración idempotente.
5. Navegador: desktop/móvil, paneles activos, errores JS, navegación por URL y recarga.
6. Permisos: anónimo, delegado propio/ajeno y Asociación en entorno PostgreSQL aislado.
7. Proveedor de datos: garantizar cero llamadas de red en modo demo.

## 8. Hoja de ruta 2027

### Bloque 1 — Contratos puros

Extraer en módulos compartidos tabla, mini tabla, estados de resultado, planificador y playoffs. Criterio de cierre: casos de equivalencia contra `app_online.js` sin inicializar Supabase, incluyendo los escenarios de límite.

### Bloque 2 — Proveedor sintético

Crear datos tipados de torneo/categoría/equipo/partido/playoff y un proveedor de sólo lectura. Criterio: demo arranca sin red y todas las pantallas muestran una fuente identificable como sintética.

### Bloque 3 — Asociación visual

Integrar gradualmente los componentes visuales existentes: categoría, equipos, fixture, tabla, programación y playoffs. Criterio: navegación y estados visuales equivalentes, acciones de escritura bloqueadas.

### Bloque 4 — Asociación funcional aislada

Conectar un backend de prueba con permisos sintéticos y RPC/RLS aisladas. Criterio: pruebas positivas/negativas reproducibles, sin producción.

### Bloque 5 — Delegados

Integrar autenticación de prueba, equipo propio, plantel y documentación. Criterio: ningún acceso entre equipos y ninguna escritura sin autorización.

### Bloque 6 — Integración de informes/documentación

Incorporar vistas administrativas y generación de informes sólo después de cerrar identidad, procedencia y estados. Criterio: lectura, identificación, evaluación y aprobación permanecen separadas.

### Bloque 7 — Preparación de publicación

Revisión de diff, configuración, pruebas de navegador, migraciones aprobadas y plan de rollback. Criterio: no hay secretos, no hay referencias 2026 no intencionales y todas las escrituras críticas pasan por el contrato aprobado.

## 9. Criterio de no regresión

Hasta completar los bloques anteriores, la demo debe permanecer aislada, con datos sintéticos y sin acciones de publicación. Ningún resultado de esta auditoría habilita cambios en `main`, PR #2, Supabase, GitHub Pages o auditoría documental 2026.

## 10. Estado final

La demo visual es válida para continuar con el planificador y la integración progresiva de Asociación. No está lista para reemplazar la aplicación real ni para iniciar Delegados conectado. El próximo paso recomendado es cerrar la equivalencia completa del planificador y construir el `SyntheticDataProvider` antes de integrar más pantallas.
