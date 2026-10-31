# Backend PostgreSQL local de Liga Maxi 2027

`demo_2027_postgres_server.js` es un puente HTTP de desarrollo. Mantiene las credenciales PostgreSQL en el proceso del servidor y expone operaciones mínimas del repositorio; el navegador nunca recibe `DATABASE_URL`.

## Ejecución

Con PostgreSQL 16 temporal y el esquema aplicado:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
node demo_2027_postgres_server.js
```

Abrí `demo_persistencia_2027.html` en el mismo servidor estático de desarrollo para usar el cliente visual. Rutas disponibles: `GET /health`, creación de torneo/categoría/equipo, guardado de fixture, programación, resultado y lectura de categoría.

El circuito web deportivo principal continúa usando `SyntheticDataProvider`; la pantalla persistente es un cliente de desarrollo separado hasta completar un test de navegador contra el servidor y PostgreSQL real. El servidor no implementa autenticación real: `actorId` es sólo trazabilidad sintética y no debe exponerse fuera de localhost.
