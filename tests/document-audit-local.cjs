'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { auditDocument, compareDocuments } = require('../tools/document-audit-local/src/audit.cjs');

const fixtures = path.resolve(__dirname, 'fixtures/document-audit');

async function timed(name, callback) {
  const started = performance.now();
  await callback();
  return { name, duration_ms: Math.round((performance.now() - started) * 100) / 100, result: 'PASS' };
}

async function main() {
  const expected = JSON.parse(fs.readFileSync(path.join(fixtures, 'expected.json'), 'utf8')).person;
  const certificate = await auditDocument(path.join(fixtures, 'certificado-texto.pdf'));
  const ecg = await auditDocument(path.join(fixtures, 'ecg-escaneado-multipagina.pdf'));
  const different = await auditDocument(path.join(fixtures, 'ecg-dni-diferente.pdf'));
  const illegibleDate = await auditDocument(path.join(fixtures, 'certificado-fecha-ilegible.pdf'));
  const results = [];

  results.push(await timed('A_identidad_coincidente', async () => {
    const comparison = compareDocuments(certificate, ecg);
    assert.equal(comparison.identity_comparison, 'coincidente');
    assert.equal(comparison.audit_status, 'listo_aprobar');
    assert.equal(comparison.human_decision_required, true);
  }));

  results.push(await timed('B_inconsistencia_dni', async () => {
    const comparison = compareDocuments(certificate, different);
    assert.equal(comparison.identity_comparison, 'inconsistente');
    assert.equal(comparison.audit_status, 'revisar');
  }));

  results.push(await timed('C_fecha_ilegible', async () => {
    assert.equal(illegibleDate.fields.date, null);
    assert.match(illegibleDate.fields.doubts.join(' '), /Fecha no identificada/);
  }));

  results.push(await timed('D_pdf_texto_sin_ocr', async () => {
    assert.equal(certificate.extraction_method, 'pdf_text');
    assert.equal(certificate.fields.name, expected.name);
    assert.equal(certificate.fields.dni, expected.dni.replace(/\D/g, ''));
    assert.equal(certificate.fields.date, expected.date);
  }));

  results.push(await timed('E_documento_escaneado_con_ocr', async () => {
    assert.equal(ecg.extraction_method, 'local_ocr');
    assert.equal(ecg.fields.name, expected.name);
    assert.equal(ecg.fields.dni, expected.dni.replace(/\D/g, ''));
    assert.equal(ecg.fields.date, expected.date);
    assert.ok(ecg.fields.evidence.dni.coordinates);
  }));

  results.push(await timed('F_evidencia_multipagina', async () => {
    assert.equal(ecg.pages.length, 2);
    assert.equal(ecg.fields.evidence.name.page, 2);
    assert.equal(ecg.fields.evidence.dni.page, 2);
    assert.equal(ecg.fields.evidence.date.page, 2);
  }));

  const comparison = compareDocuments(certificate, ecg);
  const report = {
    executed_at: new Date().toISOString(),
    total_duration_ms: Math.round((certificate.duration_ms + ecg.duration_ms + different.duration_ms + illegibleDate.duration_ms) * 100) / 100,
    document_durations_ms: {
      certificate_text: certificate.duration_ms,
      ecg_scanned_multipage: ecg.duration_ms,
      ecg_different_dni: different.duration_ms,
      certificate_illegible_date: illegibleDate.duration_ms,
    },
    tests: results,
    sample_result: comparison,
  };
  const outputDirectory = path.resolve(__dirname, '../test-results/document-audit-local');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'test-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDirectory, 'sample-audit.json'), `${JSON.stringify(comparison, null, 2)}\n`);
  console.log(`APDB_LOCAL_DOCUMENT_AUDIT_OK ${results.length}/${results.length} pruebas`);
  console.log(JSON.stringify(report.document_durations_ms));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
