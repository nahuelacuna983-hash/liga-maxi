# APdB 2027 — Bloque 4 / Preflight de seguridad documental

Estado: **investigación reproducible y propuesta de corrección, NO migración aprobada ni despliegue**.

## Evidencia real (staging permanente, 23/11/2026)

- `public.v_team_documents_admin`: vista con `security_barrier=true`, SIN `security_invoker=true`, permiso SELECT para `authenticated`; Security Advisor: `security_definer_view` ERROR.
- Su SQL expone identificadores/estado y rutas Storage de `team_documents`, junto con nombres de `document_requirements`, filtrando por `apdb_document_access_allowed(organizacion_id,categoria_id,equipo_id)`.
- `team_documents` y `document_requirements`: RLS habilitada, sin políticas, sin SELECT directo para `authenticated` ni `anon`.
- `app_online.js` lee `v_team_documents_admin` y `v_player_documents_admin` con `.from(...).select(...)`. Esta dependencia debe mantenerse o reemplazarse simultáneamente con su consumidor.
- `v_player_documents_admin` no tiene SELECT para authenticated, otra incompatibilidad contractual.
- Bucket `documentos`: privado, con políticas para read/create/update/delete condicionadas a `apdb_storage_team_path_allowed`. Delegado habilitado puede read/create de su equipo, no update/delete.
- Seguridad de funciones SECURITY DEFINER y 19 tablas con RLS sin políticas: no expandir permisos genéricamente.

## Decisión de diseño

**No ejecutar** `ALTER VIEW ... SET (security_invoker = true)` como parche único:
la vista perdería acceso a las dos tablas base y fallaría para la Asociación y los Delegados.

### Ruta preferida para contrastar en descartable

1. Identificar el contrato exacto de `v_team_documents_admin` y de sus consumidores en `app_online.js`, y comprobar si los requisitos pueden recuperarse por un endpoint controlado.
2. Preparar una RPC de lectura **estrictamente acotada** a equipo/categoría/organización, con autorización verificada dentro de la función, actor vigente, revocaciones efectivas y campos mínimos; disponer de un `search_path` restringido y no conceder ejecución a `anon`. En código cliente reemplazar la consulta a vista en el mismo cambio.
3. Alternativa: establecer SELECT mínimo y políticas RLS para `team_documents` **y** `document_requirements`, siempre con `security_invoker=true`, si el modelo de requisitos admite una política verdaderamente segregada sin fuga entre organizaciones. No elegirla sin inspeccionar los vínculos de las tablas.
4. En ambos casos cerrar la exposición de la vista vieja, conservando temporalmente compatibilidad solo bajo un control de migración probado y con rollback.
5. Revisar por separado `v_player_documents_admin`: no dar SELECT indiscriminado para arreglar una pantalla rota.

## Pruebas de aceptación necesarias

- Asociación A: ve solo sus equipos y documentos de su organización.
- Asociación B: no puede acceder a A ni con identificadores conocidos.
- Delegado A: ve y agrega nueva versión documental solo de su equipo asignado.
- Delegado B: acceso cruzado a A denegado en REST, RPC, Storage y rutas manipuladas.
- Delegado revocado: pierde acceso efectivo tras la revocación, incluso con sesión vigente donde aplique.
- Anónimo: sin lectura privada ni RPC de documentos.
- Corrección: no se permite sobrescribir la versión anterior; subir objeto nuevo y mantener historial.
- Reporte Security Advisor: desaparece el ERROR `security_definer_view` sin elevar permisos por accidente.
- Browser: ambas pantallas institucional/jugador cargan sin 403 inesperados y sin filtrar datos de otros equipos.

## Evidencia técnica automatizable

Ejecutar `tests/security/apdb_document_view_preflight.sql` con conexión de **solo lectura**. No ejecuta escrituras ni consulta datos de jugadores. La columna `contract_ready` señala condiciones de catálogo observables; **no certifica las pruebas de roles**.

## Rollback y restricciones

Preparar en descartable la reversión del contrato antiguo (definición de vista y grants) y de código cliente en un único paquete versionado. Antes de staging, obtener evidencia de tests negativos y consentimiento de despliegue. No tocar `main`, producción 2026, datos existentes ni documentación personal.
