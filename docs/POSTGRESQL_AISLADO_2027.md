# PostgreSQL aislado 2027

## Estado de ejecución

En el entorno actual no están disponibles `docker`, `psql` ni Supabase CLI. Por tanto, el esquema y las pruebas SQL fueron revisados como artefactos, pero no se declara ejecución real de PostgreSQL/RLS.

## Archivos

- `synthetic-persistence-schema.sql`: tablas, relaciones, restricciones, contexto de identidad, RLS y trigger append-only.
- `synthetic-persistence-tests.sql`: datos ficticios y escenarios de aislamiento entre dos organizaciones.
- `synthetic-persistence-roles.sql`: roles separados para propietario, aplicación y público en una base descartable.

## Decisiones

- La organización se deriva de la membresía del usuario, no de parámetros libres del cliente.
- Torneo, categoría, equipo, jugador e inscripción conservan relaciones verificables.
- Una inscripción sólo puede usar una categoría y equipo compatibles.
- Los eventos documentales no se actualizan ni eliminan; una revisión posterior agrega un evento.
- La información documental queda separada de la lectura pública deportiva.

## Pendientes de prueba real

1. Ejecutar el esquema en PostgreSQL 16 descartable.
2. Validar que el harness pueda cambiar `request.jwt.claim.sub` sin privilegios de propietario.
3. Ejecutar lecturas cruzadas, escrituras negativas y concurrencia con usuarios no propietarios.
4. Revisar políticas `WITH CHECK` para cada operación de escritura en el motor elegido.
5. Añadir RPC transaccionales para resultados, fixtures y revisiones antes de una integración real.

La seguridad sintética del proveedor está probada con Node. La seguridad PostgreSQL/RLS permanece pendiente de ejecución en un motor aislado y con `lm_app`/`lm_public`, nunca con el propietario del esquema.
