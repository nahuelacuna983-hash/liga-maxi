# APdB 2027 — Cierre en dos vueltas (operativo, no es una nueva demo)

**Fecha:** 24/11/2026. **Candidato inicial:** PR [#33](https://github.com/nahuelacuna983-hash/liga-maxi/pull/33), commit `b3fcf823d24ce65423bc3bff5c1e9067f0d5e38b`.

## Estado real comprobado

Los cuatro workflows del mismo commit finalizaron SUCCESS:
- Paquete institucional #45502845427.
- Supabase PG17 + PowerShell (solo sintético) #45502845701.
- Diferencial aislado #45502845314.
- Documentación y seguridad #45502845406.

**GO para planificar y presentar un paquete técnico. NO-GO para publicar ni declarar un backup real restaurado.** La prueba de la portada desktop/móvil usa JavaScript deshabilitado; no sustituye sesiones Auth reales.

## Lo que falta, sin duplicaciones

| Puerta | Evidencia mínima para cerrar | Responsable | Se puede completar ahora sin acceso real |
|---|---|---|---|
| A. Integridad y recuperación del backup auténtico | SHA/catálogo del archivo real, restore sin error en Supabase PG17 local aislado, tabla de diferencias de estructura/filas/RLS/RPC | Codex prepara, operador autorizado ejecuta | Herramientas y prueba sintética sí; restore real no |
| B. Auth/Storage y permisos efectivos | Inventario Auth/Storage, bytes/hash cuando existan, permisos por rol, reportes privados y recuperación comprobada | Codex prepara, operador y APdB validan | Contratos sintéticos sí; certificación real no |
| C. Construcción del paquete definitivo | Carpeta de nueve archivos con manifiesto SHA-256, publishable key correcta de Staging, prueba de subruta, rollback offline | Frente ChatGPT + responsable de build | Generador/ensayos sí; artefacto con configuración autorizada aún no |
| D. Alojamiento cPanel de prueba | Ruta `/apdb-2027-prueba/` protegida, HTTPS, control HTTP 401/403, permisos, caché, backup anterior, comprobación de hashes servidos | Responsable cPanel con apoyo del frente ChatGPT | Guía y pruebas offline sí; verificación hospedada no |
| E. Aceptación funcional y visual | Público móvil/escritorio, Asociación y Delegados autorizados; fixtures, Bo3/campeones, documentación, fallos sin filtración, derechos por equipo | APdB / operador | Escenarios sintéticos sí; prueba real no |
| F. Liberación y reversión | Acta firmada, publicación autorizada, captura de estado anterior, tiempo/criterios de retorno a versión anterior, monitoreo inicial | APdB / hosting | Acta y plan sí; publicación no |

### Regla de entrega

No pedirle al operador repetir pruebas que ya pasaron. **No inventar** respaldo de objetos Storage a partir del conteo histórico `storage.objects=0`, ni asumir que restaurar `pg_dump` repone ACL, Auth administrado o documentos físicos.

## Vuelta 1 — ejecución paralela

**Codex, [issue #34](https://github.com/nahuelacuna983-hash/liga-maxi/issues/34):** dejar listo el flujo de recuperación real y sus pruebas de rechazo, el inventario de Auth/Storage y el informe de diferencias. Todo probado con datos sintéticos. No tocar cPanel ni front-end.

**ChatGPT, frente de entrega:** preparación de acta, guión de uso por rol, verificador de aceptación offline `tools/apdb-delivery-readiness.cjs`, CI de validación y checklist de cPanel reversible. No tocar restaurador.

Al cerrar esta vuelta, integrar ambas ramas a un nuevo candidato, verificar **un único SHA final** y ejecutar nuevamente los cuatro workflows sin modificar Staging/producción.

## Vuelta 2 — solo si hace falta

Resolver incompatibilidades concretas encontradas en el candidato y preparar un **único paquete de operador** para la intervención real: un proceso de recuperación sobre Supabase PG17 descartable, y otro de instalación cPanel protegida **solo cuando se autoricen expresamente**.

Si el ensayo auténtico no puede realizarse por falta de entorno Supabase compatible, acceso Auth/Storage o responsable de hosting, no dar un falso GO; cerrar la implementación y dejar declaradas esas dependencias externas antes de fijar fecha de entrega.

## Uso del gate offline

`node tools/apdb-delivery-readiness.cjs <ruta-a-evidencia.json>`

Se requiere `format: apdb-handoff-evidence-v1`, `candidate_sha` y dos objetos: `ci` (cuatro estados) y `real` (seis estados). Valores permitidos `pass`, `pending`, `fail`. CI `pass` exige URL GitHub Actions del mismo SHA. Estado real `pass` exige referencia de acta o evidencia **privada**, no clave, usuario, contraseña o datos personales. El script no hace conexiones ni publica: produce `planning` y `publication` por separado. La evidencia es declarativa, **no** una certificación criptográfica de resultados remotos; corresponde al auditor comprobar los enlaces.

## Condiciones de no publicación

Falta de cualquiera de las seis puertas reales, errores de RLS, discrepancias de restauración, fallas de Auth o Storage, falta de HTTPS/protección o rollback, ausencia de autorización APdB => **NO-GO publicación**.

Ninguna rama debe fusionarse a `main`, desplegarse ni conectarse a producción en esta fase.
