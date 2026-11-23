# APdB 2027 — Acta de corte final del desarrollo técnico
Fecha: 2026-11-23 (Argentina)

## Alcance cerrado del paquete de código
- Se integraron las contribuciones de PR #21 (A/B: contratos para backup/restore y preflight de migración) y PR #20 (C/D: empaquetado, integridad SHA-256, ensayo HTTP, control de acceso anónimo y rollback offline) sin sustituir el circuito oficial del PR #19.
- Rama única de integración: `codex/apdb-2027-final-integrated-candidate`, PR #22.
- La integración es una **foto técnica** y NO modifica `main`, producción 2026, staging permanente ni el hosting de APdB.
- Los checks de paquetes y controles estáticos deben verificarse en el SHA exacto antes de declarar estado aprobado. La suite de Auth/Storage/Chromium tiene ejecución específica de este PR.

## El resultado al que se puede dar cierre
**Preparación e integración del código:** un único candidato y un único PR, con evidencias de CI adjuntas al PR #22.
Esto no debe confundirse con entrega institucional.

## No se puede declarar cerrado
1. **Pack A operativo:** falta exportación real verificable y restauración de staging alojado. Las dos rutas documentales que no tienen objeto en Storage requieren clasificación y tratamiento documentado.
2. **Pack B de implantación:** falta migración diferencial validada contra un clon fiel de staging, con pruebas de rollback. No instalar ciegamente las migraciones originales que podrían reemplazar políticas de Storage endurecidas.
3. **Pack C alojado:** sin autorización para aplicar cambios al staging permanente no es posible completar HTTP/Auth/Storage/Chromium en ese entorno.
4. **Pack D real:** sin URL de hosting autorizada y protección de acceso en el servidor no se puede verificar publicación institucional ni rollback alojado.
5. **Pack E:** requiere aceptación por APdB y política de habilitación humana.

## Política de cierre definitiva
- No producir nuevos paquetes de planificación o subdivisiones para aparentar avance.
- No declarar porcentajes inventados, ni cerrar issues de implantación como si fuera una entrega.
- Tratar el repositorio como **candidato técnico**, con NO-GO institucional hasta completar el respaldo real y la instalación autorizada.
- Al retomar implantación, hacer **una sola secuencia**: respaldo restaurado -> clon fiel -> migración diferencial y rollback -> staging hospedado -> URL institucional -> aceptación APdB.
- Si falta acceso o autorización, registrar esa dependencia específica y no seguir agregando tareas cosméticas.

## Evidencia del candidato
- PR #22: https://github.com/nahuelacuna983-hash/liga-maxi/pull/22
- Contrato institucional: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45286344903
- Paquete C/D: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45286344940
- Suite integral aislada: https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/45286345217

**Decisión al corte:** GO candidato de código. NO-GO de despliegue con datos reales. No se ejecutaron escrituras en staging ni producción.
