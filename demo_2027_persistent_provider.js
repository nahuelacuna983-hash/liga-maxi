(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./demo_2027_provider.js"));
  else root.PersistentSyntheticProvider = factory(root.SyntheticDataProvider);
}(typeof window !== "undefined" ? window : globalThis, function (SyntheticDataProvider) {
  "use strict";
  class PersistentSyntheticProvider extends SyntheticDataProvider {
    async saveTo(repository) { await repository.write(this.exportState()); return this; }
    async loadFrom(repository) { this.importState(await repository.read()); return this; }
    exportState() { return { tournament: this.tournament, categories: this.categories, matches: this.matches, playoffs: this.playoffs, delegates: this.delegates, tournaments: this.tournaments, activeTournamentId: this.activeTournamentId, permissions: this.permissions, players: this.players, documents: this.documents, documentHistory: this.documentHistory, auditLog: this.auditLog, scheduleHistory: this.scheduleHistory }; }
    importState(state) { if (!state || typeof state !== "object") throw new Error("Estado persistente inválido."); Object.assign(this, clone(state)); return this; }
  }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  return PersistentSyntheticProvider;
}));
