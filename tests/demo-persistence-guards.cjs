const assert = require('node:assert/strict');
const Provider = require('../demo_2027_provider.js');

const provider = new Provider();
provider.generateFixture('asoc-demo', 'maxi-a');
const before = provider.getMatches('maxi-a');
provider.setCategoryTeams('asoc-demo', 'maxi-a', before.slice(0, 2).flatMap((m) => [m.local, m.visitante]).filter((v, i, a) => a.indexOf(v) === i));
assert.equal(provider.getMatches('maxi-a').length, 0, 'pending fixture may be replaced');
provider.setCategoryTeams('asoc-demo', 'maxi-a', ['Sud América', 'Gonnet', 'Banco Provincia', 'Estudiantes']);
provider.generateFixture('asoc-demo', 'maxi-a');
provider.loadResult('maxi-a', 1, 70, 60);
assert.throws(() => provider.generateFixture('asoc-demo', 'maxi-a'), /resultados disputados/);
assert.throws(() => provider.setCategoryTeams('asoc-demo', 'maxi-a', ['Sud América', 'Gonnet']), /resultados disputados/);
console.log('DEMO_PERSISTENCE_GUARDS_OK');
