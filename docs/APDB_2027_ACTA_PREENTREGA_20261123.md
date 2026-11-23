# APdB 2027 — Acta técnica de preentrega institucional
**Fecha:** 23 de noviembre de 2026 · **Ámbito:** rama `codex/apdb-2027-operational-hardening` · **Estado:** **PILOTO CONDICIONADO — NO PUBLICAR DATOS PERSONALES REALES**

## 1. Decisión de entrega
La aplicación oficial **sí tiene un candidato técnico de piloto privado** que puede instalarse, una vez habilitado el acceso al hosting, en `/apdb-2027-prueba/`, sin modificar la web pública existente.

**No** se declara concluido el despliegue institucional ni el tratamiento de documentación personal: faltan aceptación Auth/Storage **HTTP real contra staging persistente**, acceso autorizado a cPanel, respaldo y restauración del hosting, revisión de alertas de seguridad y aceptación de la Asociación.

No confundir **CI verde en Supabase descartable** con **validación del servicio alojado**.

## 2. Artefacto vigente
- **V4:** `APDB_2027_PILOTO_PRIVADO_V4_2026-11-23.zip` — generado desde las fuentes oficiales archivadas por GitHub Actions.
- **SHA-256:** `8bc262ad65999ab43146de909e0fd5b36d61ff9c6aaa9da4f8ad6639ecc504a7`.
- **Fuente:** commit `106a727bfd826091f7dcb6935cab2eed46442c25`.
- 11 archivos: `index.html`, `index_online.html`, `app_online.js`, `apdb-administrative-adapter.js`, `sw.js`, `manifest.json`, iconos 192/512, instrucciones, commit de origen y manifiesto de integridad.
- El ZIP se construyó con `tools/build-apdb-staging.cjs`, con **URL y clave publicable solo de APdB Staging** y ruta `/apdb-2027-prueba/`.
- Confirmado localmente: `node --check` para JS, igualdad de ambas entradas HTML, ausencia de cadenas productivas históricas y claves de acceso heredadas, contenido SHA-256 íntegro.
- V1/V2/V3 quedan **obsoletos**; **no instalarlos**.

## 3. Protección de datos locales — corregida en V4
- La versión institucional ya no guarda simulaciones privadas del planificador ni email de programación en `localStorage` permanente: utiliza `sessionStorage`.
- Cierre de sesión o cambio de identidad: elimina ambas claves de `sessionStorage` y también borra restos heredados de `localStorage`; limpia el email, borrador de mensaje y lista visual de simulaciones.
- Al arrancar el frontend staging también elimina borradores persistentes antiguos.
- Se preserva la caché pública de categorías/partidos, sin datos de auditoría/documentos.
- `sw.js` no intercepta ni almacena documentos en caché.
- La recuperación de un token de Auth antes de un logout es comportamiento esperado de la sesión; hay que utilizar `Cerrar sesión` en equipos compartidos.

## 4. Evidencia automatizada
Todos los siguientes controles aprobaron para el **mismo commit** `106a727bfd826091f7dcb6935cab2eed46442c25`:
- [Contrato del paquete institucional — SUCCESS](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45263200950).
- [RLS local — SUCCESS](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45263200948).
- [Supabase descartable, RPC, Auth/Storage con JWT sintéticos, Chromium y reinicio — SUCCESS](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45263200941).
- [Archivado de fuentes exactas — SUCCESS](https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45263200862).

La suite de navegador incluye el frontend **realmente empaquetado**, Asociación y Delegado, cierre de sesión, recarga, nueva pestaña y borrado de simulaciones/correos privados.

## 5. Staging persistente: comprobado y no comprobado
**Comprobado** (proyecto `wffvmthdmmjwspnozyrv`, solo registros sintéticos):
- Proyecto independiente y activo, bucket `documentos` **privado**.
- Políticas de Storage por organización, temporada, categoría y equipo aplicadas; delegado sin borrado.
- Matriz en PostgreSQL con `authenticated`/`anon` efectivos y claims sintéticos: Asociación ve 2/2 documentos, delegado solo 1/2, usuario sin permiso 0, anónimo 0.
- Los 14 RPC `apdb_*` privilegiados inspeccionados no conceden ejecución anónima. `rls_auto_enable()` no es ejecutable por `anon` o `authenticated`; el disparador `ensure_rls` sigue activo.
- `v_app_user_permissions` no concede `SELECT` a `anon` ni a `authenticated`; la vista documental `v_team_documents_admin` concede `SELECT` solo a `authenticated`.

**No comprobado en staging alojado:** login Auth HTTP con tres cuentas sintéticas, URL firmada y descarga real, revocación después de emitir JWT, carga/lectura de archivo ficticio y navegación en la URL institucional. La última inspección del bucket tenía **cero objetos**.

## 6. Riesgos abiertos
| Punto | Impacto | Decisión |
|---|---|---|
| `security_definer_view` en `v_team_documents_admin` | Riesgo potencial de permisos amplios si cambia el predicado | No convertir ciegamente a invoker; validar políticas de tablas base y accesos cruzados antes de migrar |
| `authenticated_security_definer_function_executable` | RPC privilegiadas dependen de validaciones por rol | Mantener pruebas negativas y revisar cada función antes de revocaciones |
| `rls_enabled_no_policy` | 19 tablas con RLS sin políticas directas pueden estar aisladas adrede | Documentar contrato de acceso vía RPC; no agregar políticas abiertas |
| `auth_leaked_password_protection` | Verificación de contraseñas filtradas desactivada en proyecto | Evaluar habilitación en Auth antes de cuentas personales; verificar costo/capacidad del plan |
| URLs documentales firmadas de 300 segundos | Una URL ya emitida podría seguir accesible hasta vencer, incluso tras revocar un usuario | Controlar tiempo, compartición y revocación; no suponer revocación inmediata de URLs ya firmadas |
| Hosting y DNS/cPanel no conectados | No se puede probar HTTPS, caché del servidor ni restauración | Instalar únicamente con autorización y copia previa, manteniendo la web pública |

## 7. Secuencia exacta de aceptación (sin saltos)
1. **Antes de archivos reales:** confirmar responsables de la Asociación para hosting, Auth y datos; registrar quién conserva código y licencia.
2. Proteger `/apdb-2027-prueba/` con privacidad de directorio y HTTPS; conservar el contenido previo y plan de rollback; no tocar raíz del dominio.
3. Con cuentas sintéticas ya existentes, ejecutar `tests/apdb-staging-http-readonly.cjs` por HTTP; contrastar los 4 perfiles y no registrar JWT/contraseñas en reportes.
4. Cargar **un PDF ficticio** en bucket privado con usuario delegado autorizado; comprobar acceso propio, rechazo de club ajeno y anónimo, URL firmada y resultado tras revocación de permiso. Eliminar archivo de prueba y documentar su borrado.
5. Validar en PC y celular: entrar/salir Asociación y Delegado, plantel, fixture, tabla, documentación sintética, resultados, errores de consola y rutas HTTPS.
6. Ensayar restauración y reversión con la copia del hosting. Si falla cualquiera de los puntos: **NO GO**.
7. Obtener aceptación funcional de APdB. Solo luego planificar migración gradual desde staging a una instancia institucional final, sin importar o alterar 2026 de forma implícita.

## 8. Criterios de decisión
- **APTO PARA PILOTO PRIVADO CONTROLADO**: V4, respaldos preparados, carpeta protegida, únicamente cuentas/documentos sintéticos.
- **NO APTO AÚN PARA DATOS REALES NI DECLARAR PRODUCCIÓN INSTITUCIONAL** hasta completar pasos 1–7 y decidir las advertencias pendientes.
- **No se modificó** la rama productiva `main`, la base 2026 ni el dominio institucional durante esta preparación.

## 9. Fuente de verdad
[Control de entrega institucional #9](https://github.com/nahuelacuna983-hash/liga-maxi/issues/9). Actualizar allí evidencia, hashes, problemas y decisión **GO / NO GO** antes de cualquier cambio del hosting.

*Nota:* este informe refleja el estado técnico verificado; no es una auditoría legal ni sustituye la revisión de seguridad especializada previa a la documentación médica real.
