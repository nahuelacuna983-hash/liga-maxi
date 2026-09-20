const http = require("node:http");

const DEFAULT_CRITERIA_VERSION = "APDB_MAXI_2026_V1";

function env(name, fallback = undefined) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Falta variable de entorno ${name}`);
  return value;
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "authorization, content-type, x-admin-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error("Request demasiado grande"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("JSON invalido"));
      }
    });
    req.on("error", reject);
  });
}

function normalizeMimeType(value) {
  const mime = String(value || "").toLowerCase();
  if (mime.includes("pdf")) return "application/pdf";
  if (mime.includes("png")) return "image/png";
  if (mime.includes("jpg") || mime.includes("jpeg")) return "image/jpeg";
  return mime || "application/octet-stream";
}

function storageObjectUrl(supabaseUrl, bucket, path) {
  const encodedPath = String(path).split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${encodedPath}`;
}

async function supabaseGet(path) {
  const supabaseUrl = env("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: "application/json"
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase GET ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function supabasePost(path, body) {
  const supabaseUrl = env("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      accept: "application/json",
      prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase POST ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function downloadDocument(row) {
  const storagePath = row.storage_path;
  if (!storagePath) throw new Error("El documento no tiene storage_path");
  if (/^https?:\/\//i.test(storagePath)) {
    throw new Error("El documento apunta a Drive/URL externa; para esta version debe estar en Storage privado");
  }

  const supabaseUrl = env("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = process.env.SUPABASE_DOCUMENT_BUCKET || "documentos";
  const response = await fetch(storageObjectUrl(supabaseUrl, bucket, storagePath), {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo leer el archivo privado");
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = normalizeMimeType(row.file_type || response.headers.get("content-type"));
  return { buffer, mimeType };
}

function buildAuditPrompt(documento, scope) {
  const requisito = documento.requirement_nombre || "Documento";
  const jugador = scope === "player" ? `Jugador: ${documento.jugador_nombre || "sin nombre"}.` : "Alcance: club/equipo.";
  const criteriaVersion = process.env.DOCUMENT_AUDIT_CRITERIA_VERSION || DEFAULT_CRITERIA_VERSION;

  return `
Sos auditor documental de una asociacion deportiva de maxibasquet.
Revisa el archivo adjunto y devolve SOLO JSON valido, sin markdown.

Contexto:
- Equipo: ${documento.equipo_nombre || "sin equipo"}.
- ${jugador}
- Requisito: ${requisito}.
- Version de criterios: ${criteriaVersion}.

Criterios:
- Declaracion jurada/DJDR/deslinde: debe estar firmada y tener fecha del anio corriente. Nombre escrito no equivale a firma. Si la firma no es visible, queda pendiente/revisar.
- Certificado medico / estudio medico: debe existir aptitud fisica para practica deportiva y estudio complementario identificable. Si hay estudio y certificado, el estudio debe ser del mismo dia o anterior al certificado, con margen maximo de 30 dias. Vigencia: 12 meses.
- Lista de buena fe: debe contener indicio de recibido/sello APdB.
- Seguro: debe mostrar poliza/certificado y nomina/listado de jugadores, o indicar aceptacion provisoria gestionada por APdB.
- Pase: no bloquea habilitacion general; solo observar si parece necesario por traspaso.

Reglas de seguridad documental:
- No desplaces conclusiones entre jugadores. Si el archivo no corresponde claramente al jugador/alcance solicitado, audit_status debe ser "revisar" o "rechazado".
- Toda conclusion debe citar archivo y pagina. Si no podes ubicar pagina, usa null y explica la duda.
- Diferencia fechas visibles del documento contra texto extraido/OCR/metadatos impresos. Si hay conflicto de fechas, deja el caso en "revisar" salvo que la pagina visible resuelva claramente.
- Si el caso no puede resolverse con certeza, dejalo como "revisar" o "pendiente". Nunca conviertas una duda de lectura en incumplimiento automatico.
- Caso Raffa/Banco: ECG del mismo dia con certificado APTO puede funcionar como complemento alternativo, aunque exista una ergometria adicional posterior.
- Caso Suppes/Banco: distinguir fechas visibles reales del estudio/documento del texto extraido que pueda mezclar fechas impresas o metadatos.
- Caso Barragan/Banco: detectar si la DJDR esta sin firma visible; nombre escrito o datos completados no alcanzan como firma.

Estados posibles:
- validado, listo_aprobar, revisar, pendiente, observado, rechazado, vencido.

Devolve JSON con esta forma exacta:
{
  "audit_status": "validado|listo_aprobar|revisar|pendiente|observado|rechazado|vencido",
  "confidence": 0-100,
  "summary": "frase corta en espanol",
  "valid_until": "YYYY-MM-DD o null",
  "detected_dates": ["YYYY-MM-DD"],
  "criteria_version": "${criteriaVersion}",
  "unresolved_reason": "texto o null",
  "page_evidence": [{"page": 1, "kind": "ok|duda|faltante|fecha|firma|identidad", "quote": "evidencia breve", "conclusion": "conclusion"}],
  "checks": {
    "corresponde_requisito": true,
    "corresponde_jugador": true,
    "tiene_firma": null,
    "tiene_sello_apdb": null,
    "tiene_poliza": null,
    "tiene_nomina": null,
    "tiene_apto_fisico": null,
    "fechas_compatibles": null,
    "anio_corriente": null,
    "requiere_revision_humana": true
  },
  "findings": {"ok": [], "dudas": [], "faltantes": []},
  "extracted_text": "texto breve extraido o resumen si es imagen"
}
`;
}

function parseJsonObject(text) {
  const clean = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(clean);
}

async function auditDocument(payload) {
  if (!["team", "player"].includes(payload.scope)) throw new Error("scope invalido");
  if (!payload.documentId) throw new Error("documentId obligatorio");

  const view = payload.scope === "team" ? "v_team_documents_admin" : "v_player_documents_admin";
  const rows = await supabaseGet(`${view}?select=*&id=eq.${encodeURIComponent(payload.documentId)}&limit=1`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("Documento no encontrado");

  const { buffer, mimeType } = await downloadDocument(row);
  const base64 = buffer.toString("base64");
  const fileName = row.file_name || "documento";
  const prompt = buildAuditPrompt(row, payload.scope);
  const content = mimeType === "application/pdf"
    ? [
        { type: "input_text", text: prompt },
        { type: "input_file", filename: fileName, file_data: `data:${mimeType};base64,${base64}` }
      ]
    : [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: `data:${mimeType};base64,${base64}` }
      ];

  const auditModel = env("DOCUMENT_AUDIT_MODEL");
  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env("OPENAI_API_KEY")}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: auditModel,
      input: [{ role: "user", content }]
    })
  });
  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text();
    throw new Error(`Error de IA: ${detail}`);
  }

  const raw = await openaiResponse.json();
  const outputText = raw.output_text ||
    (raw.output || [])
      .flatMap((item) => item.content || [])
      .map((item) => item.text || "")
      .join("\n");

  const audit = parseJsonObject(outputText || "{}");
  const criteriaVersion = audit.criteria_version || process.env.DOCUMENT_AUDIT_CRITERIA_VERSION || DEFAULT_CRITERIA_VERSION;
  const insertPayload = {
    scope: payload.scope,
    team_document_id: payload.scope === "team" ? row.id : null,
    player_document_id: payload.scope === "player" ? row.id : null,
    organizacion_id: row.organizacion_id,
    torneo_id: row.torneo_id,
    categoria_id: row.categoria_id,
    equipo_id: row.equipo_id,
    equipo_nombre: row.equipo_nombre,
    player_id: payload.scope === "player" ? row.player_id || null : null,
    player_name: payload.scope === "player" ? row.jugador_nombre || null : null,
    requirement_id: row.requirement_id,
    requirement_nombre: row.requirement_nombre,
    storage_path: row.storage_path,
    file_name: row.file_name,
    file_type: mimeType,
    audit_status: audit.audit_status || "revisar",
    confidence: typeof audit.confidence === "number" ? audit.confidence : null,
    summary: audit.summary || null,
    findings: audit.findings || {},
    extracted_text: audit.extracted_text || null,
    detected_dates: audit.detected_dates || [],
    valid_until: audit.valid_until || null,
    checks: audit.checks || {},
    criteria_version: criteriaVersion,
    unresolved_reason: audit.unresolved_reason || null,
    page_evidence: audit.page_evidence || [],
    source_kind: "supabase_storage",
    source_file_id: row.storage_path,
    source_file_url: null,
    model: auditModel,
    raw_response: raw,
    audited_by: payload.actor || "auditoria-vps"
  };

  const insertedRows = await supabasePost("document_ai_audits?select=id,audit_status,confidence,summary,valid_until,audited_at", insertPayload);
  const inserted = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
  return { audit: inserted, result: audit };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, service: "auditoria-vps" });
  }
  if (req.method !== "POST" || req.url !== "/auditar-documento") {
    return json(res, 404, { error: "Ruta no encontrada" });
  }

  try {
    const adminSecret = process.env.DOCUMENT_AUDIT_ADMIN_SECRET;
    if (adminSecret && req.headers["x-admin-secret"] !== adminSecret) {
      return json(res, 401, { error: "No autorizado" });
    }
    const payload = await readBody(req);
    const result = await auditDocument(payload);
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("No autorizado") ? 401 : message.includes("no encontrado") ? 404 : 500;
    return json(res, status, { error: message });
  }
});

const port = Number(process.env.PORT || 8787);
server.listen(port, () => {
  console.log(`auditoria-vps escuchando en puerto ${port}`);
});
