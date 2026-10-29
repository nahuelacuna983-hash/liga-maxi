# Contrato de permisos de las RPC documentales históricas

Fecha: 2026-10-29  
Rama: `codex/issue-1-bloque-1`  
Alcance: análisis estático y matriz SQL aislada. No se ejecutaron migraciones ni escrituras contra Supabase.

## Resumen ejecutivo

Las ocho RPC históricas inspeccionadas no están cubiertas por la migración RLS de resultados y fixtures. Todas se implementan como `SECURITY DEFINER` y sus scripts históricos otorgan ejecución a `anon` y `authenticated`. En los cuerpos inspeccionados, el actor (`p_actor`, `p_uploaded_by`, `p_created_by`) llega como argumento del navegador o se usa para auditoría, sin una comprobación equivalente y obligatoria de `auth.uid()` y del alcance torneo/categoría/equipo.

Esto es un riesgo confirmado de autorización, no una prueba de que todos los recorridos estén explotables en producción: la aplicación mantiene controles de interfaz y usa un login legado, pero esos controles no son una frontera de seguridad de base de datos. No se modificaron las RPC porque primero debe aprobarse el contrato de transición de identidad.

## Inventario comprobado

| RPC | Consumidor en `app_online.js` | Tablas/efectos observados | Identidad recibida | Grant histórico | Estado |
|---|---|---|---|---|---|
| `add_team_player` | alta de jugador, aprox. línea 4852 | inserta `team_players`; asegura documentos | `p_created_by` | `anon`, `authenticated` | riesgo confirmado |
| `mark_player_document_uploaded` | subida individual, aprox. líneas 4779/5248 | actualiza `player_documents`; inserta evento; recibe metadatos Storage | `p_uploaded_by` | `anon`, `authenticated` | riesgo confirmado |
| `review_player_document` | revisión documental individual, aprox. líneas 6562/6659 | actualiza `player_documents`; registra evento | `p_actor` | `anon`, `authenticated` | riesgo confirmado |
| `review_team_document` | revisión institucional, aprox. líneas 6562/6659 | actualiza documento institucional; registra evento | `p_actor` | `anon`, `authenticated` | riesgo confirmado |
| `review_drive_player_document` | revisión desde Drive, aprox. línea 6718 | actualiza/revisa documento individual asociado a Drive | `p_actor` y referencia documental | `anon`, `authenticated` | riesgo confirmado |
| `create_player_from_drive_review` | alta desde revisión Drive, aprox. línea 6784 | crea jugador/documentación desde una revisión Drive | actor textual y UUIDs enviados | `anon`, `authenticated` | riesgo confirmado |
| `request_team_player_deactivation` | solicitud de baja, aprox. línea 4921 | cambia estado de `team_players` y registra motivo | `p_actor`, `p_reason` | `anon`, `authenticated` | riesgo confirmado |
| `deactivate_team_player` | baja administrativa, aprox. línea 6889 | desactiva o elimina jugador/documentos según actividad | `p_actor` | `anon`, `authenticated` | riesgo confirmado |

Las líneas son referencias del árbol revisado en este commit; no constituyen una autorización por sí mismas. La matriz SQL `tools/document-rpc-contract.sql` contiene consultas de catálogo para confirmar firmas, propietarios, `prosecdef`, `search_path` y ACL en una base aislada o con una conexión de lectura autorizada.

## Comportamiento actual por rol

### Público/anónimo

**Comprobado:** los scripts históricos conceden `EXECUTE` a `anon`; las funciones son `SECURITY DEFINER`.  
**Inferido con alto riesgo:** un cliente anónimo que conozca la firma puede intentar invocar las funciones y suministrar identificadores/actor. El alcance real depende de otras restricciones no visibles en la función, triggers y RLS de las tablas subyacentes. Esa incertidumbre no debe tratarse como protección.

Contrato propuesto: ninguna de las ocho RPC debe aceptar modificaciones documentales, de jugadores o de bajas desde `anon`.

### Delegado

**Comprobado:** la interfaz aplica controles locales y opera con el equipo del delegado; la base histórica no muestra, en los cuerpos revisados, una comprobación uniforme de `auth.uid()` y equipo/categoría.  
Contrato propuesto: sólo su equipo y categorías autorizadas, dentro del torneo; identidad y actor derivados de la sesión, nunca de un texto libre. La baja destructiva debe ser una capacidad separada y explícita.

### Asociación

**Comprobado:** la configuración de permisos existente contempla capacidades por torneo/categoría/equipo y la semilla de Asociación usa permiso global de torneo para administración.  
Contrato propuesto: Asociación sólo dentro del torneo autorizado, con capacidad específica (`can_load_documents`, `can_review_documents`, `can_manage_users` o equivalente), y con bloqueo de fila cuando exista transición de estado.

## Dependencias y riesgos

- `mark_player_document_uploaded` ocurre después de una subida a Storage. El permiso de la RPC no debe convertir un `storage_path` enviado por el navegador en autorización; debe comprobar bucket, propietario lógico, jugador/equipo y sesión.
- Las funciones `SECURITY DEFINER` deben fijar `search_path`, tener propietario controlado y revocar `PUBLIC`/`anon` cuando la transición lo permita.
- `review_*` debe conservar estados y observaciones, pero el actor y `reviewed_at` deben derivarse de sesión/servidor.
- `create_player_from_drive_review` requiere controles de procedencia y no debe crear identidad sólo por nombre de archivo.
- `deactivate_team_player` puede eliminar o desactivar registros según actividad: requiere aprobación separada, transacción y prohibición de ejecución por delegado salvo contrato explícito.
- La nueva migración de partidos no cambia por sí sola estas RPC históricas. La compatibilidad actual de resultados/fixtures no prueba compatibilidad documental.

## Matriz propuesta

| Capacidad | Anónimo | Delegado | Asociación |
|---|---:|---|---|
| Crear jugador en su equipo | no | sí, sólo equipo/categoría propios | sí, torneo autorizado |
| Subir documento individual | no | sí, jugador de equipo propio | sí, torneo autorizado |
| Revisar documento individual | no | no, salvo aprobación explícita futura | sí, con capacidad documental |
| Revisar documento institucional | no | no | sí, equipo/categoría/torneo autorizados |
| Revisar desde Drive | no | no | sí, con procedencia verificable |
| Crear desde revisión Drive | no | no | sí, con identidad y alcance inequívocos |
| Solicitar baja | no | sí, sólo equipo propio, sin borrar | sí |
| Ejecutar baja administrativa | no | no | sí, capacidad separada y auditoría |

La matriz es una propuesta de seguridad; no cambia el comportamiento hasta que se apruebe la transición de login legado a `auth.uid()`.

## Plan de implementación por etapas

1. **Catálogo aislado:** ejecutar las consultas de `tools/document-rpc-contract.sql` en PostgreSQL/Supabase local y registrar propietarios, grants y configuración efectiva.
2. **Contrato de identidad:** aprobar si los delegados tendrán usuarios Auth reales y cómo se relacionan con `delegados`; definir torneo/categoría/equipo de alcance.
3. **Funciones nuevas o sobrecargas controladas:** crear versiones autenticadas que deriven actor de `auth.uid()`, con validación de alcance y `FOR UPDATE` donde haya transición. Mantener las legacy sin alterar hasta migrar consumidores.
4. **Storage:** probar bucket/prefijo y correspondencia lógica en entorno aislado; no confiar en rutas privadas enviadas por el cliente.
5. **Migración de grants:** revocar `anon` y grants amplios sólo después de actualizar el frontend y ejecutar matriz positiva/negativa.
6. **Retiro legacy:** retirar funciones/grants antiguos sólo cuando no haya consumidores y exista plan de rollback.

## Decisiones que requieren aprobación

- Adoptar Auth como identidad obligatoria para Delegados y Asociación, o mantener temporalmente el login legado con un gateway seguro.
- Definir si un delegado puede crear jugadores, subir documentos y solicitar bajas, y si alguna revisión documental queda permitida para ese rol.
- Definir el alcance de una baja: desactivar únicamente o permitir eliminación bajo condiciones.
- Confirmar nombres de capacidades y relación canónica usuario → torneo/categoría/equipo.
- Autorizar migración y prueba en una base aislada; no se propone ejecutar nada en producción en este bloque.

## Evidencia y límites

Ejecutado localmente: inspección estática de consumidores/scripts, `node --check` de herramientas existentes, `ISSUE1_SMOKE_OK`, `RLS_POLICY_SMOKE_OK` y `git diff --check`.  
Pendiente: consulta efectiva de `pg_proc`, propietarios/ACL y llamadas positivas/negativas de estas ocho RPC en PostgreSQL aislado. El entorno actual no tiene Docker, PostgreSQL, `psql` ni Supabase CLI, por lo que no se presenta esa parte como prueba ejecutada.
