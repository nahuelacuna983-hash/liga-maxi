# APdB 2027 — Aceptación funcional antes de convocar a la Asociación

**Fecha:** 25/11/2026. **Base técnica:** PR #37. **Frente de aplicación:** PR #39. **Instalación cPanel:** issue #38 a cargo de Codex.

## Criterio de cierre (no basta una pantalla bonita)

Solo se convoca a APdB a una **presentación de entrega funcional** cuando un navegador real pueda abrir la URL institucional autorizada y completar los controles que correspondan. El sitio existente `https://maxibasquetlaplata.com.ar/liga/` y los torneos 2026 deben mantenerse sin cambios.

### Comprobaciones técnicas automatizadas ya disponibles

- `tests/apdb-institutional-package-browser.spec.cjs`: estructura desktop/móvil con JavaScript **deshabilitado**.
- `tests/apdb-institutional-js-enabled.spec.cjs`: página `index_online.html` realmente generada, **JavaScript habilitado**, inicialización con categorías y partidos sintéticos, cambio de pestañas Público / Delegados / Asociación, sin errores JS o solicitudes no autorizadas. Navegadores de escritorio y celular. Transportador Supabase simulado dentro de la prueba.
- `tests/demo-circuit-browser.spec.cjs`: campeonato, campeón, documentación sintética. Es una demo funcional separada, no un rol autenticado en producción.

Las tres comprobaciones prueban software y presentación, **no** Auth/Storage reales ni alojamiento cPanel. Cualquier afirmación de aceptación real requiere el protocolo siguiente.

## Matriz de aceptación sobre la URL real protegida

| Control de aceptación | Evidencia para considerar aprobado |
|---|---|
| Identidad del alojamiento | URL exacta `https://maxibasquetlaplata.com.ar/apdb-2027-prueba/`, HTTPS válido, subruta dentro de document-root confirmado, sin redirecciones inesperadas |
| Piloto protegido | Sin credenciales, página y archivos JS/manifest/SW denegados 401/403. Solo se prueba navegación con identidad autorizada |
| Integridad de la versión | Descarga HTTP autorizada de **cada** archivo de los 9; SHA-256 coincide con recibo privado, sin SQL, dumps, source maps, `.env`, claves privadas |
| Público | Visualiza categorías reales autorizadas, tablas/fechas/fixture/playoffs y campeones correctos, sin mensajes técnicos o acceso documental privado; móvil y PC |
| Delegados | Acceso por usuario real de prueba; visualiza únicamente equipos asignados, puede cargar resultado permitido y documentos sintéticos, y no modificar otro equipo |
| Asociación | Autenticación autorizada; puede administrar su torneo, publicar fixtures y revisar documentación sin afectar la liga 2026; auditoría observable |
| Documentación | Almacenamiento privado, permisos y recuperación de bytes por rol; usuario anónimo no puede obtener documentos |
| Persistencia | Operaciones de prueba controladas sobreviven a recarga/cierre de sesión y no filtran estado privado entre roles |
| Recuperación | Restore real del respaldo auditado **en Supabase PG17 descartable** y análisis de diferencias; inventario Auth/Storage por separado |
| Reversión | Copia de hosting anterior, ruta de restauración exacta y prueba autorizada de retorno sin afectar `/liga/` |
| Aprobación APdB | Operador de hosting y responsable de Asociación confirman acta antes de ampliar acceso público |

## Puerta de entrega

**GO para planificar la reunión:** versión institucional desplegada en subruta protegida, hash verificado, acceso autorizado desde celular y PC, flujos esenciales de los tres roles aceptados y recuperación/rollback evaluados sin fallos críticos.

**NO-GO:** falta de cPanel autorizado, falta de Staging con permisos, exposición de documentación, falla de roles/RLS, discrepancias en datos, falta de backup/restauración compatible o cambio inadvertido en `/liga/`.

## Acceso humano que no puede resolver el código

Se requiere que el responsable de `maxibasquetlaplata.com.ar` **autorice la instalación o realice personalmente el paso en cPanel**. No necesitamos recibir contraseñas por chat. El código de Codex puede dejar el ZIP exacto y los pasos; sin esa intervención no existe instalación verificable.

No crear una página simulada ni sustituir el backend por datos sintéticos para la presentación de entrega.
