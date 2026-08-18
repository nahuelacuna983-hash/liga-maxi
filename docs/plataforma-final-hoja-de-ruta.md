# Plataforma Gestor de Torneos - hoja de ruta funcional

Estado: documento de trabajo para ordenar la version final sin romper la app actual.

## Objetivo del producto

La app debe dejar de ser solamente "Liga Maxi APdB" y pasar a ser una plataforma donde distintas asociaciones u organizaciones puedan:

- crear y administrar torneos propios;
- configurar categorias, equipos, fixtures, playoffs, ascensos y descensos;
- simular formatos antes de publicarlos;
- cargar y auditar documentacion deportiva;
- cargar resultados desde delegados o desde la organizacion;
- corregir resultados por resoluciones administrativas;
- mostrar al publico tablas, fechas, resultados y playoffs de manera clara;
- dar acceso a arbitros a listados de jugadores habilitados;
- convivir con otras asociaciones sin mezclar datos.

## Principio central

Cada dato importante tiene que pertenecer a una organizacion, torneo y categoria.

La regla futura deberia ser:

- una organizacion no ve ni modifica datos de otra;
- un torneo nuevo no pisa torneos anteriores;
- un delegado solo opera sus equipos;
- el publico solo ve lo publicado;
- el admin general puede ver y socorrer todo, con auditoria.

## Roles

### Publico

Uso: consulta.

Ve:

- categorias publicadas;
- tablas;
- fixture;
- resultados;
- fecha destacada;
- playoffs;
- campeon/cierre cuando corresponda.

No puede modificar nada.

### Delegado

Uso: carga operativa de su equipo.

Puede:

- cargar resultados permitidos;
- cargar documentacion del equipo;
- cargar jugadores y documentos individuales si la organizacion lo habilita;
- ver el estado documental de su equipo;
- solicitar baja/correccion de jugadores.

No puede:

- aprobar documentos;
- corregir resultados como autoridad;
- ver documentacion de otros equipos;
- publicar fixtures;
- administrar usuarios.

### Asociacion

Uso: operacion diaria del torneo.

Puede:

- crear/simular torneos;
- publicar fixtures aprobados;
- corregir/anular resultados;
- cargar resoluciones administrativas;
- administrar playoffs;
- revisar documentacion;
- ver listados de habilitados;
- preparar informacion para arbitros;
- generar informes y cierres;
- administrar delegados de su organizacion.

### Arbitros

Uso: control simple antes del partido.

Deberian ver:

- jugadores habilitados;
- filtros por categoria, club y eventualmente partido;
- faltantes claros cuando un jugador no esta habilitado.

No deberian ver:

- archivos medicos;
- enlaces sensibles;
- auditoria interna;
- panel administrativo.

### Admin general

Uso: soporte y socorro.

Puede:

- ver todas las organizaciones;
- entrar a cualquier torneo;
- corregir problemas;
- administrar permisos globales;
- auditar acciones sensibles.

Todo lo que haga debe quedar registrado.

## Estructura final sugerida de Asociacion

La pestaña Asociacion deberia quedar como tablero administrativo, con secciones claras:

### 1. Inicio

Resumen operativo:

- torneo activo;
- categorias activas;
- partidos pendientes;
- documentos pendientes;
- programacion pendiente de informar;
- alertas importantes.

### 2. Torneos

Para crear, configurar y simular.

Incluye:

- asociacion;
- temporada;
- torneo;
- categoria;
- equipos;
- ruedas;
- frecuencia;
- fechas bloqueadas;
- formato de playoffs;
- partidos por ronda;
- ascensos, descensos y promociones;
- simulacion;
- publicacion segura.

Estado actual: existe un generador/simulador, pero todavia esta mezclado con APdB y necesita quedar como modulo final.

### 3. Operacion

Para torneos ya publicados o en juego.

Incluye:

- carga/correccion de resultados;
- anulacion de resultados;
- resoluciones administrativas 20-0;
- resultados de playoffs;
- avance de llaves;
- cierre deportivo.

Estado actual: existe y funciona bastante bien. Hay que pulirlo, no rehacerlo.

### 4. Documentacion

Para auditar lo que cargan los equipos.

Incluye:

- documentos por equipo;
- documentos por jugador;
- vencimientos;
- aprobacion, observacion y rechazo;
- documentos dudosos desde Drive;
- jugadores detectados que no existen en la app;
- solicitudes de baja/correccion.

Estado actual: existe, pero quedo cargado de botones y filtros. Necesita simplificacion visual.

### 5. Habilitados

Vista pensada para control deportivo y arbitros.

Incluye:

- filtro por categoria;
- filtro por club;
- futuro filtro por partido;
- estado Si/No con faltantes visibles;
- exportacion simple.

Estado actual: existe dentro de Documentacion. Conviene separarlo como seccion propia para que sea facil de usar.

### 6. Programacion

Problema actual: informar horarios/canchas a la asociacion y arbitros.

Debe incluir:

- fecha;
- categoria;
- partido;
- cancha;
- horario;
- responsable;
- estado: pendiente, listo, enviado;
- texto automatico para email/WhatsApp;
- registro de envio.

Estado actual: existe una base. Es prioridad alta porque resuelve un problema real de organizacion.

### 7. Informes

Debe generar documentos claros para compartir.

Informes utiles:

- fixture simulado;
- fixture oficial publicado;
- partidos pendientes;
- tabla actual;
- playoffs;
- cierre de torneo;
- habilitados por club;
- programacion para arbitros.

Estado actual: hay generadores de informe, pero la experiencia debe avisar mejor que se genero/descargo.

### 8. Usuarios

Debe administrar:

- admin general;
- usuarios de asociacion;
- delegados;
- equipos asignados;
- claves o login futuro;
- permisos por organizacion, torneo y categoria.

Estado actual: hay base de permisos, falta interfaz real.

### 9. Auditoria

Debe mostrar:

- resultados cargados;
- correcciones;
- anulaciones;
- aprobaciones documentales;
- publicaciones de fixture;
- movimientos de usuarios;
- accesos relevantes.

Estado actual: hay registros parciales. Falta convertirlo en una bitacora facil de leer.

## Que ya tenemos

- App publica funcionando.
- Carga de resultados por delegados.
- Correccion administrativa de resultados.
- Anulacion de resultados.
- Resolucion administrativa 20-0.
- Tablas automaticas.
- Playoffs visibles y carga de resultados de playoffs.
- Generador/simulador de torneos.
- Informes descargables.
- Documentacion por equipo.
- Documentacion por jugador.
- Importacion conceptual desde Drive por metadatos.
- Auditoria parcial.
- Estadisticas de uso.
- Base de roles y permisos.

## Que falta ordenar

- Separar visualmente Documentacion y Habilitados.
- Simplificar la pantalla de Asociacion.
- Completar la logica multi-asociacion real.
- Guardar configuraciones de torneos como plantillas reutilizables.
- Mejorar la publicacion de fixtures desde simulacion.
- Hacer que los informes indiquen claramente si se generaron y donde se descargaron.
- Armar vista de campeon/cierre.
- Mejorar Programacion para arbitros.
- Convertir permisos en gestion visual real.
- Preparar vista de arbitros sin exponer documentos sensibles.

## Orden recomendado de trabajo

### Etapa 1 - Orden visual sin riesgo

No cambia base de datos ni resultados.

- Reorganizar Asociacion en secciones claras.
- Separar Habilitados de Documentacion.
- Renombrar botones confusos.
- Dejar textos operativos simples.
- Mejorar avisos de descarga/generacion de informes.

### Etapa 2 - Programacion y arbitros

Prioridad operativa.

- Cargar cancha y horario por partido.
- Generar comunicacion lista para enviar.
- Marcar enviado.
- Preparar vista de arbitros por categoria, club o partido.

### Etapa 3 - Torneos nuevos

Para el proximo torneo.

- Guardar simulaciones.
- Descargar fixture simulado/oficial.
- Publicar fixture solo con confirmacion.
- Mantener torneos cerrados como historial.

### Etapa 4 - Multi-asociacion real

Para vender la plataforma.

- Organizaciones.
- Torneos.
- Temporadas.
- Usuarios por organizacion.
- Datos aislados por organizacion.

### Etapa 5 - Comercializacion

Con el producto mas ordenado.

- documento de venta;
- precios por asociacion/torneo;
- mantenimiento mensual;
- soporte;
- onboarding;
- carga inicial de datos.

## Decision recomendada inmediata

El proximo cambio de codigo deberia ser chico y visible:

1. separar "Habilitados" como boton propio dentro de Asociacion;
2. dejar Documentacion solo para auditoria de papeles;
3. dejar Programacion como modulo prioritario para arbitros;
4. mejorar Informes para que cada descarga tenga confirmacion clara.

Eso limpia la operacion diaria sin tocar torneos, resultados ni documentos cargados.
