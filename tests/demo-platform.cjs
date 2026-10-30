const assert = require("assert");
const Provider = require("../demo_2027_provider.js");
const provider = new Provider();

const created = provider.createTournament("asoc-demo", { nombre: "Clausura sintético", temporada: 2027 });
assert.strictEqual(created.estado, "borrador");
provider.setActiveTournament("asoc-demo", created.id);
assert.throws(() => provider.createTournament("delegado-a", { nombre: "No autorizado", temporada: 2027 }), /no autorizada/);
provider.setPermission("asoc-demo", "delegado-a", { equipos: ["Sud América"], categorias: ["maxi-a"] });
provider.registerPlayer("asoc-demo", { id: "player-1", nombre: "Jugador Sintético", equipo: "Sud América", categoria: "maxi-a" });
const document = provider.setDocumentStatus("asoc-demo", "player-1", "seguro", "observado", "Evidencia sintética");
assert.strictEqual(document.status, "observado");
assert.strictEqual(provider.getPlayerDocuments("player-1").length, 1);
assert.throws(() => provider.setDocumentStatus("delegado-a", "player-1", "seguro", "aprobado"), /no autorizada/);
assert.ok(Object.values(provider.getPermissions()).some((item) => item.role === "asociacion"));
console.log("DEMO_PLATFORM_OK");
