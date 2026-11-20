'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { extractFields, normalizeIdentity } = require('./fields.cjs');
const { extractPdfText, renderPdfPages } = require('./pdf.cjs');
const { recognizeImages } = require('./ocr.cjs');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hasUsefulText(pages) {
  const text = pages.map((page) => page.text).join('\n');
  return text.length > 40 && /\b(?:NOMBRE|DNI|FECHA)\b/i.test(text);
}

async function auditDocument(filePath) {
  const started = performance.now();
  const directPages = await extractPdfText(filePath);
  let pages = directPages;
  let method = 'pdf_text';

  if (!hasUsefulText(directPages)) {
    method = 'local_ocr';
    const rendered = renderPdfPages(filePath);
    try {
      pages = await recognizeImages(rendered.images);
    } finally {
      fs.rmSync(rendered.directory, { recursive: true, force: true });
    }
  }

  const documentName = path.basename(filePath);
  const fields = extractFields(documentName, pages, method);
  return {
    document: documentName,
    source_hash: sha256(filePath),
    extraction_method: method,
    fields,
    pages: pages.map((page) => ({ page: page.page, text: page.text })),
    duration_ms: Math.round((performance.now() - started) * 100) / 100,
  };
}

function compareDocuments(certificate, ecg) {
  const observations = [];
  const doubts = [...certificate.fields.doubts, ...ecg.fields.doubts];
  let identity = 'coincidente';

  if (!certificate.fields.dni || !ecg.fields.dni || !certificate.fields.name || !ecg.fields.name) {
    identity = 'no_concluyente';
    observations.push('No hay evidencia suficiente para comparar completamente la identidad.');
  } else if (
    certificate.fields.dni !== ecg.fields.dni
    || normalizeIdentity(certificate.fields.name) !== normalizeIdentity(ecg.fields.name)
  ) {
    identity = 'inconsistente';
    observations.push('Los documentos contienen identidades diferentes. Requiere revision humana.');
  } else {
    observations.push('Nombre y DNI coinciden entre los documentos sintéticos.');
  }

  if (!certificate.fields.date || !ecg.fields.date) {
    observations.push('Al menos una fecha no pudo determinarse de forma concluyente.');
  }

  return {
    schema_version: 'apdb-local-document-audit/1.0',
    audit_status: identity === 'coincidente' && certificate.fields.date && ecg.fields.date ? 'listo_aprobar' : 'revisar',
    human_decision_required: true,
    identity_comparison: identity,
    observations,
    doubts,
    documents: [certificate, ecg],
    checks: {
      name_matches: certificate.fields.name && ecg.fields.name
        ? normalizeIdentity(certificate.fields.name) === normalizeIdentity(ecg.fields.name)
        : null,
      dni_matches: certificate.fields.dni && ecg.fields.dni
        ? certificate.fields.dni === ecg.fields.dni
        : null,
      dates_readable: Boolean(certificate.fields.date && ecg.fields.date),
    },
  };
}

module.exports = { auditDocument, compareDocuments };
