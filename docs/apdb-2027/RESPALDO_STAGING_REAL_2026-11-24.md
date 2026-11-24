# APdB 2027 — Respaldo real y verificación local (24/11/2026)

## Alcance y origen de la evidencia

Evidencia proporcionada por el operador desde Windows CMD y PowerShell el 24/11/2026. El origen es **exclusivamente APdB 2027 Staging**, proyecto `wffvmthdmmjwspnozyrv`, PostgreSQL 17; **no** se operó sobre producción. No se incluyen contraseñas ni filas individuales de datos.

## Respaldo PostgreSQL

- Ruta local de operador: `%USERPROFILE%\Documents\APDB-2027-Backup\apdb-2027-staging.dump`
- `pg_dump` 17.12, formato custom, `--no-owner --no-acl`.
- Archivo: **487263 bytes**.
- SHA-256: `8074d05758b2ca40a625ffd1634f013b0f0db93bb3bc9ea5b1380a364296ac11`.
- `pg_restore --list`: exitoso; índice con **69** entradas `TABLE DATA`, incluyendo **28** tablas `public`.
- Extracción de datos `pg_restore --data-only --table=...`: ejecutada sin modificar fuentes.
- Auditoría PowerShell local reportada por operador el 24/11/2026, 13:32:23: **28 tablas public contabilizadas**, seis cotejos con valores de referencia **COINCIDE**.

### Comparación de conteos (Staging remoto vs. datos del dump)

| Tabla | Staging | Dump |
| --- | ---: | ---: |
| `public.torneos` | 2 | 2 |
| `public.categorias` | 2 | 2 |
| `public.equipos` | 8 | 8 |
| `public.partidos` | 7 | 7 |
| `public.team_players` | 0 | 0 |
| `public.team_documents` | 2 | 2 |

Los conteos remotos y la extracción del dump se realizaron en momentos distintos, no dentro de un mismo snapshot transaccional; **no demuestran igualdad fila a fila**. Conteos de otras tablas del dump incluyen `app_users=3`, `app_user_permissions=2`, `playoff_matches=3`, `document_ai_audits=4`, `match_schedules=1`.

En el momento de la consulta de Staging: `storage.objects=0`, `document_files=0`, `player_documents=0`, `team_documents=2`. Este resultado no prueba inventario/recuperación de bytes externos, ni validez de enlaces a documentos.

## Intento de restauración — NO APROBADO

Destino descartable **local**: PostgreSQL 17.12, puerto 5433, BD `apdb_2027_restore_test`, inicialmente vacía.

El intento de `pg_restore --single-transaction --exit-on-error` **falló** en `CREATE EXTENSION supabase_vault` por ausencia de `supabase_vault.control` en PostgreSQL de Windows. La transacción se revirtió; consulta posterior devolvió **0 tablas**. El texto `CODIGO_RESULTADO:0` mostrado por un comando previo de CMD era **engañoso**: no acredita éxito (expansión de `%ERRORLEVEL%` al combinar comandos). La evidencia válida es el log de `pg_restore` y el conteo cero.

Extensiones declaradas en TOC: `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`.

## Herramientas y límites

- `tools/postgres-backup-restore.cjs` actualmente restringe origen y destino a localhost; **NO** usar tal cual para comparar directamente con el hospedaje de Staging. Sí cuenta con pruebas de CI contra DB sintéticas.
- El respaldo custom omite propietario y ACL explícitamente: **no puede demostrar recuperación idéntica de privilegios y roles Supabase**.
- `pg_dump` por sí solo **no** conserva los bytes físicos de Supabase Storage ni toda la configuración gestionada de Auth/proveedores, secretos y otras configuraciones externas.
- Ninguna verificación de conteos por sí sola prueba consistencia de relaciones, RLS, RPC, seguridad, igualdad de contenido o recuperación funcional.

## Puertas de salida restantes (NO-GO de despliegue)

1. Restauración integral en **entorno compatible con Supabase, separado y descartable**, con evaluación de roles, extensiones, esquema, datos, RLS y RPC. No forzar `supabase_vault` ni saltar errores para declarar éxito.
2. Verificación de contenidos y restricciones frente a snapshot del origen, y de Auth/Storage por procedimientos separados y autorizados.
3. Validación HTTP/roles/funcionalidad de la aplicación en el alojamiento de pruebas de APdB, tras autorización de publicación.
4. Solo después, reevaluar GO/NO-GO. No hacer merge/deploy ni migraciones en Staging/producción por este informe.

## Decisión

**OK**: existencia, catálogo legible, SHA-256, extracción de contenido de 28 tablas public y comparación de conteo de seis tablas.

**NO-GO**: recuperación integral y publicación. No requieren más comprobaciones manuales tabla por tabla; se debe pasar al procedimiento automatizado en un entorno fiel a Supabase.
