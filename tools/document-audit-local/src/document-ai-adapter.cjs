'use strict';

const crypto = require('node:crypto');

const ALLOWED_STATUSES = new Set(['pendiente', 'validado', 'listo_aprobar', 'revisar', 'observado', 'rechazado', 'vencido', 'error']);

function averageConfidence(document) {
  const values = Object.values(document.fields?.evidence || {})
    .map((item) => item?.confidence)
    .filter((value) => Number.isFinite(value));
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100 : null;
}

function pageEvidence(document) {
  return Object.entries(document.fields?.evidence || {}).map(([field, evidence]) => ({
    field,
    document: evidence.document,
    page: evidence.page,
    fragment: evidence.text,
    coordinates: evidence.coordinates || null,
    method: evidence.method,
    confidence: evidence.confidence,
  }));
}

function sourceHash(result) {
  return crypto.createHash('sha256')
    .update(result.documents.map((document) => `${document.document}:${document.source_hash}`).join('|'))
    .digest('hex');
}

function mapDocumentAuditResult(result, context = {}) {
  if (!result || result.schema_version !== 'apdb-local-document-audit/1.0') {
    throw new Error('Resultado OCR incompatible con apdb-local-document-audit/1.0');
  }
  if (result.human_decision_required !== true) {
    throw new Error('La auditoría local debe exigir decisión humana');
  }
  if (!context.scope || !['team', 'player'].includes(context.scope)) {
    throw new Error('scope debe ser team o player');
  }
  const documentIds = context.scope === 'team'
    ? { team_document_id: context.documentId, player_document_id: null }
    : { team_document_id: null, player_document_id: context.documentId };
  if (!context.documentId || !context.organizacionId || !context.torneoId || !context.categoriaId || !context.equipoId) {
    throw new Error('Falta contexto documental/deportivo obligatorio');
  }
  const status = ALLOWED_STATUSES.has(result.audit_status) ? result.audit_status : 'error';
  const combinedHash = sourceHash(result);
  const base = {
    scope: context.scope,
    ...documentIds,
    organizacion_id: context.organizacionId,
    torneo_id: context.torneoId,
    categoria_id: context.categoriaId,
    equipo_id: context.equipoId,
    equipo_nombre: context.equipoNombre || null,
    player_id: context.playerId || null,
    player_name: context.playerName || null,
    requirement_id: context.requirementId || null,
    requirement_nombre: context.requirementNombre || null,
    criteria_version: context.criteriaVersion || 'APDB_MAXI_2026_V1',
    audit_status: status,
    summary: result.observations.join(' '),
    findings: {
      observations: result.observations,
      doubts: result.doubts,
      identity_comparison: result.identity_comparison,
      human_decision_required: true,
    },
    extracted_text: result.documents.map((document) => document.pages.map((page) => `[p${page.page}] ${page.text}`).join('\n')).join('\n'),
    detected_dates: result.documents.map((document) => ({ document: document.document, date: document.fields.date })),
    checks: { ...result.checks, identity_comparison: result.identity_comparison },
    model: result.documents.map((document) => document.extraction_method).join('+'),
    raw_response: result,
    audited_by: 'auditoria-local-ocr',
    source_kind: 'local_file',
    source_file_id: context.sourceFileId || result.documents.map((document) => document.document).join('|'),
    source_hash: combinedHash,
    page_evidence: result.documents.flatMap(pageEvidence),
  };
  return result.documents.map((document) => ({
    ...base,
    file_name: document.document,
    file_type: 'application/pdf',
    storage_path: context.storagePath || null,
    confidence: averageConfidence(document),
  }));
}

module.exports = { mapDocumentAuditResult };
