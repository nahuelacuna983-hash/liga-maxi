# APdB 2027 — Preparación de validación Supabase aislada

## Estado del entorno actual

La rama contiene una fixture PostgreSQL y un gate RLS reproducibles. En la
máquina de preparación están disponibles Node/npm, pero no se detectaron
Supabase CLI, Docker ni `psql`. Por eso no se declara validada la autenticación
JWT, `auth.uid()`, Storage, URLs firmadas ni las RPC productivas.

## Qué se puede validar localmente

- Catálogo de tablas, vistas, RLS, grants y `SECURITY DEFINER`: `tests/apdb-2027-rls-gate.cjs`.
- Denegación efectiva de `anon` y `authenticated` en la fixture: `tests/apdb-rls-negative.sql`.
- Contrato de operaciones del frontend: `tests/apdb-2027-authorization-contract.cjs`.
- Compatibilidad de la fixture y regresiones sintéticas ya existentes.

## Qué requiere Supabase aislado

| Área | Evidencia necesaria |
|---|---|
| Auth | JWT emitido por Auth, `auth.uid()` y membresía vigente |
| Delegados | Resultado permitido para equipo/categoría propia y denegado para otra |
| Revocación | Mismo JWT rechazado después de revocar membresía/asignación |
| Organizaciones | Lecturas y escrituras cruzadas rechazadas |
| Storage | Bucket privado, upload/download y URL firmada por alcance |
| RPC | Ejecución como usuario real y rechazo de argumentos/contextos ajenos |

## Procedimiento seguro recomendado

1. Crear un proyecto o entorno Supabase de prueba expresamente aislado, sin
   importar tablas con PII ni objetos del bucket productivo.
2. Aplicar primero el esquema y las migraciones documentales de referencia,
   registrando versión y orden de ejecución.
3. Crear únicamente usuarios sintéticos y dos organizaciones sintéticas.
4. Ejecutar las lecturas de catálogo y luego la matriz positiva/negativa con
   JWT reales.
5. Probar Storage con archivos sintéticos no médicos y rutas separadas por
   temporada.
6. Conservar logs de códigos HTTP/SQLSTATE sin tokens ni URLs firmadas.
7. Destruir el entorno sólo después de conservar el informe de resultados.

No usar `SUPABASE_URL`, service keys, JWT ni buckets productivos en scripts
locales. La aplicación vigente mantiene escrituras directas sobre partidos,
categorías, programación y playoffs; antes de cerrar sus políticas esas
operaciones deben migrarse o cubrirse con RPC autorizadas en el clon.

## Gate de salida

La seguridad operativa no puede cerrarse hasta obtener evidencia separada para
PostgreSQL/RLS, Auth, Storage y RPC. Un `APDB_RLS_GATE_CATALOG_OK` sólo certifica
el catálogo aislado y no prueba permisos efectivos de usuarios Supabase.
