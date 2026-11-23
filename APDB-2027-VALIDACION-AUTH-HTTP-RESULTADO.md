# APdB 2027 - Validacion Auth/HTTP en staging

Fecha: 2026-11-22
Rama de referencia: `codex/apdb-2027-operational-hardening`
Commit de partida: `0f72691b9598095964b799ec8a3b262b8e7c1ab3`

## Resultado

La validacion se detuvo antes de crear usuarios o registros. El bloqueo es operativo y concreto: la conexion Yani permite consultas y administracion de base, pero no expone un mecanismo seguro de ciclo de vida de usuarios Auth para crear y eliminar las cuatro identidades sinteticas requeridas. Tampoco hay credenciales temporales disponibles que puedan reutilizarse sin incumplir el alcance.

No se usaron usuarios existentes, no se escribieron datos, no se aplico la migracion de reconciliacion y no se ejecutaron llamadas HTTP autenticadas.

## Preflight verificado

- Proyecto: `APdB 2027 Staging`.
- Project ref: `wffvmthdmmjwspnozyrv`.
- Estado: `ACTIVE_HEALTHY`.
- RPC administrativa registrada: `apdb_2027_administrative_onboarding_rpc_secure`.
- Las tres RPC son `SECURITY DEFINER`, propietarias de `postgres`, con `search_path` `public, auth, pg_temp`.
- `anon` no tiene `EXECUTE`; `authenticated` sí.
- Conteos observados sin modificación: 2 torneos, 2 categorías, 8 equipos, 7 partidos y 3 partidos de playoff.

## Matriz de pruebas

| Prueba | Resultado |
|---|---|
| Identidad de staging y separación de producción | Aprobada, sólo lectura |
| Definiciones y privilegios RPC | Aprobada, sólo lectura |
| Migración de reconciliación | No aplicada, conforme a autorización |
| Creación de administrador sintético | Bloqueada: falta mecanismo Auth administrativo seguro |
| Creación de delegado sintético | Bloqueada por el mismo motivo |
| Usuario autenticado sin permisos | Bloqueada sin identidad sintética temporal |
| Usuario de otra organización | Bloqueada sin identidad sintética temporal |
| HTTP anónimo | No ejecutada en esta intervención |
| Alta, idempotencia, asignación y revocación | No ejecutadas |
| Aislamiento entre organizaciones y concurrencia | No ejecutadas |
| Compatibilidad frontend | Sólo contratos locales previos; no Auth/HTTP real |

## Integridad

No hubo escrituras en staging durante esta intervención. Producción, Liga Maxi 2026, Pago cuotas, `main`, cPanel y DNS no fueron modificados.

## Intervención mínima necesaria

Habilitar un procedimiento administrativo controlado para crear cuatro usuarios Auth sintéticos con contraseñas temporales y eliminarlos por UUID al finalizar, o proporcionar un ejecutor local autorizado que solicite esas credenciales sin registrarlas. El procedimiento debe permitir identificar exclusivamente los UUID creados por la ejecución y limpiar sus dependencias sin borrados globales.

Hasta disponer de ese mecanismo, la validación Auth/HTTP integral queda **NO CERTIFICADA**.
