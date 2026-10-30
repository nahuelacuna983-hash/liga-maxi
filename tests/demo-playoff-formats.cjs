const assert = require('node:assert/strict');
const Provider = require('../demo_2027_provider.js');

function completeRegularSeason(provider, categoryId, teams) {
  provider.setCategoryTeams('asoc-demo', categoryId, teams);
  provider.generateFixture('asoc-demo', categoryId, { start: '2027-06-06' });
  for (const match of provider.getMatches(categoryId)) provider.loadResult(categoryId, match.partido_numero, 80, 70);
}
function completeRound(provider, categoryId, round, score = [80, 70]) {
  for (const match of provider.getPlayoffMatches(categoryId).filter((item) => item.ronda === round && item.puntos_local == null)) provider.loadPlayoffResult(categoryId, match.partido_numero, score[0], score[1]);
  return provider.advancePlayoffs(categoryId);
}

const p = new Provider();
completeRegularSeason(p, 'maxi-a', ['A', 'B', 'C', 'D', 'E', 'F']);
const top6 = p.generatePlayoffs('maxi-a', 6, { seriesGames: 2 });
assert.equal(top6.matches.filter((m) => m.ronda === 'repechaje').length, 4);
completeRound(p, 'maxi-a', 'repechaje', [70, 60]);
assert.equal(p.getPlayoffMatches('maxi-a').filter((m) => m.ronda === 'semifinales').length, 0, 'global tie must not advance');
for (const tiedSecond of p.getPlayoffMatches('maxi-a').filter((m) => m.ronda === 'repechaje' && m.serie_partido === 2)) {
  p.annulPlayoffResult('maxi-a', tiedSecond.partido_numero);
  p.loadPlayoffResult('maxi-a', tiedSecond.partido_numero, 70, 50);
}
p.advancePlayoffs('maxi-a');
assert.equal(p.getPlayoffMatches('maxi-a').filter((m) => m.ronda === 'semifinales').length, 4, 'two-game series generate two semifinal matches per pairing');
completeRound(p, 'maxi-a', 'semifinales');
completeRound(p, 'maxi-a', 'final');
assert.equal(p.getPlayoffs('maxi-a').estado, 'finalizado');
assert.ok(p.getChampion('maxi-a'));

const p8 = new Provider();
completeRegularSeason(p8, 'maxi-a', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
p8.generatePlayoffs('maxi-a', 8, { seriesGames: 1 });
completeRound(p8, 'maxi-a', 'cuartos');
assert.equal(p8.getPlayoffMatches('maxi-a').filter((m) => m.ronda === 'semifinales').length, 2);
completeRound(p8, 'maxi-a', 'semifinales');
completeRound(p8, 'maxi-a', 'final');
assert.equal(p8.getPlayoffs('maxi-a').estado, 'finalizado');
assert.ok(p8.getChampion('maxi-a'));
console.log('DEMO_PLAYOFF_FORMATS_OK');
