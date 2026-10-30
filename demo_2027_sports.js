(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Demo2027Sports = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function esResolucionAdministrativa(partido) {
    return partido?.estado_resultado === "resolucion_local" || partido?.estado_resultado === "resolucion_visitante";
  }
  function esAdministrativoSinPuntos(partido) { return partido?.estado_resultado === "administrativo_sin_puntos"; }
  function tieneResultado(partido) { return esResolucionAdministrativa(partido) || (partido?.puntos_local != null && partido?.puntos_visitante != null); }
  function validateNormalResult(local, visitante) {
    if (!Number.isInteger(local) || !Number.isInteger(visitante) || local < 0 || visitante < 0) throw new Error("Puntos inválidos.");
    if (local === visitante) throw new Error("Un resultado normal no puede terminar empatado.");
    return true;
  }
  function addPoints(row, local, visitante, partido) {
    if (esAdministrativoSinPuntos(partido)) return;
    if (esResolucionAdministrativa(partido)) { if (partido.estado_resultado === "resolucion_local") row[local].pg++, row[visitante].pp++, row[local].pts += 2; else row[visitante].pg++, row[local].pp++, row[visitante].pts += 2; return; }
    if (partido.puntos_local > partido.puntos_visitante) row[local].pg++, row[visitante].pp++, row[local].pts += 2, row[visitante].pts += 1;
    else if (partido.puntos_visitante > partido.puntos_local) row[visitante].pg++, row[local].pp++, row[visitante].pts += 2, row[local].pts += 1;
    else row[local].pts++, row[visitante].pts++;
  }
  function calcularMiniTablaOlimpica(equipos, partidos) {
    const selected = new Set(equipos); const mini = {};
    equipos.forEach((equipo) => { mini[equipo] = { pg: 0, pp: 0, pts: 0, pf: 0, pc: 0, dif: 0 }; });
    partidos.forEach((partido) => {
      if (!selected.has(partido.local) || !selected.has(partido.visitante) || !tieneResultado(partido)) return;
      mini[partido.local].pf += partido.puntos_local; mini[partido.local].pc += partido.puntos_visitante;
      mini[partido.visitante].pf += partido.puntos_visitante; mini[partido.visitante].pc += partido.puntos_local;
      const before = {}; Object.keys(mini).forEach((key) => { before[key] = { pg: 0, pp: 0, pts: mini[key].pts }; });
      addPoints(mini, partido.local, partido.visitante, partido);
      if (esAdministrativoSinPuntos(partido)) return;
      if (esResolucionAdministrativa(partido)) return;
    });
    Object.values(mini).forEach((team) => { team.dif = team.pf - team.pc; delete team.pg; delete team.pp; });
    return mini;
  }
  function compare(a, b, all, partidos) {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const tied = all.filter((team) => team.pts === a.pts).map((team) => team.equipo);
    if (tied.length > 1) {
      const mini = calcularMiniTablaOlimpica(tied, partidos); const ma = mini[a.equipo]; const mb = mini[b.equipo];
      if (mb.pts !== ma.pts) return mb.pts - ma.pts;
      if (mb.dif !== ma.dif) return mb.dif - ma.dif;
      if (mb.pf !== ma.pf) return mb.pf - ma.pf;
    }
    if (b.dif !== a.dif) return b.dif - a.dif;
    if (b.pf !== a.pf) return b.pf - a.pf;
    return a.equipo.localeCompare(b.equipo);
  }
  function calcularTabla(partidos) {
    const table = {};
    partidos.forEach((partido) => {
      [partido.local, partido.visitante].forEach((team) => { if (!table[team]) table[team] = { equipo: team, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, dif: 0, pts: 0 }; });
      if (!tieneResultado(partido)) return;
      table[partido.local].pj++; table[partido.visitante].pj++;
      table[partido.local].pf += partido.puntos_local; table[partido.local].pc += partido.puntos_visitante;
      table[partido.visitante].pf += partido.puntos_visitante; table[partido.visitante].pc += partido.puntos_local;
      addPoints(table, partido.local, partido.visitante, partido);
    });
    const output = Object.values(table); output.forEach((team) => { team.dif = team.pf - team.pc; });
    return output.sort((a, b) => compare(a, b, output, partidos));
  }
  function ganadorPartidoPlayoff(partido) {
    if (!partido || partido.puntos_local == null || partido.puntos_visitante == null || partido.puntos_local === partido.puntos_visitante) return "";
    return partido.puntos_local > partido.puntos_visitante ? partido.local : partido.visitante;
  }
  function ganadorSerieGlobal(partidos, llave) {
    const totals = {}; (partidos || []).filter((partido) => partido.llave === llave && partido.puntos_local != null && partido.puntos_visitante != null).forEach((partido) => { totals[partido.local] = (totals[partido.local] || 0) + partido.puntos_local; totals[partido.visitante] = (totals[partido.visitante] || 0) + partido.puntos_visitante; });
    const ordered = Object.entries(totals).sort((a, b) => b[1] - a[1]); return ordered.length > 1 && ordered[0][1] !== ordered[1][1] ? ordered[0][0] : "";
  }
  function ganadorSerieMejorDe(partidos, llave) {
    const wins = {};
    for (const partido of (partidos || []).filter((item) => item.llave === llave)) {
      const winner = ganadorPartidoPlayoff(partido);
      if (!winner) continue;
      wins[winner] = (wins[winner] || 0) + 1;
    }
    const ordered = Object.entries(wins).sort((a, b) => b[1] - a[1]);
    return ordered.length && ordered[0][1] >= 2 && (!ordered[1] || ordered[0][1] > ordered[1][1]) ? ordered[0][0] : "";
  }
  return { calcularTabla, calcularMiniTablaOlimpica, validateNormalResult, ganadorPartidoPlayoff, ganadorSerieGlobal, ganadorSerieMejorDe };
});
