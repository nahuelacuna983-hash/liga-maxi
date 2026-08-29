# Simulacros operativos APdB

Fecha: 28/08/2026

Objetivo: probar la app con usuarios reales y datos controlados antes de declararla lista para uso pleno.

Regla general: no borrar datos reales, no publicar fixtures sin aprobacion, no ejecutar SQL destructivo durante los simulacros.

## Preparacion comun

Antes de empezar:

- abrir la app publicada actual;
- confirmar clave de Asociacion;
- confirmar clave del delegado usado en la prueba;
- elegir una categoria y un equipo de prueba;
- tener archivos PDF/JPG/PNG de prueba;
- anotar hora de inicio y usuario que prueba;
- sacar captura si algo no coincide.

Resultado esperado comun:

- la app no debe mostrar datos de otros equipos al delegado;
- toda accion sensible debe verse despues en Asociacion o Auditoria;
- si se descarga un documento, debe aparecer aviso visible y archivo en Descargas;
- si algo no se puede hacer, debe quedar claro por pantalla.

## Simulacro 1: delegado documental

Usuario: delegado.

Equipo sugerido: Sud America.

Pasos:

1. Entrar a Delegados.
2. Ingresar clave del equipo.
3. Confirmar que se ve solo el alcance permitido.
4. Revisar el bloque de documentacion.
5. Agregar un jugador de prueba si corresponde.
6. Subir un documento de equipo.
7. Subir un documento individual de jugador.
8. Verificar que el estado quede cargado o pendiente de revision.
9. Verificar prehabilitacion del jugador.
10. Descargar lista del equipo.
11. Exportar CSV de lista o poliza si corresponde.
12. Copiar alertas de vencimiento.

Control de exito:

- el delegado entiende que falta;
- el delegado no puede aprobar documentos;
- el delegado no ve documentos de otros clubes;
- la carga aparece luego en Asociacion;
- el archivo subido puede abrirse desde Asociacion.

## Simulacro 2: auditoria documental Asociacion

Usuario: Asociacion/Admin.

Pasos:

1. Entrar a Asociacion.
2. Habilitar acceso.
3. Ir a Documentacion.
4. Elegir categoria.
5. Elegir club operativo.
6. Revisar resumen documental.
7. Abrir un archivo cargado.
8. Aprobar un documento.
9. Observar o rechazar otro documento con motivo.
10. Revisar impacto en habilitacion.
11. Generar Informe club.
12. Exportar CSV pendientes.
13. Copiar resumen.

Control de exito:

- Asociacion distingue pendiente, cargado, aprobado, observado y rechazado;
- aprobar cambia el calculo de habilitacion;
- observar deja motivo claro;
- el informe club se descarga y se abre;
- no aparecen documentos mezclados de otro club.

## Simulacro 3: lista para arbitros

Usuario: Asociacion/Admin hoy. Futuro: arbitro con vista limitada.

Pasos por club:

1. Ir a Asociacion > Documentacion.
2. Usar acceso rapido a Lista para arbitros, o ir a Habilitados.
3. Filtrar por club.
4. Revisar verdes y rojos.
5. Descargar Control cancha.
6. Descargar lista completa si hace falta.

Pasos por partido:

1. Elegir categoria.
2. Elegir partido.
3. Confirmar que aparecen ambos equipos.
4. Descargar Control cancha.

Control de exito:

- con un golpe de vista se ve quien esta habilitado;
- el documento no expone archivos medicos ni enlaces sensibles;
- se distinguen faltantes bloqueantes;
- pase no bloquea habilitacion general.

Regla actual de habilitacion:

- bloquea si falta lista/buena fe del equipo;
- bloquea si falta seguro del equipo;
- bloquea si falta certificado/estudio del jugador;
- bloquea si falta declaracion jurada/deslinde del jugador;
- pase no bloquea salvo control particular de traspaso.

## Simulacro 4: programacion y correo a arbitros

Usuario: Asociacion/Admin.

Pasos:

1. Ir a Asociacion > Programacion.
2. Elegir categoria.
3. Completar cancha, fecha y hora en 2 o 3 partidos.
4. Revisar partidos faltantes.
5. Copiar comunicacion.
6. Abrir correo.
7. Revisar destinatario.
8. Pegar o verificar texto final.
9. Marcar listos como enviados.
10. Volver a entrar y confirmar que el estado se conserva.

Control de exito:

- el mensaje sale prolijo y uniforme;
- no hay que copiar partido por partido;
- se reduce riesgo de mandar mal horarios/canchas;
- queda registro de enviado/informado.

## Simulacro 5: generador de torneo sin publicar

Usuario: Asociacion/Admin.

Pasos:

1. Ir a Asociacion > Torneos.
2. Elegir categoria.
3. Elegir competencia.
4. Cargar o pegar equipos.
5. Configurar ruedas, dia, frecuencia, inicio y fin.
6. Cargar fechas bloqueadas.
7. Cargar fechas especiales.
8. Configurar playoffs y partidos por ronda.
9. Simular.
10. Revisar alertas.
11. Revisar libres y cruces.
12. Descargar fixture simulado.
13. Descargar documento oficial del fixture.
14. Guardar simulacion local.

Control de exito:

- la simulacion no modifica Supabase;
- la app avisa si no entra en calendario;
- las fechas especiales aparecen aplicadas;
- se puede recuperar la simulacion;
- el documento descargado sirve para compartir.

## Simulacro 6: publicacion segura

Condicion: solo en categoria vacia o de prueba.

Pasos:

1. Simular torneo.
2. Evaluar preparacion.
3. Confirmar que no hay partidos cargados en categoria destino.
4. Escribir PUBLICAR.
5. Confirmar publicacion del navegador.
6. Descargar constancia.
7. Ir a Publico y verificar fixture.
8. Ir a Programacion y verificar que aparecen partidos.

Control de exito:

- si hay partidos cargados, bloquea;
- si esta vacio, publica;
- despues de publicar, el publico ve la categoria correcta;
- la app registra auditoria.

## Orden recomendado de ejecucion

1. Simulacro 1: delegado documental.
2. Simulacro 2: auditoria documental.
3. Simulacro 3: lista para arbitros.
4. Simulacro 4: programacion y correo.
5. Simulacro 5: torneo sin publicar.
6. Simulacro 6: publicacion solo en categoria vacia.

## Registro manual sugerido

Para cada prueba anotar:

- fecha/hora;
- usuario/rol;
- categoria;
- equipo;
- accion;
- resultado esperado;
- resultado real;
- captura si fallo;
- decision: OK, corregir, postergar.

