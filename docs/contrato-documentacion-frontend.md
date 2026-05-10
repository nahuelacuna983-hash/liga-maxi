# Contrato frontend - Modulo Documentacion

## Objetivo

Definir que datos necesita recibir la app para mostrar y operar el modulo documental.

Este contrato permite integrar Supabase sin reescribir el flujo visual ya probado en el prototipo.

## Requisitos por categoria

La app necesita una lista de requisitos activos para la categoria seleccionada.

```js
[
  {
    id: "uuid",
    organizacion_id: "uuid o null",
    torneo_id: "uuid o null",
    nombre: "Certificado medico",
    descripcion: "Apto medico de jugadores",
    categoria_id: "uuid o null",
    obligatorio: true,
    requiere_vencimiento: true,
    activo: true
  }
]
```

## Documentos por equipo

La app necesita una lista de documentos existentes o pendientes por equipo.

```js
[
  {
    id: "uuid",
    requirement_id: "uuid",
    organizacion_id: "uuid",
    torneo_id: "uuid",
    categoria_id: "uuid",
    equipo_id: "uuid",
    equipo_nombre: "UNIVERSAL",
    documento: "Certificado medico",
    uploaded_by: "UNIVERSAL",
    storage_path: "documentos/maxi-35-a/universal/certificado.pdf",
    file_name: "certificado.pdf",
    file_type: "application/pdf",
    file_size: 234000,
    status: "cargado",
    vencimiento: "2026-06-30",
    observacion: "Esperando revision",
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-05-10T18:00:00Z",
    updated_at: "2026-05-10T18:00:00Z"
  }
]
```

## Estados permitidos

- `pendiente`
- `cargado`
- `observado`
- `aprobado`
- `rechazado`
- `vencido`

## Acciones del Delegado

### Subir documento

Funcion futura recomendada:

```text
upsert_team_document_metadata
```

Entrada:

```js
{
  requirement_id: "uuid",
  torneo_id: "uuid",
  categoria_id: "uuid",
  equipo_id: "uuid",
  equipo_nombre: "UNIVERSAL",
  file: File,
  vencimiento: "2026-06-30"
}
```

Resultado esperado:

```js
{
  ok: true,
  document_id: "uuid",
  status: "cargado"
}
```

### Reemplazar documento observado

Igual que subir documento, pero conservando auditoria anterior.

## Acciones de Asociacion

### Aprobar

Funcion futura recomendada:

```text
review_team_document
```

Entrada:

```js
{
  document_id: "uuid",
  actor: "ADMIN"
}
```

Resultado:

```js
{
  ok: true,
  status: "aprobado"
}
```

### Observar

Funcion futura recomendada:

```text
review_team_document
```

Entrada:

```js
{
  document_id: "uuid",
  actor: "ADMIN",
  observacion: "Falta hoja de cobertura"
}
```

Resultado:

```js
{
  ok: true,
  status: "observado"
}
```

### Recordar

Primera version:

- registra evento con `create_document_reminder`;
- no envia notificacion automatica.

Version futura:

- WhatsApp;
- email;
- notificacion interna.

## Eventos de auditoria

Cada accion importante debe generar un evento.

```js
{
  id: "uuid",
  team_document_id: "uuid",
  event_type: "uploaded",
  actor: "UNIVERSAL",
  detail: "Archivo cargado por delegado",
  created_at: "2026-05-10T18:00:00Z"
}
```

Tipos sugeridos:

- `uploaded`
- `replaced`
- `approved`
- `observed`
- `rejected`
- `reminder_created`
- `expired`

## Reglas de UI

- Delegado solo ve sus equipos.
- Asociacion ve todos.
- Un documento aprobado no se reemplaza salvo accion administrativa.
- Un documento observado se puede reemplazar.
- Un documento pendiente se puede cargar.
- Un documento cargado espera revision.
