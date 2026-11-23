# APdB 2027 — entrega operativa mínima (aplicación oficial)

Estado: preparación técnica, **NO autorizado para publicar todavía**.
Destino: URL institucional administrada por APdB. No sustituir la web 2026 ni su Supabase.

## Producto a entregar

La aplicación existente `index_online.html` + `app_online.js`, con el adaptador administrativo, sobre un proyecto Supabase independiente. La Asociación no recibe la demo aislada `demo_circuito_2027.html` como si fuera el producto terminado.

El constructor correspondiente es `tools/build-apdb-staging.cjs`. El ZIP `build-cpanel-private-package.ps1` es deliberadamente sintético/offline y no cumple la entrega operativa solicitada.

## Avances verificados el 23/11/2026

- El constructor genera ahora tanto `index_online.html` como `index.html` **idénticos** para que la subcarpeta institucional abra la aplicación desde su raíz. El contrato se ejecutó exitosamente: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45208216645
- El frontend de staging ya no consulta un ID fallback vacío cuando aún no hay torneo visible; conserva la búsqueda de un torneo persistido con partidos (el staging existente tiene uno sintético con 7 partidos y otro borrador sin partidos).
- Matriz read-only del predicado documental contra staging: Asociación puede ambos equipos, Delegado solo el asignado, identidad sin permisos ninguno. **No** es prueba HTTP/JWT real; ver `docs/APDB_2027_REVISION_STAGING_20261123.md`.
- El bucket `documentos` se encuentra privado y contiene **cero objetos** en staging; hay dos filas sintéticas de `team_documents`, insuficientes para certificar recuperación desde Storage. Requiere carga/descarga segura con archivos de prueba reales y usuarios autenticados.
- Las suites aisladas RLS y Supabase han sido aprobadas en commits previos. **No** validan por sí solas el staging persistente ni habilitan el despliegue institucional.

## Puertas obligatorias antes de publicar

1. **Fuente:** fijar commit aprobado y conservar paquete, manifiesto/hash y un respaldo del código publicado previamente.
2. **Identidad del backend:** usar únicamente el proyecto APdB staging autorizado (`wffvmthdmmjwspnozyrv`), clave *publishable* pública; nunca `service_role`, secretos de servidor o referencias al proyecto productivo de 2026.
3. **Integridad de aislamiento:** comprobar que HTML/JS entregables no contienen endpoint, clave ni ID fallback 2026. Ejecutar `node tests/apdb-staging-build.cjs` y contratos relacionados con Node en checkout aislado.
4. **Migraciones:** consolidar las correspondientes a Auth/RLS/RPC/Storage y aplicar solo con autorización a staging, con usuarios, clubes, planteles y documentos **sintéticos**.
5. **Circuito completo:** probar en navegador, como visitante, delegado autorizado, delegado ajeno/revocado y Asociación: login/logout, torneo y categorías, fixture, resultados, tablas, playoffs, documentación privada, revisión y habilitación, recuperación tras recargar.
6. **Seguridad documental:** comprobar denegación cruzada de lectura/escritura, bucket privado, URLs firmadas, permisos por club y temporada, auditoría de acciones.
7. **Operación:** backup/restauración ensayados en entorno de prueba, responsable técnico, procedimiento de reversión, cuentas administradas por APdB y aceptación institucional.
8. **Publicación:** desplegar primero en subcarpeta/subdominio protegido y verificar en celular y escritorio. Pasar al acceso institucional definitivo solo después de aceptación expresa.

## Comandos de paquete (después de contar con una configuración aprobada)

```powershell
node tools/validate-apdb-staging-config.cjs C:\ruta\apdb-staging-config.local.json
node tests/apdb-staging-build.cjs
node tools/build-apdb-staging.cjs C:\ruta\apdb-staging-config.local.json C:\ruta\salida\apdb-2027-staging
```

El archivo local de configuración debe permanecer fuera de Git y señalar únicamente a staging. El constructor rechaza sobrescrituras de una salida existente. El paquete no constituye una certificación de seguridad: se requiere verificación real de Auth/Storage/RPC.

## Asistencia permitida durante piloto

Puede ser asistida por un operador identificado la configuración inicial, importación supervisada, corrección administrativa autorizada y generación puntual de informes. **No** se aceptan accesos clandestinos, escrituras directas para saltar permisos, eliminación de trazabilidad, exposición de documentos médicos, ni declarar habilitado a quien aún requiere aprobación humana.

## Qué falta para afirmar «listo»

- CI y pruebas del paquete real sobre la rama de entrega.
- Configuración autorizada de staging y circuito de navegador autenticado.
- Evidencia de permisos/Storage, backup restaurable y reversión.
- Dominio/subcarpeta institucional autorizados, responsables y aceptación.

Hasta cumplir estos puntos el entregable es **candidato a piloto**; no una instalación institucional final.
