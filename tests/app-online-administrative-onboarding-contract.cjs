const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index_online.html", "utf8");
const js = fs.readFileSync("app_online.js", "utf8");
const build = fs.readFileSync("tools/build-apdb-staging.cjs", "utf8");

for (const id of ["admin-torneo-nombre", "admin-torneo-temporada", "admin-categoria-nombre", "admin-equipos", "admin-alta-torneo", "admin-alta-status", "admin-delegado-auth-id", "admin-delegado-permission-id", "admin-delegado-categoria", "admin-delegado-equipo", "admin-delegado-asignar", "admin-delegado-revocar", "admin-delegado-status"]) {
  assert.match(html, new RegExp(`id="${id}"`), `falta control ${id}`);
}
assert.match(html, /apdb-administrative-adapter\.js/);
assert.match(js, /prepararAltaAdministrativa/);
assert.match(js, /ApdbAdministrativeAdapter\.ensureTournamentCategoryTeams/);
assert.match(js, /ApdbAdministrativeAdapter\.setDelegateScope/);
assert.match(js, /ApdbAdministrativeAdapter\.revokeDelegateScope/);
assert.match(js, /estado\.asociacionDesbloqueada/);
assert.doesNotMatch(js, /\.from\("(torneos|categorias|equipos)"\)\.insert/);
assert.match(build, /apdb-administrative-adapter\.js/);
console.log("APDB_APP_ADMINISTRATIVE_ONBOARDING_CONTRACT_OK");
