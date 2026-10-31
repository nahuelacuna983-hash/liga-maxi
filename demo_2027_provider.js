(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./demo_2027_fixture.js"), require("./demo_2027_sports.js"));
  else root.SyntheticDataProvider = factory(root.Demo2027Fixture, root.Demo2027Sports);
})(typeof window !== "undefined" ? window : globalThis, function (fixtureRules, sportsRules) {
  "use strict";
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  class SyntheticDataProvider {
    constructor() {
      this.tournament = { id: "demo-2027", nombre: "Apertura de prueba 2027", estado: "activo" };
      this.categories = {
        "maxi-a": { id: "maxi-a", nombre: "Maxi +35 A", torneo_id: "demo-2027", organizador: "org-demo", equipos: ["Sud América", "Gonnet", "Banco Provincia", "Estudiantes"], blocked: ["2027-04-11"] },
        "maxi-b": { id: "maxi-b", nombre: "Maxi +35 B", torneo_id: "demo-2027", organizador: "org-demo", equipos: ["Estrella de Berisso", "Mayo", "Universal", "Los Hornos"], blocked: [] },
      };
      this.matches = {};
      this.playoffs = {};
      this.delegates = { "delegado-a": { nombre: "Delegado A", equipos: ["Sud América"] }, "delegado-b": { nombre: "Delegado B", equipos: ["Gonnet"] } };
      this.tournaments = { "demo-2027": { id: "demo-2027", nombre: "Apertura de prueba 2027", temporada: 2027, estado: "activo", categorias: ["maxi-a", "maxi-b"], organizador: "org-demo" } };
      this.activeTournamentId = "demo-2027";
      this.permissions = { "admin-demo": { role: "administrador", organizador: "org-demo" }, "asoc-demo": { role: "asociacion", organizador: "org-demo" }, "delegado-a": { role: "delegado", equipos: ["Sud América"] }, "delegado-b": { role: "delegado", equipos: ["Gonnet"] } };
      this.players = {};
      this.documents = {};
      this.documentHistory = [];
      this.auditLog = [];
      this.scheduleHistory = [];
    }
    getTournament() { return clone(this.tournament); }
    getTournaments() { return clone(Object.values(this.tournaments)); }
    createTournament(actorId, input) { const permission = this.requireRole(actorId, ["administrador", "asociacion"]); const id = `torneo-${Object.keys(this.tournaments).length + 1}`; this.tournaments[id] = { id, nombre: input.nombre, temporada: input.temporada, estado: "borrador", categorias: [], organizador: permission.organizador || "org-demo" }; return clone(this.tournaments[id]); }
    setActiveTournament(actorId, tournamentId) { const permission = this.requireRole(actorId, ["administrador", "asociacion"]); const tournament = this.tournaments[tournamentId]; if (!tournament) throw new Error("Torneo sintético inexistente."); if (permission.role !== "administrador" && tournament.organizador !== permission.organizador) throw new Error("El actor no pertenece al organizador del torneo."); this.activeTournamentId = tournamentId; return clone(tournament); }
    updateTournament(actorId, tournamentId, patch) { const permission = this.requireRole(actorId, ["administrador", "asociacion"]); const tournament = this.tournaments[tournamentId]; if (!tournament) throw new Error("Torneo sintético inexistente."); if (permission.role !== "administrador" && tournament.organizador !== permission.organizador) throw new Error("El actor no puede modificar este torneo."); if (patch.estado && patch.estado !== tournament.estado && Object.values(this.matches).some((items) => items.some((match) => match.estado_resultado === "jugado"))) throw new Error("No se puede modificar el estado con partidos disputados."); Object.assign(tournament, patch); return clone(tournament); }
    requireRole(actorId, roles) { const permission = this.permissions[actorId]; if (!permission || !roles.includes(permission.role)) throw new Error("Operación no autorizada para el rol sintético."); return permission; }
    createUser(actorId, targetId, permission = {}) { this.requireRole(actorId, ["administrador"]); if (!targetId || this.permissions[targetId]) throw new Error("Usuario sintético inválido o ya existente."); this.permissions[targetId] = { role: permission.role || "publico", organizador: permission.organizador || null, equipos: permission.equipos || [], categorias: permission.categorias || [] }; this.auditLog.push({ actorId, action: "create_user", targetId, at: new Date().toISOString() }); return clone(this.permissions[targetId]); }
    setPermission(actorId, targetId, permission) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); const target = this.permissions[targetId]; if (!target) throw new Error("Usuario sintético inexistente."); if (actor.role !== "administrador" && ((permission.organizador && permission.organizador !== actor.organizador) || (target.organizador && target.organizador !== actor.organizador))) throw new Error("No se puede asignar un permiso de otro organizador."); const next = { ...target, ...permission }; this.permissions[targetId] = next; if (next.role === "delegado") this.delegates[targetId] = { nombre: next.nombre || targetId, equipos: [...(next.equipos || [])], categorias: [...(next.categorias || [])] }; this.auditLog.push({ actorId, action: "set_permission", targetId, at: new Date().toISOString() }); return clone(next); }
    revokePermission(actorId, targetId) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); if (actor.role !== "administrador" && this.permissions[targetId]?.organizador && this.permissions[targetId].organizador !== actor.organizador) throw new Error("No se puede revocar un permiso de otro organizador."); delete this.permissions[targetId]; }
    registerPlayer(actorId, player) { const actor = this.requireRole(actorId, ["administrador", "asociacion", "delegado"]); const category = this.categories[player.categoria]; if (!category || category.torneo_id !== this.activeTournamentId) throw new Error("Categoría fuera del torneo activo."); if (actor.role === "delegado" && (!actor.equipos?.includes(player.equipo) || actor.categorias && !actor.categorias.includes(player.categoria))) throw new Error("El delegado no puede registrar jugadores de este alcance."); if (actor.organizador && actor.organizador !== category.organizador) throw new Error("El actor no pertenece al organizador de la categoría."); if (!player.id || !player.nombre || !player.equipo || !player.categoria) throw new Error("Jugador sintético incompleto."); this.players[player.id] = { ...player, torneo: this.activeTournamentId, organizador: category.organizador }; return clone(this.players[player.id]); }
    setDocumentStatus(actorId, playerId, requirement, status, evidence = "") { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); if (!this.players[playerId]) throw new Error("Jugador sintético inexistente."); if (actor.role !== "administrador" && this.players[playerId].organizador !== actor.organizador) throw new Error("El actor no puede revisar documentos de otro organizador."); if (!["pendiente", "cargado", "observado", "aprobado", "rechazado"].includes(status)) throw new Error("Estado documental sintético inválido."); const key = `${this.players[playerId].torneo}:${playerId}:${requirement}`; const item = { id: key, playerId, requirement, status, evidence, reviewedBy: actorId, reviewedAt: new Date().toISOString() }; this.documentHistory.push(clone(item)); this.documents[key] = item; this.auditLog.push({ actorId, action: "set_document_status", targetId: key, at: item.reviewedAt }); return clone(item); }
    getPlayerDocuments(actorId, playerId) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); const player = this.players[playerId]; if (!player || actor.role !== "administrador" && player.organizador !== actor.organizador) throw new Error("El actor no puede leer documentos de otro organizador."); return clone(Object.values(this.documents).filter((item) => item.playerId === playerId)); }
    getPlayers(actorId) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); return clone(Object.values(this.players).filter((player) => actor.role === "administrador" || player.organizador === actor.organizador)); }
    getPermissions(actorId) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); return clone(Object.fromEntries(Object.entries(this.permissions).filter(([, item]) => actor.role === "administrador" || item.organizador === actor.organizador))); }
    getDocumentHistory(actorId, playerId) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); const player = this.players[playerId]; if (!player || actor.role !== "administrador" && player.organizador !== actor.organizador) throw new Error("El actor no puede leer este historial."); return clone(this.documentHistory.filter((item) => item.playerId === playerId)); }
    getAuditLog(actorId) { this.requireRole(actorId, ["administrador"]); return clone(this.auditLog); }
    getCategories(tournamentId = this.activeTournamentId) { return clone(Object.values(this.categories).filter((category) => !tournamentId || category.torneo_id === tournamentId)); }
    getCategory(id) { return this.categories[id] ? clone(this.categories[id]) : null; }
    addCategory(actorId, tournamentId, category) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); const tournament = this.tournaments[tournamentId]; if (!tournament) throw new Error("Torneo sintético inexistente."); if (actor.role !== "administrador" && tournament.organizador !== actor.organizador) throw new Error("El actor no puede modificar este organizador."); if (!category.id || this.categories[category.id]) throw new Error("Identificador de categoría ocupado."); this.categories[category.id] = { id: category.id, nombre: category.nombre, torneo_id: tournamentId, organizador: tournament.organizador, equipos: [], blocked: [] }; tournament.categorias.push(category.id); return clone(this.categories[category.id]); }
    addTeam(actorId, categoryId, teamName) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); const category = this.categories[categoryId]; if (!category) throw new Error("Categoría sintética inexistente."); if (actor.role !== "administrador" && category.organizador !== actor.organizador) throw new Error("El actor no puede modificar esta categoría."); const name = String(teamName || "").trim(); if (!name || category.equipos.includes(name)) throw new Error("Equipo sintético inválido o repetido."); if ((this.matches[categoryId] || []).some((match) => match.estado_resultado === "jugado" || match.estado_resultado === "administrativo_sin_puntos")) throw new Error("No se pueden cambiar los equipos con resultados disputados."); category.equipos.push(name); return clone(category);
    }
    getTeams(categoryId) { return clone(this.categories[categoryId]?.equipos || []); }
    setCategoryTeams(actorId, categoryId, teams) {
      const actor = this.requireRole(actorId, ["administrador", "asociacion"]);
      if (!this.categories[categoryId] || !Array.isArray(teams) || teams.length < 2) throw new Error("Equipos sintéticos inválidos.");
      if (actor.role !== "administrador" && this.categories[categoryId].organizador !== actor.organizador) throw new Error("El actor no puede modificar esta categoría.");
      const existing = this.matches[categoryId] || [];
      if (existing.some((match) => match.estado_resultado === "jugado" || match.estado_resultado === "administrativo_sin_puntos")) throw new Error("No se pueden cambiar los equipos con resultados disputados.");
      this.categories[categoryId].equipos = [...teams];
      if (existing.length) this.matches[categoryId] = [];
    }
    generateFixture(actorId, categoryId, options = {}) {
      const actor = this.requireRole(actorId, ["administrador", "asociacion"]);
      const category = this.categories[categoryId]; if (!category) throw new Error("Categoría sintética inexistente.");
      if (category.torneo_id !== this.activeTournamentId || actor.role !== "administrador" && category.organizador !== actor.organizador) throw new Error("El actor no puede generar fixture para esta categoría.");
      if ((this.matches[categoryId] || []).some((match) => match.estado_resultado === "jugado" || match.estado_resultado === "administrativo_sin_puntos")) throw new Error("No se puede regenerar un fixture con resultados disputados.");
      const generated = fixtureRules.generateFixture(category.equipos, options.start || "2027-04-04", options.blocked || category.blocked, options.frequency || 1, options.wheels || 1, options.gameDay ?? 0);
      this.matches[categoryId] = generated.matches; return clone(generated);
    }
    getMatches(categoryId) { return clone(this.matches[categoryId] || []); }
    updateMatchSchedule(actorId, categoryId, matchNumber, patch = {}) { const actor = this.requireRole(actorId, ["administrador", "asociacion"]); const category = this.categories[categoryId]; const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber); if (!category || !match) throw new Error("Partido sintético inexistente."); if (actor.role !== "administrador" && category.organizador !== actor.organizador) throw new Error("El actor no puede programar esta categoría."); if (match.estado_resultado === "jugado" || match.estado_resultado === "administrativo_sin_puntos") throw new Error("No se puede reprogramar un partido con resultado."); if (patch.fecha && category.blocked.includes(patch.fecha)) throw new Error("La fecha está bloqueada para la categoría."); const previous = { fecha: match.fecha, hora: match.hora || null, cancha: match.cancha || null }; Object.assign(match, { fecha: patch.fecha || match.fecha, hora: patch.hora ?? match.hora, cancha: patch.cancha ?? match.cancha }); this.scheduleHistory.push({ categoryId, matchNumber, actorId, previous, next: { fecha: match.fecha, hora: match.hora || null, cancha: match.cancha || null }, at: new Date().toISOString() }); return clone(match); }
    loadResult(categoryId, matchNumber, local, visitante) {
      sportsRules.validateNormalResult(local, visitante);
      const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber);
      if (!match) throw new Error("Partido sintético inexistente.");
      match.puntos_local = local; match.puntos_visitante = visitante; match.estado_resultado = "jugado"; return clone(match);
    }
    loadDelegateResult(delegateId, categoryId, matchNumber, local, visitante) {
      const delegate = this.delegates[delegateId]; const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber);
      const category = this.categories[categoryId];
      if (!delegate || !category) throw new Error("Delegado o categoría sintética inexistente.");
      const permission = this.permissions[delegateId];
      if (!permission || permission.role !== "delegado" || permission.categorias?.length && !permission.categorias.includes(categoryId)) throw new Error("El delegado no tiene permiso para esta categoría.");
      if (permission.equipos?.length) delegate.equipos = permission.equipos;
      if (category.closed) throw new Error("La categoría está cerrada.");
      if (!match || (!delegate.equipos.includes(match.local) && !delegate.equipos.includes(match.visitante))) throw new Error("El delegado no puede modificar este partido.");
      return this.loadResult(categoryId, matchNumber, local, visitante);
    }
    setAdministrativeNoPoints(categoryId, matchNumber) {
      const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber);
      if (!match) throw new Error("Partido sintético inexistente.");
      match.puntos_local = 0; match.puntos_visitante = 0; match.estado_resultado = "administrativo_sin_puntos"; return clone(match);
    }
    annulResult(categoryId, matchNumber) { const match = (this.matches[categoryId] || []).find((item) => item.partido_numero === matchNumber); if (!match) throw new Error("Partido sintético inexistente."); match.puntos_local = null; match.puntos_visitante = null; match.estado_resultado = "pendiente"; return clone(match); }
    setCategoryClosed(categoryId, closed = true) { if (!this.categories[categoryId]) throw new Error("Categoría sintética inexistente."); this.categories[categoryId].closed = Boolean(closed); }
    getTable(categoryId) { return sportsRules.calcularTabla(this.matches[categoryId] || []); }
    generatePlayoffs(categoryId, classified = 4, options = {}) {
      if (!this.categories[categoryId]) throw new Error("Categoría sintética inexistente.");
      if (![4, 6, 8].includes(Number(classified))) throw new Error("Formato de playoffs no definido en la demo.");
      const table = this.getTable(categoryId).slice(0, Number(classified));
      if (table.length < Number(classified)) {
        this.playoffs[categoryId] = { formato: `top${classified}`, estado: "pendiente_clasificados", clasificados_requeridos: Number(classified), matches: [] };
        return clone(this.playoffs[categoryId]);
      }
      const pairings = Number(classified) === 8
        ? [[1, 8], [4, 5], [2, 7], [3, 6]]
        : Number(classified) === 6
          ? [[3, 6], [4, 5]]
          : [[1, 4], [2, 3]];
      const mode = Number(classified) === 6 ? "global" : (options.mode || "mejor_de");
      const games = Number(options.seriesGames || (Number(classified) === 6 ? 2 : 1));
      if (![1, 2, 3].includes(games)) throw new Error("Cantidad de partidos de serie no definida.");
      const matches = pairings.flatMap(([a, b], index) => Array.from({ length: games }, (_, game) => ({
        llave: Number(classified) === 6 ? `repechaje_${index + 1}` : `cuartos_${index + 1}`,
        ronda: Number(classified) === 6 ? "repechaje" : Number(classified) === 4 ? "semifinales" : "cuartos",
        partido_numero: index * games + game + 1,
        serie_partido: game + 1,
        local: (game % 2 === 0 ? table[a - 1]?.equipo : table[b - 1]?.equipo),
        visitante: (game % 2 === 0 ? table[b - 1]?.equipo : table[a - 1]?.equipo),
        modo_definicion: mode,
        puntos_local: null,
        puntos_visitante: null,
      })));
      this.playoffs[categoryId] = { formato: `top${classified}`, estado: "listo", modo_repechaje: mode, series_games: Number(options.seriesGames || 1), matches, direct_teams: Number(classified) === 6 ? [table[0].equipo, table[1].equipo] : [], seed_order: table.map((row, index) => ({ equipo: row.equipo, posicion: index + 1 })), next_round: null, champion: null };
      return clone(this.playoffs[categoryId]);
    }
    getPlayoffMatches(categoryId) { return clone(this.playoffs[categoryId]?.matches || []); }
    loadPlayoffResult(categoryId, matchNumber, local, visitante) {
      const playoff = this.playoffs[categoryId];
      if (!playoff) throw new Error("Playoffs sintéticos no generados.");
      const match = playoff.matches.find((item) => item.partido_numero === matchNumber);
      if (!match) throw new Error("Partido de playoffs sintético inexistente.");
      if (match.puntos_local != null || match.puntos_visitante != null) throw new Error("El partido de playoffs ya tiene resultado.");
      sportsRules.validateNormalResult(local, visitante);
      match.puntos_local = local; match.puntos_visitante = visitante;
      return clone(match);
    }
    annulPlayoffResult(categoryId, matchNumber) {
      const playoff = this.playoffs[categoryId];
      const match = playoff?.matches.find((item) => item.partido_numero === matchNumber);
      if (!match) throw new Error("Partido de playoffs sintético inexistente.");
      match.puntos_local = null; match.puntos_visitante = null;
      playoff.champion = null;
      playoff.estado = "pendiente_resultados";
      return clone(match);
    }
    advancePlayoffs(categoryId) {
      const playoff = this.playoffs[categoryId];
      if (!playoff) throw new Error("Playoffs sintéticos no generados.");
      if (playoff.estado === "pendiente_clasificados") return clone(playoff);
      const roundOrder = { repechaje: 1, cuartos: 1, semifinales: 2, final: 3 };
      const currentRound = playoff.matches.reduce((round, match) => (roundOrder[match.ronda] || 0) > (roundOrder[round] || 0) ? match.ronda : round, "");
      const grouped = new Map();
      playoff.matches.filter((match) => match.ronda === currentRound).forEach((match) => { if (!grouped.has(match.llave)) grouped.set(match.llave, []); grouped.get(match.llave).push(match); });
      const winners = [];
      for (const [key, series] of grouped) {
        const winner = series[0].modo_definicion === "global"
          ? sportsRules.ganadorSerieGlobal(series, key)
          : series.length === 1
            ? sportsRules.ganadorPartidoPlayoff(series[0])
            : sportsRules.ganadorSerieMejorDe(series, key);
        if (!winner) return clone({ ...playoff, estado: "pendiente_resultados" });
        winners.push(winner);
      }
      if (winners.length === 1) { playoff.champion = winners[0]; playoff.estado = "finalizado"; return clone(playoff); }
      const nextRound = currentRound === "final" ? "finalizado" : currentRound === "semifinales" ? "final" : "semifinales";
      let pairs;
      if (nextRound === "finalizado") pairs = [];
      else if (currentRound === "repechaje") {
        const ranked = winners.slice().sort((a, b) => playoff.seed_order.find((item) => item.equipo === a).posicion - playoff.seed_order.find((item) => item.equipo === b).posicion);
        pairs = [[playoff.direct_teams[0], ranked[1]], [playoff.direct_teams[1], ranked[0]]];
      } else pairs = winners.length === 2 ? [[winners[0], winners[1]]] : [[winners[0], winners[1]], [winners[2], winners[3]]];
      if (nextRound === "finalizado") { playoff.champion = winners[0]; playoff.estado = "finalizado"; return clone(playoff); }
      const games = nextRound === "finalizado" ? 0 : Math.max(1, Number(playoff.series_games || 1));
      const roundMatches = pairs.flatMap(([local, visitante], index) => Array.from({ length: games }, (_, game) => ({ llave: `${nextRound}_${index + 1}`, ronda: nextRound, partido_numero: playoff.matches.length + index * games + game + 1, serie_partido: game + 1, local: game % 2 ? visitante : local, visitante: game % 2 ? local : visitante, modo_definicion: "mejor_de", puntos_local: null, puntos_visitante: null })));
      playoff.matches.push(...roundMatches); playoff.next_round = roundMatches.map((match) => match.llave); playoff.estado = "clasificados_avanzados";
      return clone(playoff);
    }
    getChampion(categoryId) { return this.playoffs[categoryId]?.champion || null; }
    simulateCompleteChampionship(categoryId) {
      const category = this.categories[categoryId];
      if (!category) throw new Error("Categoría sintética inexistente.");
      this.generateFixture("admin-demo", categoryId, { start: "2027-04-04", blocked: category.blocked, gameDay: 0 });
      for (const match of this.getMatches(categoryId)) this.loadResult(categoryId, match.partido_numero, 80, 70);
      const format = category.equipos.length >= 8 ? 8 : category.equipos.length >= 6 ? 6 : 4;
      this.generatePlayoffs(categoryId, format, { seriesGames: 1 });
      for (let guard = 0; guard < 6; guard += 1) {
        const pending = this.getPlayoffMatches(categoryId).filter((match) => match.puntos_local == null && match.local && match.visitante);
        for (const match of pending) this.loadPlayoffResult(categoryId, match.partido_numero, 70, 60);
        const state = this.advancePlayoffs(categoryId);
        if (state.estado === "finalizado") return clone({ categoryId, champion: state.champion, table: this.getTable(categoryId), playoffs: state });
      }
      throw new Error("La simulación no alcanzó un campeón.");
    }
    getDelegate(id) { return clone(this.delegates[id]); }
    getDelegateMatches(id, categoryId) { const delegate = this.delegates[id]; if (!delegate) return []; return this.getMatches(categoryId).filter((match) => delegate.equipos.includes(match.local) || delegate.equipos.includes(match.visitante)); }
    getPlayoffs(categoryId) { return clone(this.playoffs[categoryId] || []); }
  }
  return SyntheticDataProvider;
});
