(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Demo2027Rules = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function validateNormalResult(homeScore, awayScore) {
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) throw new Error("El resultado debe contener puntos enteros no negativos.");
    if (homeScore === awayScore) throw new Error("Un resultado normal no puede terminar empatado.");
    return true;
  }
  function calculateTable(teams, matches) {
    const rows = Object.fromEntries(teams.map((team) => [team.id, { ...team, pj: 0, pts: 0, pf: 0, pc: 0 }]));
    matches.filter((match) => match.state === "jugado").forEach((match) => {
      const home = rows[match.home]; const away = rows[match.away];
      home.pj++; away.pj++; home.pf += match.hs; home.pc += match.as; away.pf += match.as; away.pc += match.hs;
      if (match.hs > match.as) { home.pts += 2; away.pts += 1; } else if (match.as > match.hs) { away.pts += 2; home.pts += 1; } else { home.pts += 1; away.pts += 1; }
    });
    return Object.values(rows).sort((left, right) => right.pts - left.pts || (right.pf - right.pc) - (left.pf - left.pc));
  }
  return { calculateTable, validateNormalResult };
});
