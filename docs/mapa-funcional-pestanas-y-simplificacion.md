# Mapa funcional de pantallas y simplificacion

Fecha de revision: 21/08/2026

Objetivo: ordenar la app como plataforma usable por publico, delegados, asociacion, arbitros y administradores, sin seguir agregando secciones por urgencia.

## Criterio principal

La app no deberia organizarse por "modulos tecnicos", sino por trabajos reales:

- mirar el torneo;
- cargar algo;
- controlar algo;
- organizar una fecha;
- crear/publicar un torneo;
- revisar historial y auditoria.

Si una pantalla no responde claramente a un trabajo real, deberia fusionarse, ocultarse o convertirse en boton dentro de otra pantalla.

## Pestañas principales actuales

### Publico

Uso actual:

- selector de categoria;
- tabla;
- fixture/resultados;
- playoffs cuando corresponda.

Usuario esperado:

- publico general;
- jugadores;
- delegados que solo quieren consultar.

Estado:

- necesaria;
- debe ser simple;
- no deberia mostrar nada administrativo.

Recomendacion:

- mantener como pestaña principal;
- hacer que la pantalla se adapte al momento del torneo:
  - fase regular: tabla + fecha + fixture;
  - playoffs: llave arriba, resultados de llave y resumen;
  - torneo cerrado: campeon, posiciones finales y acceso al historial.

### Fecha

Uso actual:

- vista destacada de resultados de una fecha/categoria.

Usuario esperado:

- publico;
- redes/comunicacion;
- delegados.

Estado:

- util, pero podria confundirse con Publico.

Recomendacion:

- mantener por ahora como pestaña publica secundaria;
- a futuro podria llamarse "Fecha" o "Resultados de fecha";
- si playoffs son protagonistas, esta pestaña podria mostrar tambien "Partidos de playoffs".

### Acceso

Uso actual:

- link;
- QR;
- instalacion;
- login por email/clave;
- cierre de sesion.

Usuario esperado:

- todos;
- especialmente nuevos usuarios.

Estado:

- necesaria para venta y adopcion;
- no deberia mezclarse con operacion deportiva.

Recomendacion:

- mantener como pestaña principal mientras la app crece;
- mas adelante podria estar en un menu de usuario, pero hoy es importante porque resuelve instalacion y entrada.

### Delegados

Uso actual:

- ingreso con clave;
- carga de resultados;
- carga de documentacion;
- carga/listado de jugadores asociados al equipo.

Usuario esperado:

- delegado de equipo;
- eventualmente encargado documental del club.

Estado:

- necesaria;
- hoy mezcla dos trabajos fuertes: resultados y documentacion.

Recomendacion:

- mantener como una sola pestaña para no complicar al delegado;
- ordenar internamente por bloques simples:
  - "Mis partidos";
  - "Mi documentacion";
  - "Mis jugadores";
- despues de habilitar clave, mostrar solo lo que ese delegado puede hacer;
- evitar tablas enormes desde el primer golpe visual.

### Asociacion

Uso actual:

- acceso administrativo;
- 10 subpestañas internas:
  - Inicio;
  - Operacion;
  - Documentacion;
  - Habilitados;
  - Torneos;
  - Programacion;
  - Informes;
  - Cierres;
  - Permisos;
  - Auditoria.

Usuario esperado:

- asociacion;
- admin general;
- operador de torneo;
- auditor documental;
- eventualmente usuario de socorro.

Estado:

- es el centro de la plataforma;
- tiene demasiadas secciones visibles al mismo nivel;
- varias se pisan entre si.

Recomendacion:

- no agregar mas pestañas internas;
- fusionar por trabajos reales.

## Asociacion: analisis de subpestañas actuales

### Inicio

Uso actual:

- resumen de categoria;
- accesos rapidos.

Valor:

- alto.

Problema:

- depende de que el resto este bien ordenado.

Recomendacion:

- mantener como tablero administrativo;
- debe mostrar alertas accionables:
  - partidos sin programar;
  - resultados pendientes;
  - documentos para revisar;
  - jugadores no habilitados;
  - publicaciones incompletas;
  - cierre pendiente.

### Operacion

Uso actual:

- correccion de resultados de fase regular;
- anulacion;
- resolucion administrativa 20-0;
- carga de resultados de playoffs.

Valor:

- muy alto.

Problema:

- "Operacion" es un nombre amplio;
- mezcla fase regular, playoffs y resoluciones;
- al usuario puede costarle saber si debe entrar aca o en Cierres/Informes.

Recomendacion:

- renombrar a "Competencia";
- dentro de esa pantalla separar por bloques:
  - Resultados;
  - Playoffs;
  - Resoluciones administrativas;
  - Tabla/estado deportivo.

### Documentacion

Uso actual:

- control documental por categoria;
- filtros;
- exportar CSV;
- Drive documental;
- documentos por equipo y por jugador.

Valor:

- muy alto.

Problema:

- tiene demasiada informacion junta;
- Drive documental es tecnico para el usuario general;
- "Exportar CSV" no explica para que sirve.

Recomendacion:

- mantener como seccion principal dentro de Asociacion;
- cambiar enfoque visual:
  - primero resumen por club;
  - despues pendientes de revision;
  - despues detalle;
  - Drive documental como "Importaciones / archivos sin asociar", no como bloque principal.

### Habilitados

Uso actual:

- lista operativa para arbitros;
- filtros por club, estado y partido;
- exportar CSV;
- descargar lista;
- plan de prueba.

Valor:

- alto.

Problema:

- esta separada de Documentacion, pero depende totalmente de ella;
- "Plan de prueba" no deberia estar en uso normal;
- "Exportar habilitados CSV" y "Descargar lista" no son claros para todos.

Recomendacion:

- fusionar conceptualmente dentro de "Documentacion";
- dejar como subvista destacada: "Lista para arbitros";
- si se mantiene como boton, que sea simple:
  - Ver por partido;
  - Ver por club;
  - Descargar lista.

### Torneos

Uso actual:

- generador;
- simulacion;
- equipos manuales;
- formato;
- fechas especiales;
- informes de fixture;
- historial local;
- preparacion;
- publicacion segura.

Valor:

- muy alto.

Problema:

- es potente, pero muy cargado;
- mezcla simulacion, informe, checklist y publicacion;
- si algo queda incompleto obliga a SQL.

Recomendacion:

- mantener como seccion principal;
- organizar como asistente por pasos:
  - 1. Datos del torneo;
  - 2. Equipos;
  - 3. Calendario;
  - 4. Formato deportivo;
  - 5. Simular;
  - 6. Revisar;
  - 7. Publicar;
  - 8. Verificar publicacion.

La idea de "Control de publicacion" debe vivir aca, no como pestaña nueva.

### Programacion

Uso actual:

- horarios;
- canchas;
- correo para arbitros;
- copiar comunicacion;
- abrir correo;
- marcar enviados.

Valor:

- muy alto, porque resuelve un problema real de organizacion.

Problema:

- necesita estar mas guiado;
- deberia ser muy visual: listo / falta / enviado.

Recomendacion:

- mantener como seccion principal;
- convertirla en flujo:
  - cargar horario/cancha;
  - revisar faltantes;
  - generar mensaje;
  - abrir/copy correo;
  - marcar enviado.

### Informes

Uso actual:

- descargar informe del torneo;
- documento oficial del fixture.

Valor:

- medio/alto.

Problema:

- se pisa con Torneos y Cierres;
- "informe" depende del contexto: fixture simulado, torneo actual, cierre, habilitados.

Recomendacion:

- no mantener como seccion principal independiente;
- convertir en botones dentro de cada area:
  - en Torneos: Descargar fixture / documento oficial;
  - en Competencia: Informe deportivo;
  - en Documentacion: Informe documental;
  - en Cierres: Acta de cierre.

### Cierres

Uso actual:

- vista previa de cierre;
- campeon posible;
- pendientes;
- acta de cierre.

Valor:

- alto.

Problema:

- puede pisarse con Competencia e Informes.

Recomendacion:

- mantener, pero como etapa final de "Competencia";
- si queda como pestaña, deberia aparecer solo cuando el torneo este avanzado o cerrado.

### Permisos

Uso actual:

- muestra roles;
- no permite gestion visual completa.

Valor:

- alto a futuro;
- medio hoy.

Problema:

- hoy es mas declarativa que operativa.

Recomendacion:

- mantener para admin general;
- ocultar a asociacion comun hasta que tenga edicion real;
- futuro: usuarios, roles, equipos, claves, accesos de socorro.

### Auditoria

Uso actual:

- actividad reciente;
- accesos;
- cargas y movimientos sensibles.

Valor:

- alto para seguridad y confianza.

Problema:

- no todos necesitan verla.

Recomendacion:

- mantener para admin/asociacion con permiso;
- no mezclar con informes comunes;
- usarla para trazabilidad, no para operacion diaria.

## Propuesta de arquitectura simplificada

### Navegacion publica

- Publico
- Fecha
- Acceso

### Navegacion operativa

- Delegados

### Asociacion

Reducir de 10 secciones visibles a 6 secciones principales:

1. Inicio
2. Competencia
3. Documentacion
4. Programacion
5. Torneos
6. Administracion

Donde "Administracion" contiene:

- Usuarios y permisos;
- Auditoria;
- Configuracion;
- acciones de socorro.

Informes y Cierres no desaparecen: pasan a ser acciones dentro de la pantalla correspondiente.

## Propuesta de fusion

| Actual | Propuesta |
| --- | --- |
| Operacion | Competencia |
| Cierres | Dentro de Competencia |
| Informes | Botones dentro de cada modulo |
| Documentacion | Documentacion |
| Habilitados | Dentro de Documentacion como "Lista para arbitros" |
| Torneos | Torneos, con pasos |
| Programacion | Programacion |
| Permisos | Administracion |
| Auditoria | Administracion |
| Inicio | Inicio |

## Que deberia ver cada usuario

### Publico

- Publico;
- Fecha;
- Acceso.

### Delegado

- Publico;
- Fecha;
- Acceso;
- Delegados.

Dentro de Delegados:

- resultados de sus equipos;
- documentacion de sus equipos;
- jugadores de sus equipos;
- estado de habilitacion propio.

### Asociacion

- Publico;
- Fecha;
- Acceso;
- Asociacion.

Dentro de Asociacion:

- Inicio;
- Competencia;
- Documentacion;
- Programacion;
- Torneos;
- Administracion segun permiso.

### Arbitros

Idealmente no deberian entrar a toda Asociacion.

Vista futura recomendada:

- acceso directo a "Habilitados por partido";
- filtros por categoria, partido y club;
- sin enlaces a archivos sensibles.

## Cambios recomendados por prioridad

### Prioridad 1: ordenar sin romper

- Renombrar Operacion a Competencia.
- Mover Cierres visualmente dentro de Competencia o dejarlo como boton "Cierre".
- Mover Habilitados dentro de Documentacion como subvista.
- Convertir Informes en botones contextuales.
- Ocultar "Plan de prueba" del uso normal.

### Prioridad 2: guiar procesos

- Torneos como asistente por pasos.
- Programacion como flujo listo/falta/enviado.
- Documentacion con resumen por club primero.
- Delegados con "Mis partidos", "Mi documentacion", "Mis jugadores".

### Prioridad 3: plataforma vendible

- Roles reales por usuario.
- Vista de arbitros separada.
- Administracion de asociaciones/torneos/categorias.
- Cierre oficial de torneo con campeon, ascensos, descensos y acta.

## Decision recomendada

No agregar nuevas secciones por ahora.

Primero ordenar las existentes:

1. Asociacion debe quedar en 6 areas.
2. Cada area debe tener botones de accion claros.
3. Los informes deben generarse desde donde se necesitan.
4. Las reparaciones o verificaciones deben estar dentro del flujo que las provoca.

La app ya tiene mucho valor. La siguiente evolucion no es sumar potencia: es hacer que esa potencia sea entendible.
