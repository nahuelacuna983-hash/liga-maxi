# APdB 2027 — Resultado de migración diferencial para staging
Fecha: 2026-11-23 (hora Argentina) · **Preparación técnica; NO desplegada**

## Se realizó
- Comparación en modo **solo lectura** del proyecto Supabase staging `wffvmthdmmjwspnozyrv` (12 migraciones, última `20261123163609`) contra el candidato de PR #22.
- El SQL original `20261124000000_apdb_private_storage_scope.sql` fue **excluido completamente** del diferencial porque sustituía las políticas de Storage alojadas.
- Tres funciones documentales que llamaban `apdb_storage_path_allowed(...,'upload')` se adaptaron a `apdb_storage_team_path_allowed(...,'create')`.
- En las tres se añadió la comprobación del ID de equipo en el segmento 4 de la ruta, para impedir asociar el archivo de un equipo autorizado a un documento de otro equipo.
- Se reutilizaron las migraciones de eventos de habilitación, el circuito documental y las RPC seguras de lectura, manteniendo las vistas fuera del acceso directo de roles API.
- Se agregaron validaciones *fail closed* de versión de migración, esquema, helper actual, cuatro políticas Storage y RLS.

## Evidencia técnica actual
1. **Preflight hospedado exclusivamente SELECT:** 10/10 condiciones PASS. Archivo `tests/security/apdb_staging_differential_gate_readonly.sql`. No se modificaron datos ni políticas.
2. **Contrato de fuente:** PASS en GitHub Actions.
3. **Ensayo de ejecución en Supabase Docker descartable:** PASS. CI crea una base sintética con las cuatro migraciones base, instala la función y políticas Storage vigentes de staging, aplica el diferencial y verifica SHA lógico (MD5) de políticas antes/después.
4. **Inmutabilidad Storage en la simulación:** hash de las cuatro políticas alojadas idéntico antes y después, y RPC/eventos nuevos presentes. Run: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45297741205.

## Archivo final de prueba
`staging-candidate/apdb-2027-staging-differential.sql` — ensamblado solo para el staging verificado, NO incorporarlo a la secuencia estándar de migraciones del proyecto como sustitución universal.

## Lo que esta evidencia NO demuestra
- La instancia descartable replica funciones/políticas relevantes, **no es una restauración byte a byte de staging**. Queda pendiente el ensayo sobre el respaldo real restaurado de Codex.
- No existe prueba de reversión integral en el staging alojado ni respaldo realmente recuperado aún.
- Quedan 2 referencias a documentos institucionales que no tienen objeto Storage; no se modificaron.
- El Advisor alojado todavía informa `security_definer_view` antes del parche; no se certifica como corregido hasta volver a consultar después de aplicar en staging con autorización.
- No se aplicó ninguna migración ni se tocaron registros en staging alojado o producción 2026.

## Próximo movimiento (solo cuando Codex finalice A)
1. Restaurar el respaldo staging en un clon autorizado separado y comprobar los hashes/inventarios.
2. Re-ejecutar el preflight exacto sobre ese clon; si todo PASS, aplicar **este SQL** en clon y ejecutar tests Auth/Storage/documentales/negativos.
3. Acordar ventana breve de cambio y aprobar reversión desde el backup (no revertir funciones en caliente sin coordinación).
4. Aplicar al staging hospedado únicamente después de lo anterior y de autorización explícita; validar Advisor y circuitos.
5. Paquete PR #22 y host APdB existente se utilizan después de esta validación, sin desarrollo adicional ni migración desde GES.

**Decisión:** SQL diferencial técnicamente ensayado y controles de compatibilidad 10/10; **GO para clon fiel**, **NO-GO para staging hospedado hasta respaldarlo y restaurarlo en un clon**.
