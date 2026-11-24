# APdB 2027 — Paquete de recepción y entrega a cPanel

**Alcance:** preparación y auditoría sin despliegue. El candidato se entrega en carpeta institucional privada y no incluye dump, credenciales `service_role`, datos de jugadores ni configuración gestionada de Auth.

## Evidencia del frente de entrega

- PR #35: [puerta de preentrega](https://github.com/nahuelacuna983-hash/liga-maxi/pull/35).
- Validación `tools/apdb-delivery-readiness.cjs`: separa «se puede planificar» de «se puede publicar» y exige pruebas CI del mismo SHA.
- Herramienta `tools/apdb-package-receipt.cjs`: verifica la carpeta de nueve archivos con `tools/verify-apdb-release.cjs`, genera un `APDB-RELEASE-RECEIPT.json` con hashes individuales y una constancia legible para APdB, fuera de la carpeta pública.
- Pruebas sintéticas: `tests/apdb-package-receipt.cjs` rechaza integridad alterada, directorio de recibos dentro del paquete, reuso de destino y SHA inválido.

## Preparación del operador (únicamente después de tener el paquete oficial autorizado)

1. Obtener un **build** de nueve archivos, realizado en carpeta NUEVA con el constructor existente `tools/build-apdb-staging.cjs`, la subruta `/apdb-2027-prueba/`, el URL de Staging autorizado y su clave **publishable**. Nunca usar `service_role`, `sb_secret_`, el backup real ni una clave sintética en una entrega real.
2. Antes de copiar a hosting, ejecutar `node tools/verify-apdb-release.cjs <carpeta-paquete>`. Debe responder `APDB_RELEASE_PACKAGE_VERIFIED files=8` (ocho archivos listados en manifiesto, más el manifiesto de integridad).
3. Ejecutar `node tools/apdb-package-receipt.cjs <carpeta-paquete> <carpeta-nueva-de-acta-privada> <sha40-de-la-version>`. El segundo directorio **no debe existir previamente ni estar dentro del paquete**. Se generan `APDB-RELEASE-RECEIPT.json` y `APDB-CONSTANCIA-ENTREGA.md`. Este acto **no publica nada**.
4. Al instalar en cPanel con autorización expresa, colocar los archivos solo bajo la subruta de piloto protegida. Comprobar HTTPS, permisos, autenticación (incluidos recursos estáticos), cabeceras privadas, rutas y hash de los ocho archivos y el manifiesto. Conservar copia y hash de la versión anterior fuera de `public_html`.
5. Ejecutar el chequeo HTTP anónimo contra la URL autorizada (401/403 esperados en piloto protegido). Después, con identidades de prueba, comprobar visual y funcionalmente Público, Delegados y Asociación en móvil/escritorio, documentación privada y series deportivas.
6. Si algún control falla, no abrir el piloto: restaurar la carpeta anterior, su configuración de acceso y verificar los hashes previos. No modificar el torneo 2026.
7. La apertura de la visualización pública sin autenticación exige **decisión separada** de APdB; el piloto protegido no debe convertirse en acceso público por accidente.

## Acta de recepción — casilleros

- Versión exacta SHA:
- Ruta institucional aprobada:
- Fingerprint del recibo privado:
- Fecha y responsable de copia previa:
- Responsable que verificó HTTPS y protección:
- Resultado de prueba de los tres roles:
- Resultado recuperación/autorización Auth/Storage:
- Responsable de revertir y ubicación de backup cPanel:
- Aprobación expresa de APdB para publicar: **PENDIENTE**

## Limitaciones

El recibo certifica bytes preparados localmente, no que esos bytes estén servidos por cPanel. Ningún test en JavaScript desactivado prueba el circuito Auth/Storage en producción. La recuperación de datos auténticos corresponde al frente separado [issue #34](https://github.com/nahuelacuna983-hash/liga-maxi/issues/34); no mezclar operaciones ni resultados. `GO` del CI es únicamente para preparación de entrega.
