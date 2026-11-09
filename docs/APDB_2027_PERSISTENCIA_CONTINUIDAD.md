# APdB 2027 - Continuidad de persistencia

## Estado implementado

- El proveedor PostgreSQL ya conserva torneos, categorías, equipos, jugadores, documentos, historial, fixture, resultados y playoffs.
- La API incorpora requisitos documentales, presentación por delegado y revisión por Asociación.
- La pantalla persistente expone configuración de requisitos, presentación delegada, revisión de Asociación y el conteo de documentos e historial recuperados desde la API.
- La presentación exige membresía, asignación vigente, categoría, equipo y requisito configurado.
- Un documento aprobado no puede ser sobrescrito por el delegado.
- El historial documental es append-only.
- Documentación completa no habilita automáticamente la competencia deportiva.

## Pruebas

Prueba PostgreSQL/HTTP:

```powershell
node tests/postgres-documentation-integration.cjs
```

Certificación ejecutada en Windows sobre la base aislada `apdb_2027_certificacion_2`: Chromium 1/1 aprobado, duración 6,1 segundos, resultado `POSTGRES_DOCUMENTATION_E2E_OK`, commit certificado `859595791dba64cde97c0e49f1ae84780da409c8`.

La certificación cubre exclusivamente el circuito documental persistente sintético. No extiende su alcance a producción, Supabase, cPanel, almacenamiento de documentos reales, ni a otros módulos no incluidos en esa ejecución.

Prueba Chromium persistente:

```powershell
$env:POSTGRES_UI_BASE_URL = "http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres&api=http://127.0.0.1:8787"
$env:DOC_PLAYER_ID = "<UUID del jugador sintético>"
$env:DOC_TEAM_ID = "<UUID del equipo sintético>"
$env:DOC_CATEGORY_ID = "<UUID de la categoría sintética>"
$env:DOC_REQUIREMENT = "Apto físico"
npx playwright test tests/postgres-documentation-browser.spec.cjs
```

La prueba requiere un servidor autenticado conectado a PostgreSQL 16 y un fixture sintético preparado. La ejecución certificada se realizó sobre la base aislada indicada arriba.

Comando único de validación completa, incluida recreación del servidor y recuperación:

```powershell
$env:DATABASE_URL = "postgresql://<usuario>:<contraseña>@127.0.0.1:5432/<base-descartable>"
node tests/postgres-documentation-e2e.cjs
```

El comando falla explícitamente si falta `DATABASE_URL`, si Chromium no está instalado o si una etapa es omitida; no usa `test.skip` para convertir una ausencia de infraestructura en aprobación.

Pruebas locales sin PostgreSQL:

```powershell
node tests/demo-documentation-flow.cjs
node tests/demo-documentation-statuses.cjs
node tests/demo-platform.cjs
node tests/demo-isolation.cjs
```

## cPanel

El ZIP estático de `demo-femenino` no contiene servidor ni credenciales y no puede ejecutar la API PostgreSQL. La demo aislada sirve para visualizar el circuito sintético. La versión persistente requiere ejecutar el backend HTTP en un entorno autorizado, restringido y con PostgreSQL aislado; no alcanza con subir HTML/JavaScript a cPanel.

## Pendientes para un piloto

- Repetir la certificación en CI si se necesita evidencia automatizada compartida; no es requisito para afirmar el resultado local ya obtenido.
- Definir almacenamiento privado y retención de evidencias antes de usar documentación real.
- Confirmar requisitos y reglas oficiales de APdB.
