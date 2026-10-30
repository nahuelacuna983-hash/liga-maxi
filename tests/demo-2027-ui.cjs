const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("demo_2027.html", "utf8");
const js = fs.readFileSync("demo_2027.js", "utf8");
assert.match(html, /\.demo-toolbar button \{[^}]*color:\s*#16324f/);
const headers = [...js.matchAll(/<th>([^<]+)<\/th>/g)].map((match) => match[1]);
assert.deepStrictEqual(headers, ["#", "Equipo", "PJ", "PG", "PP", "PF", "PC", "DIF", "PTS"]);
assert.match(js, /<td>\$\{team\.pj\}<\/td><td>\$\{team\.pg\}<\/td><td>\$\{team\.pp\}/);
assert.match(html, /\.demo-table-wrap \{\s*overflow-x: auto;/);
console.log("DEMO_2027_UI_STATIC_OK");
