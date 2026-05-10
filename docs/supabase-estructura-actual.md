# Supabase - Estructura actual observada

Consulta realizada en modo solo lectura.

## Organizaciones

Tabla: `organizaciones`

Columnas observadas:

- id
- nombre
- slug
- created_at

Registro observado:

- Asociación Platense de Básquet (`apdb`)

## Torneos

Tabla: `torneos`

Columnas observadas:

- id
- organizacion_id
- nombre
- temporada
- tipo
- estado
- created_at

Registro observado:

- Torneo Base APdB
- temporada 2026
- tipo liga

## Categorias

Tabla: `categorias`

Columnas observadas:

- id
- torneo_id
- nombre
- estado
- formato
- playoffs
- clasificados
- dia_juego
- fecha_inicio
- fecha_fin
- frecuencia
- fechas_bloqueadas
- series_playoff
- created_at

Categorias observadas:

- Maxi +48
- Maxi +35 B
- Maxi +35 A
- Femenino

## Equipos

Tabla: `equipos`

Columnas observadas:

- id
- categoria_id
- nombre
- orden_inicial
- activo
- created_at

Observacion:

- Conviene que el modulo documental use `equipo_id`.
- Tambien conviene guardar `equipo_nombre` como copia historica para auditoria.

## Partidos

Tabla: `partidos`

Columnas observadas:

- id
- categoria_id
- fecha_id
- fase
- orden
- local
- visitante
- puntos_local
- puntos_visitante
- estado_resultado
- created_at
- updated_at
- jornada
- fecha
- libre
- cargado_por
- cargado_en

## Decision para documentacion

El modulo documental debe relacionarse con:

- `organizaciones.id`
- `torneos.id`
- `categorias.id`
- `equipos.id`

No conviene basarse solamente en texto de equipo porque el mismo club puede existir en varias categorias.

