'use strict';

const fs = require('fs');
const path = require('path');
const { createWorker, OEM, PSM } = require('tesseract.js');
const spanish = require('@tesseract.js-data/spa');

function linesFromTsv(tsv) {
  const rows = String(tsv || '').split(/\r?\n/).slice(1).map((line) => line.split('\t'));
  const groups = new Map();
  for (const row of rows) {
    if (row.length < 12 || Number(row[0]) !== 5 || !row[11].trim()) continue;
    const key = row.slice(1, 5).join(':');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      text: row[11],
      confidence: Number(row[10]),
      left: Number(row[6]),
      top: Number(row[7]),
      width: Number(row[8]),
      height: Number(row[9]),
    });
  }
  return [...groups.values()].map((words) => {
    const left = Math.min(...words.map((word) => word.left));
    const top = Math.min(...words.map((word) => word.top));
    const right = Math.max(...words.map((word) => word.left + word.width));
    const bottom = Math.max(...words.map((word) => word.top + word.height));
    return {
      text: words.map((word) => word.text).join(' '),
      bbox: { x: left, y: top, width: right - left, height: bottom - top },
      confidence: words.reduce((sum, word) => sum + word.confidence, 0) / words.length,
    };
  });
}

async function createLocalWorker() {
  return createWorker('spa', OEM.LSTM_ONLY, {
    langPath: spanish.langPath,
    gzip: spanish.gzip,
    cacheMethod: 'none',
    logger: () => {},
  }, {
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
  });
}

async function recognizeImages(images) {
  const worker = await createLocalWorker();
  const pages = [];
  try {
    for (let index = 0; index < images.length; index += 1) {
      const result = await worker.recognize(images[index], {}, { text: true, tsv: true });
      const lines = linesFromTsv(result.data.tsv);
      pages.push({ page: index + 1, lines, text: result.data.text, confidence: result.data.confidence });
    }
  } finally {
    await worker.terminate();
  }
  return pages;
}

module.exports = { linesFromTsv, recognizeImages };
