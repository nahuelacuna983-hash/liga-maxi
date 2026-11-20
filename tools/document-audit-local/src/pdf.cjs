'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function groupPdfItems(items) {
  const rows = new Map();
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const key = [...rows.keys()].find((existing) => Math.abs(existing - y) <= 2) ?? y;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(item);
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) => {
      row.sort((a, b) => a.transform[4] - b.transform[4]);
      const left = Math.min(...row.map((item) => item.transform[4]));
      const bottom = Math.min(...row.map((item) => item.transform[5]));
      const right = Math.max(...row.map((item) => item.transform[4] + item.width));
      const top = Math.max(...row.map((item) => item.transform[5] + item.height));
      return {
        text: row.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim(),
        bbox: { x: left, y: bottom, width: right - left, height: top - bottom },
        confidence: 100,
      };
    });
}

async function extractPdfText(pdfPath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const document = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    const lines = groupPdfItems(content.items);
    pages.push({ page: number, lines, text: lines.map((line) => line.text).join('\n') });
  }
  return pages;
}

function resolvePdfToPpm() {
  if (process.env.PDFTOPPM_PATH && fs.existsSync(process.env.PDFTOPPM_PATH)) {
    return process.env.PDFTOPPM_PATH;
  }
  try {
    return execFileSync('where.exe', ['pdftoppm.exe'], { encoding: 'utf8' }).split(/\r?\n/).find(Boolean).trim();
  } catch {
    throw new Error('No se encontro pdftoppm. Configure PDFTOPPM_PATH con la ruta del ejecutable de Poppler.');
  }
}

function renderPdfPages(pdfPath, dpi = 220) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'apdb-document-audit-'));
  const prefix = path.join(directory, 'page');
  execFileSync(resolvePdfToPpm(), ['-png', '-r', String(dpi), pdfPath, prefix], { stdio: 'pipe' });
  const images = fs.readdirSync(directory)
    .filter((file) => /^page-\d+\.png$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => path.join(directory, file));
  return { directory, images };
}

module.exports = { extractPdfText, renderPdfPages };
