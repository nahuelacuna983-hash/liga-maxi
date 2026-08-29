# Tablero de cierre preventa

Fecha: 28/08/2026

Objetivo: ver en una sola pagina el estado real antes de hacer simulacros y vender la plataforma.

## Semaforo general

| Area | Estado | Comentario |
| --- | --- | --- |
| Publico | Listo para simulacro | Muestra tabla, fixture, fecha y playoffs. Revisar rendimiento en celular. |
| Delegados | Listo para simulacro | Carga resultados, jugadores y documentacion. Confirmar permisos por equipo. |
| Asociacion / Competencia | Listo para simulacro | Corrige/anula resultados, resoluciones 20-0 y playoffs. |
| Asociacion / Documentacion | Listo para simulacro | Revisa documentos, impacto de habilitacion e informe por club. |
| Habilitados / Arbitros | Listo para simulacro | Filtro por club/partido y control de cancha imprimible. Falta vista externa exclusiva. |
| Programacion | Listo para simulacro | Genera texto/correo y marca enviados. Falta automatizar envio real. |
| Generador de torneos | Listo para simulacro sin publicar | Simula, sugiere, descarga fixture/documento. Publicar solo en categoria vacia. |
| Informes/cierres | Parcial | Sirve para control, pero falta cierre oficial definitivo con escritura de campeon/historial. |
| Usuarios/permisos | Parcial | Hay base y login, falta administracion visual completa. |
| Multi asociacion | Pendiente | Hoy esta orientado a APdB. Falta separacion formal para vender como plataforma amplia. |
| Dominio propio | Preparado, no ejecutado | Falta RLS, AutoSSL, cPanel y Auth URLs. |
| Seguridad RLS | Pendiente de verificar en Supabase | Hay SQL de solo lectura preparado. |

## Lo que se puede probar ya

- Delegado carga jugadores/documentos.
- Asociacion aprueba/observa.
- Se recalcula habilitacion.
- Se descarga informe club.
- Se descarga control cancha para arbitros.
- Se programa una fecha y se prepara correo.
- Se simula un torneo sin publicar.
- Se descarga fixture simulado.
- Se descarga documento oficial del fixture.

## Lo que no conviene prometer cerrado

- Envio automatico real de correos o WhatsApp.
- Vista independiente para arbitros con login propio.
- Multi asociacion completa.
- Backoffice visual de usuarios/permisos completo.
- Cierre oficial con campeon/historial escrito en base.
- Auditoria documental automatica desde Drive sin supervision.
- PDFs finales con identidad institucional cerrada.

## Decisiones pendientes

1. Dominio final: raiz `maxibasquetlaplata.com.ar` o carpeta de prueba.
2. Mantener GitHub Pages durante transicion o mudar completamente.
3. Rol de arbitros: acceso publico con link reservado o usuario autenticado.
4. Servicio comercial: solo app, app + soporte, o app + carga/auditoria documental.
5. Responsable de aprobar documentos.
6. Politica de datos medicos y conservacion de archivos.
7. Precio inicial para APdB.

## Proximo bloque recomendado

1. Ejecutar SQL `verificar-rls-antes-dominio.sql`.
2. Si RLS esta bien, preparar prueba en cPanel.
3. Ejecutar simulacro documental con Sud America.
4. Ejecutar simulacro de programacion/correo.
5. Ejecutar simulacro de torneo sin publicar.
6. Listar fallas reales encontradas.
7. Recien ahi decidir publicacion de dominio o demo formal.

