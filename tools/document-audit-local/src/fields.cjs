'use strict';

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeIdentity(value) {
  return normalizeSpaces(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function normalizeDni(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 9 ? digits : null;
}

function normalizeDate(value) {
  const match = String(value || '').match(/\b(0?[1-9]|[12]\d|3[01])[\/-](0?[1-9]|1[0-2])[\/-](20\d{2}|19\d{2})\b/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
}

function findLine(page, labelPattern) {
  return page.lines.find((line) => labelPattern.test(line.text)) || null;
}

function evidenceForLine(documentName, page, line, method) {
  if (!line) return null;
  return {
    document: documentName,
    page: page.page,
    text: normalizeSpaces(line.text),
    coordinates: line.bbox || null,
    method,
    confidence: Number.isFinite(line.confidence) ? Math.round(line.confidence * 100) / 100 : null,
  };
}

function extractFields(documentName, pages, method) {
  const output = { name: null, dni: null, date: null, evidence: {}, doubts: [] };

  for (const page of pages) {
    const nameLine = findLine(page, /\bNOMBRE(?:\s+Y\s+APELLIDO)?\s*:/i);
    if (!output.name && nameLine) {
      const match = nameLine.text.match(/\bNOMBRE(?:\s+Y\s+APELLIDO)?\s*:\s*([A-ZÁÉÍÓÚÑ ]{5,})/i);
      if (match) {
        output.name = normalizeSpaces(match[1]).toUpperCase();
        output.evidence.name = evidenceForLine(documentName, page, nameLine, method);
      }
    }

    const dniLine = findLine(page, /\bDNI\s*:/i);
    if (!output.dni && dniLine) {
      const match = dniLine.text.match(/\bDNI\s*:\s*([\d.\s-]{7,15})/i);
      const normalized = match ? normalizeDni(match[1]) : null;
      if (normalized) {
        output.dni = normalized;
        output.evidence.dni = evidenceForLine(documentName, page, dniLine, method);
      }
    }

    const dateLine = findLine(page, /\bFECHA(?:\s+DEL\s+ESTUDIO|\s+DE\s+EMISION)?\s*:/i);
    if (!output.date && dateLine) {
      const normalized = normalizeDate(dateLine.text);
      if (normalized) {
        output.date = normalized;
        output.evidence.date = evidenceForLine(documentName, page, dateLine, method);
      }
    }
  }

  if (!output.name) output.doubts.push('Nombre no identificado de forma concluyente.');
  if (!output.dni) output.doubts.push('DNI no identificado de forma concluyente.');
  if (!output.date) output.doubts.push('Fecha no identificada de forma concluyente.');
  return output;
}

module.exports = {
  extractFields,
  normalizeDate,
  normalizeDni,
  normalizeIdentity,
  normalizeSpaces,
};
