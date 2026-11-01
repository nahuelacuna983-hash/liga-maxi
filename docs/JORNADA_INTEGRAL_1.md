# Jornada integral 1

## Alcance

Base revisada: `e1c4a62923ea012c7a1946eb28d331fe0a40a31c`.

La rama contiene persistencia PostgreSQL local para torneos, categorías, equipos, fixtures, programación, resultados, playoffs e historial. Las pruebas CI anteriores validaron los recorridos deportivos Top 4, Top 6 y Top 8 con datos ficticios.

## Estado verificado

- Persistencia transaccional de fase regular y recuperación mediante nuevas conexiones: implementada en `PostgresRepository` y cubierta por `tests/postgres-http-integration.cjs`.
- Bloqueo de resultados duplicados y reprogramación de partidos disputados: implementado con bloqueo `FOR UPDATE` y estado `pending`.
- Integridad de equipos y partidos por categoría: implementada mediante claves foráneas compuestas en el esquema local.
- Playoffs persistentes e historial: implementados en `lm_demo_playoffs` y `lm_demo_playoff_history`.
- Circuito visual PostgreSQL y campeonatos Top 4/Top 6/Top 8: validados en las ejecuciones CI informadas por el proyecto hasta el commit base.

## Bloqueos reales

- El servidor local todavía recibe `actorId` desde el cuerpo HTTP y no verifica una sesión firmada. Esto no es autenticación ni autorización efectiva.
- No debe habilitarse para usuarios reales hasta incorporar identidad server-side, expiración de sesión y permisos derivados de esa identidad.
- El modo navegador todavía usa `localStorage` para recordar la categoría; la recuperación de datos existe en PostgreSQL, pero una prueba específica de navegador con proceso HTTP reiniciado debe ejecutarse en CI.
- El esquema demo no contiene todavía organizaciones, usuarios, membresías ni asignaciones de delegados persistentes; por lo tanto, el aislamiento multi-organizador no está validado.

## Próximo bloque seguro

1. Introducir un contrato de sesión de desarrollo aislada, con tokens efímeros emitidos por el servidor y verificados en cada operación administrativa.
2. Separar `actorId` derivado de sesión de los datos enviados por el navegador.
3. Persistir organizaciones, perfiles y asignaciones con claves foráneas y controles de pertenencia.
4. Agregar pruebas negativas HTTP para anónimo, delegado ajeno y organizador ajeno antes de conectar esos permisos a la interfaz.

No se declara la plataforma apta para usuarios reales hasta ejecutar esas pruebas con PostgreSQL y roles sin privilegios de propietario.
