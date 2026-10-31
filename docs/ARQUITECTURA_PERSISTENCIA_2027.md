# Arquitectura de persistencia 2027

## Capas

- `demo_2027_provider.js`: reglas y modo sintético en memoria.
- `demo_2027_postgres_repository.js`: transacciones PostgreSQL, restricciones relacionales, historial y bloqueo de filas para resultados.
- `demo_2027_postgres_server.js`: único proceso que conoce `DATABASE_URL`; sirve la pantalla persistente local y traduce HTTP a operaciones del repositorio.
- `demo_2027_http_client.js`: cliente de navegador sin credenciales de base.
- `demo_persistencia_2027.html`: primera pantalla persistente aislada. No reemplaza todavía el circuito sintético principal.

## Validado

- PostgreSQL 16 real para repositorio y backend HTTP: ejecución #3 de GitHub Actions, según el estado informado del proyecto.
- Rollback de fixture duplicado.
- Resultado duplicado rechazado.
- Reprogramación posterior a resultado rechazada.
- Recuperación tras cierre y reinicio del servidor HTTP.
- Historial de fixture, programación y resultado.
- Separación de categorías por claves foráneas y consultas.

## Límites actuales

El backend de desarrollo todavía recibe `actorId` en el cuerpo HTTP. Es trazabilidad sintética, no autenticación. No existe aún sesión, identidad derivada, autorización multi-organizador ni RLS para este nuevo esquema. El servidor debe permanecer ligado a `127.0.0.1` y no exponerse externamente.

La pantalla persistente aún no calcula la tabla ni playoffs desde PostgreSQL; el motor deportivo probado continúa en el proveedor sintético. El siguiente bloque debe agregar una lectura de competencia y un adaptador de tablas, además de una identidad de desarrollo no falsificable por el navegador.

## Arranque local

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
node demo_2027_postgres_server.js
```

Abrir `http://127.0.0.1:8787/`. Las credenciales no se envían al navegador.
