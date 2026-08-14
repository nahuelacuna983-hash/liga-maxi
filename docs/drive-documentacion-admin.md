# Modulo admin de documentacion desde Drive

Este modulo suma una bandeja administrativa para asociar archivos existentes en Google Drive con jugadores cargados en la app.

## Principios

- No sube archivos a Supabase Storage.
- No muestra documentacion a usuarios comunes.
- No publica links sensibles en el repositorio.
- Guarda solamente metadatos y enlaces de Drive en Supabase.
- La revision queda en Asociacion/Admin.
- Crear un jugador desde esta revision no aprueba documentacion ni habilita automaticamente.

## Flujo

1. Listar archivos de la carpeta de Drive por tipo documental.
2. Preparar un seed privado local con metadatos: nombre, tipo, id de Drive, URL, MIME.
3. Correr el seed en Supabase solo desde una maquina de administracion.
4. Revisar desde Asociacion > Documentacion > Drive.
5. Asociar a jugador existente, marcar revisar o crear jugador desde revision admin.

## Carpeta privada

Usar `private/` para seeds locales. Esa carpeta esta ignorada por Git.

Ejemplo:

```text
private/drive-documentacion-seed.json
private/drive-documentacion-seed.sql
```

## Tipos documentales

- estudios_medicos
- djdr
- pase
- seguro
- lista_buena_fe

## Estados

- `cargado`
- `pendiente`
- `revisar`
- `vencido`

## Estados de asociacion

- `exacto`: asociado con seguridad a un jugador.
- `dudoso`: parece coincidir, pero requiere confirmacion.
- `sin_jugador`: el nombre aparece en Drive pero no existe como jugador.
- `sin_asociar`: no se pudo inferir jugador.
