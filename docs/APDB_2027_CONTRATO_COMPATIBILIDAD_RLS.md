# APdB 2027 — Contrato real de compatibilidad antes de cerrar escrituras anónimas

**Fuente inspeccionada:** `app_online.js` de la rama `codex/apdb-2027-operational-hardening`. Política real: consulta de solo lectura a Supabase `liga-maxi`, 2026-11-09. **Ninguna configuración fue modificada.**

## Hallazgos directos, con evidencia de código

| Operación | Archivo y líneas aproximadas | Estado comprobado de RLS | Impacto si se cierra sin adaptación |
|---|---|---|---|
| Carga/corrección de resultados | `app_online.js:4720,5492,5546,5606,5663` → `.from("partidos").update(...)` | `INSERT` y `UPDATE` para `anon, authenticated`, `true` | Puede bloquear la carga de resultados actual |
| Generación de fixture | `app_online.js:10401` → `.from("partidos").insert(...)` | `INSERT` amplio | Puede impedir crear un torneo |
| Cambios de categoría | `app_online.js:10176` → `.from("categorias").update(...)` | `UPDATE` amplio, también `anon` | Puede impedir oficialización/ajustes |
| Playoffs | `app_online.js:5835` → `.from("playoff_matches").upsert(...)` | `INSERT` y `UPDATE` para `anon, authenticated` | Puede impedir registrar llaves/resultados |
| Programación | `app_online.js:6335,6636` → `.from("match_schedules").upsert(...)` | `INSERT` y `UPDATE` amplios | Puede impedir jornadas/canchas |
| Carga de documentación | `app_online.js:4812,5296` → `.storage.from("documentos").upload(...)` | `storage.objects` permite `INSERT` a `public` para bucket `documentos` | Puede impedir subir archivos, pero la política actual requiere corrección |
| Revisión documental | `app_online.js:6703,6800` → `review_player_document`/`review_team_document` RPC | Revisión efectiva de actor todavía pendiente | Puede fallar aprobación institucional |
| Acceso a documentación | `app_online.js:6982,7095,7151` → `createSignedUrl` | SELECT Storage permite `authenticated` para todo bucket `documentos` | Posible lectura demasiado amplia; comprobar alcance por usuario |
| Inicio de sesión real | `app_online.js:6056` → `auth.signInWithPassword` | Supabase Auth disponible | El contrato definitivo debe depender de `auth.uid()` y permisos verificados, no de una clave legada |

## Hallazgo adicional sobre documentos

El frontend construye rutas con el segmento literal `"2026"` en `app_online.js:4804,5285`. Antes de admitir cargas 2027, sustituirlo por el contexto **validado** de temporada/torneo, manteniendo ruta y acceso a históricos. No modificar ni mover archivos 2026 automáticamente.

## Políticas reales confirmadas

- `partidos`: `INSERT` y `UPDATE` `anon,authenticated`, condiciones `true`.
- `categorias`: `UPDATE` `anon,authenticated`, condiciones `true`.
- `playoff_matches`: `INSERT` y `UPDATE` `anon,authenticated`, condiciones `true`.
- `match_schedules`: `INSERT` y `UPDATE` `anon,authenticated`, condiciones `true`.
- `storage.objects`: `INSERT` `public` para `documentos`; `SELECT` `authenticated` sin comprobación adicional de equipo en la política inspeccionada.
- `document_requirements` y `team_documents`: `SELECT` `public` según las políticas actuales. Revisar sensibilidad de columnas, vistas y campos antes de cambiar.

Estas observaciones son **riesgos de configuración demostrados**, no pruebas de lectura/escritura explotables desde un navegador externo.

## Orden de implementación sin romper el uso actual

1. **Crear línea base de compatibilidad:** registrar las operaciones exactas de Público, Fecha, Delegados y Asociación con usuarios autorizados, sin datos oficiales y sin escritura productiva de prueba.
2. **Preparar entorno aislado clonando esquema, policies, funciones y grants**, sin datos personales ni médicos. Asegurar `anon`, `authenticated`, `auth.uid()` simulado de manera fiel.
3. **Cerrar primero rutas sensibles de archivos y vistas**, tras adaptar el frontend a sesión real y RPC de autorización; probar subida, acceso y denegación por equipo/rol en clon.
4. **Sustituir escrituras directas** por RPC de resultados, fixtures, playoffs, programación y administración que validen actor/alcance/categoría/estado, con `search_path` seguro y grants mínimos.
5. **Retirar las políticas legacy permisivas** sólo cuando las cuatro vistas funcionen con esas RPC en el clon. Verificar denegación `anon` mediante sesión real y que un delegado no modifique otro equipo.
6. **Preparar backup/restore, rollback y release gate** antes de proponer aplicar cambios en producción.
7. **No habilitar documentos médicos reales 2027** mientras Storage/RLS no estén verificados y ajustados.

## Próximos criterios de aprobación

- `anon`: puede leer exclusivamente datos deportivos publicados, no escribir categorías, resultados, fixtures, programación ni documentos.
- Delegado autorizado: puede operar únicamente su equipo/categoría y no revisar documentos como Asociación.
- Delegado ajeno/revocado: escritura denegada; ningún acceso a documentos de otro equipo.
- Asociación: puede realizar operaciones institucionales dentro de su alcance, con historial.
- Storage: bucket privado, subida y lectura por ámbito autorizado, rutas separadas por temporada; URLs firmadas de duración controlada.
- 2026: mismas URLs públicas, historial y resultados.
- Restauración: comprobación sobre backup aislado antes de cualquier despliegue.

**Estado:** contrato y evidencia confirmados; cambios seguros de política y regresiones con identidades reales, todavía pendientes.

## Matriz operativa aislada

| Perfil sintético | Lectura deportiva pública | Escrituras deportivas | Documentos privados | Administración/RPC |
|---|---|---|---|---|
| Anónimo | Permitida sólo en catálogo publicado | Denegada por grant/RLS | Denegada | Denegada |
| Autenticado sin permisos | Permitida sólo en catálogo publicado | Denegada | Denegada | Denegada |
| Delegado autorizado | Catálogo y alcance asignado | Sólo resultado/documentación de su alcance, sujeto a RPC | Sólo su alcance | Denegada |
| Delegado ajeno o revocado | Catálogo público | Denegada | Denegada | Denegada |
| Asociación | Según organización vigente | Permitida dentro de su organización y reglas | Revisión dentro de su organización | Permitida con historial |

La fixture local comprueba materialmente las dos primeras filas y el cierre de funciones
`SECURITY DEFINER`; no representa Supabase Auth, `auth.uid()`, Storage ni RPC productivas.
La matriz de delegados y Asociación queda pendiente de ejecutar contra un clon Supabase
o un entorno PostgreSQL que reproduzca fielmente sus claims y funciones.
