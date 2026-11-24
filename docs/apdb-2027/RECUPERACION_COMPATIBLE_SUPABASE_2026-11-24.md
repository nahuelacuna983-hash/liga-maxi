# APdB 2027 — Criterio de recuperación compatible con Supabase (24/11/2026)

## Decisión: no forzar el backup crudo en PostgreSQL estándar

La prueba real aportada por el operador demostró que el archivo `apdb-2027-staging.dump` (487263 bytes, SHA-256 `8074d05758b2ca40a625ffd1634f013b0f0db93bb3bc9ea5b1380a364296ac11`) es legible y contiene 28 tablas públicas con datos contabilizados, pero **no se pudo restaurar íntegramente** sobre PostgreSQL 17 de Windows debido a la extensión `supabase_vault`. Esto no es un fallo demostrado del dump: el destino no ofrece el mismo entorno Supabase.

**Fuente primaria actual:** Supabase, [Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform). La guía explica que el procedimiento recomendado usa `supabase db dump` para generar separadamente roles, esquema y datos, y una instancia Supabase self-hosted con Docker para recuperar y probar. El dump específico del CLI filtra esquemas y roles internos y es distinto de `pg_dump` sin esos filtros. La guía no cubre por sí sola archivos de Storage ni Edge Functions.

## Entregables ya comprobados

- Respaldo crudo en PC, **conservar sin cambios**; no adjuntarlo a tickets, repositorios ni chats.
- Índice legible; auditoría de 28 tablas `public`; conteos cotejados de `torneos=2`, `categorias=2`, `equipos=8`, `partidos=7`, `team_players=0`, `team_documents=2`.
- Conteo `storage.objects=0` en staging **en el instante consultado**; no constituye un inventario de bytes fuera de PostgreSQL ni verifica referencias de los dos registros documentales.
- Restauración local fallida y revertida sin tablas; el código `CODIGO_RESULTADO:0` del CMD original fue una lectura falsa; NO usar como indicador de éxito.

## Ejecución futura de recuperación integral — guardas obligatorias

1. Usar un **destino descartable y compatible con Supabase** (por ejemplo, self-hosted Docker) y confirmar recursos, acceso y costos antes de crearlo. No reutilizar Staging ni producción como destino.
2. Obtener un **segundo juego de exportaciones Supabase-compatibles** (roles, schema, data) con la versión fijada de Supabase CLI y la misma fuente autorizada. Ejecutar desde un equipo aprobado; nunca escribir claves de conexión en logs, repositorio o mensajes. La exportación no debe ejecutar SQL de escritura contra la fuente.
3. Inventariar extensiones necesarias, roles y dependencias antes de ejecutar ninguna importación. Verificar que el destino tiene `supabase_vault` y los demás requisitos; NO ocultar errores quitando objetos del dump ni inventar `CREATE EXTENSION` falsos.
4. Restaurar sobre **una nueva base descartable**, con controles de errores verdaderos. Capturar éxito solo si la herramienta termina con código de salida 0, sin errores en el log, y quedan visibles esquemas y tablas esperados.
5. Comparar filas/contenidos, estructura, restricciones, índices, políticas RLS, definiciones de RPC, permisos efectivos y funcionalidades por rol. Registrar diffs para revisión; prohibir GO con divergencias sin explicación.
6. Capturar por separado Auth (configuración gestionada/secretos no exportables automáticamente), Storage bytes/rutas/ACL y funciones edge cuando aplique. Validar restauración y aislamiento documental con identidades sintéticas.
7. Solo tras tener pruebas funcionales repetibles y autorizaciones expresas, discutir aplicación de migraciones a Staging y despliegue en URL institucional. Producción 2026 siempre fuera de alcance.

## Conclusión y limitación operativa

**GO para conservar el respaldo y seguir con validaciones no destructivas. NO-GO para declarar recuperación integral y publicación.**

La herramienta `tools/postgres-backup-restore.cjs` del proyecto exige origen y destino localhost: sus pruebas sintéticas son útiles, pero **no sirven por sí solas como evidencia de un restore real de Staging**. No ejecutar esa herramienta contra una URL Supabase alojada tal como está.

El operador ya instaló PostgreSQL 17 y preparó una DB local; no pedirle reinstalarlo, repetir decenas de comandos o restablecer credenciales. El siguiente requisito real es la instancia **Supabase compatible**, no más consultas repetitivas de `TABLE DATA`.

Este documento es un procedimiento y decisión técnica, **no** un informe de restauración completada.
