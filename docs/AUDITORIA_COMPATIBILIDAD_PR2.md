# Auditoría de compatibilidad del PR #2

Fecha de corte: 29/10/2026. Esta revisión es de sólo lectura. No se ejecutó ninguna migración contra Supabase real, no se modificó `main` y no se tocó la auditoría 2026.

## Resultado ejecutivo

El workflow `RLS local integration #1` demuestra que la migración funciona en el esquema sintético para la matriz cubierta. No alcanza para declarar compatible toda la aplicación: existen dos recorridos actuales de Asociación que todavía hacen `UPDATE` directo sobre `partidos` y quedarían bloqueados por la migración.

**Conclusión: PR #2 bloqueado para fusionar** hasta resolver esos recorridos y repetir la matriz SQL con ellos.

## Compatible verificado

| Componente | Evidencia | Estado |
|---|---|---|
| Carga/corrección normal | `app_online.js:107`, `guardarResultadoDelegado` y `guardarResultadoAsociacion` llaman `cargar_resultado_partido`; workflow RLS pasó carga, corrección y alcance por equipo | Compatible en la matriz ejecutada |
| Publicación de fixture | `app_online.js:10065` llama `publicar_fixture_categoria`; workflow pasó fixture impar con libre, equipos válidos y rechazo de entradas maliciosas | Compatible en la matriz ejecutada |
| Lectura de `partidos` y `equipos` | `app_online.js:229,600,3378,10116` y `1053` sólo leen | No afectada por los revokes de escritura |
| Gestión documental y jugadores | La aplicación usa RPCs (`add_team_player`, `mark_player_document_uploaded`, `review_*`, `deactivate_team_player`) y no INSERT/UPDATE directo en las tablas auditadas | No afectada directamente; las RPCs propias requieren prueba separada |
| `app_user_permissions` | La aplicación lee `get_current_app_user_permissions`; no escribe la tabla | Compatible con el revoke de escritura directo |

## Riesgo confirmado

### Resolución administrativa

- **Archivo/función:** `app_online.js:5453`, `resolverPartidoAdministrativamente`.
- **Operación:** `from("partidos").update(...)` con `resolucion_local` o `resolucion_visitante`.
- **Impacto:** la migración revoca INSERT/UPDATE/DELETE directos en `partidos` (`20261029_restrict_partidos_write_by_permission.sql:269`). El botón de resolución administrativa fallará aunque el usuario sea Asociación.
- **Corrección propuesta:** RPC administrativa separada, por ejemplo `resolver_partido_administrativamente`, con autorización global `can_correct_results`, `FOR UPDATE`, bloqueo de categoría/fecha y estado permitido; el cliente debe invocar sólo esa RPC.

### Anulación de resultado

- **Archivo/función:** `app_online.js:5515`, `anularResultadoAsociacion`.
- **Operación:** `from("partidos").update(...)` para volver a `pendiente`.
- **Impacto:** mismo bloqueo por revocación de UPDATE directo.
- **Corrección propuesta:** RPC `anular_resultado_partido`, con permiso global de Asociación, bloqueo de fila y auditoría derivada de `auth.uid()`/JWT.

### Función de actualización de categoría

- **Archivo/función:** `app_online.js:10025`, `guardarFormatoCategoriaPublicadaPlanner`.
- **Operación:** UPDATE directo sobre `categorias`.
- **Estado:** la función quedó sin llamadas después de migrar la publicación al RPC (`rg` no encuentra invocaciones). No es un fallo del camino actual, pero conviene eliminarla o dejarla explícitamente fuera de uso antes de fusionar para evitar una ruta futura sin autorización DB.

## Pendiente de prueba

### RPCs de documentación, jugadores y delegados

La aplicación invoca `get_current_app_user_permissions`, `add_team_player`, `request_team_player_deactivation`, `mark_player_document_uploaded`, `review_player_document`, `review_team_document`, `review_drive_player_document`, `create_player_from_drive_review` y `deactivate_team_player`. La migración no modifica sus grants ni sus cuerpos. El workflow RLS no prueba que un delegado no pueda usar una de esas RPCs fuera de su alcance. Se requiere una matriz adicional de permisos sobre esas funciones antes de certificar el circuito completo.

### Seguridad del propietario de las funciones

`cargar_resultado_partido` y `publicar_fixture_categoria` son `SECURITY DEFINER`. El código fija `search_path`, revoca EXECUTE a `public`/`anon` y valida `auth.uid()`, pero el propietario efectivo, `BYPASSRLS` y privilegios indirectos sólo fueron probados en el esquema sintético. Deben comprobarse en una base aislada equivalente antes de aplicar la migración real.

### Concurrencia

El `FOR UPDATE` fue incluido y la prueba local ejecutada verificó la ruta funcional, pero el workflow no contiene dos sesiones concurrentes reales. Falta un test de dos transacciones que intenten corregir simultáneamente el mismo partido y compruebe el resultado final y la auditoría.

### Workflow

El workflow de `main` incluye el input `ref` y permite ejecutar el SQL del PR sobre la rama indicada. La rama del PR conserva una versión anterior del workflow sin ese input. Esto no afecta la ejecución desde `main`, pero la fuente canónica para lanzar la prueba debe ser el workflow de `main` con `ref=codex/issue-1-bloque-1`.

## Operaciones relevadas

- `partidos`: lecturas en `229`, `600`, `3378`, `10116`; actualizaciones directas incompatibles en `5484` y `5541`; RPC normal en `107`; publicación por RPC en `10065`.
- `equipos`: lectura en `1053`; no hay escrituras directas.
- `delegados`, `delegado_categorias`, `app_user_permissions`: no hay escrituras directas detectadas en `app_online.js`; se accede mediante RPC/vista.
- Tablas de documentación y jugadores: las escrituras observadas son RPC, no operaciones directas de las tablas protegidas por esta migración.

## Recomendación

1. No fusionar todavía.
2. Implementar las dos RPCs administrativas para resolución y anulación, y reemplazar los dos UPDATE directos.
3. Ampliar el workflow SQL para probar ambas RPCs y las RPCs documentales con delegado propio/ajeno.
4. Repetir la prueba en CI y revisar el propietario/privilegios efectivos de las funciones.

