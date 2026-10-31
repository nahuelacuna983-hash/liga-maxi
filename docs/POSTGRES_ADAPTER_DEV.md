# Backend PostgreSQL local de Liga Maxi 2027

`demo_2027_postgres_server.js` es un puente HTTP de desarrollo. Mantiene las credenciales PostgreSQL en el proceso del servidor y expone operaciones mínimas del repositorio; el navegador nunca recibe `DATABASE_URL`.

## Ejecución

Con PostgreSQL 16 temporal y el esquema aplicado:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
node demo_2027_postgres_server.js
```

Rutas disponibles: `GET /health`, creación de torneo/categoría/equipo, guardado de fixture, programación, resultado y lectura de categoría.

El circuito web actual continúa usando `SyntheticDataProvider`; esta capa no se anuncia como integración visual hasta completar un test de navegador contra el servidor y PostgreSQL real.
