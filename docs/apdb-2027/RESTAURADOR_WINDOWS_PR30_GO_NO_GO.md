# APdB 2027 — Revisión del ejecutor Windows y evidencia de CI

Fecha de revisión: 2026-11-24. Alcance: PR #30 complementario a PR #29.

## Resultado verificado

El workflow [45496305100](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45496305100) finalizó **SUCCESS** y ejecutó el script real `tools/apdb-supabase-restore-local.ps1` con ambos modos: `preflight` y `restore`, sobre una base **PG17 Supabase sintética, descartable y separada**.

Se comprobó mediante `tests/security/apdb_pg17_restore_verify.sql` que tras el restore estaban presentes la fila sintética esperada, la función, RLS, la política correspondiente, `supabase_vault` y los esquemas `auth` y `storage`. El origen no contenía datos reales.

En esta rama se incorporaron además cuatro **pruebas negativas** al CI, para rechazar: (a) base ya ocupada, (b) nombre protegido, (c) host remoto, (d) archivo no válido. **No marcar estas cuatro como exitosas hasta confirmar la nueva ejecución**.

## Contrato del restaurador

- Ejecutar `preflight` antes de `restore`.
- Cliente `psql` y `pg_restore` v17; backend PostgreSQL 17+; extensión `supabase_vault` disponible.
- Destino `127.0.0.1` / `localhost` / `::1`, base con nombre explícito `apdb_*restore*`, `apdb_*test*` o `apdb_*disposable*`, sin tablas ni vistas de usuario. El destino NO es la base inicializada `postgres` del servicio Supabase; debe ser una base de prueba nueva y aislada dentro de un **servidor Supabase-compatible**.
- La dirección local por sí sola **no demuestra que no haya un túnel o proxy hacia un servidor remoto**. Antes de usar datos reales el operador debe verificar la instancia local por medio externo. No utilizar este procedimiento con reenvío de puertos/SSH a Staging o producción.
- El script nunca elimina ni crea bases ni sobrescribe tablas existentes. `pg_restore` ejecuta en una sola transacción y aborta al primer error. Ninguna restauración debe interpretarse como efectuada antes de ver el éxito del proceso y los resultados del manifiesto.
- Contraseñas locales mediante `PGPASSFILE`, `PGPASSWORD` o prompt seguro; no copiar secretos a GitHub, issue, logs ni chats.
- Se aplica `--no-owner --no-acl`; **no** se restauran ni validan los permisos/ACL de origen, deben probarse por separado.

## GO / NO-GO

**GO sintético** únicamente para el caso probado por CI.

**NO-GO de recuperación integral del backup real de Staging** hasta que:
1. se configure un servidor Supabase PG17 aislado y verificablemente local, sin redireccionamiento remoto;
2. se ejecute el respaldo auténtico en una base descartable nueva;
3. se comparen datos, estructuras, índices, funciones, roles/RLS y políticas contra el origen, con diffs observables;
4. se inventaríen/exporten y validen por separado Auth administrado, secretos de Vault y bytes de Storage según corresponda.

La marca `restoreExecuted=true` solo acredita el fin sin errores del proceso y la presencia de requisitos mínimos; `verificationPending=true` **prohíbe interpretar el manifiesto como recuperación integral aprobada**.

El archivo verdadero permanece en el equipo del operador; no se lo subió ni adjuntó al PR. No se ha ejecutado ningún restore real ni una publicación institucional.
