const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { JsonFileRepository } = require('../demo_2027_repository.js');
const PersistentSyntheticProvider = require('../demo_2027_persistent_provider.js');

(async () => {
  const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'liga-maxi-')), 'state.json');
  const repository = new JsonFileRepository(file);
  const first = new PersistentSyntheticProvider();
  const tournament = first.createTournament('asoc-demo', { nombre: 'Persistencia 2027', temporada: 2027 });
  first.setActiveTournament('asoc-demo', tournament.id);
  first.addCategory('asoc-demo', tournament.id, { id: 'persist-cat', nombre: 'Maxi Persistente' });
  for (const team of ['A', 'B', 'C', 'D']) first.addTeam('asoc-demo', 'persist-cat', team);
  first.generateFixture('asoc-demo', 'persist-cat', { start: '2027-06-06', gameDay: 0, blocked: [] });
  const match = first.getMatches('persist-cat')[0];
  first.updateMatchSchedule('asoc-demo', 'persist-cat', match.partido_numero, { fecha: '2027-06-13', hora: '20:00', cancha: 'Central' });
  first.loadResult('persist-cat', match.partido_numero, 70, 60);
  await first.saveTo(repository);

  const second = new PersistentSyntheticProvider();
  await second.loadFrom(repository);
  assert.equal(second.activeTournamentId, tournament.id);
  assert.deepEqual(second.getCategory('persist-cat').equipos, ['A', 'B', 'C', 'D']);
  assert.equal(second.getMatches('persist-cat').length, 6);
  assert.equal(second.getMatches('persist-cat')[0].puntos_local, 70);
  assert.equal(second.scheduleHistory.length, 1);
  assert.equal(second.getTable('persist-cat').length, 4);
  await fs.rm(path.dirname(file), { recursive: true, force: true });
  console.log('DEMO_PERSISTENCE_RESTART_OK');
})().catch((error) => { console.error(error); process.exitCode = 1; });
