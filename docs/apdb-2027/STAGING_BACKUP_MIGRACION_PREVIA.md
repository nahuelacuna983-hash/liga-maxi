# APdB 2027 — Puerta de respaldo y migración segura de staging
Control del 23/11/2026. **NO ejecutar sobre producción 2026.** Este procedimiento no equivale a una copia ya realizada.

## 1. Estado observado sin escrituras
- Proyecto aprobado de pruebas persistentes: `wffvmthdmmjwspnozyrv` / `db.wffvmthdmmjwspnozyrv.supabase.co`, PostgreSQL 17, plan Free.
- 12 migraciones registradas; la última endurece permisos sobre `rls_auto_enable`.
- Inventario: 2 torneos, 2 categorías, 8 equipos, 7 partidos, 0 jugadores, 2 documentos institucionales, 0 documentos de jugadores, 3 cuentas Auth.
- Storage privado `documentos`: 0 objetos. Los **2** registros existentes de `team_documents` contienen `storage_path` sin archivo correspondiente; tratar como **incidencia de integridad**, no como documento recuperable ni como pérdida real confirmada.
- No existe una rama de Supabase utilizable como destino de restauración. Aún figuran sin instalar los RPC finales de habilitación, revisión documental y lectura segura.

## 2. Reglas de respaldo
- No utilizar el endpoint, IDs ni credenciales de producción 2026.
- Sin exportación verificable de las bases y resguardo de Auth/Storage, el cambio en staging permanece BLOQUEADO.
- El plan Free no debe darse por cubierto por respaldos automáticos; Supabase recomienda exportaciones manuales con CLI. Un dump de PostgreSQL **NO** contiene bytes de Storage (solo sus metadatos).
- No subir dump con usuarios, documentos, hashes o tokens a GitHub, tickets, Actions, Drive público ni a esta conversación.
- Mantener los archivos en ubicación cifrada bajo custodia del operador autorizado; establecer fecha, hash, formato, alcance, versión Postgres y responsable.
- Respaldo de esquema/datos/usuarios Auth requiere permisos de lectura adecuados. El conector actual no entrega un respaldo descargable/restaurable ni sustituye esa operación.

## 3. Secuencia exacta propuesta
1. Exportar **por canal privado** y con acceso autorizado la base de staging, incluyendo esquemas `public`, `auth`, `storage` y `supabase_migrations` cuando la cuenta disponga de permisos. Herramienta `pg_dump` compatible con PostgreSQL 17; formato custom. Si faltan permisos, **detener**: no declarar copia completa.
2. Inventariar y descargar, usando API Storage autorizada, **todos** los bytes de objetos privados si existieran; comprobar hashes y cantidad de objetos. El bucket está vacío actualmente, pero volver a medir en el momento exacto del backup.
3. Comprobar y resguardar por canal seguro la configuración del despliegue y el material de recuperación de Auth necesario. No copiar ni versionar llaves service_role.
4. Registrar huella SHA-256 y manifest de los respaldos; comprobar que el dump pasa `pg_restore --list`, no solo que existe.
5. Restaurar el respaldo en **otro** entorno desechable autorizado, compatible con PostgreSQL 17 y extensiones de Supabase. No sobreescribir el staging original; verificar tablas, permisos, cuentas sintéticas, lectura privada y diferencias esperadas.
6. Reconciliar las migraciones `20261123000000`, `20261124000000` y `20261125000000` del circuito final con las 12 migraciones presentes. **No aplicar `20261124000000` sin rediseñar sus políticas Storage**, ya que la instancia alojada tiene controles por ruta/equipo posteriores.
7. Aplicar migración diferencial segura y el parche de lectura documental de PR #19 **primero en un clon descartable equivalente al estado actual de staging**. Pruebas negativas de organización cruzada, delegación revocada, Auth HTTP, Storage, Chromium, rollback.
8. Solo luego, con autorización de cambios de staging y respaldo comprobado, aplicar paquete atómico a staging y ejecutar el mismo CI/HTTP. Repetir Security Advisor y verificar que `security_definer_view` ya no aparezca.
9. Al final, construir y probar el paquete institucional protegido en su URL autorizada.

## 4. Puertas de aceptación automatizadas disponibles
- CI de aislamiento, deportes, documentos, Auth/Storage, Chromium y reinicio de la **instancia descartable**: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740050 (SUCCESS 3/3).
- SQL de inventario alojado, solo lectura: `tests/security/apdb_staging_release_gate_readonly.sql`.
- Paquete para staging: PR #19.

## 5. Criterios de parada
- No hay dump real verificable, o no puede restaurarse sin pérdida.
- La ruta documental existe en DB pero su objeto privado no está presente sin justificación documentada.
- Fallan denegaciones por equipo/organización o la vista vieja sigue expuesta.
- Persisten alertas críticas sin revisión.
- No existe autorización de acceso a hosting o aceptación institucional.

**Estado: NO-GO de modificación de staging**, hasta cerrar estas condiciones.
Referencias Supabase: https://supabase.com/docs/guides/platform/backups y https://supabase.com/docs/reference/cli/supabase-db-dump .
