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

Requiere `DATABASE_URL` apuntando a una base PostgreSQL 16 temporal. La prueba crea datos sintéticos, comprueba presentación autorizada, rechaza otro delegado, aprueba como Asociación y verifica dos eventos de historial.

Prueba Chromium persistente:

```powershell
$env:POSTGRES_UI_BASE_URL = "http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres&api=http://127.0.0.1:8787"
$env:DOC_PLAYER_ID = "<UUID del jugador sintético>"
$env:DOC_TEAM_ID = "<UUID del equipo sintético>"
$env:DOC_REQUIREMENT = "Apto físico"
npx playwright test tests/postgres-documentation-browser.spec.cjs
```

Requiere un servidor autenticado conectado a PostgreSQL 16 y un fixture sintético preparado. No se declara aprobada en esta ejecución porque el entorno local no expone `DATABASE_URL` ni `psql`.

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

- Ejecutar `tests/postgres-documentation-integration.cjs` en CI con PostgreSQL 16.
- Ejecutar la prueba HTTP y Chromium contra PostgreSQL 16 en CI o en una base local descartable.
- Definir almacenamiento privado y retención de evidencias antes de usar documentación real.
- Confirmar requisitos y reglas oficiales de APdB.
