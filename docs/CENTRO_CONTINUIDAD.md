# Centro de continuidad APdB / Liga Maxi

Ultima revision: 2026-11-12
Rama: `codex/apdb-2027-operational-hardening`

Este indice distingue fuentes versionadas, artefactos de codigo y respaldos
restaurables. No declara respaldado un recurso cuya restauracion no fue
comprobada.

## Inventario

| Recurso | Evidencia | Ubicacion | Restauracion comprobada | Estado |
|---|---|---|---|---|
| Codigo y configuracion | Historial y ramas Git remotas | Repositorio | Checkout y regresiones locales/CI | Protegido por Git; falta retencion externa |
| Esquema APdB aislado | Migraciones, config y seed | `supabase/migrations/`, `supabase/seed.sql` | `supabase db reset --local` en CI aislado | Comprobado solo con datos sintéticos |
| Datos deportivos sintéticos | Seeds y escenarios | `tests/apdb-*` | Campeonatos y recuperaciones aisladas | Comprobado en descartable |
| Base Supabase productiva | No hay dump en el repositorio | Servicio externo | No ejecutada en este bloque | Sin respaldo restaurable verificable |
| Storage documental productivo | Migraciones, politicas y contratos | `supabase/`, `docs/` | No hay export de objetos productivos | Sin copia restaurable comprobada |
| Paquetes cPanel | ZIPs locales ignorados por Git | `private/` | Extraccion y prueba de subcarpeta | Codigo de instalacion, no backup del sitio |
| cPanel y `.htaccess` | Procedimientos y archivo de referencia | `docs/` | No se accedio al hosting en este bloque | Requiere backup del administrador |
| Continuidad | Documentos enlazados abajo | `docs/` | Lectura local comprobada | Versionada |

## Puntos de recuperación

- Las ramas Git son puntos de codigo, no sustituyen un backup externo de base.
- `codex/apdb-2027-operational-hardening` contiene la infraestructura aislada.
- Las pruebas aisladas crean usuarios, datos y bases efimeras; no son respaldos.
- Los ZIP de `private/` no incluyen el `.htaccess` de Directory Privacy ni una
  base de datos.
- Las carpetas `tmp` encontradas fuera del repositorio pertenecen a otros
  trabajos y no se consideran respaldos APdB.

## Procedimientos

### Codigo

Obtener la rama autorizada, confirmar el SHA, ejecutar contratos y conservar
los cambios locales antes de revertir a otro punto de recuperacion.

### Supabase aislado

Usar `tools/start-apdb-isolated-pilot.ps1` o
`.github/workflows/apdb-supabase-isolated.yml`. Puede utilizar
`supabase db reset --local`; la recuperacion comprobada es recreacion desde
fuentes versionadas, no restauracion productiva.

### Supabase productivo

Un administrador debe generar el backup administrado de base y una exportacion
privada del Storage, fuera de GitHub y sin datos expuestos. Ambos deben
restaurarse primero en un proyecto aislado. Este repositorio no contiene
credenciales ni ejecuta esa operacion.

### cPanel

Consultar `docs/paquete-cpanel.md`, `docs/prueba-controlada-dominio-cpanel.md`
y `docs/seguridad-dominio-cpanel.md`. Respaldar la carpeta objetivo y
conservar el `.htaccess` creado por cPanel; revertir desde la copia del
administrador sin tocar la raiz 2026.

## Reglas y pendientes

- No guardar contraseñas, service-role keys, tokens, datos medicos ni dumps
  personales en GitHub.
- No confundir migraciones o `docs/*.sql` con backups de datos.
- No ejecutar scripts `ejecutar-en-supabase-*` sobre producción sin backup,
  revision y ventana autorizada.
- Falta obtener y probar un backup restaurable de Supabase productivo.
- Falta definir exportacion/restauracion privada del bucket documental.
- Falta backup verificable de `public_html`, responsables, retencion y
  frecuencia de restauracion.

## Prueba de restauracion aislada

El 2026-11-12 se ejecutó `tools/postgres-backup-restore.cjs` con dos clusters
PostgreSQL 16 temporales en `127.0.0.1:55432` y `127.0.0.1:55433`. Se creó un
esquema sintético con organizaciones y equipos, se generó un dump custom fuera
del repositorio y se restauró en el segundo cluster. La comparación verificó
catálogo de tablas, columnas, relaciones y conteos de filas.

La evidencia queda fuera de GitHub, en `%TEMP%\apdb-backups-evidence`, con un
manifiesto `.dump.manifest.json` que registra fecha, tamaño, origen, destino y
SHA-256. Resultado: `APDB_POSTGRES_BACKUP_RESTORE_OK`. No es una restauración
de Supabase productivo ni cubre Storage, Auth administrado o cPanel.

Hasta completar esos puntos, la continuidad productiva queda bloqueada aunque
el codigo y la recreacion sintetica esten disponibles.
