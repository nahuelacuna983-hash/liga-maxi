# Guia de pestanas, funcionamiento y usuarios

Proyecto: Gestor de Torneos / Liga Maxi

Estado: documento operativo. Describe la app actual y la incidencia de cada tipo de usuario sobre los datos.

## Idea general

La app tiene cuatro pestanas principales:

- Publico
- Fecha
- Delegados
- Asociacion

Las dos primeras son de consulta. Delegados permite carga controlada por clave. Asociacion concentra administracion, auditoria, documentacion, torneos, programacion e informes.

La regla de seguridad general es:

- Publico y Fecha no escriben datos.
- Delegados escriben solo sobre su equipo/categoria habilitada.
- Asociacion puede corregir, revisar, publicar y auditar.
- Admin general debe poder operar todo y actuar como acceso de socorro.

## Usuarios y roles

### Visitante publico

No usa clave.

Puede ver:

- tablas de posiciones
- fixture y resultados
- fecha destacada
- llaves de playoffs
- informacion publica por categoria

No puede:

- cargar resultados
- cargar documentos
- modificar datos
- ver auditoria
- ver permisos
- publicar fixtures

Incidencia sobre datos: ninguna. Solo lectura.

### Delegado

Ingresa con clave de equipo.

Puede ver y operar solo las categorias/equipos vinculados a su clave.

Puede:

- cargar resultados de partidos habilitados
- ver partidos de su categoria
- cargar documentacion de su equipo
- agregar jugadores para documentacion individual cuando corresponde
- cargar documentos por jugador
- solicitar baja/correccion de un jugador

No deberia poder:

- corregir resultados ya cargados como autoridad
- revisar/aprobar documentacion
- ver documentos de otros equipos fuera de su alcance
- administrar permisos
- publicar fixtures
- cerrar torneos

Incidencia sobre datos:

- Escribe resultados en partidos.
- Sube archivos documentales.
- Crea registros de jugadores/documentos.
- Genera eventos de auditoria de uso.

### Asociacion

Ingresa con clave administrativa o permiso equivalente.

Puede:

- corregir resultados de fase regular
- cargar resoluciones administrativas
- anular resultados
- cargar resultados de playoffs
- revisar/aprobar/observar documentos
- administrar bajas de jugadores
- preparar, simular y publicar fixtures si la categoria esta vacia
- generar informes
- revisar cierres de torneo
- cargar programacion de partidos
- marcar programacion como informada
- consultar auditoria de uso

Incidencia sobre datos:

- Puede modificar resultados y estados administrativos.
- Puede revisar documentacion.
- Puede publicar un fixture simulado en Supabase.
- Puede dejar registros de programacion.
- Puede generar documentos descargables.

### Admin general

Es el rol superior.

Debe poder:

- acceder a todas las asociaciones
- acceder a todas las categorias
- modificar resultados
- revisar documentacion
- publicar fixtures
- administrar usuarios/permisos
- usar acceso de emergencia
- auditar actividad

Incidencia sobre datos:

- Total, con registro de auditoria.

### Jugador

Actualmente no tiene pestana propia.

Estado actual:

- La documentacion por jugador existe dentro del flujo de Delegados y Asociacion.
- El delegado carga jugadores y documentos.
- La Asociacion revisa esos documentos.

Futuro posible:

- acceso individual del jugador
- carga directa de certificado, declaracion jurada y pase
- consulta de estado documental propio

Incidencia actual sobre datos: indirecta, a traves del delegado.

## Pestana Publico

Objetivo: consulta simple y rapida.

Contenido:

- selector de categoria
- tabla de posiciones
- fixture/resultados
- playoffs

Funcionamiento:

- Carga datos desde Supabase.
- Actualiza la categoria seleccionada.
- Muestra escudos cuando existen.
- En playoffs muestra la llave oficial o proyectada segun la categoria.

Incidencia por usuario:

- Visitante: puede ver todo lo publico.
- Delegado: puede usarla como consulta.
- Asociacion/Admin: puede usarla como control visual.

Escritura de datos: no.

Riesgo operativo: bajo.

## Pestana Fecha

Objetivo: mostrar de forma mas directa la fecha/resultados destacados.

Contenido:

- selector de categoria
- resultados de una fecha relevante
- vista mas enfocada para etapa de competencia o comunicacion

Funcionamiento:

- Usa los partidos cargados.
- Prioriza fechas con resultados.
- Si hay resultados cargados en fechas posteriores, la app puede avisar para revisar.

Incidencia por usuario:

- Visitante: consulta.
- Delegado: consulta.
- Asociacion/Admin: control de que lo cargado se vea bien.

Escritura de datos: no.

Riesgo operativo: bajo.

## Pestana Delegados

Objetivo: que cada delegado pueda operar su equipo sin acceder al panel administrativo.

Contenido:

- clave de delegado
- selector de categoria
- selector de partido
- carga de puntos local/visitante
- guardar resultado
- modulo de documentacion
- carga de documentos por equipo
- carga de jugadores/documentos por jugador

Funcionamiento:

1. El delegado ingresa su clave.
2. La app valida clave local y/o permisos desde Supabase.
3. Se habilitan categorias/equipos permitidos.
4. El delegado carga resultados o documentacion.
5. La app guarda datos y registra auditoria.

Documentacion por equipo:

- lista de buena fe
- seguro
- imagenes para redes
- otros requisitos configurados

Documentacion por jugador:

- certificado medico y estudio complementario
- declaracion jurada
- pase

Restricciones actuales:

- Femenino tiene carga de jugadores deshabilitada desde Delegados.
- La baja de jugadores por delegado es solicitud, no baja definitiva.
- La revision/aprobacion documental queda para Asociacion.

Incidencia por usuario:

- Delegado: alta incidencia sobre su equipo.
- Asociacion/Admin: puede verificar lo cargado.
- Publico: no interviene.

Escritura de datos: si.

Riesgo operativo: medio. Afecta resultados y documentacion, pero con alcance limitado por clave.

## Pestana Asociacion

Objetivo: panel administrativo central.

Requiere clave administrativa o permisos.

Subpestanas actuales:

- Operacion
- Documentacion
- Torneos
- Programacion
- Informes
- Cierres
- Permisos
- Auditoria

## Asociacion > Operacion

Objetivo: corregir y administrar resultados deportivos.

Contenido:

- selector de categoria
- selector de partido
- puntos local/visitante
- guardar correccion
- anulacion de resultado
- resolucion administrativa 20-0
- carga de resultados de playoffs

Funcionamiento:

- Permite corregir resultados de fase regular.
- Permite anular resultados cargados.
- Permite resolver partidos no jugados con resultado administrativo.
- Permite cargar resultados de playoffs sin mezclar con fase regular.

Incidencia por usuario:

- Asociacion/Admin: puede modificar datos deportivos reales.
- Delegado/Publico: no acceden.

Escritura de datos: si.

Riesgo operativo: alto. Cambia tablas, resultados, llaves y visualizacion publica.

## Asociacion > Documentacion

Objetivo: control administrativo de documentos cargados por delegados.

Contenido:

- resumen documental
- filtros por estado
- filtros por vencimiento
- buscador
- tabla de documentos por equipo
- tabla de documentos por jugador
- botones de ver archivo
- revision/aprobacion/observacion
- administracion de jugadores y bajas
- lista de habilitados para arbitros
- exportacion CSV de habilitados
- descarga imprimible de habilitados

Funcionamiento:

- Lee documentos cargados por delegados.
- Muestra estado: pendiente, cargado, aprobado, observado/rechazado, vencido o por vencer.
- Permite aprobar u observar documentos.
- Permite administrar jugadores mal cargados o con baja solicitada.
- Genera una lista de habilitados por categoria y por club.
- La lista considera buena fe y seguro aprobados a nivel equipo, mas certificado/estudio, deslinde/declaracion jurada y pase aprobados a nivel jugador.
- La lista permite exportar CSV o descargar una version imprimible para compartir.

Incidencia por usuario:

- Asociacion/Admin: revisa y decide.
- Delegado: carga, pero no aprueba.
- Jugador: indirecto.

Escritura de datos: si.

Riesgo operativo: medio/alto. Afecta habilitaciones y estado documental.

## Asociacion > Torneos

Objetivo: preparar y generar torneos nuevos.

Contenido:

- categoria
- competencia
- ruedas
- dia de juego
- frecuencia
- fecha de inicio
- fecha limite
- fechas bloqueadas
- formato de playoffs
- cantidad de partidos por ronda
- ascenso/repechaje
- descenso
- fechas de playoffs/promocion
- simulacion de torneo
- vista previa del fixture
- playoffs simulados
- preparacion de torneo
- checklist descargable
- publicacion segura de fixture

Funcionamiento:

1. Se configuran las reglas del torneo.
2. Se simula el fixture.
3. La app calcula si entra en calendario.
4. La app sugiere ajustes si no entra.
5. Se descarga el fixture simulado o checklist.
6. Si la categoria no tiene partidos cargados, se puede publicar el fixture.

Publicacion segura:

- Requiere una simulacion vigente.
- Requiere escribir PUBLICAR.
- Pide confirmacion del navegador.
- Vuelve a consultar Supabase antes de insertar.
- Si ya hay partidos en la categoria, bloquea la publicacion.
- Si esta vacia, crea partidos reales en Supabase.
- Descarga constancia de publicacion.
- Registra auditoria de uso.

Incidencia por usuario:

- Asociacion/Admin: puede simular y publicar.
- Delegado/Publico: no acceden.

Escritura de datos:

- Simular: no.
- Descargar informes: no.
- Publicar fixture: si.

Riesgo operativo: alto al publicar. Bajo mientras solo se simula.

## Asociacion > Programacion

Objetivo: organizar horarios, canchas y comunicacion a arbitros.

Contenido:

- resumen de programacion
- partidos por categoria
- fecha del partido
- hora
- cancha
- observacion
- estado de envio
- texto listo para copiar/enviar
- marcado de programacion informada

Funcionamiento:

- Toma los partidos cargados.
- Permite completar dia/hora/cancha.
- Arma un mensaje ordenado para informar.
- Permite marcar que la programacion fue enviada/informada.
- Registra auditoria.

Incidencia por usuario:

- Asociacion/Admin: carga y marca envios.
- Delegado/Publico: no modifican.

Escritura de datos: si.

Riesgo operativo: medio. No cambia resultados, pero afecta organizacion y arbitros.

## Asociacion > Informes

Objetivo: generar documentos descargables.

Contenido:

- descarga de informe del torneo actual
- descarga de fixture simulado si existe simulacion vigente
- vista imprimible para guardar PDF

Funcionamiento:

- Si hay una simulacion vigente, descarga el fixture simulado.
- Si no, descarga informe del torneo actual.
- Abre una pestana imprimible.

Incidencia por usuario:

- Asociacion/Admin: genera informes.
- Delegado/Publico: no acceden.

Escritura de datos: no.

Riesgo operativo: bajo.

## Asociacion > Cierres

Objetivo: revisar estado de cierre de un torneo.

Contenido:

- resumen de fase regular
- tabla final
- playoffs
- campeon posible
- pendientes de partidos
- pendientes documentales
- descarga de acta de cierre

Funcionamiento:

- No cierra automaticamente.
- Resume la informacion disponible.
- Ayuda a detectar si falta algo antes de oficializar.
- Genera acta descargable.

Incidencia por usuario:

- Asociacion/Admin: consulta y genera acta.

Escritura de datos: no en el estado actual.

Riesgo operativo: bajo.

## Asociacion > Permisos

Objetivo: administrar usuarios y accesos.

Estado actual:

- Hay base de roles/permisos en Supabase.
- La pantalla muestra el modulo como etapa en desarrollo.
- Todavia falta edicion visual completa de usuarios, equipos, categorias y permisos.

Permisos contemplados:

- cargar resultados
- cargar documentos
- revisar documentos
- corregir resultados
- administrar torneos
- administrar usuarios
- acceso de emergencia

Incidencia por usuario:

- Admin general: deberia administrar todo.
- Asociacion: deberia administrar segun permiso.

Escritura de datos: actualmente limitada. Futuro: si.

Riesgo operativo futuro: alto.

## Asociacion > Auditoria

Objetivo: ver uso y movimientos sensibles.

Contenido:

- accesos recientes
- eventos de carga de resultados
- cargas documentales
- correcciones
- anulaciones
- programacion informada
- publicacion de fixture
- dispositivo/sesion

Funcionamiento:

- Lee eventos registrados en app_usage_events.
- Resume actividad reciente.
- Solo se muestra dentro de Asociacion.

Incidencia por usuario:

- Asociacion/Admin: consulta.
- Otros usuarios: no acceden.

Escritura de datos:

- La auditoria se alimenta automaticamente cuando ocurren eventos.
- La consulta de auditoria no modifica datos.

Riesgo operativo: bajo.

## Resumen de incidencia por rol

| Area | Publico | Delegado | Asociacion | Admin general |
| --- | --- | --- | --- | --- |
| Ver tablas | Si | Si | Si | Si |
| Ver fixture | Si | Si | Si | Si |
| Ver fecha destacada | Si | Si | Si | Si |
| Cargar resultados fase regular | No | Solo su equipo/categoria | Si | Si |
| Corregir/anular resultados | No | No | Si | Si |
| Cargar resolucion administrativa | No | No | Si | Si |
| Cargar playoffs | No | No | Si | Si |
| Cargar documentos de equipo | No | Si, su equipo | Si/Admin revision | Si |
| Cargar documentos por jugador | No | Si, su equipo | Si/Admin revision | Si |
| Aprobar/observar documentos | No | No | Si | Si |
| Agregar jugadores | No | Si, su equipo | Si | Si |
| Solicitar baja jugador | No | Si | No aplica | No aplica |
| Aprobar baja/eliminar jugador | No | No | Si | Si |
| Simular torneo | No | No | Si | Si |
| Publicar fixture | No | No | Si, con candados | Si |
| Programar horarios/canchas | No | No | Si | Si |
| Generar informes | No | No | Si | Si |
| Ver auditoria | No | No | Si | Si |
| Administrar permisos | No | No | Parcial/futuro | Si |

## Puntos pendientes importantes

1. Separar formalmente asociaciones, temporadas y torneos.
2. Completar edicion visual de usuarios y permisos.
3. Definir flujo final de jugador con acceso propio o no.
4. Crear cierre oficial con escritura de campeon/subcampeon/historial.
5. Consolidar envio automatico o semi-automatico de programacion a arbitros.
6. Mejorar la gestion de torneos historicos, activos y proximos.
7. Definir modo borrador o categoria de prueba para ensayos sin tocar produccion.

## Regla operativa recomendada

Antes de publicar un torneo nuevo:

1. Crear o seleccionar la categoria correcta.
2. Confirmar equipos.
3. Configurar fechas, ruedas, bloqueos y playoffs.
4. Simular.
5. Evaluar preparacion.
6. Descargar checklist.
7. Descargar fixture simulado.
8. Enviar a revision interna/asociacion.
9. Publicar solo si la categoria esta vacia.
10. Descargar constancia de publicacion.
11. Programar horarios/canchas.
12. Informar a arbitros y registrar envio.
