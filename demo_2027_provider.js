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
    getDelegate(id) { return clone(this.delegates[id]); }
    getDelegateMatches(id, categoryId) { const delegate = this.delegates[id]; if (!delegate) return []; return this.getMatches(categoryId).filter((match) => delegate.equipos.includes(match.local) || delegate.equipos.includes(match.visitante)); }
    getPlayoffs(categoryId) { return clone(this.playoffs[categoryId] || []); }
  }
  return SyntheticDataProvider;
});
