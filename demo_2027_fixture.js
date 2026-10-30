(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Demo2027Fixture = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function generateRoundRobin(teams) {
    const list = teams.slice(); if (list.length % 2) list.push(null); const rounds = [];
    for (let round = 0; round < list.length - 1; round++) {
      const games = [];
      for (let i = 0; i < list.length / 2; i++) { const home = list[i]; const away = list[list.length - 1 - i]; if (home && away) games.push({ local: home, visitante: away }); }
      rounds.push(games); list.splice(1, 0, list.pop());
    }
    return rounds;
  }
  function addDays(iso, days) { const date = new Date(`${iso}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
  function generateFixture(teams, startISO, blocked = [], frequency = 1) {
    const blockedSet = new Set(blocked); const rounds = generateRoundRobin(teams); const matches = []; let date = startISO;
    rounds.forEach((round, index) => { while (blockedSet.has(date)) date = addDays(date, 7 * frequency); round.forEach((game, gameIndex) => matches.push({ ...game, jornada: index + 1, partido_numero: gameIndex + 1, fecha: date, estado_resultado: "pendiente", puntos_local: null, puntos_visitante: null })); date = addDays(date, 7 * frequency); });
    return { rounds: rounds.length, matches, blocked: [...blockedSet] };
  }
  return { generateRoundRobin, generateFixture };
});
