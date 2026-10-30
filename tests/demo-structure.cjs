const assert = require("assert");
const fs = require("fs");
const demo = fs.readFileSync("demo_circuito_2027.html", "utf8");
const original = fs.readFileSync("index_online.html", "utf8");
for (const id of ["tab-publico", "tab-fecha", "tab-delegados", "tab-asociacion"]) assert.match(original, new RegExp(`id="${id}"`));
for (const view of ["public", "date", "delegate", "association"]) assert.match(demo, new RegExp(`data-view="${view}"`));
assert.doesNotMatch(demo, /https?:\/\//i);
assert.doesNotMatch(fs.readFileSync("demo_circuito_2027.js", "utf8"), /supabase|fetch\(/i);
console.log("DEMO_STRUCTURE_OK");
