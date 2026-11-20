#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { auditDocument, compareDocuments } = require('./audit.cjs');

async function main() {
  const [, , certificateArg, ecgArg, outputArg] = process.argv;
  if (!certificateArg || !ecgArg) {
    throw new Error('Uso: node cli.cjs <certificado.pdf> <ecg.pdf> [salida.json]');
  }
  const certificate = await auditDocument(path.resolve(certificateArg));
  const ecg = await auditDocument(path.resolve(ecgArg));
  const result = compareDocuments(certificate, ecg);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (outputArg) {
    const output = path.resolve(outputArg);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, json, 'utf8');
  } else {
    process.stdout.write(json);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
