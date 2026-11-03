# APdB 2027 - Misión XXXL 03

## Estado consolidado

Rama: `codex/demo-2027-visual`

SHA final: `3f563497001e470cf3f2e7d110958749bd5dc6af`

No se modificaron `main`, producción 2026, Supabase, PR #2 ni workflows protegidos.

## Capacidades implementadas

### Plataforma y Asociación

- Temporadas vinculadas por UUID a una organización.
- Ciclo de vida de categoría: `draft`, `officialized`, `closed`.
- Bloqueo persistente de incorporación de equipos y fixtures después de oficializar/cerrar.
- Administración de usuarios, membresías y asignaciones mediante endpoints autenticados.
- Panel persistente con temporadas, estado de categoría, usuarios, membresías y alcances de delegados.
- Consultas administrativas con aislamiento organizacional.

### Delegados

- Alcances por organización, categoría y equipo.
- Resultados autorizados mediante transacción PostgreSQL.
- Revocación de membresía/asignación y rechazo de operaciones fuera de alcance.
- No se habilitaron operaciones de fixtures, playoffs o administración para delegados.

### Portal público

- Endpoints separados para organizaciones, torneos, competencia y playoffs.
- Competencia pública sin credenciales.
- Sin exposición de documentos, usuarios, membresías ni historial administrativo.

### Documentación sintética

- Registro persistente de jugadores ficticios.
- Requisitos documentales y evidencia sintética.
- Estados `pending`, `submitted`, `observed`, `approved` y `rejected`.
- Historial append-only de revisiones y actor.
- Las revisiones no convierten automáticamente un documento en habilitación deportiva.
- No se incorporaron archivos médicos ni datos personales reales.

## Evidencia funcional

- `tests/postgres-platform-integration.cjs` ejercita consulta pública, temporada, jugador, revisión documental, historial, oficialización y bloqueo estructural.
- `tests/postgres-auth-isolation-integration.cjs` conserva aislamiento multi-organizador, revocaciones y permisos.
- El circuito deportivo persistente y los recorridos Top 4/6/8 permanecen en la rama.

## Pruebas ejecutadas

Superadas localmente:

- 24 pruebas sintéticas Node.
- `AUTH_CONTRACT_OK`.
- `AUTH_SERVER_CONTRACT_OK`.
- `POSTGRES_SERVER_CONTRACT_OK`.
- `DEMO_PLAYOFF_FORMATS_OK`.
- Sintaxis de repositorio, servidor, cliente, circuito persistente y prueba de plataforma.
- `git diff --check`.

Pendientes de ejecución real:

- PostgreSQL 16 de plataforma/documentación.
- Chromium autenticado del panel administrativo.
- Recuperación física del backend con el nuevo módulo documental.
- Regresiones Top 4, Top 6 y Top 8 posteriores a la extensión de esquema.
- Validación de dos asociaciones completas desde navegador.

El entorno local no dispone de PostgreSQL ni Chromium operativo para esta batería; no se declaran esas pruebas como superadas.

## Inventario resumido de la aplicación existente

- Público, fecha, fixture, tablas, resultados y playoffs: implementados y validados previamente en modo sintético y persistente.
- Asociación: estructura original y circuito persistente disponibles; administración documental ahora tiene contrato PostgreSQL sintético.
- Delegados: proveedor sintético y autorización PostgreSQL disponibles; falta la validación Chromium autenticada del panel documental/administrativo.
- Documentación histórica 2026: permanece en la aplicación original y no fue migrada ni modificada.
- Auditoría médica/institucional real, Storage/Drive y decisiones humanas históricas: fuera del entorno sintético y bloqueadas para lanzamiento.

## Bloqueos para lanzamiento institucional

1. Autenticación real de usuarios y recuperación de cuenta; el login actual es exclusivamente sintético.
2. Revisión de RLS/RPC y Storage en un proyecto APdB aislado, sin tocar producción.
3. Migración controlada de documentación histórica y definición de retención/evidencia.
4. Política institucional para estados documentales, habilitación y reaperturas.
5. Backups, monitoreo, dominio, TLS, gestión de secretos y procedimiento de rollback.
6. Prueba de aceptación con dos asociaciones, organizadores y delegados en PostgreSQL 16/Chromium.

## Versión mínima operativa propuesta

Un piloto privado debería habilitar inicialmente: organizaciones, temporadas, torneos, categorías, equipos, fixture, programación, resultados, tablas, playoffs, usuarios/membresías, carga documental sintética o controlada y portal público. La documentación médica real debe permanecer deshabilitada hasta validar Auth, RLS, Storage, auditoría y respaldo.

## Estimación fundamentada

- Integración CI de la nueva prueba PostgreSQL y Chromium: un bloque corto de trabajo técnico.
- Preparación de Auth/RLS/Storage institucional: bloque separado de seguridad y revisión.
- Migración documental histórica y capacitación: trabajo funcional/institucional, no inferible sólo desde este repositorio.

No se presenta una fecha de lanzamiento: faltan validaciones externas y decisiones institucionales.
