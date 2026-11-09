# APdB 2027 - Material de demostración institucional

## Alcance y evidencia

Este material se basa en el commit certificado `859595791dba64cde97c0e49f1ae84780da409c8`.

La certificación documental persistente fue ejecutada en Windows con PostgreSQL 16 y Chromium sobre la base aislada `apdb_2027_certificacion_2`:

- Chromium: 1/1 aprobado.
- Duración: 6,1 segundos.
- Resultado: `POSTGRES_DOCUMENTATION_E2E_OK`.

Esta evidencia certifica únicamente el circuito documental sintético probado. La base PostgreSQL no está integrada al hosting institucional de cPanel y la certificación no habilita datos oficiales ni documentos médicos reales.

## Inventario definitivo

### Demostrable en la instalación privada de cPanel

- Navegación pública de la demostración.
- Torneo y categoría Femenino sintéticos.
- Equipos y jugadoras ficticias.
- Fixture.
- Resultados sintéticos.
- Tabla de posiciones.
- Semifinales, final y campeón sintéticos.
- Flujo documental visual con datos ficticios.
- Aviso visible de demostración no oficial.

La instalación es estática y está protegida por Directory Privacy. No debe presentarse como una conexión a PostgreSQL.

### Probado con PostgreSQL local y Chromium

- Login de desarrollo.
- Selección autorizada de categoría.
- Configuración de dos requisitos documentales.
- Presentación por delegado autorizado.
- Rechazo de otro delegado.
- Revisión por Asociación.
- Un requisito aprobado y otro pendiente: `PENDIENTE`.
- Ambos requisitos aprobados: `DOCUMENTACIÓN COMPLETA`.
- Bloqueo de modificación de documento aprobado.
- Historial append-only con cuatro eventos.
- Recarga, nueva autenticación y recuperación del estado.
- Reinicio del servidor y recuperación desde PostgreSQL, según el recorrido E2E certificado.

### Implementado pero no certificado como producto institucional

- Integración completa entre la aplicación original y el modelo PostgreSQL 2027.
- Autenticación institucional real.
- RLS productivo.
- Almacenamiento privado de documentos.
- OCR o auditoría automática sobre documentos oficiales.
- Operación multiusuario institucional con cuentas reales.
- Backups y restauración operativa.
- Integración PostgreSQL dentro de cPanel.

### Pendiente

- Confirmación reglamentaria de cruces de playoffs.
- Carga y validación de datos oficiales.
- Definición de roles institucionales definitivos.
- Política de retención y eliminación documental.
- Prueba piloto cerrada con usuarios designados.

## Guion de presentación - 20 minutos

### 0:00-2:00 - Contexto

Abrir la URL privada de cPanel y mostrar el aviso `DATOS FICTICIOS - DEMOSTRACIÓN NO OFICIAL`. Aclarar que la instalación no modifica la aplicación 2026.

### 2:00-5:00 - Competencia

Seleccionar Femenino, mostrar equipos, fixture y tabla. Abrir un partido con resultado y explicar la diferencia entre información pública y administración.

### 5:00-8:00 - Playoffs

Mostrar la llave sintética, semifinales, final y campeón. Indicar que las reglas reglamentarias pendientes no se presentan como decisión oficial.

### 8:00-11:00 - Asociación

Abrir Asociación, seleccionar categoría y mostrar los controles de requisitos, revisión y estado documental. No cargar información real.

### 11:00-14:00 - Delegado

Presentar un documento ficticio como delegado autorizado. Mostrar que el sistema conserva el estado pendiente de revisión.

### 14:00-17:00 - Revisión y habilitación

Revisar un requisito como Asociación. Mostrar `PENDIENTE` cuando falta el segundo y `DOCUMENTACIÓN COMPLETA` cuando ambos están aprobados. Explicar que documentación completa no habilita automáticamente la competencia deportiva.

### 17:00-19:00 - Persistencia certificada

Explicar que el flujo documental persistente fue ejecutado con PostgreSQL 16 y Chromium sobre `apdb_2027_certificacion_2`, con resultado `POSTGRES_DOCUMENTATION_E2E_OK`. Aclarar que esta base no es la instalación cPanel.

### 19:00-20:00 - Próximos pasos

Presentar las decisiones pendientes, riesgos y condiciones para un piloto cerrado.

## Capturas y material de respaldo

Preparar, sin mostrar datos reales:

1. Portada de la demo con el aviso de datos ficticios.
2. Selector Femenino y equipos.
3. Fixture y tabla.
4. Llave de playoffs y campeón sintético.
5. Configuración de los dos requisitos.
6. Presentación documental como delegado.
7. Revisión como Asociación.
8. Estado `PENDIENTE`.
9. Estado `DOCUMENTACIÓN COMPLETA`.
10. Historial con cuatro eventos.
11. Consola o log que muestre `POSTGRES_DOCUMENTATION_E2E_OK`, sin credenciales ni tokens.
12. Pantalla posterior a recarga y nueva autenticación.

No incluir capturas de documentos médicos, tokens, contraseñas, URLs internas de base de datos ni información de jugadores reales.

## Preguntas para APdB

### Competencia

- ¿Cuáles son las categorías oficiales de la temporada 2027?
- ¿Qué equipos participan en cada categoría?
- ¿Cuál es el formato de fixture y calendario?
- ¿Cómo se asignan puntos y desempates?
- ¿Las llaves de playoffs son fijas o se reordenan por clasificación?
- ¿Qué modalidades Top 4, Top 6 y Top 8 aplican por categoría?

### Administración

- ¿Qué roles institucionales existirán?
- ¿Qué puede hacer Asociación, delegado, club y consulta pública?
- ¿Quién puede aprobar, observar o rechazar documentación?
- ¿Cómo se revoca una delegación?

### Documentación

- ¿Qué requisitos son obligatorios por categoría y equipo?
- ¿Qué vigencia tiene cada requisito?
- ¿Qué documentos requieren revisión humana?
- ¿Qué significa habilitación deportiva y quién la decide?
- ¿Cuál es la política de retención, acceso y eliminación?
- ¿Debe conservarse el documento original y su historial de revisiones?

### Operación

- ¿Dónde se alojará el backend y PostgreSQL?
- ¿Quién administra backups y restauraciones?
- ¿Quién recibe incidentes y solicitudes de soporte?
- ¿Qué usuarios participarán en el piloto?
- ¿Qué fecha y criterios determinan el pasaje de prueba a operación?

## Transición a piloto

1. Confirmar reglas deportivas y requisitos documentales por escrito.
2. Elegir un entorno backend con PostgreSQL, HTTPS, backups y control de acceso.
3. Implementar autenticación institucional y RLS revisado.
4. Definir Storage privado para documentos y política de retención.
5. Crear una organización y usuarios de prueba sin datos oficiales.
6. Ejecutar el recorrido completo con evidencia y plan de reversión.
7. Importar sólo el conjunto mínimo de datos autorizado.
8. Realizar piloto cerrado con Asociación y delegados seleccionados.
9. Comparar resultados con la aplicación 2026 sin modificarla.
10. Autorizar formalmente cualquier transición posterior.

## Riesgos que bloquean datos reales

- El login actual de desarrollo no es identidad institucional.
- cPanel aloja el paquete estático, no necesariamente el backend Node ni PostgreSQL.
- No hay autorización para conectar esta demo con Supabase productivo.
- Los documentos médicos requieren almacenamiento privado, cifrado, control de acceso y retención definida.
- Deben validarse RLS, sesiones, revocaciones y auditoría con roles institucionales.
- No existe todavía una decisión formal sobre todas las reglas de playoffs.
- La certificación documental no certifica automáticamente fixture, resultados, playoffs ni integración con la aplicación vigente.

## Mensaje recomendado

La plataforma ya permite demostrar un circuito deportivo y documental sintético, y el flujo documental persistente fue certificado con PostgreSQL 16 y Chromium en una base aislada. La demostración privada no es producción. Para un piloto APdB todavía deben definirse reglas, identidad institucional, almacenamiento privado, backups, alojamiento del backend y autorización formal de los datos.
