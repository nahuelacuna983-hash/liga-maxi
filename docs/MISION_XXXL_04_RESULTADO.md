# APdB 2027 - Mision XXXL 04

## Estado de esta entrega

Rama: `codex/demo-2027-visual`  
Modo: datos sintéticos y persistencia PostgreSQL aislada preparada  
PostgreSQL real local: no ejecutado en este entorno (requiere `DATABASE_URL` y PostgreSQL 16).

## Implementado

- Las llaves de playoffs distinguen `projection` de `official`.
- La generación visual persistente guarda una proyección y no la presenta como oficial.
- La oficialización dispone de una operación explícita (`POST /api/categories/:id/playoffs/officialize`).
- El repositorio rechaza la oficialización si la fase regular conserva partidos `pending`, dentro de la transacción.
- La operación oficializada registra historial `playoff_officialized`.
- El proveedor sintético conserva la misma regla y no muta el estado cuando una oficialización es rechazada.
- La interfaz ofrece `Generar proyección` y `Oficializar llave`, manteniendo resultados, avance y campeón existentes.
- Se conserva la separación entre modo sintético y modo PostgreSQL.

## Pruebas ejecutadas

- `node --check demo_2027_postgres_repository.js`
- `node --check demo_circuito_2027_persistent.js`
- `node tests/demo-playoff-publication-guards.cjs`
- `node tests/demo-playoff-formats.cjs`
- `node tests/auth-contract.cjs`
- `node tests/auth-server-contract.cjs`
- `node tests/postgres-server-contract.cjs`
- `git diff --check`

Resultado: todas las pruebas anteriores superadas.

## Pendiente de CI

Debe ejecutarse en PostgreSQL 16 aislado el flujo completo de la plataforma, incluyendo la nueva columna `publication_state`, la negativa con fase regular incompleta, la oficialización posterior, historial, Top 4/6/8 y recuperación tras reinicio. Chromium autenticado y la prueba integral de aceptación también requieren ejecución en CI para considerarse evidencia real.

La autenticación de desarrollo sigue siendo exclusivamente sintética y no constituye autenticación institucional.
