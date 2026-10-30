(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Demo2027Fixture = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function generateRoundRobin(teams) {
    const list = teams.slice(); if (list.length % 2) list.push(null); const rounds = [];
    for (let round = 0; round < list.length - 1; round++) {
      const games = [];
      let libre = "";
      const invierte = round % 2 === 1;
      for (let i = 0; i < list.length / 2; i++) { const a = list[i]; const b = list[list.length - 1 - i]; if (!a || !b) { libre = a || b || ""; continue; } games.push({ local: invierte ? b : a, visitante: invierte ? a : b }); }
      rounds.push({ partidos: games, libre }); list.splice(1, 0, list.pop());
    }
    return rounds;
  }
  function addDays(iso, days) { const date = new Date(`${iso}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
  function nextGameDay(startISO, gameDay) { const start = new Date(`${startISO}T12:00:00Z`); const distance = (Number(gameDay) - start.getUTCDay() + 7) % 7; return addDays(startISO, distance); }
  function generateFixture(teams, startISO, blocked = [], frequency = 1, wheels = 1, gameDay = 0) {
    const blockedSet = new Set(blocked); const base = generateRoundRobin(teams); const jornadas = []; let date = nextGameDay(startISO, gameDay); let matchNumber = 0;
    for (let wheel = 1; wheel <= wheels; wheel++) base.forEach((round) => {
      while (blockedSet.has(date)) date = addDays(date, 7 * frequency);
      const invert = wheel % 2 === 0;
      const partidos = round.partidos.map((game) => ({ local: invert ? game.visitante : game.local, visitante: invert ? game.local : game.visitante, jornada: jornadas.length + 1, rueda: wheel, partido_numero: ++matchNumber, fecha: date, estado_resultado: "pendiente", puntos_local: null, puntos_visitante: null }));
      jornadas.push({ numero: jornadas.length + 1, rueda: wheel, fecha: date, libre: round.libre, partidos }); date = addDays(date, 7 * frequency);
    });
    return { rounds: base.length, jornadas, matches: jornadas.flatMap((jornada) => jornada.partidos), blocked: [...blockedSet], ultimaFecha: jornadas.at(-1)?.fecha || "" };
  }
  return { generateRoundRobin, generateFixture };
});
