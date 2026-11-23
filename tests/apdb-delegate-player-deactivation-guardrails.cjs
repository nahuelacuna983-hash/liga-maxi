const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("app_online.js", "utf8");
function body(name) {
  const start = source.indexOf("async function " + name + "(");
  assert.ok(start >= 0, "Falta el controlador " + name);
  const end = source.indexOf("\nasync function ", start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}
const deactivation = body("solicitarBajaJugadorDelegado");

assert.match(deactivation, /estado\.jugadoresPorCategoriaId\[categoria\.id\]/);
assert.match(deactivation, /String\(item\.id\) === String\(playerId\)/);
assert.match(deactivation, /obtenerEquiposDelegadoCategoria\(categoriaNombre\)/);
assert.match(deactivation, /nombresEquipoCoinciden\(equipo, jugador\.equipo_nombre\)/);
assert.match(deactivation, /if \(!jugador \|\| !equiposAutorizados\.some\(/);
assert.match(deactivation, /if \(respuesta === null\)/);
assert.match(deactivation, /const motivo = respuesta\.trim\(\)/);
assert.match(deactivation, /if \(!motivo\)/);
assert.ok(deactivation.indexOf("if (!motivo)") < deactivation.indexOf('supabaseClient.rpc("request_team_player_deactivation"'));
assert.match(deactivation, /p_reason: motivo/);
assert.doesNotMatch(deactivation, /Solicitud de baja\/correccion/);
assert.doesNotMatch(deactivation, /corre docs\/ejecutar-en-supabase/);

console.log("APDB_DELEGATE_PLAYER_DEACTIVATION_GUARDRAILS_OK");
