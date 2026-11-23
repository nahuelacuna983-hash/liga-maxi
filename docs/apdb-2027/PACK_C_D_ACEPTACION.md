# Packs C y D — Puertas de aceptación sin despliegue
**Fecha:** 2026-11-23 · **Estado:** preparación de validación, no se ejecutaron escrituras sobre staging ni hosting.

## C — Staging operativo (preparación)
**Depende de A+B:** backup real con restauración y migración diferencial aprobada; hasta entonces el staging permanente es SOLO LECTURA.

### Control previo obligatorio
1. Registrar los IDs del commit exacto del PR #19 y de la migración diferencial aprobada por el responsable de A/B.
2. Ejecutar `tests/security/apdb_staging_release_gate_readonly.sql` y `tests/security/apdb_staging_storage_integrity_readonly.sql` **solo SELECT**. Conservar conteos sin datos personales.
3. Verificar la anomalía de dos rutas documentales institucionales sin objetos privados; no modificar esos registros sin clasificación y respaldo.
4. Reconsultar Security Advisor antes de la migración. Debe cerrarse el error `security_definer_view` tras aplicar el cambio, sin abrir `SELECT` de las vistas antiguas.
5. No crear usuarios de prueba ni documentos hasta contar con el respaldo y autorización de staging.

### Matriz de aceptación después de A+B y autorización de escritura
| Actor | Prueba permitida | Prueba negativa |
|---|---|---|
| Visitante/anónimo | Fixture/tabla pública | Sin lectura de rutas médicas, RFC privadas ni subida Storage |
| Delegado A | Equipo autorizado: jugadores, nuevos archivos, resultados | No puede leer o modificar equipo B ni sobrescribir evidencia previa |
| Delegado B | Equipo B autorizado | No accede al equipo A aunque conozca IDs y rutas |
| Delegado revocado | Inicio de sesión según Auth | Denegación efectiva de RPC, Storage y modificación aun con sesión vigente |
| Asociación A | Revisión, corrección, suspensión y publicación solo en A | Sin administración ni lectura privada de organización B |
| Asociación B | Sus propios equipos | Sin acceso a A |
| Público | Tabla/fixture/llaves e informe público | Sin datos personales o certificados |
Aprobar solo si los tests HTTP REST/Auth, Storage privado, URLs firmadas, navegador Chromium, sesión/reinicio y persistencia dan PASS sobre **staging hospedado** con datos sintéticos, sin afectar registros anteriores.

### Evidencia exigida
- SQL preflight / postflight, contador de migraciones, Security Advisor antes/después.
- Resultados de pruebas por rol incluyendo 403/42501 esperados, no solo casos positivos.
- Capturas funcionales con información **sintética**, sin certificados ni datos personales reales.
- Manifiesto de restauración del Pack A y reversión del Pack B.
**NO-GO** si cualquier prueba cruza la organización, si el Advisor conserva el hallazgo crítico o si hay pérdida de datos.

## D — Publicación institucional (preparación)
El paquete institucional es `index_online.html` + `app_online.js` oficiales y adaptador administrativo. No generar demo alternativa.

### Generación sin acceso al hosting
- Constructor existente `node tools/build-apdb-staging.cjs <config-local> <carpeta-salida>`. La configuración con URL staging y publishable key se guarda **fuera de Git**. No usar `service_role`.
- El constructor ahora genera `release-integrity.json` con hashes SHA-256 de los siete archivos originales. Verificar con `node tools/verify-apdb-release.cjs <carpeta-salida>`.
- Rechazar rutas `/`, `../`, archivos alterados o intentos de sobreescribir un paquete existente.
- Exigir que no existan endpoint, clave pública o torneo fallback de producción 2026; esa sanitización no equivale a autorización de acceso.
- Mantener el manifiesto con el mismo `publicBasePath`. Rutas relativas de JS/CSS/Service Worker no deben salir de esa subcarpeta.

### Requisitos de hosting: NO afirmar que son automáticos
1. URL HTTPS aislada en subdominio/subdirectorio APdB, habilitada por administrador de hosting.
2. **Protección de acceso en servidor** (contraseña HTTP/SSO, VPN o lista de acceso); `robots.txt` o `noindex` por sí solos NO protegen documentos.
3. Cabeceras `Cache-Control: no-store` para respuestas de autenticación y documentos privados, restringir caché de `index_online.html`; no confundir el SW vacío con caché persistente.
4. Privilegios mínimos para desplegar y hacer rollback. Nunca poner credenciales de Supabase o hosting en el repositorio.
5. Antes de publicar: copiar a almacenamiento seguro el paquete anterior (archivos + hashes), subir a una ruta nueva, validar hashes descargados.
6. Probar sesión, cambio de usuario, cierre, URL privada, móvil y PC; comprobar que el hosting no liste carpetas ni exponga archivos de configuración.
7. Rollback de archivos: restaurar paquete previamente validado desde almacenamiento seguro, conservar datos y revisar que el frontend antiguo sea compatible con las RPC; si no, detener y escalar (el rollback de código NO revierte la base).

### NO-GO institucional
Mientras staging no pase el Pack C o no haya autorización del dominio/hosting, ninguna publicación. Sin URL protegida verificada y aprobación APdB, el Pack D permanece abierto.

## Paquete de traspaso desde A/B
Para que C/D continúen se necesitan de Codex: SHA de migración diferencial, hashes del backup recuperable, prueba de restauración, estados de Storage y rutas huérfanas, plan de rollback probado y matriz de permisos de Auth/RPC/Storage. No pedir ni recibir secretos.

## Evidencias aisladas previas, no equivalen a cierre hospedado
- PR #19 de la aplicación completa, CI descartable https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740050
- Matriz documental + PostgreSQL 16/restauración sintética: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740020
- Constructor original: `tests/apdb-staging-build.cjs`
