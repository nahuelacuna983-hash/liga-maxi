const assert = require('node:assert/strict');
const Provider = require('../demo_2027_provider.js');

const p = new Provider();
p.generateFixture('asoc-demo', 'maxi-a', { start: '2027-04-04', blocked: ['2027-04-11'], gameDay: 0 });
const first = p.getMatches('maxi-a')[0];
assert.throws(() => p.updateMatchSchedule('asoc-demo', 'maxi-a', first.partido_numero, { fecha: '2027-04-11' }), /bloqueada/);
const scheduled = p.updateMatchSchedule('asoc-demo', 'maxi-a', first.partido_numero, { fecha: '2027-04-18', hora: '20:30', cancha: 'Municipal' });
assert.equal(scheduled.cancha, 'Municipal');
assert.equal(p.scheduleHistory.length, 1);
p.loadResult('maxi-a', first.partido_numero, 70, 60);
assert.throws(() => p.updateMatchSchedule('asoc-demo', 'maxi-a', first.partido_numero, { cancha: 'Otra' }), /resultado/);
assert.throws(() => p.addTeam('asoc-demo', 'maxi-a', 'Nuevo equipo'), /resultado/);
console.log('DEMO_SCHEDULING_OK');
