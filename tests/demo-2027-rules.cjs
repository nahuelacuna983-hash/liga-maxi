const assert = require("assert");
const rules = require("../demo_2027_rules.js");
assert.throws(() => rules.validateNormalResult(58, 58), /no puede terminar empatado/);
assert.strictEqual(rules.validateNormalResult(58, 54), true);
const table = rules.calculateTable([{ id: "a", name: "A" }, { id: "b", name: "B" }], [{ home: "a", away: "b", hs: 58, as: 54, state: "jugado" }]);
assert.deepStrictEqual(table.map((team) => [team.name, team.pts]), [["A", 2], ["B", 1]]);
console.log("DEMO_2027_RULES_OK");
