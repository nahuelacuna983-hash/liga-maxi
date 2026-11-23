const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("app_online.js","utf8");
function part(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a);return source.slice(a,b);}
const render=part("function renderAccionDocumentoJugadorDelegado(","\nfunction renderBotonVerDocumentoDelegado(");
assert.match(render,/requisito\?\.requiere_vencimiento/);
assert.match(render,/class="player-doc-expiry-input"/);
const upload=part("async function subirDocumentoJugadorDelegado(","\nasync function desbloquearDelegado(");
assert.match(upload,/player-doc-expiry-input/);
assert.match(upload,/requisito\?\.requiere_vencimiento && !vencimiento/);
assert.match(upload,/p_vencimiento: vencimiento/);
console.log("APDB_2027_PLAYER_DOCUMENT_EXPIRY_CONTRACT_OK");