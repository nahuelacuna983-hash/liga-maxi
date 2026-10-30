# Liga Maxi 2027 — estado de integración con la aplicación original

## Comprobado

La aplicación original (`index_online.html`, `app_online.js`, `style.css`) contiene las vistas públicas `Público`, `Fecha`, `Delegados` y `Asociación`. Asociación organiza paneles de Inicio, Competencia, Documentación, Torneos, Programación y Administración, además de subpaneles de auditoría, habilitados, informes, cierres y uso.

La demo 2027 mantiene el recorrido público de cuatro vistas, reutiliza `style.css` y ahora presenta los seis paneles de Asociación. Competencia y Programación son funcionales con datos sintéticos; Documentación, Torneos y Administración están presentes como pendientes explícitos y no ejecutan operaciones remotas.

## Contrato de adaptación

El proveedor sintético expone las operaciones que la interfaz deportiva necesita:

- torneo y categorías: `getTournament`, `getCategories`, `getCategory`;
- equipos y fixture: `getTeams`, `generateFixture`, `getMatches`;
- tabla: `getTable`;
- resultados: `loadDelegateResult`, `loadResult`, `annulResult`, `setAdministrativeNoPoints`;
- playoffs: `generatePlayoffs`, `getPlayoffMatches`, `loadPlayoffResult`, `advancePlayoffs`, `getChampion`.

Además, las operaciones administrativas sintéticas verifican actor, organizador, torneo activo, categoría, equipo y jugador antes de modificar estado. Las pruebas `demo-platform.cjs` y `demo-isolation.cjs` cubren intentos autorizados y cruzados entre organizadores.

Las operaciones de generación/configuración y las lecturas de jugadores, permisos y documentos requieren un actor explícito. Los rechazos de permisos se producen antes de modificar colecciones internas; la prueba de aislamiento compara el estado antes y después.

La futura implementación sobre una base aislada deberá cumplir el mismo contrato, pero reemplazar las mutaciones en memoria por RPC/Auth/RLS verificadas. No se debe conectar este adaptador a la URL productiva ni reutilizar claves del sitio publicado.

## Flujo documental observado

La aplicación original consulta `document_requirements`, `v_team_documents_admin`, `v_player_documents_admin`, `v_drive_player_documents_admin` y `v_document_audit_results_admin`. Las decisiones se escriben mediante RPC de revisión y existen operaciones Storage/Drive. La demo no toca ninguna de esas fuentes.

Riesgos a validar antes de integrar:

1. Separar lectura OCR/preauditoría de aprobación administrativa.
2. Mantener el requisito de identidad, equipo, categoría y torneo en cada operación.
3. Evitar que un estado histórico aprobado prevalezca sobre una revisión posterior.
4. Ejecutar las escrituras documentales sólo mediante RPC autorizadas.
5. Conservar evidencia y procedencia sin exponer contenido médico innecesario.

## Validación y límites

`tests/original-integration-contract.cjs` comprueba la correspondencia estructural de las cuatro vistas originales y los seis paneles de Asociación, además de la ausencia de llamadas remotas en la demo. La equivalencia deportiva y los torneos sintéticos se cubren con los tests existentes.

Playwright no está instalado en el entorno actual; no se declara una prueba automatizada de navegador como ejecutada. La integración visual completa de los seis paneles originales queda pendiente de un trabajo específico de presentación, sin alterar `index_online.html` ni `app_online.js`.
