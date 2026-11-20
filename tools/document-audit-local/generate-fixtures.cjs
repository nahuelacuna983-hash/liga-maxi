'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const outputDirectory = path.resolve(__dirname, '../../tests/fixtures/document-audit');
const person = { name: 'LUCAS EMILIO PRUEBA', dni: '40.123.456', date: '15/11/2026' };

async function textPdf(fileName, title, fields, pages = 1) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const page = pdf.addPage([595, 842]);
    page.drawText(title, { x: 60, y: 770, size: 20, font: bold, color: rgb(0.05, 0.16, 0.28) });
    page.drawText(`DOCUMENTO SINTETICO - PAGINA ${pageNumber}`, { x: 60, y: 742, size: 10, font });
    if (pageNumber === pages) {
      fields.forEach((line, index) => page.drawText(line, { x: 80, y: 660 - index * 55, size: 16, font }));
    } else {
      page.drawText('Caratula sin datos identificatorios.', { x: 80, y: 650, size: 14, font });
    }
  }
  fs.writeFileSync(path.join(outputDirectory, fileName), await pdf.save());
}

async function scannedPdf(fileName, title, fields, pages = 2) {
  const pdf = await PDFDocument.create();
  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const lines = pageNumber === pages
      ? fields
      : ['CARATULA DE ESTUDIO', 'Documento sintetico.', 'Sin datos personales en esta pagina.'];
    const svg = `
      <svg width="1400" height="1980" xmlns="http://www.w3.org/2000/svg">
        <rect width="1400" height="1980" fill="#f8f8f4"/>
        <rect x="90" y="90" width="1220" height="1800" fill="none" stroke="#263746" stroke-width="4"/>
        <text x="150" y="210" font-family="Arial" font-size="54" font-weight="700">${title}</text>
        <text x="150" y="280" font-family="Arial" font-size="28">DOCUMENTO SINTETICO - PAGINA ${pageNumber}</text>
        ${lines.map((line, index) => `<text x="180" y="${520 + index * 150}" font-family="Arial" font-size="48">${line}</text>`).join('')}
        <line x1="150" y1="1650" x2="1250" y2="1650" stroke="#777" stroke-width="3"/>
      </svg>`;
    const image = await sharp(Buffer.from(svg)).rotate(pageNumber === pages ? 0.25 : -0.2, { background: '#f8f8f4' }).png().toBuffer();
    const embedded = await pdf.embedPng(image);
    const page = pdf.addPage([595, 842]);
    page.drawImage(embedded, { x: 0, y: 0, width: 595, height: 842 });
  }
  fs.writeFileSync(path.join(outputDirectory, fileName), await pdf.save());
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  await textPdf('certificado-texto.pdf', 'CERTIFICADO MEDICO SINTETICO', [
    `NOMBRE: ${person.name}`,
    `DNI: ${person.dni}`,
    `FECHA DE EMISION: ${person.date}`,
    'CONSTANCIA: Control documental de prueba.',
  ]);
  await scannedPdf('ecg-escaneado-multipagina.pdf', 'REGISTRO ECG SINTETICO', [
    `NOMBRE: ${person.name}`,
    `DNI: ${person.dni}`,
    `FECHA DEL ESTUDIO: ${person.date}`,
    'NOTA: Sin interpretacion clinica.',
  ]);
  await scannedPdf('ecg-dni-diferente.pdf', 'REGISTRO ECG SINTETICO', [
    `NOMBRE: ${person.name}`,
    'DNI: 40.123.457',
    `FECHA DEL ESTUDIO: ${person.date}`,
    'NOTA: Sin interpretacion clinica.',
  ]);
  await textPdf('certificado-fecha-ilegible.pdf', 'CERTIFICADO MEDICO SINTETICO', [
    `NOMBRE: ${person.name}`,
    `DNI: ${person.dni}`,
    'FECHA DE EMISION: ##/##/####',
    'CONSTANCIA: Control documental de prueba.',
  ]);
  fs.writeFileSync(path.join(outputDirectory, 'expected.json'), `${JSON.stringify({ person }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
