# Demo visual Liga Maxi 2027

Esta rama contiene una demostración local aislada. Usa `style.css` del proyecto y lógica deportiva sintética; no carga `app_online.js`, Supabase, Storage ni service workers.

## Ejecutar

Desde esta carpeta:

```powershell
python -m http.server 4173
```

Abrir `http://127.0.0.1:4173/demo_2027.html`. Cerrar el servidor con `Ctrl+C`.

## Prueba Playwright

Requiere `@playwright/test` disponible en el entorno. Con el servidor activo:

```powershell
npx playwright test tests/demo-2027.spec.cjs
```

La prueba comprueba carga, fixture, tabla, resultados y ausencia de solicitudes fuera del servidor local. La prueba no se declara ejecutada hasta disponer de Playwright y del servidor.

Prueba de reglas sin navegador:

```powershell
node tests/demo-2027-sports.cjs
```

Equivalencia contra las funciones originales, sin crear cliente Supabase:

```powershell
node tests/equivalence-app-sports.cjs
```

## Reutilización de lógica real

La aplicación existente concentra `calcularTabla(partidos)`, `calcularMiniTablaOlimpica`, `ganadorPartidoPlayoff` y `ganadorSeriePlayoff` en `app_online.js`, pero ese archivo inicializa el cliente Supabase al cargarse. La demo no lo importa para evitar conexiones accidentales. `demo_2027_sports.js` es un módulo compatible y auditable para esta etapa; la integración siguiente debe extraer las funciones puras reales desde `app_online.js` o convertirlas en módulos compartidos, sin duplicar reglas.
