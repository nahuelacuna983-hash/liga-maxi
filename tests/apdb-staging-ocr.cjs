'use strict';

const path = require('node:path');
const { auditDocument, compareDocuments } = require('../tools/document-audit-local/src/audit.cjs');
const { mapDocumentAuditResult } = require('../tools/document-audit-local/src/document-ai-adapter.cjs');

const STAGING_URL = process.env.APDB_STAGING_URL || 'https://wffvmthdmmjwspnozyrv.supabase.co';
const STAGING_KEY = process.env.APDB_STAGING_ANON_KEY;
const WORKER_EMAIL = 'auditor-ocr@apdb-test.invalid';
const CONTEXT = {
  scope: 'team', documentId: 'a7000000-0000-4000-8000-000000000401',
  organizacionId: 'a7000000-0000-4000-8000-000000000001', torneoId: 'a7000000-0000-4000-8000-000000000002',
  categoriaId: 'a7000000-0000-4000-8000-000000000003', equipoId: 'a7000000-0000-4000-8000-000000000011',
  equipoNombre: 'Equipo Sintético Norte', requirementId: 'a7000000-0000-4000-8000-000000000301',
  requirementNombre: 'Apto físico', criteriaVersion: 'APDB_MAXI_2026_V1',
};

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin; const stdout = process.stdout; let value = '';
    stdout.write(question); const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true); stdin.resume();
    const onData = (chunk) => { for (const char of chunk.toString('utf8')) {
      if (char === '\u0003') process.exitCode = 130;
      else if (char === '\r' || char === '\n') { stdin.removeListener('data', onData); if (stdin.setRawMode) stdin.setRawMode(Boolean(wasRaw)); stdout.write('\n'); resolve(value); return; }
      else if (char === '\u007f' || char === '\b') value = value.slice(0, -1); else value += char;
    }};
    stdin.on('data', onData);
  });
}

async function request(pathname, options = {}) {
  const response = await fetch(`${STAGING_URL}${pathname}`, options);
  const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}

async function main() {
  if (!/^https:\/\/wffvmthdmmjwspnozyrv\.supabase\.co\/?$/i.test(STAGING_URL)) throw new Error('Destino no autorizado: sólo APdB staging');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$|^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(STAGING_KEY || '')) throw new Error('Falta APDB_STAGING_ANON_KEY publicable');
  let password = await askHidden(`Contraseña de ${WORKER_EMAIL}: `);
  const login = await request('/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: STAGING_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: WORKER_EMAIL, password }) });
  password = null;
  if (!login.response.ok || !login.body.access_token) throw new Error(`Auth OCR falló: HTTP ${login.response.status}`);
  const token = login.body.access_token;
  const root = path.resolve('tests/fixtures/document-audit');
  const result = compareDocuments(await auditDocument(path.join(root, 'certificado-texto.pdf')), await auditDocument(path.join(root, 'ecg-escaneado-multipagina.pdf')));
  const rows = mapDocumentAuditResult(result, CONTEXT).map(({ audited_by, ...row }) => row);
  const call = async (row) => request('/rest/v1/rpc/apdb_record_automatic_document_audit', { method: 'POST', headers: { apikey: STAGING_KEY, Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_payload: row }) });
  const first = [];
  for (const row of rows) { const response = await call(row); if (!response.response.ok) throw new Error(`RPC OCR falló: HTTP ${response.response.status}`); first.push(response.body); }
  const duplicate = [];
  for (const row of rows) { const response = await call(row); if (!response.response.ok) throw new Error(`Reintento OCR falló: HTTP ${response.response.status}`); duplicate.push(response.body); }
  if (JSON.stringify(first) !== JSON.stringify(duplicate)) throw new Error('La repetición idéntica no devolvió los mismos identificadores');
  console.log(`APDB_STAGING_OCR_RPC_OK audits=${first.length} idempotent=true human_decision_required=true`);
}

main().catch((error) => { console.error(`APDB_STAGING_OCR_FAILED ${error.message}`); process.exitCode = 1; });
