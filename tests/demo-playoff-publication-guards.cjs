"use strict";
const assert = require("node:assert/strict");
const SyntheticDataProvider = require("../demo_2027_provider.js");

const provider = new SyntheticDataProvider();
provider.generateFixture("asoc-demo", "maxi-a", { start: "2027-04-04", gameDay: 0 });
assert.throws(() => provider.generatePlayoffs("maxi-a", 4, { publicationState: "official" }), /fase regular pendiente/);
const projection = provider.generatePlayoffs("maxi-a", 4);
assert.equal(projection.publicationState, "projection");
assert.equal(projection.provisional, true);
for (const match of provider.getMatches("maxi-a")) provider.loadResult("maxi-a", match.partido_numero, 80, 70);
const official = provider.generatePlayoffs("maxi-a", 4, { publicationState: "official" });
assert.equal(official.publicationState, "official");
assert.equal(official.provisional, false);
console.log("DEMO_PLAYOFF_PUBLICATION_GUARDS_OK");
