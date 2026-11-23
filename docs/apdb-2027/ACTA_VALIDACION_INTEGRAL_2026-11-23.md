# APdB 2027 — Acta de validación técnica integrada
**Fecha:** 2026-11-23 (Argentina)
**Alcance:** aplicación oficial `index_online.html` / `app_online.js`, paquete institucional, permisos y circuito deportivo/documental sobre entornos de prueba descartables.
**Resultado:** **APTO COMO CANDIDATO TÉCNICO AISLADO**. **NO AUTORIZADO PARA USO INSTITUCIONAL CON DATOS REALES**.

## Código y evidencia
- Candidato completo: PR #19 — https://github.com/nahuelacuna983-hash/liga-maxi/pull/19
- Suite **APdB document guardrails**: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740050 — **3/3 trabajos SUCCESS**:
  1. `document-guardrails`: controles estáticos administrativos, revisión y habilitación.
  2. `eligibility-auth-http`: Supabase local, migraciones completas, usuarios JWT sintéticos, Storage privado, habilitación y circuito documental en Chromium.
  3. `full-platform-isolated`: Auth/RLS, competición, resultados, playoffs, recuperación de la aplicación en Chromium, reinicio sin reset y persistencia.
- Suite **document RPC contract**: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740020 — **3/3 trabajos SUCCESS**: sintaxis, RPC documentales, aislamiento PostgreSQL sintético y respaldo-restauración de PostgreSQL 16; empaquetado seguro.
- Suite **paquete institucional**: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45274740142 — **SUCCESS**.

## Corrección encontrada y resuelta en pruebas
La primera corrida integrada falló porque el test `tests/apdb-2027-private-storage-isolated.cjs` todavía leía `v_player_documents_admin` directamente, mientras la nueva política de seguridad bloquea esta vista. Se corrigió el test para consumir `apdb_list_player_documents` y `apdb_list_team_documents`, y **verificar expresamente que las vistas legadas rechacen SELECT directo**.
La nueva corrida completa obtuvo SUCCESS en todos los trabajos (links arriba). No se abrió acceso a vistas como solución temporal.

## Verificación sobre staging permanente (SOLO LECTURA)
Proyecto: APdB 2027 Staging, `wffvmthdmmjwspnozyrv`, Postgres 17, plan free.
- Migraciones registradas: 12, con parches de seguridad Storage/trigger anteriores.
- Conteos: 2 torneos, 2 categorías, 8 equipos, 7 partidos, 0 jugadores, 2 documentos de equipo, 0 documentos individuales, 0 objetos privados Storage, 3 usuarios Auth.
- Sin ramas de Supabase disponibles (`list_branches=[]`).
- Fallan las verificaciones de disponibilidad en staging para: tabla de eventos de habilitación, RPC de habilitación, revisión de documentos, nuevas RPC de lectura y vista institucional `security_invoker`.
- Ya existe protección de ejecución para `rls_auto_enable`; la vista `v_team_documents_admin` conserva el hallazgo `security_definer_view` en staging hasta aplicar migraciones aprobadas.
- **No se aplicó ninguna migración ni cambio de datos a staging**.

## Puertas de salida pendientes
1. Preparar **migraciones diferenciales** de Auth/RPC/Storage para staging según su estado actual; nunca ejecutar las migraciones originales de 2027 de manera masiva, porque alguna sustituye políticas Storage ya endurecidas.
2. Obtener y comprobar un respaldo **real** recuperable de esquema/datos/usuarios de staging y bytes de Storage. El ensayo de PostgreSQL sintético no prueba recuperación del staging alojado.
3. Aplicación controlada en staging con control de cambios y rollback; repetir pruebas de HTTP/Chromium con **usuarios y documentos sintéticos**, sin alterar los registros existentes.
4. Consultar Security Advisor tras la aplicación y cerrar la vista privilegiada y cualquier hallazgo crítico. Evaluar funciones SECURITY DEFINER individualmente; no revocar accesos esenciales sin pruebas.
5. Instalar en URL institucional protegida con HTTPS, validar móvil/PC y tener autorización del hosting.
6. Aceptación de APdB: cuentas oficiales, requisitos/vencimientos, autoridad de habilitación, distribución de informes, calendario GES y acto de conformidad.

## Resolución
- **GO**: continuar preparación de implantación y pruebas aisladas sobre PR #19.
- **NO-GO**: desplegar, mergear a `main`, operar datos reales o certificar institucionalmente hasta cerrar las seis puertas.
- Producción 2026 no se tocó.
