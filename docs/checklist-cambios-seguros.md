# Checklist de cambios seguros - Dia de partidos

## Objetivo

Permitir avanzar sin poner en riesgo la carga de resultados de los delegados.

## Hoy se puede trabajar en

- Documentacion en archivos dentro de `docs/`.
- Prototipos independientes no enlazados desde la app principal.
- SQL borrador sin ejecutar.
- Revision de codigo.
- Planificacion de Supabase.
- Diseno de pantallas futuras.

## Hoy no conviene tocar

- `guardarResultadoDelegado`.
- Boton `delegado-guardar`.
- Selects de categoria/partido de Delegados.
- Escritura en la tabla `partidos`.
- Claves actuales de delegados.
- Service worker.
- Manifest/icono instalado.
- Fixture o resultados reales.

## Antes de publicar cualquier cambio

- Confirmar que la app abre desde la URL principal.
- Probar tab Publico.
- Probar tab Delegados con una clave conocida.
- Verificar que se pueda seleccionar partido.
- Verificar que el boton Guardar resultado sigue disponible luego de desbloquear.
- No hacer pruebas escribiendo resultados reales.
- Si se prueba escritura, usar un partido de test o hacerlo fuera del horario operativo.

## Cambios permitidos en app principal antes de partidos

Solo cambios visuales menores que no alteren JavaScript de carga, y preferentemente ninguno.

## Cambios recomendados despues de partidos

1. Separar el modulo documentacion en archivos propios.
2. Crear tablas de Supabase en entorno controlado.
3. Integrar lectura documental en Asociacion.
4. Integrar subida real de archivos para un solo equipo de prueba.
5. Recien despues habilitar para delegados.

