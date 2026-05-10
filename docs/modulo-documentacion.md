# Modulo Documentacion - APdB Liga Maxi

## Objetivo

Permitir que cada equipo o delegado cargue documentacion requerida por la Asociacion, y que la Asociacion pueda revisar, aprobar, observar o rechazar cada archivo.

Este modulo debe agregarse sin afectar la carga actual de resultados.

## Alcance inicial recomendado

Primera version:

- carga por equipo;
- listado de documentos requeridos;
- estado por documento;
- vista administrativa de revision;
- vencimientos visibles;
- almacenamiento en Supabase Storage;
- metadatos en tabla Supabase;
- sin bloquear la carga de resultados todavia.

## Tipos de documentos

- Lista de buena fe.
- Certificado medico.
- Estudio complementario.
- Seguro.
- Declaracion jurada.
- Pase.
- DNI o documentacion identificatoria, si la Asociacion lo decide.
- Imagenes para redes.

## Estados

- Pendiente: falta cargar.
- Cargado: el delegado subio archivo y espera revision.
- Observado: Asociacion pide correccion.
- Aprobado: documento valido.
- Rechazado: documento no aceptado.
- Vencido: requiere renovacion.

## Roles

### Delegado

Puede:

- ver solo sus equipos/categorias;
- subir archivos;
- reemplazar archivos observados o vencidos;
- ver estado y observaciones.

No puede:

- aprobar documentos;
- ver documentos de otros equipos;
- borrar auditoria.

### Asociacion

Puede:

- ver todos los equipos;
- filtrar por categoria, equipo, estado y vencimiento;
- aprobar, observar o rechazar;
- agregar observaciones;
- descargar o abrir archivos;
- ver historial de cargas.

## Supabase - tablas sugeridas

### document_requirements

Define que documentos se piden.

Campos sugeridos:

- id
- nombre
- descripcion
- aplica_a_categoria_id
- obligatorio
- requiere_vencimiento
- activo
- created_at

### team_documents

Guarda cada documento cargado por un equipo.

Campos sugeridos:

- id
- requirement_id
- categoria_id
- equipo
- uploaded_by
- storage_path
- file_name
- file_type
- file_size
- status
- vencimiento
- observacion
- reviewed_by
- reviewed_at
- created_at
- updated_at

### document_events

Auditoria simple.

Campos sugeridos:

- id
- team_document_id
- event_type
- actor
- detail
- created_at

## Supabase Storage

Bucket sugerido:

- `documentos`

Ruta sugerida:

```text
documentos/{categoria}/{equipo}/{requirement_id}/{timestamp}-{file_name}
```

## Seguridad

Primera etapa segura:

- construir pantallas sin escritura;
- despues habilitar subida en entorno controlado;
- no bloquear resultados por documentos faltantes;
- mantener el sistema de delegados actual hasta migrar permisos.

Etapa posterior:

- mover delegados a tabla Supabase;
- validar cargas mediante RLS o RPC;
- asociar cada delegado a equipo/categoria;
- auditar cada cambio.

## Pantallas

### Delegados - Documentacion

Debe mostrar:

- equipo/categoria habilitados;
- lista de documentos requeridos;
- estado actual;
- boton para subir/reemplazar;
- observacion de Asociacion;
- fecha de vencimiento si aplica.

### Asociacion - Control documental

Debe mostrar:

- resumen por categoria;
- documentos pendientes;
- documentos observados;
- vencimientos proximos;
- filtros;
- acciones de aprobar/observar/rechazar.

## Implementacion por etapas

### Etapa 1 - Preparacion sin riesgo

- crear panel visual en Asociacion, sin Supabase Storage;
- mostrar datos simulados o vacios;
- definir estructura de tablas;
- no tocar carga de resultados.

### Etapa 2 - Lectura real

- crear tablas en Supabase;
- leer requisitos y estados;
- mostrar pendientes por equipo;
- sin subida de archivos todavia.

### Etapa 3 - Subida controlada

- crear bucket Storage;
- permitir subir archivo;
- registrar metadatos;
- mostrar estado Cargado.

### Etapa 4 - Revision administrativa

- aprobar, observar, rechazar;
- guardar observaciones;
- registrar auditoria.

### Etapa 5 - Integracion deportiva

- avisos en Delegados;
- tablero de vencimientos;
- eventual bloqueo administrativo si la Asociacion lo decide.

## Criterio de listo para la semana que viene

Para considerar el modulo resuelto en primera version:

- Asociacion puede ver el estado documental por equipo.
- Delegado puede cargar archivos.
- Asociacion puede aprobar u observar.
- Los archivos quedan en Supabase Storage.
- No se rompe la carga de resultados.
- No se modifica fixture ni tablas deportivas.
