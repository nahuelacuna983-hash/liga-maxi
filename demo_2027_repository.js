(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Demo2027Repository = factory();
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  class MemoryRepository {
    constructor(seed = {}) { this.state = clone(seed); }
    async read() { return clone(this.state); }
    async write(next) { this.state = clone(next); return this.read(); }
  }

  class JsonFileRepository extends MemoryRepository {
    constructor(path, fsModule = require("fs/promises")) { super(); this.path = path; this.fs = fsModule; }
    async read() {
      try { this.state = JSON.parse(await this.fs.readFile(this.path, "utf8")); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      return super.read();
    }
    async write(next) { await this.fs.writeFile(this.path, JSON.stringify(next, null, 2) + "\n", "utf8"); return super.write(next); }
  }

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  return { MemoryRepository, JsonFileRepository };
}));
