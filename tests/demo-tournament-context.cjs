const assert = require('node:assert/strict');
const Provider = require('../demo_2027_provider.js');

const p = new Provider();
const original = p.activeTournamentId;
const originalCategory = p.getCategories()[0].id;
p.generateFixture('asoc-demo', originalCategory);
const before = p.getMatches(originalCategory).length;
const created = p.createTournament('asoc-demo', { nombre: 'Segundo torneo', temporada: 2027 });
p.setActiveTournament('asoc-demo', created.id);
assert.deepEqual(p.getCategories(), [], 'new tournament has no inherited categories');
assert.deepEqual(p.getMatches(originalCategory).length, before, 'previous tournament fixture preserved');
assert.throws(() => p.generateFixture('asoc-demo', originalCategory), /no puede generar|fuera del torneo activo/);
p.setActiveTournament('asoc-demo', original);
assert.equal(p.getCategories().length, 2);
assert.equal(p.getMatches(originalCategory).length, before);
console.log('DEMO_TOURNAMENT_CONTEXT_OK');
