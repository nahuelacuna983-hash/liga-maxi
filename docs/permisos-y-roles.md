# Permisos y roles - APdB Liga Maxi

## Objetivo

Ordenar el acceso antes de avanzar con aprobaciones automaticas, IA o multi torneo.

La app actual sigue funcionando con claves simples. Esta capa nueva permite empezar a migrar a usuarios reales sin cortar el uso de delegados.

## Roles

### admin_general

Acceso total a la plataforma.

Puede:

- ver todo
- corregir resultados
- revisar documentacion
- crear/editar torneos
- administrar usuarios y permisos
- usar modo socorro

### asociacion

Administra una asociacion o torneo.

Puede:

- generar torneos
- administrar categorias/equipos
- corregir resultados
- revisar documentacion
- usar modo socorro dentro de su asociacion

No deberia tocar datos de otra asociacion cuando el sistema sea multi asociacion.

### delegado

Gestiona uno o mas equipos asignados.

Puede:

- cargar resultados de sus partidos permitidos
- cargar documentacion de equipo
- cargar documentacion por jugador

No puede aprobar documentos ni corregir datos administrativos.

### jugador

Futuro.

Podra ver o cargar documentacion propia si se decide habilitarlo.

### publico

Solo lectura.

## Tablas nuevas

- `app_users`
- `app_user_permissions`
- `v_app_user_permissions`

## Archivos SQL

1. `docs/ejecutar-en-supabase-permisos-base.sql`
2. `docs/ejecutar-en-supabase-permisos-seed-apdb.sql`

## Proxima migracion

1. Leer permisos desde Supabase.
2. Mantener claves actuales como respaldo.
3. Separar visualmente vistas por rol.
4. Migrar a Supabase Auth.
5. Activar RLS/politicas reales por rol.
