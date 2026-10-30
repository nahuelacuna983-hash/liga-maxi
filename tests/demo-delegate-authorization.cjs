const assert = require('node:assert/strict');
const Provider = require('../demo_2027_provider.js');

const p = new Provider();
p.generateFixture('asoc-demo', 'maxi-a');
p.setPermission('asoc-demo', 'delegado-a', { role: 'delegado', organizador: 'org-demo', categorias: ['maxi-a'], equipos: ['Sud América'] });
const own = p.getDelegateMatches('delegado-a', 'maxi-a').find((m) => m.local === 'Sud América' || m.visitante === 'Sud América');
assert.ok(own);
p.loadDelegateResult('delegado-a', 'maxi-a', own.partido_numero, 70, 60);
const foreign = p.getMatches('maxi-a').find((m) => m.partido_numero !== own.partido_numero && !['Sud América'].includes(m.local) && !['Sud América'].includes(m.visitante));
if (foreign) assert.throws(() => p.loadDelegateResult('delegado-a', 'maxi-a', foreign.partido_numero, 70, 60), /no puede modificar/);
assert.throws(() => p.loadDelegateResult('delegado-a', 'maxi-b', 1, 70, 60), /categoría/);
console.log('DEMO_DELEGATE_AUTHORIZATION_OK');
