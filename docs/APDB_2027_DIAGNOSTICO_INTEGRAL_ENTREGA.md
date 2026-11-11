# APdB 2027 — Diagnóstico integral para puesta en funcionamiento

**Base revisada:** `8995d7e` en `codex/apdb-2027-operational-hardening`  
**Alcance:** diagnóstico, sin cambios funcionales ni despliegue.

## 1. Resumen ejecutivo

Existe un producto operativo vigente sobre `index_online.html` + `app_online.js`
con Supabase y una segunda implementación persistente PostgreSQL/Node para
desarrollo y certificación aislada. El motor deportivo 2027 está ampliamente
probado con datos sintéticos; la documentación persistente también tiene una
certificación real PostgreSQL 16 + Chromium (`POSTGRES_DOCUMENTATION_E2E_OK`).

El bloqueo para entregar APdB 2027 no es el fixture deportivo: es la falta de
una validación equivalente de Auth, RLS/RPC efectivos y Storage privado sobre
la aplicación oficial, además de la definición operativa de datos, roles,
backups y reglas pendientes. La ruta más corta es conservar Supabase como
backend oficial, aislar un entorno de prueba fiel y adaptar sólo las
escrituras sensibles que hoy son directas.

## 2. Estado real por módulo

| Módulo | Estado | Evidencia | Trabajo pendiente | Prioridad |
|---|---|---|---|---|
| Torneos/categorías | Implementado en app vigente; persistente sintético probado | `app_online.js`, contratos demo, `demo-platform` | Validar creación 2027 con rol Asociación en Supabase aislado | Alta |
| Equipos/planteles | Implementado; altas y planteles sintéticos probados | `app_online.js`, documentación de permisos | Verificar pertenencia y revocación por organización | Alta |
| Fixture | Implementado y probado en motor 2027 | `demo_2027_sports.js`, pruebas Top 4/6/8 | Regresión contra RLS/RPC oficial | Alta |
| Programación | Implementada; persistencia PostgreSQL probada | `match_schedules`, contratos y pruebas PostgreSQL | Autorizar por rol/contexto en Supabase | Alta |
| Resultados/tablas | Implementados; desempates y tablas probados sintéticamente | `app_online.js`, motor deportivo, pruebas demo | Cerrar escrituras directas y probar concurrencia oficial | Alta |
| Playoffs/campeón | Top 4/6/8 persistentes probados en PostgreSQL sintético | pruebas `postgres-top*.spec.cjs` | Validar RPC/RLS y regla de cruces APdB | Alta |
| Usuarios/delegados | Modelo y login documentados; desarrollo persistente probado | `docs/permisos-y-roles.md`, `tests/postgres-auth*` | Supabase Auth real, membresías y revocaciones | Alta |
| Documentación | Flujo persistente sintético certificado | `POSTGRES_DOCUMENTATION_E2E_OK`, `docs/APDB_2027_PERSISTENCIA_CONTINUIDAD.md` | Storage privado, Auth/RLS/RPC real y retención | Alta |
| Habilitación/LDBF | Estados y separación conceptual implementados | módulo documental y pruebas de estados | Confirmar regla oficial y generar informe institucional | Alta |
| Informes/exportaciones | Exportaciones y vistas existentes en app | `app_online.js`, contratos documentales | Validar formato operativo para árbitros y Asociación | Media |
| Público | Consultas deportivas existentes | `index_online.html`, rutas institucionales | Regresión de enlaces y separación de datos 2026/2027 | Alta |
| Persistencia/recuperación | PostgreSQL sintético certificado por módulos | `tests/postgres-*`, recuperación documental | Backup/restore y continuidad en backend oficial | Alta |
| Seguridad efectiva | Gate RLS aislado y negativos locales preparados | `tests/apdb-2027-rls-gate.cjs`, fixture | Clon Supabase con JWT, Storage y RPC reales | Crítica |
| Separación de temporadas/orgs. | Contratos y controles existen en desarrollo | docs y repositorio PostgreSQL | Evidencia real en Supabase sin afectar 2026 | Crítica |

## 3. Funcionalidades listas para mostrar

- Torneos, categorías, equipos, fixture, resultados, tablas y playoffs en el
  circuito sintético 2027.
- Top 4, Top 6 y Top 8 con campeón y recuperación en PostgreSQL aislado según
  las ejecuciones documentadas.
- Flujo documental sintético de Asociación y delegado, con requisitos,
  revisión, estados incompleto/completo e historial append-only.
- Aplicación institucional privada estática y demo Femenino, siempre como
  demostración y no como backend oficial.

No debe presentarse como listo para producción el acceso a documentos reales,
la autorización institucional ni la sustitución de GES.

## 4. Incompletas o bloqueadas

1. **Seguridad de usuarios:** el catálogo RLS no reemplaza JWT, `auth.uid()` ni
   pruebas de usuarios reales.
2. **Storage:** falta demostrar bucket privado, carga, descarga y URLs firmadas
   por organización/equipo/temporada.
3. **RPC:** varias funciones y escrituras históricas conceden alcance amplio a
   `anon`/`authenticated`; no deben cerrarse sin adaptar el consumidor.
4. **Datos oficiales 2027:** no hay torneo oficial ni altas autorizadas.
5. **Operación:** falta respaldo restaurable, monitoreo, responsables y
   procedimiento de reversión aprobado.
6. **Reglamento:** el modo de cruces de playoffs debe ser confirmado por APdB
   antes de oficializar nuevas llaves.

## 5. Bloqueos críticos

| Bloqueo | Tipo | Criterio de resolución |
|---|---|---|
| No existe clon Supabase fiel | Infraestructura/prueba | Proyecto local o staging con Auth, Storage, RPC y migraciones ordenadas |
| Escrituras directas sensibles | Seguridad/integridad | RPC/RLS con actor, organización, torneo y alcance comprobados |
| Documentos privados | Seguridad/legal | Bucket privado, retención, backup y prueba de denegación cruzada |
| Datos/reglas oficiales | Decisión APdB | Temporada, categorías, equipos, requisitos y formato de playoffs aprobados |
| Continuidad | Operación | Backup/restore probado y responsables definidos |

La falta de decisiones o infraestructura sí bloquea el lanzamiento; una mejora
visual o una automatización futura no lo bloquea.

## 6. Alcance mínimo de lanzamiento

Para iniciar oficialmente se necesita: temporada 2027 aislada de 2026,
categorías/equipos autorizados, login institucional, roles Asociación/delegado,
fixture y programación, resultados con autorización y auditoría, tablas
públicas, documentación privada con estado separado de habilitación, backup y
procedimiento de reversión.

Postergable: automatización OCR, analítica avanzada, multi-organizador general,
mejoras PWA y automatizaciones comerciales, siempre que no sean necesarias para
documentos o informes obligatorios.

## 7. Plan priorizado

| Tarea | Componentes | Dependencia | Criterio verificable | Horas estimadas |
|---|---|---|---|---:|
| Consolidar staging Supabase | `supabase/`, SQL documentales, Auth/Storage | Acceso/decisión de APdB | Instancia reproducible sin PII | 8–16 |
| Matriz JWT y organizaciones | RLS, RPC, `tests/` | staging | Permitido/denegado/revocado comprobado | 12–24 |
| Cerrar escrituras sensibles | `app_online.js`, RPC/migraciones | matriz anterior | Resultados, fixture, programación y playoffs autorizados | 16–32 |
| Storage documental seguro | SQL Storage, cliente | Auth + staging | Upload/download cruzado denegado | 8–16 |
| Preparar datos 2027 | torneos/categorías/equipos | decisiones oficiales | Seed revisado y reversible | 6–12 |
| Informes y aceptación | app, exportaciones, Playwright | datos y permisos | Recorrido institucional completo | 8–16 |
| Backup/restore y operación | scripts/procedimientos | staging | Restauración ensayada y checklist | 6–12 |

Rango total: **58–128 horas**, con incertidumbre dominada por el acceso y la
compatibilidad real de Supabase. Codex puede realizar código, fixtures,
pruebas y documentación; APdB debe aportar decisiones, usuarios de prueba y
aceptación; cualquier acceso a servicios externos requiere autorización.

## 8. Escenarios de entrega

### Cinco días

Sólo razonable para un piloto técnico muy acotado: staging ya disponible,
decisiones cerradas, sin documentos reales y con una matriz mínima de resultados.
No alcanza para afirmar reemplazo seguro de GES.

### Diez días

Posible para un piloto privado si se entrega rápidamente staging/Auth/Storage,
se reutilizan RPC existentes y se limita el alcance a una categoría. Requiere
dedicación diaria y aceptación rápida.

### Quince a veintiún días

Es el escenario razonable para una primera versión operativa acotada: permite
validar seguridad, datos 2027, documentación privada, recuperación e informes,
sin incluir automatizaciones futuras.

## 9. Riesgos y dependencias

- Cambiar RLS sin adaptar `app_online.js` puede interrumpir la operación actual.
- El hosting estático de cPanel no ejecuta por sí solo el backend PostgreSQL.
- Documentos médicos requieren controles legales, retención y acceso mínimo.
- La coexistencia 2026/2027 necesita filtros y backups comprobados.
- Las credenciales de servicio nunca deben llegar al navegador.
- El login sintético de desarrollo no es autenticación institucional.

## 10. Decisiones necesarias de APdB

1. Categorías, equipos, calendario y fecha de inicio 2027.
2. Roles, responsables y procedimiento de revocación.
3. Requisitos documentales, vencimientos y autoridad de aprobación.
4. Regla oficial de cruces de playoffs.
5. Política de publicación pública y de informes de árbitros.
6. Retención, backup y responsables de documentación.
7. Entorno de staging y ventana para el piloto.

## 11. Próximas acciones recomendadas

1. No tocar producción 2026.
2. Obtener un entorno Supabase aislado o staging aprobado.
3. Consolidar migraciones y seeds sintéticos.
4. Ejecutar la matriz JWT/RLS/Storage/RPC.
5. Corregir las escrituras sensibles en el clon.
6. Preparar una categoría piloto y recorrerla con usuarios ficticios.
7. Sólo después, definir ventana y procedimiento de carga oficial.

## Conclusión

El núcleo deportivo y el circuito documental sintético están suficientemente
avanzados para una demostración técnica y para acelerar un piloto. La entrega
oficial no está bloqueada por el motor de fixture, sino por autorización real,
Storage, datos/reglas APdB y operación de continuidad. La recomendación única es
mantener Supabase como backend oficial y usar PostgreSQL/Node como laboratorio,
evitando una migración completa antes de validar esos controles.
