'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { auditDocument, compareDocuments } = require('../tools/document-audit-local/src/audit.cjs');
const { mapDocumentAuditResult } = require('../tools/document-audit-local/src/document-ai-adapter.cjs');

async function main() {
  const root = path.resolve(__dirname, 'fixtures/document-audit');
  const certificate = await auditDocument(path.join(root, 'certificado-texto.pdf'));
  const ecg = await auditDocument(path.join(root, 'ecg-escaneado-multipagina.pdf'));
  const result = compareDocuments(certificate, ecg);
  const rows = mapDocumentAuditResult(result, {
    scope: 'player', documentId: '00000000-0000-4000-8000-000000000001',
    organizacionId: '00000000-0000-4000-8000-000000000010',
    torneoId: '00000000-0000-4000-8000-000000000011',
    categoriaId: '00000000-0000-4000-8000-000000000012',
    equipoId: '00000000-0000-4000-8000-000000000013',
    playerId: '00000000-0000-4000-8000-000000000014',
    playerName: 'LUCAS EMILIO PRUEBA', requirementId: '00000000-0000-4000-8000-000000000015',
    requirementNombre: 'Apto fisico', criteriaVersion: 'APDB_MAXI_2026_V1',
  });
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.audit_status, 'listo_aprobar');
    assert.equal(row.human_decision_required, undefined);
    assert.equal(row.findings.human_decision_required, true);
    assert.equal(row.player_document_id, '00000000-0000-4000-8000-000000000001');
    assert.ok(row.page_evidence.length >= 3);
    assert.ok(row.source_hash);
    assert.equal(row.audited_by, 'auditoria-local-ocr');
    assert.equal(row.source_kind, 'local_file');
    assert.equal(row.approved, undefined);
  }
  const second = mapDocumentAuditResult(result, {
    scope: 'player', documentId: '00000000-0000-4000-8000-000000000001',
    organizacionId: '00000000-0000-4000-8000-000000000010', torneoId: '00000000-0000-4000-8000-000000000011',
    categoriaId: '00000000-0000-4000-8000-000000000012', equipoId: '00000000-0000-4000-8000-000000000013',
  });
  assert.equal(second[0].source_hash, rows[0].source_hash, 'el reanalisis debe conservar la huella de entrada');
  assert.notEqual(rows[0].source_hash, rows[1].source_hash, 'cada archivo debe tener una huella independiente');
  assert.notEqual(rows[0].source_file_id, rows[1].source_file_id, 'cada archivo debe tener un identificador independiente');
  assert.throws(() => mapDocumentAuditResult({ ...result, human_decision_required: false }, {}), /decisión humana/);
  assert.throws(() => mapDocumentAuditResult(result, { ...{ scope: 'player' }, documentId: 'x' }), /contexto/);
  console.log('APDB_DOCUMENT_AI_ADAPTER_OK rows=2 append_only=true human_decision_required=true');
}

main().catch((error) => { console.error(`APDB_DOCUMENT_AI_ADAPTER_FAILED ${error.message}`); process.exitCode = 1; });
