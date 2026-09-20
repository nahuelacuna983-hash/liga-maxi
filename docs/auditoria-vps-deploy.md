# Auditoria automatica en VPS

Este modulo reemplaza la ejecucion de la Edge Function por un servicio Node privado.
La web no debe guardar claves sensibles. El servicio corre en el VPS y se comunica con Supabase usando `service_role`.

## Archivos

- `server/auditoria-vps/server.js`
- `server/auditoria-vps/.env.example`

## Requisitos del VPS

- Node.js 18 o superior.
- Acceso para configurar variables de entorno.
- Salida HTTPS a:
  - `https://eshbydpsmypflfxpmhyk.supabase.co`
  - `https://api.openai.com`

## Variables de entorno

Copiar `server/auditoria-vps/.env.example` como `.env` o cargar esos valores en el panel/proceso del VPS.

Valores sensibles:

- `SUPABASE_SERVICE_ROLE_KEY`: se obtiene en Supabase, Project Settings, API. No va en frontend ni Git.
- `OPENAI_API_KEY`: clave API con credito disponible.
- `DOCUMENT_AUDIT_ADMIN_SECRET`: clave interna para autorizar llamadas al servicio.

## Ejecutar

Desde la carpeta `server/auditoria-vps`:

```bash
node server.js
```

Debe mostrar:

```text
auditoria-vps escuchando en puerto 8787
```

## Probar salud

```bash
curl http://localhost:8787/health
```

Respuesta esperada:

```json
{"ok":true,"service":"auditoria-vps"}
```

## Probar auditoria con documento real de Storage

```bash
curl -X POST http://localhost:8787/auditar-documento \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: poner_clave_larga_interna" \
  -d '{
    "scope": "player",
    "documentId": "d9608410-c748-459e-ada2-d4e122a63026",
    "actor": "test-admin"
  }'
```

Ese documento corresponde a un archivo real en Storage privado. Si OpenAI no tiene credito, el servicio va a responder error de cuota.

## Limitaciones actuales

- Esta version audita documentos que tienen `storage_path` real del bucket privado `documentos`.
- Si `storage_path` contiene un link de Google Drive, responde que debe estar en Storage privado.
- La aprobacion final sigue siendo administrativa; el servicio solo genera el dictamen automatico en `document_ai_audits`.
- Para Banco Provincia, si los originales estan solo en Drive, primero hay que importarlos al bucket privado o agregar un lector Drive al servicio.

## Integracion futura con la app

La app puede llamar a este servicio desde un boton admin, pero no debe exponer `SUPABASE_SERVICE_ROLE_KEY` ni `OPENAI_API_KEY`.
Para produccion conviene publicar el servicio detras de HTTPS, por ejemplo:

```text
https://api.maxibasquetlaplata.com.ar/auditar-documento
```

El header `x-admin-secret` debe enviarse solo desde pantallas admin o desde otro backend, no desde una pantalla publica.
