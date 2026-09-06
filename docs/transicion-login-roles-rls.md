# Transicion a login, roles y RLS final

Fecha: 05/09/2026

## Estado actual

La app tiene dos mecanismos conviviendo:

- Claves legacy: delegados/asociacion entran con clave simple.
- Supabase Auth: ya existe base para leer permisos del usuario autenticado con `get_current_app_user_permissions()`.

Esto permite migrar sin cortar el torneo, pero todavia no es el modelo final de seguridad.

## Objetivo final

Cada accion sensible debe tener usuario real y permiso verificable:

- quien cargo;
- que equipo/categoria tenia permitido;
- que documento toco;
- que resultado corrigio;
- que torneo publico;
- que aviso/programacion envio.

## Roles finales

### Admin general

Puede todo:

- asociaciones;
- torneos;
- usuarios;
- permisos;
- resultados;
- documentacion;
- auditoria;
- modo socorro.

### Asociacion

Puede operar dentro de su organizacion:

- generar/publicar torneos;
- corregir resultados;
- cargar resoluciones administrativas;
- revisar documentacion;
- administrar programacion;
- ver auditorias;
- consultar habilitados.

### Delegado

Puede operar solo sobre sus equipos/categorias:

- cargar resultados permitidos;
- cargar jugadores;
- solicitar baja;
- cargar documentacion;
- ver estado documental de su equipo;
- descargar/listar datos de su equipo.

No puede aprobar documentacion ni modificar datos de otros equipos.

### Arbitro / consulta

Lectura controlada:

- habilitados por categoria;
- habilitados por equipo;
- idealmente habilitados por partido/fecha.

No puede ver documentos sensibles ni editar datos.

### Publico

Solo lectura:

- tabla;
- fixture;
- resultados;
- playoffs;
- contenidos publicados.

## Acciones que deben salir de `anon`

Estas acciones no deberian ejecutarse desde una key publica sin usuario real:

- aprobar/rechazar documentos;
- crear jugador desde revision;
- baja de jugadores;
- cambiar permisos;
- correccion/anulacion de resultados;
- resoluciones administrativas 20-0;
- publicar fixtures;
- guardar programacion;
- cargar resultados de playoffs;
- consultar vistas admin documentales.

## Transicion recomendada

### Paso 1: lectura clara

Mantener publico solo lo deportivo publicado.

No bloquear todavia carga de resultados/documentos.

### Paso 2: login real optativo

Crear usuarios Auth para:

- admin general;
- asociacion;
- 1 delegado de prueba;
- 1 usuario consulta/arbitro.

Mantener claves legacy como respaldo.

### Paso 3: acciones admin solo con Auth

Pasar primero a Auth:

- aprobacion documental;
- baja definitiva de jugadores;
- permisos;
- auditoria;
- publicar torneo.

Esto reduce mucho riesgo sin molestar demasiado a delegados.

### Paso 4: delegados con Auth

Pasar carga de resultados/documentos a usuario real.

La clave legacy puede quedar durante un tiempo como transicion, pero no como modelo comercial.

### Paso 5: RLS final

Quitar grants a `anon` en funciones y vistas sensibles.

Las RPC deben validar `auth.uid()` y permisos.

## Prueba piloto sugerida

Antes de migrar todos:

1. Crear usuario real para Asociacion.
2. Crear usuario real para delegado Sud America.
3. Crear usuario real de consulta/arbitro.
4. Probar circuito completo con esos usuarios.
5. Repetir con un segundo delegado.
6. Recien ahi ampliar.

## Criterio comercial

Para vender como plataforma:

- no alcanza con que funcione por clave;
- debe quedar claro quien hizo cada accion;
- debe poder revocarse acceso;
- debe poder cambiarse responsable sin cambiar codigo;
- debe haber trazabilidad.

## Pendiente tecnico principal

Revisar y ajustar RPC para que validen permisos por usuario autenticado antes de quitar grants legacy.
