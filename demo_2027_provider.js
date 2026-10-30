(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./demo_2027_fixture.js"), require("./demo_2027_sports.js"));
  else root.SyntheticDataProvider = factory(root.Demo2027Fixture, root.Demo2027Sports);
})(typeof window !== "undefined" ? window : globalThis, function (fixtureRules, sportsRules) {
  "use strict";
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  class SyntheticDataProvider {
    constructor() {
      this.tournament = { id: "demo-2027", nombre: "Apertura de prueba 2027", estado: "activo" };
      this.categories = {
        "maxi-a": { id: "cat-maxi-a", nombre: "Maxi +35 A", equipos: ["Sud América", "Gonnet", "Banco Provincia", "Estudiantes"], blocked: ["2027-04-11"] },
        "maxi-b": { id: "cat-maxi-b", nombre: "Maxi +35 B", equipos: ["Estrella de Berisso", "Mayo", "Universal", "Los Hornos"], blocked: [] },
      };
      this.matches = {};
      this.playoffs = {};
      this.delegates = { "delegado-a": { nombre: "Delegado A", equipos: ["Sud América"] }, "delegado-b": { nombre: "Delegado B", equipos: ["Gonnet"] } };
    }
    getTournament() { return clone(this.tournament); }
    getCategories() { return clone(Object.values(this.categories)); }
    getCategory(id) { return clone(this.categories[id]); }
    getTeams(categoryId) { return clone(this.categories[categoryId]?.equipos || []); }
    setCategoryTeams(categoryId, teams) {
      if (!this.categories[categoryId] || !Array.isArray(teams) || teams.length < 2) throw new Error("Equipos sintéticos inválidos.");
      this.categories[categoryId].equipos = [...teams];
      this.matches[categoryId] = [];
    }
    generateFixture(categoryId, options = {}) {
      const category = this.categories[categoryId]; if (!category) throw new Error("Categoría sintética inexistente.");
      const generated = fixtureRules.generateFixture(category.equipos, options.start || "2027-04-04", options.blocked || category.blocked, options.frequency || 1, options.wheels || 1, options.gameDay ?? 0);
      this.matches[categoryId] = generated.matches; return clone(generated);
    }
    getMatches(categoryId) { return clone(this.matches[categoryId] || []); }
    loadResult(categoryId, matchNumber, local, visitante) {
      sportsRules.validateNormalResult(local, visitante);
      const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber);
      if (!match) throw new Error("Partido sintético inexistente.");
      match.puntos_local = local; match.puntos_visitante = visitante; match.estado_resultado = "jugado"; return clone(match);
    }
    loadDelegateResult(delegateId, categoryId, matchNumber, local, visitante) {
      const delegate = this.delegates[delegateId]; const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber);
      const category = this.categories[categoryId];
      if (!delegate || !category) throw new Error("Delegado o categoría sintética inexistente.");
      if (category.closed) throw new Error("La categoría está cerrada.");
      if (!match || (!delegate.equipos.includes(match.local) && !delegate.equipos.includes(match.visitante))) throw new Error("El delegado no puede modificar este partido.");
      return this.loadResult(categoryId, matchNumber, local, visitante);
    }
    setAdministrativeNoPoints(categoryId, matchNumber) {
      const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber);
      if (!match) throw new Error("Partido sintético inexistente.");
      match.puntos_local = 0; match.puntos_visitante = 0; match.estado_resultado = "administrativo_sin_puntos"; return clone(match);
    }
    annulResult(categoryId, matchNumber) { const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber); if (!match) throw new Error("Partido sintético inexistente."); match.puntos_local = null; match.puntos_visitante = null; match.estado_resultado = "pendiente"; return clone(match); }
    setCategoryClosed(categoryId, closed = true) { if (!this.categories[categoryId]) throw new Error("Categoría sintética inexistente."); this.categories[categoryId].closed = Boolean(closed); }
    getTable(categoryId) { return sportsRules.calcularTabla(this.matches[categoryId] || []); }
    generatePlayoffs(categoryId, classified = 4, options = {}) {
      if (!this.categories[categoryId]) throw new Error("Categoría sintética inexistente.");
      if (![4, 6, 8].includes(Number(classified))) throw new Error("Formato de playoffs no definido en la demo.");
      const table = this.getTable(categoryId).slice(0, Number(classified));
      if (table.length < Number(classified)) {
        this.playoffs[categoryId] = { formato: `top${classified}`, estado: "pendiente_clasificados", clasificados_requeridos: Number(classified), matches: [] };
        return clone(this.playoffs[categoryId]);
      }
      const pairings = Number(classified) === 8
        ? [[1, 8], [4, 5], [2, 7], [3, 6]]
        : Number(classified) === 6
          ? [[3, 6], [4, 5]]
          : [[1, 4], [2, 3]];
      const mode = Number(classified) === 6 ? "global" : (options.mode || "mejor_de");
      const games = Number(options.seriesGames || (Number(classified) === 6 ? 2 : 1));
      if (![1, 2, 3].includes(games)) throw new Error("Cantidad de partidos de serie no definida.");
      const matches = pairings.flatMap(([a, b], index) => Array.from({ length: games }, (_, game) => ({
        llave: Number(classified) === 6 ? `repechaje_${index + 1}` : `cuartos_${index + 1}`,
        ronda: Number(classified) === 6 ? "repechaje" : Number(classified) === 4 ? "semifinales" : "cuartos",
        partido_numero: index * games + game + 1,
        serie_partido: game + 1,
        local: (game % 2 === 0 ? table[a - 1]?.equipo : table[b - 1]?.equipo),
        visitante: (game % 2 === 0 ? table[b - 1]?.equipo : table[a - 1]?.equipo),
        modo_definicion: mode,
        puntos_local: null,
        puntos_visitante: null,
      })));
      this.playoffs[categoryId] = { formato: `top${classified}`, estado: "listo", modo_repechaje: mode, matches, next_round: null, champion: null };
      return clone(this.playoffs[categoryId]);
    }
    getPlayoffMatches(categoryId) { return clone(this.playoffs[categoryId]?.matches || []); }
    loadPlayoffResult(categoryId, matchNumber, local, visitante) {
      const playoff = this.playoffs[categoryId];
      if (!playoff) throw new Error("Playoffs sintéticos no generados.");
      sportsRules.validateNormalResult(local, visitante);
      const match = playoff.matches.find((item) => item.partido_numero === matchNumber);
      if (!match) throw new Error("Partido de playoffs sintético inexistente.");
      if (match.puntos_local != null || match.puntos_visitante != null) throw new Error("El partido de playoffs ya tiene resultado.");
      match.puntos_local = local; match.puntos_visitante = visitante;
      return clone(match);
    }
    advancePlayoffs(categoryId) {
      const playoff = this.playoffs[categoryId];
      if (!playoff) throw new Error("Playoffs sintéticos no generados.");
      if (playoff.estado === "pendiente_clasificados") return clone(playoff);
      const roundOrder = { repechaje: 1, cuartos: 1, semifinales: 2, final: 3 };
      const currentRound = playoff.matches.reduce((round, match) => (roundOrder[match.ronda] || 0) > (roundOrder[round] || 0) ? match.ronda : round, "");
      const grouped = new Map();
      playoff.matches.filter((match) => match.ronda === currentRound).forEach((match) => { if (!grouped.has(match.llave)) grouped.set(match.llave, []); grouped.get(match.llave).push(match); });
      const winners = [];
      for (const [key, series] of grouped) {
        const winner = series[0].modo_definicion === "global"
          ? sportsRules.ganadorSerieGlobal(series, key)
          : series.length === 1
            ? sportsRules.ganadorPartidoPlayoff(series[0])
            : sportsRules.ganadorSerieMejorDe(series, key);
        if (!winner) return clone({ ...playoff, estado: "pendiente_resultados" });
        winners.push(winner);
      }
      if (winners.length === 1) { playoff.champion = winners[0]; playoff.estado = "finalizado"; return clone(playoff); }
      const nextRound = currentRound === "final" ? "finalizado" : currentRound === "semifinales" ? "final" : "semifinales";
      const pairs = nextRound === "finalizado" ? [] : winners.length === 2 ? [[winners[0], winners[1]]] : [[winners[0], winners[1]], [winners[2], winners[3]]];
      if (nextRound === "finalizado") { playoff.champion = winners[0]; playoff.estado = "finalizado"; return clone(playoff); }
      const roundMatches = pairs.map(([local, visitante], index) => ({ llave: `${nextRound}_${index + 1}`, ronda: nextRound, partido_numero: playoff.matches.length + index + 1, serie_partido: 1, local, visitante, modo_definicion: "mejor_de", puntos_local: null, puntos_visitante: null }));
      playoff.matches.push(...roundMatches); playoff.next_round = roundMatches.map((match) => match.llave); playoff.estado = "clasificados_avanzados";
      return clone(playoff);
    }
    getChampion(categoryId) { return this.playoffs[categoryId]?.champion || null; }
    getDelegate(id) { return clone(this.delegates[id]); }
    getDelegateMatches(id, categoryId) { const delegate = this.delegates[id]; if (!delegate) return []; return this.getMatches(categoryId).filter((match) => delegate.equipos.includes(match.local) || delegate.equipos.includes(match.visitante)); }
    getPlayoffs(categoryId) { return clone(this.playoffs[categoryId] || []); }
  }
  return SyntheticDataProvider;
});
