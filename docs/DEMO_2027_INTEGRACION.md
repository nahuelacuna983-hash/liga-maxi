# Demo Liga Maxi 2027 — integración progresiva

## Correspondencia visual

La aplicación original organiza la experiencia pública en `Público`, `Fecha`, `Delegados` y `Asociación`. La demo integrada conserva ese recorrido mediante vistas sintéticas y mantiene los estilos base de `style.css` en lugar de introducir un sistema visual paralelo.

La correspondencia estructural se verifica con `tests/demo-structure.cjs`: los cuatro tabs originales existen en `index_online.html`, las cuatro vistas equivalentes existen en la demo y la demo no contiene URLs remotas.

En Asociación, la aplicación original separa Inicio, Competencia, Documentación, Torneos, Programación y Administración. La demo implementa por ahora el subconjunto seguro de Competencia/Programación: categoría, equipos sintéticos, fixture, fechas bloqueadas y playoffs en memoria.

## Separación de arquitectura

- `demo_2027_sports.js`: reglas puras de tabla, desempate, resultados y series.
- `demo_2027_fixture.js`: generación y fechas del fixture.
- `demo_2027_provider.js`: estado sintético y validaciones de operaciones.
- `demo_circuito_2027.js`: presentación y eventos del circuito.
- `index_online.html` y `app_online.js`: referencia funcional y visual, no modificados por la demo.

No se inicializa Supabase, no se ejecutan RPC y no se realizan escrituras remotas. El selector de delegado es una simulación de flujo, no un control de seguridad.

## Prueba en Windows

```powershell
cd C:\liga-maxi-2027-demo
node tests/demo-playoffs.cjs
node tests/demo-tournaments.cjs
node tests/demo-circuit.cjs
node tests/demo-circuit-ui.cjs
node tests/demo-provider.cjs
node tests/demo-fixture.cjs
node tests/planner-equivalence.cjs
node tests/equivalence-app-sports.cjs
npx --yes http-server . -p 4173 -a 127.0.0.1
```

Abrir `http://127.0.0.1:4173/demo_circuito_2027.html`. En Asociación generar fixture y preparar playoffs; luego cargar resultados, avanzar rondas y verificar el campeón en Público.

## Pendientes

Playwright no está instalado en este entorno y no se declara una prueba automatizada Playwright como ejecutada; la prueba de navegador disponible sigue siendo manual en Edge. La integración con Supabase/Auth/RLS requiere una base aislada posterior. Las funciones documentales y administrativas de la aplicación original permanecen fuera de esta demo deportiva.
