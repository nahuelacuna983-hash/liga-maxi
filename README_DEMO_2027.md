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
