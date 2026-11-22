const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { JsonFileRepository } = require("../demo_2027_repository.js");
const PersistentSyntheticProvider = require("../demo_2027_persistent_provider.js");

const scenario = {
  torneo: { nombre: "APdB 2027 - Alta sintética", temporada: 2027 },
  categoria: { id: "apdb-2027-sintetica", nombre: "Femenino Sintético" },
  equipos: ["Norte Sintético", "Sur Sintético", "Este Sintético", "Oeste Sintético"],
};

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "apdb-onboarding-"));
  const repository = new JsonFileRepository(path.join(root, "state.json"));
  const first = new PersistentSyntheticProvider();
  const tournament = first.ensureTournament("asoc-demo", scenario.torneo);
  first.setActiveTournament("asoc-demo", tournament.id);
  const category = first.ensureCategory("asoc-demo", tournament.id, scenario.categoria);
  for (const team of scenario.equipos) first.ensureTeam("asoc-demo", category.id, team);
  first.setPermission("asoc-demo", "delegado-a", { role: "delegado", organizador: "org-demo", categorias: [category.id], equipos: [scenario.equipos[0]] });
  await first.saveTo(repository);

  const counts = () => ({
    tournaments: first.getTournaments().filter((item) => item.nombre === scenario.torneo.nombre).length,
    categories: first.getCategories(tournament.id).filter((item) => item.nombre === scenario.categoria.nombre).length,
    teams: first.getTeams(category.id).length,
  });
  assert.deepEqual(counts(), { tournaments: 1, categories: 1, teams: 4 });

  const repeated = new PersistentSyntheticProvider();
  await repeated.loadFrom(repository);
  const sameTournament = repeated.ensureTournament("asoc-demo", scenario.torneo);
  const sameCategory = repeated.ensureCategory("asoc-demo", sameTournament.id, scenario.categoria);
  for (const team of scenario.equipos) repeated.ensureTeam("asoc-demo", sameCategory.id, team);
  assert.equal(sameTournament.id, tournament.id);
  assert.equal(sameCategory.id, category.id);
  assert.deepEqual(repeated.getTeams(category.id), scenario.equipos);
  assert.equal(repeated.getTournaments().filter((item) => item.nombre === scenario.torneo.nombre).length, 1);
  assert.equal(repeated.getCategories(tournament.id).filter((item) => item.nombre === scenario.categoria.nombre).length, 1);

  assert.throws(() => repeated.ensureTournament("delegado-a", { nombre: "No autorizado", temporada: 2027 }), /no autorizada/);
  assert.throws(() => repeated.ensureCategory("delegado-a", category.id, { id: "ajena", nombre: "Categoría ajena" }), /no autorizada/);
  assert.throws(() => repeated.ensureTeam("delegado-a", category.id, "Equipo ajeno"), /no autorizada/);
  assert.throws(() => repeated.setPermission("delegado-a", "delegado-b", { role: "delegado", organizador: "org-demo", equipos: [scenario.equipos[1]] }), /no autorizada/);

  const recovered = new PersistentSyntheticProvider();
  await recovered.loadFrom(repository);
  assert.equal(recovered.activeTournamentId, tournament.id);
  assert.equal(recovered.getCategory(category.id).nombre, scenario.categoria.nombre);
  assert.deepEqual(recovered.getTeams(category.id), scenario.equipos);
  await recovered.saveTo(repository);
  assert.equal((await repository.readSnapshot()).state.tournaments[tournament.id].nombre, scenario.torneo.nombre);
  await fs.rm(root, { recursive: true, force: true });
  console.log("APDB_ADMIN_ONBOARDING_LOCAL_OK");
}

main().catch((error) => {
  console.error("APDB_ADMIN_ONBOARDING_LOCAL_FAILED", error.message);
  process.exitCode = 1;
});
