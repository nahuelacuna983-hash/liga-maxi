"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const src=fs.readFileSync("app_online.js","utf8");
const fn=(name)=>{
 const needle="async function "+name+"() {";
 const a=src.indexOf(needle);
 assert(a>=0,"Missing async export "+name);
 const b=src.indexOf("\nfunction ",a+needle.length);
 const c=src.indexOf("\nasync function ",a+needle.length);
 const end=Math.min(...[b,c].filter(n=>n>=0),src.length);
 return src.slice(a,end);
};
const refresh=fn("validarListadoArbitrosParaEmision");
assert.match(refresh,/delete estado\.listadoArbitrosPorCategoriaId\[categoria\.id\]/);
assert.match(refresh,/supabaseClient\.rpc\("apdb_get_referee_eligibility"/);
assert.match(refresh,/if \(error\)[\s\S]*?return false;/);
for(const name of ["exportarHabilitadosCsv","descargarListaHabilitadosHtml","descargarControlHabilitadosCanchaHtml","copiarResumenHabilitadosArbitros"]){
 const body=fn(name);
 assert.match(body,/if \(!await validarListadoArbitrosParaEmision\(categoria\)\) return;/);
 assert.ok(body.indexOf("validarListadoArbitrosParaEmision")<body.indexOf("calcularHabilitadosCategoria"),name+" must refresh before calculating output");
}
console.log("APDB_2027_REFEREE_OUTPUT_REFRESH_OK");