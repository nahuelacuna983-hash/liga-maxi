# APdB 2027 — Primera barrera de seguridad (rama aislada)

**Producto objetivo:** `index_online.html` + `app_online.js` sobre Supabase. No se crea una segunda aplicación.

## Controles preparados

- `docs/apdb-2027-seguridad-gate-readonly.sql`: inspección **de solo lectura** de RLS, grants para `anon`/`authenticated`, políticas, funciones `SECURITY DEFINER`, vistas administrativas y bucket `documentos`. No lee contenido médico ni información personal.
- `tests/apdb-2027-rls-gate.cjs`: prueba de metadatos contra una **base aislada** con `DATABASE_URL` y `APDB_ISOLATED_DATABASE=YES`. Falla cuando encuentra grants anónimos de escritura, RLS deshabilitada, vistas administrativas legibles por `anon` o funciones `SECURITY DEFINER` ejecutables por `anon`. Este gate es deliberadamente conservador: un GRANT amplio o EXECUTE no demuestran explotabilidad por sí solos; exigen revisión de políticas y código.

## Secuencia segura de ejecución (NO producción)

1. Clonar esquema y políticas necesarias en un proyecto Supabase o PostgreSQL de prueba, sin copiar documentos médicos ni credenciales. Verificar que existan los roles `anon` y `authenticated`. Registrar cómo se construyó el clon.
2. Ejecutar el archivo SQL con **usuario de lectura**. Revisar hallazgos por tabla y función.
3. Ejecutar el gate Node en ese clon; **no** configurarlo con la cadena de conexión de Supabase productivo.
4. Corregir problemas en migraciones revisables de la rama aislada, nunca con cambios directos en producción.
5. Agregar y ejecutar regresiones de perfiles **anónimo / delegado autorizado / delegado de otro equipo / Asociación**. Comprobar lectura pública deportiva, carga de resultados y documentos, revisiones y revocaciones.
6. Repetir el gate y las pruebas funcionales. Para considerar apta una migración se requiere un respaldo restaurable, verificación de reversión y autorización expresa antes de desplegar.

El gate de catálogos **no reemplaza** las pruebas de autorización con JWT y permisos reales. Tampoco comprueba que los RPC `SECURITY DEFINER` hagan validaciones correctas.

## Decisiones de implementación

- Preservar la fuente única de verdad en Supabase durante APdB 2027; dejar Node/PostgreSQL independiente como laboratorio certificado, no como backend oficial.
- Mantener públicas sólo consultas deportivas apropiadas. No publicar archivos médicos ni vistas administrativas.
- Antes de restringir `partidos`, `categorias`, `playoff_matches`, `match_schedules` o Storage, comprobar qué operaciones vigentes del frontend dependen del permiso actual. Cerrar privilegios sin ese contrato podría interrumpir la carga de resultados.
- No crear torneos 2027 ni asignaciones reales hasta autorizar el procedimiento y verificar cómo separar el histórico 2026.

## Bloqueos que este primer entregable NO resuelve

1. Clon aislado de esquema real con políticas vigentes y prueba de restore.
2. Matriz funcional de autorizaciones sobre la aplicación actual.
3. Corrección comprobada de políticas RLS y RPC.
4. Inicio de sesión y controles de roles desde equipos/categorías reales.
5. Storage privado, reglas de habilitación y generación efectiva de LDBF.
6. Informes de árbitros operativos con programación confirmada.
7. Torneo APdB 2027 oficial y despliegue autorizado.

**No declarar listo para producción a partir de esta prueba.**
