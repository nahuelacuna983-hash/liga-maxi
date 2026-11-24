# APdB 2027 — Carpeta de entrega y decisión de publicación

Fecha: 24/11/2026. Rama candidata: `codex/apdb-2027-integrated-release-review` — PR #33.
**Este documento no autoriza desplegar ni modificar proyectos.**

## 1. Qué se entrega

**Aplicación oficial** para la ruta de prueba institucional `/apdb-2027-prueba/`:

- Página inicial, aplicación `index_online.html` / `app_online.js` y adaptador administrativo existente.
- Accesos visuales a Público, Delegados y Asociación.
- Constructor `tools/build-apdb-staging.cjs`, verificador `tools/verify-apdb-release.cjs`, manifiesto `release-integrity.json` con tamaño y SHA-256 de ocho archivos.
- Prueba HTTP subruta, prueba Chromium desktop y móvil, suite deportiva/documental sintética y ensayo offline de reversión.
- Restaurador de copias descartables `tools/apdb-supabase-restore-local.ps1` (herramienta **administrativa interna**, **NO** parte de los archivos públicos de cPanel).

**No se entrega** código de migraciones, dump real, `.env`, credenciales privadas, lista de jugadores real ni material administrativo en el directorio público. El paquete final está cerrado a los archivos enumerados por el verificador.

## 2. Evidencia técnica y límites

- PR #33, prueba de `APdB 2027 packs C-D release gates`: comprobar su conclusión **SUCCESS en ese mismo SHA**.
- `APdB 2027 PG17 Supabase recovery compatibility`: probar el script en base descartable, no el backup auténtico.
- `APdB staging differential isolated rehearsal`: ensayar cambios SQL únicamente contra ambiente sintético. El job PG17 duplicado fue eliminado de este workflow porque el workflow dedicado PG17 ya lo valida; se evitó un conflicto por puerto Docker `54324`.
- `APdB document guardrails`: validar controles sintéticos de documentación y permisos.
- **Todos** los workflows del SHA candidato deben estar verdes antes de aprobar la integración.
- El test institucional Chromium muestra controles con JavaScript desactivado: **no equivale** a autenticación real ni lectura/carga real de Storage.

## 3. Decisión de dos etapas

### GO — preparación de entrega

Se puede presentar a la Asociación el funcionamiento previamente conocido y el plan de validación. También preparar una versión candidata y un paquete privado de documentación, **sin anunciar que la instalación institucional está funcionando**.

### NO-GO — habilitar la URL o darla por operativa

Quedan requisitos fuera del alcance sintético:

1. **Recuperación real comprobada.** El dump `apdb-2027-staging.dump` está en PC del operador; debe restaurarse en un Supabase PG17 realmente aislado y verificarse su contenido y permisos. La preparación de CI sintético no es restauración real.
2. **Auth y Storage gestionados.** Verificar usuarios, políticas efectivas, configuración, inventario/bytes de documentos y accesos autorizados sin exposición pública. Requiere inventarios/exportaciones separadas y autorizadas.
3. **Prueba del alojamiento institucional.** Confirmar el control de acceso al piloto, HTTPS, rutas HTTP, cabeceras de caché, permisos de archivos, subruta, rollback y DNS/cPanel autorizado. La verificación offline no prueba hosting real.
4. **Aceptación con usuarios aprobados.** Asociación: creación/gestión dentro de alcance; Delegado: acceso solo a equipos asignados; Público: visualización sin mensajes técnicos ni acceso a datos privados. Usar identidades de prueba autorizadas, nunca datos personales en capturas.
5. **Autorización expresa del responsable** antes de cambiar hosting, DNS, Staging o producción.

## 4. Operatoria propuesta para instalación futura (NO ejecutar todavía)

1. Registrar el SHA aprobado del candidato y resultado de todos los CI; generar el build institucional **con la publishable key del proyecto Staging autorizado**, nunca con una clave `service_role` ni con la clave sintética del test. Mantener los parámetros privados fuera del repo.
2. Construir paquete en **directorio nuevo**, verificar `release-integrity.json` y registrar el SHA del archivo comprimido que se enviará al operador. El paquete incluye solo los nueve archivos públicos esperados (ocho archivos + manifiesto).
3. En alojamiento institucional, confirmar que `/apdb-2027-prueba/` está protegido antes de servir recursos; preservar copia completa de la carpeta anterior, si existe; preparar recuperación inmediata con hashes y permisos.
4. Subir a un directorio temporal **no público** o protegido, verificar integridad, luego activar mediante mecanismo autorizado sin cambiar la raíz del sitio ni el sistema 2026.
5. Ejecutar chequeo HTTP anónimo pasivo `tools/check-apdb-hosted-pilot.cjs`, que exige 401/403 del piloto y assets protegidos. Una respuesta 404 no es aprobación del paquete; redirecciones deben revisarse manualmente.
6. Recién entonces hacer prueba autenticada de Público/Delegado/Asociación con identidades sintéticas y revisar documentación y logs. Si falla cualquier prueba, retirar el piloto o restaurar la carpeta anterior; comprobar nuevamente hashes y que 2026 siga intacto.

**Nota:** El gate anónimo asume piloto protegido (no acceso público). Si el objetivo final es acceso Público sin autenticación, eso debe habilitarse mediante una etapa distinta y una decisión formal de publicación, preservando los límites de seguridad para los roles privados.

## 5. Mensaje de estado apto para la Asociación

> Estamos preparando una versión institucional de la plataforma que la Asociación ya conoce, con los módulos deportivos y administrativos integrados. La entrega se realizará en la dirección institucional de prueba cuando se completen la verificación de los accesos y documentación, la recuperación de respaldo y el control de seguridad. La instalación no está publicada todavía.

## 6. Material reservado (no adjuntar a la entrega pública)

- Backup original, contraseñas y manifiesto de su recuperación real.
- Exportaciones de Auth, claves, secretos y documentos privados de Storage.
- Scripts SQL, información de pruebas de seguridad, rutas locales del operador.
- Credenciales de cPanel, credenciales de la base de datos y enlaces privados de documentos.

## 7. Firma de aceptación (pendiente)

| Control | Responsable | Evidencia | Resultado |
|---|---|---|---|
| CI del SHA integrado | Equipo técnico | URLs de Actions | Pendiente de cierre |
| Backup real restaurado en aislado | Operador autorizado | Informe privado de recuperación | Pendiente |
| Auth/Storage y roles | Asociación y equipo técnico | Pruebas privadas | Pendiente |
| Hosting y rollback | Administrador cPanel autorizado | Verificación HTTP y acta | Pendiente |
| Publicación | Responsable APdB | Aprobación expresa | No autorizada |

No fusionar en `main` ni activar la URL por la mera aprobación de pruebas sintéticas.
