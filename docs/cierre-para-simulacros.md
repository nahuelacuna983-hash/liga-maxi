# Cierre operativo para simulacros

Fecha de revision: 28/08/2026

Objetivo: ordenar que esta listo, que falta controlar y como ejecutar simulacros reales sin tocar datos productivos innecesariamente.

## Estado publicado

La app tiene publicado el bloque operativo posterior a la reunion con Asociacion:

- carga de jugadores desde Delegados;
- documentacion por equipo y por jugador;
- prehabilitacion visible para Delegados;
- alertas documentales copiables para Delegados;
- revision documental desde Asociacion;
- impacto documental por club;
- informe documental por club;
- lista para arbitros por club o partido;
- control de cancha imprimible para arbitros;
- programacion de partidos con texto listo para correo;
- generador de torneos con simulacion, fixture preliminar, documento oficial y publicacion segura;
- informes y cierres administrativos;
- auditoria de movimientos sensibles;
- acceso/instalacion como pantalla de entrada.

## Lo que ya sirve para simulacro

### Delegado

Puede probar:

- ingresar con clave de equipo;
- cargar o corregir datos de jugadores de su equipo;
- cargar documentacion de equipo;
- cargar documentacion individual por jugador;
- ver si el jugador queda prehabilitado o no;
- copiar alertas de vencimiento;
- descargar lista de equipo;
- exportar CSV de lista/poliza.

### Asociacion

Puede probar:

- revisar documentos cargados;
- aprobar, observar o rechazar;
- ver impacto en habilitacion;
- generar informe documental por club;
- ver habilitados por club;
- ver habilitados por partido;
- descargar control de cancha para arbitros;
- programar fecha con cancha y horario;
- copiar/abrir correo de programacion;
- marcar programacion informada;
- corregir resultados;
- anular resultados;
- resolver partido administrativamente;
- cargar resultados de playoffs;
- simular torneo;
- descargar fixture simulado;
- descargar documento oficial;
- publicar fixture solo si la categoria esta vacia.

### Publico

Puede probar:

- ver tabla;
- ver fixture;
- ver fecha destacada;
- ver playoffs;
- usar link por categoria.

## Riesgos que conviene probar antes de venta

1. Login y permisos: confirmar que un delegado no ve ni toca otro equipo.
2. Documentacion: confirmar que cargar, aprobar y observar cambia la habilitacion.
3. Arbitros: confirmar que el control de cancha muestra claro SI/NO y faltantes.
4. Programacion: confirmar que el texto de correo queda correcto y se registra como informado.
5. Torneos: confirmar que la simulacion respeta equipos, fechas bloqueadas, fechas especiales, libres y playoffs.
6. Publicacion: confirmar que no permite publicar sobre una categoria con partidos cargados.
7. Publico: confirmar que lo publicado se ve bien en celular y escritorio.
8. Rendimiento: confirmar que la primera carga no tarda demasiado.

## Simulacro recomendado 1: documentacion Sud America

Objetivo: probar el circuito real delegado/asociacion/arbitro.

Pasos:

1. Entrar como delegado de Sud America.
2. Revisar jugadores cargados.
3. Cargar o reemplazar un documento de equipo.
4. Cargar documentos individuales de 2 o 3 jugadores.
5. Ver prehabilitacion en Delegados.
6. Entrar como Asociacion.
7. Filtrar por categoria y club Sud America.
8. Aprobar un documento.
9. Observar otro documento.
10. Confirmar que cambia el impacto de habilitacion.
11. Descargar Informe club.
12. Entrar a Habilitados.
13. Filtrar por Sud America.
14. Descargar Control cancha.

Resultado esperado:

- El delegado entiende que falta y que esta aprobado.
- Asociacion puede auditar sin mezclar clubes.
- Arbitros reciben una lista clara, sin enlaces sensibles.

## Simulacro recomendado 2: programacion y correo

Objetivo: evitar errores de copia y demoras con arbitros.

Pasos:

1. Entrar en Asociacion > Programacion.
2. Elegir categoria.
3. Completar cancha, hora y observacion de 2 partidos.
4. Generar texto.
5. Copiar texto.
6. Abrir correo.
7. Revisar destinatario.
8. Marcar como informado.

Resultado esperado:

- El correo sale con formato uniforme.
- Queda registro de que fue informado.
- Se reducen errores manuales.

## Simulacro recomendado 3: torneo nuevo sin publicar

Objetivo: validar el generador antes de tocar Supabase.

Pasos:

1. Entrar en Asociacion > Torneos.
2. Cargar equipos actuales o lista manual.
3. Definir competencia, ruedas, dia, frecuencia, inicio y limite.
4. Cargar fechas bloqueadas.
5. Cargar fechas especiales.
6. Definir playoffs y cantidad de partidos por ronda.
7. Simular torneo.
8. Revisar alertas y sugerencias.
9. Descargar fixture simulado.
10. Descargar documento oficial.
11. No publicar hasta que Asociacion apruebe.

Resultado esperado:

- Se obtiene fixture completo para presentar.
- Las llaves quedan comunicables.
- Si no entra en calendario, la app explica alternativas.

## Simulacro recomendado 4: publicacion controlada

Objetivo: publicar solo en categoria vacia o de prueba.

Condicion previa:

- Usar una categoria de prueba o una categoria real vacia.

Pasos:

1. Simular torneo.
2. Revisar preparacion.
3. Escribir PUBLICAR.
4. Confirmar publicacion.
5. Descargar constancia.
6. Ir a Publico y verificar fixture.
7. Ir a Programacion y verificar partidos disponibles.

Resultado esperado:

- La app bloquea si ya hay partidos.
- La app publica si la categoria esta vacia.
- Lo publicado queda visible.

## Pendientes antes de vender como plataforma completa

### Criticos

- Definir entorno de prueba real: categoria de prueba o torneo borrador.
- Confirmar permisos por rol con usuarios reales, no solo claves.
- Separar formalmente asociaciones/organizaciones en base de datos y pantalla.
- Mejorar primera carga en celular si sigue lenta.
- Ordenar Asociacion para que no parezca una suma de parches.

### Importantes

- Vista especifica para arbitros sin entrar a Asociacion completa.
- Automatizar avisos de vencimientos por correo o WhatsApp mediante servicio externo.
- Cierre oficial con campeon, ascensos, descensos e historial.
- Mejor documento PDF/HTML oficial para fixtures aprobados.
- Flujo de importacion documental masiva desde Drive o planilla.

### Deseables

- Estadisticas deportivas: goleadores, asistencias, MVP, fotos.
- Media day y ficha visual de jugador.
- Panel comercial/marca blanca para nuevas asociaciones.

## Decision recomendada

Antes de seguir agregando funciones, ejecutar tres simulacros:

1. documentacion Sud America;
2. programacion de una fecha;
3. generacion de torneo nuevo sin publicar.

Si esos tres salen bien, la app esta en condiciones de demostracion seria.

Despues de eso, el siguiente bloque deberia ser:

1. vista de arbitros separada;
2. permisos/login real cerrados;
3. multi asociacion formal.

