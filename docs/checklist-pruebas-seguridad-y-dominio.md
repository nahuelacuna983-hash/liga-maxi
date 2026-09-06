# Checklist de pruebas seguridad y dominio

## Antes de tocar Supabase

- Backup de Supabase realizado.
- App actual funcionando en GitHub Pages.
- Paquete cPanel subido solo a entorno controlado.
- HTTPS activo en dominio propio.
- No avisar a delegados todavia.

## Prueba base sin cambios de RLS

1. Abrir `https://maxibasquetlaplata.com.ar/`.
2. Confirmar que no redirige a GitHub.
3. Ver tabla publica.
4. Cambiar categoria.
5. Ver fixture.
6. Ver playoffs.
7. Entrar como delegado.
8. Probar pantalla documental sin subir archivos sensibles.
9. Entrar como asociacion.
10. Ver documentacion.
11. Ver habilitados.
12. Ver programacion.
13. Ver informes.

## Prueba despues de RLS etapa 1

Repetir todos los pasos anteriores y agregar:

- Cargar resultado de prueba.
- Anular resultado de prueba.
- Guardar correccion administrativa.
- Cargar documento de prueba.
- Aprobar/rechazar documento de prueba.
- Agregar jugador de prueba.
- Solicitar baja de jugador de prueba.
- Confirmar baja como asociacion.
- Cargar resultado de playoff.
- Guardar programacion.

## Senales de alarma

Detener cambios si aparece:

- pantalla publica vacia;
- categorias duplicadas o ausentes;
- error al cargar resultados;
- error al entrar como delegado;
- error al ver documentacion;
- error al aprobar documentos;
- error al publicar torneos;
- error al guardar programacion;
- datos sensibles visibles sin login.

## Prueba desde celular

- Abrir desde navegador comun.
- Medir si tarda varios segundos en negro.
- Instalar como app.
- Cerrar y reabrir.
- Cambiar categoria.
- Ver tabla en vertical y horizontal.
- Probar acceso delegado.

## Decision

Si todo funciona:

- dejar dominio en prueba privada;
- actualizar Supabase Auth Redirect URLs;
- preparar comunicacion para reinstalar PWA.

Si falla:

- volver a GitHub Pages como referencia operativa;
- revertir solo el cambio que produjo la falla;
- documentar error exacto.
