# Liga Maxi 2027 — circuito sintético

## Estado

La demo mantiene una única instancia de `SyntheticDataProvider` durante la sesión y permite recorrer:

`Asociación -> Fixture -> Delegados -> Resultado -> Tabla -> Público`.

Los resultados y playoffs son exclusivamente de memoria. El selector de delegado es una simulación de flujo y no representa autenticación, Auth ni RLS.

## Comprobaciones realizadas

- Generación de fixture por categoría y aislamiento entre `maxi-a` y `maxi-b`.
- Carga de resultados sólo mediante el equipo asignado al delegado.
- Rechazo de partidos ajenos, categorías cerradas y empates normales.
- Anulación y recálculo de tabla.
- Playoffs sintéticos Top 4, Top 6 y Top 8.
- Top 6 conserva la definición `global`, tal como está expresada en la lógica original; Top 4/Top 8 conservan el modo de serie configurado.
- Equivalencia de tabla, desempate olímpico y ganadores de playoffs contra funciones extraídas de `app_online.js`.
- Prueba visual real en Edge del circuito integrado, con actualización visible de resultado y tabla.

## Limitaciones

La demo todavía no implementa el avance automático de ganadores entre rondas ni una simulación completa de series de varios partidos. Esas reglas dependen de la configuración de cada categoría y deben extraerse antes de presentarlas como comportamiento final. Playwright no está instalado en este entorno; la validación de navegador disponible fue manual en Edge.

## Reproducción

Desde `C:\liga-maxi-2027-demo`:

```powershell
node tests/demo-circuit.cjs
node tests/demo-playoffs.cjs
node tests/demo-circuit-ui.cjs
node tests/demo-provider.cjs
node tests/demo-fixture.cjs
node tests/planner-equivalence.cjs
node tests/equivalence-app-sports.cjs
```

Para la revisión visual, iniciar un servidor local y abrir `demo_circuito_2027.html`. No se requieren credenciales ni conexión remota.
