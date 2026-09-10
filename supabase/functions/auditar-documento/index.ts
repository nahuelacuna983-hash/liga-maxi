import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AuditScope = "team" | "player";

type AuditRequest = {
  scope: AuditScope;
  documentId: string;
  actor?: string;
};

type DocumentRow = {
  id: string;
  requirement_id: string | null;
  requirement_nombre: string | null;
  organizacion_id: string | null;
  torneo_id: string | null;
  categoria_id: string | null;
  equipo_id: string | null;
  equipo_nombre: string | null;
  player_id?: string | null;
  jugador_nombre?: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_type: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta variable de entorno ${name}`);
  return value;
}

function normalizeMimeType(value?: string | null) {
  const mime = String(value || "").toLowerCase();
  if (mime.includes("pdf")) return "application/pdf";
  if (mime.includes("png")) return "image/png";
  if (mime.includes("jpg") || mime.includes("jpeg")) return "image/jpeg";
  return mime || "application/octet-stream";
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildAuditPrompt(documento: DocumentRow, scope: AuditScope) {
  const requisito = documento.requirement_nombre || "Documento";
  const jugador = scope === "player" ? `Jugador: ${documento.jugador_nombre || "sin nombre"}.` : "Alcance: club/equipo.";

  return `
Sos auditor documental de una asociacion deportiva de maxibasquet.
Revisa el archivo adjunto y devolve SOLO JSON valido, sin markdown.

Contexto:
- Equipo: ${documento.equipo_nombre || "sin equipo"}.
- ${jugador}
- Requisito: ${requisito}.

Criterios:
- Declaracion jurada/DJDR/deslinde: debe estar firmada y tener fecha del anio corriente.
- Certificado medico / estudio medico: debe existir aptitud fisica para practica deportiva; si hay estudio y certificado, sus fechas deben ser compatibles o coincidentes. Vigencia: 12 meses.
- Lista de buena fe: debe contener indicio de recibido/sello APdB.
- Seguro: debe mostrar poliza/certificado y nomina/listado de jugadores, o indicar aceptacion provisoria gestionada por APdB.
- Pase: no bloquea habilitacion general; solo observar si parece necesario por traspaso.

Estados posibles:
- validado: el archivo cumple claramente.
- listo_aprobar: parece correcto, pero conviene acto administrativo humano.
- revisar: hay dudas de lectura, sello, firma, fecha o correspondencia.
- observado: hay una observacion relevante que corregir.
- rechazado: no corresponde al requisito o no sirve.
- vencido: corresponde pero esta vencido.

Devolve JSON con esta forma exacta:
{
  "audit_status": "validado|listo_aprobar|revisar|observado|rechazado|vencido",
  "confidence": 0-100,
  "summary": "frase corta en espanol",
  "valid_until": "YYYY-MM-DD o null",
  "detected_dates": ["YYYY-MM-DD"],
  "checks": {
    "corresponde_requisito": true|false|null,
    "tiene_firma": true|false|null,
    "tiene_sello_apdb": true|false|null,
    "tiene_poliza": true|false|null,
    "tiene_nomina": true|false|null,
    "tiene_apto_fisico": true|false|null,
    "fechas_compatibles": true|false|null,
    "anio_corriente": true|false|null
  },
  "findings": {
    "ok": ["..."],
    "dudas": ["..."],
    "faltantes": ["..."]
  },
  "extracted_text": "texto breve extraido o resumen si es imagen"
}
`;
}

function parseJsonObject(text: string) {
  const clean = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(clean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  try {
    const adminSecret = Deno.env.get("DOCUMENT_AUDIT_ADMIN_SECRET");
    if (adminSecret && req.headers.get("x-admin-secret") !== adminSecret) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const payload = await req.json() as AuditRequest;
    if (!["team", "player"].includes(payload.scope)) {
      return jsonResponse({ error: "scope invalido" }, 400);
    }
    if (!payload.documentId) {
      return jsonResponse({ error: "documentId obligatorio" }, 400);
    }

    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const view = payload.scope === "team" ? "v_team_documents_admin" : "v_player_documents_admin";
    const { data: documento, error: docError } = await supabase
      .from(view)
      .select("*")
      .eq("id", payload.documentId)
      .single();

    if (docError || !documento) {
      return jsonResponse({ error: docError?.message || "Documento no encontrado" }, 404);
    }

    const row = documento as DocumentRow;
    if (!row.storage_path) {
      return jsonResponse({ error: "El documento no tiene storage_path" }, 400);
    }

    const { data: fileBlob, error: downloadError } = await supabase
      .storage
      .from("documentos")
      .download(row.storage_path);

    if (downloadError || !fileBlob) {
      return jsonResponse({ error: downloadError?.message || "No se pudo leer el archivo privado" }, 500);
    }

    const mimeType = normalizeMimeType(row.file_type || fileBlob.type);
    const base64 = await blobToBase64(fileBlob);
    const fileName = row.file_name || "documento";
    const prompt = buildAuditPrompt(row, payload.scope);

    const content = mimeType === "application/pdf"
      ? [
          { type: "input_text", text: prompt },
          {
            type: "input_file",
            filename: fileName,
            file_data: `data:${mimeType};base64,${base64}`
          }
        ]
      : [
          { type: "input_text", text: prompt },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64}`
          }
        ];

    const auditModel = requireEnv("DOCUMENT_AUDIT_MODEL");
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${requireEnv("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: auditModel,
        input: [
          {
            role: "user",
            content
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text();
      return jsonResponse({ error: "Error de IA", detail }, 502);
    }

    const raw = await openaiResponse.json();
    const outputText = raw.output_text ||
      raw.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
        .map((item: { text?: string }) => item.text || "")
        .join("\n");

    const audit = parseJsonObject(outputText || "{}");
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
      model: auditModel,
      raw_response: raw,
      audited_by: payload.actor || "auditoria-ia"
    };

    const { data: inserted, error: insertError } = await supabase
      .from("document_ai_audits")
      .insert(insertPayload)
      .select("id, audit_status, confidence, summary, valid_until, audited_at")
      .single();

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({ ok: true, audit: inserted, result: audit });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
