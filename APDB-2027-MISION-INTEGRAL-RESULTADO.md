# APdB 2027 - Resultado de la misión integral

Fecha: 2026-11-22  
Rama: `codex/apdb-2027-operational-hardening`

## Versión integrada

La aplicación oficial `index_online.html` / `app_online.js` ahora incorpora en Asociación una sección de **Alta administrativa 2027** dentro del panel existente de Torneos.

El flujo:

1. Solicita torneo, temporada, categoría y equipos sintéticos.
2. Comprueba sesión Asociación y permiso efectivo `can_manage_tournaments`.
3. Invoca exclusivamente `apdb_ensure_tournament_category_teams`.
4. Recupera la información persistida y actualiza los selectores existentes.
5. Deja el resultado listo para publicación del fixture mediante las RPC deportivas ya existentes.

No se añadió una aplicación paralela ni se modificó el motor de fixture, resultados, tablas o playoffs.

## Archivos modificados

- `index_online.html`
- `app_online.js`
- `apdb-administrative-adapter.js`
- `supabase/migrations/20261122000000_apdb_administrative_onboarding_rpc.sql`
- `tools/build-apdb-staging.cjs`
- `tests/app-online-administrative-onboarding-contract.cjs`
- `tests/apdb-administrative-adapter-contract.cjs`
- `tests/apdb-administrative-onboarding.cjs`

## Seguridad de la integración

- La UI no escribe directamente en `torneos`, `categorias`, `equipos` ni `app_user_permissions`.
- La migración deriva la identidad desde `auth.uid()`.
- La organización se obtiene desde `app_users` y sus permisos efectivos.
- Asociación requiere `can_manage_tournaments`; asignación/revocación requiere `can_manage_users`.
- Delegados, usuarios ajenos y usuarios revocados no pueden administrar.
- La asignación exige usuario Delegado activo y relaciones torneo/categoría/equipo de la misma organización.
- Las RPC usan `SECURITY DEFINER`, `search_path` restringido y `EXECUTE` sólo para `authenticated`.
- Se agregaron bloqueos transaccionales para evitar duplicados bajo concurrencia.

## Pruebas reales ejecutadas

Aprobadas:

- `APDB_APP_ADMINISTRATIVE_ONBOARDING_CONTRACT_OK`
- `APDB_ADMINISTRATIVE_ADAPTER_CONTRACT_OK`
- `APDB_ADMIN_ONBOARDING_LOCAL_OK`
- `DEMO_PERSISTENCE_RESTART_OK`
- `DEMO_TOURNAMENTS_OK`
- `APDB_APP_ONLINE_SECURE_RESULT_CONTRACT_OK`
- `APDB_APP_ONLINE_PUBLIC_PLAYOFFS_CONTRACT_OK`
- Chromium `tests/demo-circuit-browser.spec.cjs`: **3/3**
  - Asociación hasta campeón sin solicitudes remotas.
  - Legibilidad móvil del campeón.
  - Inscripción y auditoría documental sintética.
- `node --check app_online.js`
- `node --check apdb-administrative-adapter.js`
- `git diff --check`

La prueba Chromium valida la aplicación sintética existente y las regresiones deportivas; no constituye una sesión Supabase Auth real.

## CI y staging

El workflow PostgreSQL 16 existente ya contiene la etapa administrativa `Run administrative onboarding RPC integration` en el commit previo `e3eb827`. No se modificó Supabase staging ni se ejecutaron migraciones remotas durante esta misión.

La certificación aislada de PostgreSQL/RPC disponible en CI sigue siendo la evidencia previa del commit `99a7f814042ea37933e3cdc8ecad06455cfdf811`; los cambios de UI y esta integración administrativa requieren una nueva ejecución CI para certificar su combinación.

No se pudo generar un paquete web funcional conectado a staging porque la clave pública staging no está disponible en variables locales. El constructor `tools/build-apdb-staging.cjs` la exige y rechaza valores ficticios. Esto evita publicar accidentalmente una configuración incompleta o productiva.

## Paquete de publicación

El constructor está actualizado para incluir `apdb-administrative-adapter.js`. El paquete funcional podrá generarse con:

```powershell
node tools/build-apdb-staging.cjs C:\ruta\apdb-staging-config.local.json C:\ruta\salida\apdb-2027-staging
```

La configuración debe permanecer fuera de Git y contener únicamente la URL `https://wffvmthdmmjwspnozyrv.supabase.co` y su clave pública `sb_publishable_...`. No se creó un ZIP engañosamente funcional ni se publicó nada en cPanel.

## Bloqueos concretos

1. Ejecutar la nueva etapa CI contra PostgreSQL 16 para este HEAD.
2. Ejecutar una prueba Auth/HTTP real con usuarios sintéticos.
3. Obtener localmente la clave pública staging para construir el paquete privado.
4. Validar el circuito completo desde navegador conectado a staging: alta, fixture, resultados, tablas, playoffs, logout, recarga y nuevo ingreso.

## Decisiones humanas mínimas

- Proporcionar la clave pública staging mediante un archivo local fuera de Git o variable segura.
- Autorizar la ejecución CI y, separadamente, cualquier escritura de datos sintéticos en staging.
- Definir los usuarios/alcances oficiales del piloto.
- Autorizar la publicación privada en cPanel cuando Auth/RLS/Storage hayan sido certificados.

## Conclusión

Existe una versión funcional integrada localmente sobre la aplicación oficial, con alta administrativa segura preparada y regresiones deportivas aprobadas. El circuito completo persistente con Supabase staging no puede declararse operativo todavía porque requiere una ejecución Auth/HTTP real y la configuración pública staging para empaquetar y abrir la versión privada.
