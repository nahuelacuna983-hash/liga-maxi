const assert = require("node:assert/strict");
const source = require("node:fs").readFileSync("app_online.js", "utf8");
assert.match(source, /function limpiarEstadoPrivadoAuth\(\)/);
assert.match(source, /cerrarSesionAuth\(\)[\s\S]*?limpiarEstadoPrivadoAuth\(\)/);
for (const field of ["partidosPorCategoria", "playoffsPorCategoria", "programacionPorCategoriaId", "documentosPorCategoriaId", "auditoriaDocumentalPorCategoriaId"]) {
  assert.match(source, new RegExp(`estado\\.${field} = \\{\\}`));
}
assert.match(source, /authUser\) \{[\s\S]*?cargarPermisosUsuarioActual/);
console.log("APP_AUTH_SESSION_LIFECYCLE_OK");
