# APdB 2027 - Continuidad de persistencia

## Estado implementado

- El proveedor PostgreSQL ya conserva torneos, categorías, equipos, jugadores, documentos, historial, fixture, resultados y playoffs.
- La API incorpora requisitos documentales, presentación por delegado y revisión por Asociación.
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
- Conectar la vista persistente de Delegados al endpoint de presentación, manteniendo el login y Bearer existentes.
- Definir almacenamiento privado y retención de evidencias antes de usar documentación real.
- Confirmar requisitos y reglas oficiales de APdB.
