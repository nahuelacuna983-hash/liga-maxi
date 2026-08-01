# Motor generador de torneos

## Objetivo

El generador no debe limitarse a armar un fixture. Tiene que actuar como asistente de viabilidad para distintas asociaciones, formatos, torneos de verano y eventos especiales.

La regla operativa es:

1. Leer equipos y configuracion.
2. Simular sin escribir en Supabase.
3. Medir si entra en calendario.
4. Proponer alternativas.
5. Recien despues permitir publicar o guardar oficialmente.

## Variables que debe considerar

- Categoria y competencia.
- Cantidad real de equipos.
- Ruedas de fase regular.
- Dia principal de juego.
- Frecuencia: semanal o semana por medio.
- Fecha de inicio y fecha limite.
- Fechas bloqueadas.
- Playoffs: sin playoffs, Top 4, Top 6 o Top 8.
- Cantidad de partidos por ronda: cuartos/repechaje, semifinales y final.
- Promocion posterior a playoffs o fase regular.
- Reglas de ascenso/descenso cuando corresponda.

## Diagnostico esperado

El sistema debe informar:

- jornadas de fase regular;
- fechas de playoffs;
- fechas de promocion posterior;
- fechas totales necesarias;
- fechas jugables disponibles;
- margen calendario;
- fecha final estimada;
- si el torneo entra o no entra en calendario.

## Sugerencias automaticas

Cuando el torneo no entra, o entra muy justo, el sistema debe proponer alternativas:

- jugar todas las semanas si estaba configurado semana por medio;
- cambiar el dia principal de juego;
- extender la fecha limite necesaria;
- revisar fechas bloqueadas;
- reducir series de playoffs o promocion a partido unico;
- combinar ajustes cuando uno solo no alcanza.

## Alcance actual

Implementado en modo simulacion:

- frecuencia semanal / semana por medio;
- promocion posterior;
- calculo de fechas completas incluyendo fase regular, playoffs y promocion;
- diagnostico de calendario;
- sugerencias basicas;
- informe descargable con fixture simulado y diagnostico.

Pendiente para version final:

- guardar configuraciones de formato por asociacion;
- comparar varias alternativas lado a lado;
- publicar fixture oficial desde una simulacion aprobada;
- persistir plantillas de torneos reutilizables;
- permitir multiples dias de juego por semana en vez de un solo dia alternativo.
