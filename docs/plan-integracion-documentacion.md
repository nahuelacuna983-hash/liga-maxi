# Plan de integracion - Modulo Documentacion

## Objetivo

Llevar el modulo documental desde prototipo a produccion sin interrumpir resultados, fixture, tablas ni delegados.

## Principio de trabajo

Primero lectura. Luego simulacion con datos reales. Recien despues escritura.

## Fase 0 - Estado actual

Ya existe:

- prototipo visual independiente;
- SQL borrador;
- contrato frontend;
- checklist de cambios seguros;
- definicion de roles y estados.

No existe todavia:

- bucket de Storage;
- tablas reales en Supabase;
- carga real de archivos;
- permisos RLS documentales.

## Fase 1 - Preparar Supabase sin conectar app

Acciones:

1. Hacer backup/export de estructura actual.
2. Crear tablas documentales.
3. Crear vista `v_team_documents_admin`.
4. Crear bucket `documentos`.
5. Insertar requisitos iniciales.
6. Ejecutar consultas SELECT de prueba.
7. Verificar que nada toca `partidos`, `categorias` ni resultados.

Criterio de exito:

- las tablas existen;
- la vista administrativa responde;
- el bucket existe;
- las consultas de prueba devuelven datos o vacio sin error;
- la app actual sigue funcionando igual.

## Fase 2 - Lectura documental en entorno controlado

Acciones:

1. Crear funciones JS aisladas para leer requisitos.
2. Crear funciones JS aisladas para leer documentos por categoria/equipo.
3. Mostrar datos documentales solo en una pantalla no usada por delegados.
4. No permitir subir archivos todavia.

Criterio de exito:

- Asociacion puede ver requisitos y estados;
- no hay botones de escritura activos;
- resultados siguen funcionando.

## Fase 3 - Subida real para equipo de prueba

Acciones:

1. Elegir una categoria y un equipo de prueba.
2. Permitir subir un archivo.
3. Guardar archivo en Storage.
4. Guardar metadatos en `team_documents`.
5. Registrar evento `uploaded`.

Criterio de exito:

- archivo visible en Storage;
- metadato visible en tabla;
- evento visible en auditoria;
- ningun resultado deportivo se modifica.

## Fase 4 - Revision de Asociacion

Acciones:

1. Habilitar aprobar.
2. Habilitar observar con texto.
3. Habilitar rechazar si la Asociacion lo pide.
4. Registrar eventos.
5. Actualizar `updated_at`.

Criterio de exito:

- Asociacion cambia estados correctamente;
- Delegado ve observaciones;
- historial queda registrado.

## Fase 5 - Habilitar delegados reales

Acciones:

1. Integrar panel documental al tab Delegados.
2. Mostrar solo equipos permitidos.
3. Permitir subir/reemplazar segun estado.
4. Mantener carga de resultados separada.

Criterio de exito:

- delegado carga documentacion;
- delegado sigue cargando resultados igual que antes;
- Asociacion puede controlar estados.

## Fase 6 - Endurecer permisos

Acciones:

1. Migrar delegados a tabla Supabase.
2. Crear politicas RLS o RPC.
3. Evitar claves hardcodeadas en frontend.
4. Auditar cada accion.

Criterio de exito:

- ningun delegado puede ver/cargar documentos de otro equipo;
- Asociacion conserva control total.

## Orden recomendado de publicacion

1. Publicar solo docs o prototipo independiente si hace falta.
2. Publicar lectura documental oculta o solo Asociacion.
3. Publicar carga para equipo de prueba.
4. Publicar carga para todos.

## Rollback

Si algo falla:

- deshabilitar botones documentales;
- ocultar panel documental;
- no tocar tablas deportivas;
- conservar datos cargados en Storage/Supabase para revision manual.
