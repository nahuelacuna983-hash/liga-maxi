(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Demo2027Repository = factory();
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  class RepositoryError extends Error { constructor(code, message) { super(message); this.name = "RepositoryError"; this.code = code; } }
  class MemoryRepository {
    constructor(seed = {}) { validateState(seed); this.state = clone(seed); this.revision = 0; }
    async read() { return clone(this.state); }
    async readSnapshot() { return { schemaVersion: SCHEMA_VERSION, revision: this.revision, state: await this.read() }; }
    async write(next, options = {}) { validateState(next); if (options.expectedRevision != null && options.expectedRevision !== this.revision) throw new RepositoryError("STALE_REVISION", "El estado persistente quedó obsoleto."); this.state = clone(next); this.revision += 1; return this.readSnapshot(); }
  }
  class JsonFileRepository extends MemoryRepository {
    constructor(filePath, fsModule = require("fs/promises")) { super(emptyState()); this.path = filePath; this.fs = fsModule; }
    async readSnapshot() { let raw; try { raw = JSON.parse(await this.fs.readFile(this.path, "utf8")); } catch (error) { if (error.code === "ENOENT") return { schemaVersion: SCHEMA_VERSION, revision: 0, state: clone(this.state) }; throw new RepositoryError("CORRUPT_FILE", `No se pudo leer el estado persistente: ${error.message}`); } if (!raw || raw.schemaVersion !== SCHEMA_VERSION || !Number.isInteger(raw.revision) || raw.revision < 0) throw new RepositoryError("INCOMPATIBLE_SCHEMA", "Versión o revisión persistida incompatible."); validateState(raw.state); this.state = clone(raw.state); this.revision = raw.revision; return { schemaVersion: raw.schemaVersion, revision: raw.revision, state: clone(raw.state) }; }
    async read() { return (await this.readSnapshot()).state; }
    async write(next, options = {}) { validateState(next); const current = await this.readSnapshot(); if (options.expectedRevision != null && options.expectedRevision !== current.revision) throw new RepositoryError("STALE_REVISION", "El estado persistente quedó obsoleto."); const snapshot = { schemaVersion: SCHEMA_VERSION, revision: current.revision + 1, state: clone(next) }; const temp = `${this.path}.${process.pid}.${Date.now()}.tmp`; try { await this.fs.writeFile(temp, JSON.stringify(snapshot, null, 2) + "\n", "utf8"); await this.fs.rename(temp, this.path); } catch (error) { try { await this.fs.unlink(temp); } catch {} throw new RepositoryError("WRITE_FAILED", `No se pudo confirmar la escritura: ${error.message}`); } this.state = clone(next); this.revision = snapshot.revision; return snapshot; }
  }
  function emptyState() { return { categories: {}, matches: {}, playoffs: {}, delegates: {}, tournaments: { "empty": { id: "empty" } }, activeTournamentId: "empty", permissions: {}, players: {}, documents: {}, documentHistory: [], auditLog: [], scheduleHistory: [] }; }
  function validateState(state) { if (!state || typeof state !== "object" || Array.isArray(state)) throw new RepositoryError("INVALID_STATE", "El estado persistente debe ser un objeto."); for (const key of ["categories", "matches", "playoffs", "delegates", "tournaments", "permissions", "players", "documents"]) if (!state[key] || typeof state[key] !== "object" || Array.isArray(state[key])) throw new RepositoryError("INVALID_STATE", `Falta una colección válida: ${key}.`); for (const key of ["documentHistory", "auditLog", "scheduleHistory"]) if (!Array.isArray(state[key])) throw new RepositoryError("INVALID_STATE", `Falta una lista válida: ${key}.`); if (typeof state.activeTournamentId !== "string" || !state.tournaments[state.activeTournamentId]) throw new RepositoryError("INVALID_STATE", "El torneo activo no existe."); return true; }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  return { SCHEMA_VERSION, RepositoryError, MemoryRepository, JsonFileRepository, validateState };
}));
