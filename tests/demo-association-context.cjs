const assert = require('node:assert/strict');
const fs = require('node:fs');
const Provider = require('../demo_2027_provider.js');

const source = fs.readFileSync('demo_asociacion_2027.js', 'utf8');
assert.match(source, /provider\.getMatches\(selectedCategoryId\(\)\)/);
assert.match(source, /El torneo activo no tiene categoría o fixture generado/);
assert.doesNotMatch(source, /renderCompetition\(\).*currentFixture\.length/);

const p = new Provider();
const aperture = p.activeTournamentId;
const category = p.getCategories()[0].id;
p.generateFixture('asoc-demo', category);
const apertureMatches = p.getMatches(category).length;
const clausura = p.createTournament('asoc-demo', { nombre: 'Clausura de prueba 2027', temporada: 2027 });
p.setActiveTournament('asoc-demo', clausura.id);
assert.equal(p.getCategories().length, 0);
assert.equal(p.getMatches(category).length, apertureMatches, 'old data remains stored but is not in active category scope');
assert.deepEqual(p.getCategories(clausura.id), []);
p.setActiveTournament('asoc-demo', aperture);
assert.equal(p.getCategories().length, 2);
assert.equal(p.getMatches(category).length, apertureMatches);
console.log('DEMO_ASSOCIATION_CONTEXT_OK');
