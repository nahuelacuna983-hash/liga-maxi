"use strict";

(() => {
  if (new URLSearchParams(location.search).get("mode") !== "postgres") return;
  const client = new PostgresHttpClient(
    new URLSearchParams(location.search).get("api") || "http://127.0.0.1:8787",
  );
  const developmentOrganizationId = "00000000-0000-4000-8000-000000000101";
  const state = {
    category: null,
    teams: [],
    matches: [],
    table: [],
    playoffs: null,
    playoffFormat: 4,
    selectedMatchId: "",
    lifecycle: { state: "draft" },
    documents: { documents: [], history: [] },
    playoffRule: { crossing_mode: null, confirmed: false },
    users: [],
    view: "public",
  };
  const $ = (id) => document.querySelector(id);
  const status = (message) => {
    $("#circuit-status").textContent = message;
  };
  const request = async (work) => {
    try {
      await work();
    } catch (error) {
      status(`Error persistente: ${error.message}`);
    }
  };
  const rows = () =>
    state.matches
      .map(
        (m) =>
          `<div class="row"><span>${m.local} vs ${m.visitante}</span><strong>${m.puntos_local == null ? "Pendiente" : `${m.puntos_local} - ${m.puntos_visitante}`}</strong></div>`,
      )
      .join("") || "<p>No hay partidos persistidos.</p>";
  const renderPublic = () => {
    $("#view-public").innerHTML =
      `<h2>Público · PostgreSQL local</h2><p>Datos recuperados del backend.</p><table><thead><tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>PF</th><th>PC</th><th>DIF</th><th>PTS</th></tr></thead><tbody>${state.table.map((r) => `<tr><td>${r.equipo}</td><td>${r.pj}</td><td>${r.pg}</td><td>${r.pp}</td><td>${r.pf}</td><td>${r.pc}</td><td>${r.dif}</td><td>${r.pts}</td></tr>`).join("")}</tbody></table><h3>Fixture</h3>${rows()}`;
  };
  const reload = async () => {
    if (!state.category) return;
    const result = await client.competition(state.category.id);
    state.matches = result.matches;
    state.table = result.table;
    state.teams = result.teams || state.teams;
    const persistedPlayoffs = await client.playoffs(state.category.id);
    state.playoffs = persistedPlayoffs.playoff?.payload || null;
    if (client.token) {
      state.lifecycle = await client.lifecycle(state.category.id);
      state.documents = await client.documents(state.category.id);
    }
    state.playoffRule = await client.playoffRule(state.category.id);
    if (state.playoffs?.formato) state.playoffFormat = Number(state.playoffs.formato.replace("top", ""));
    renderPublic();
    renderAssociation();
  };
  const renderAssociation = () => {
    const options = state.matches
      .map(
        (match) =>
          `<option value="${match.id}" ${match.id === state.selectedMatchId ? "selected" : ""}>${match.local} vs ${match.visitante}</option>`,
      )
      .join("");
    $("#view-association").innerHTML =
      `<h2>Asociación · PostgreSQL local</h2><p class="notice">Confirmaciones emitidas sólo después de PostgreSQL. El login es exclusivo de desarrollo y no es autenticación productiva.</p><div class="result-actions"><input id="pg-login-user" placeholder="Usuario de desarrollo"><button id="pg-login">Iniciar sesión</button><button id="pg-logout">Cerrar sesión</button></div><div id="pg-team-state">Equipos persistidos: ${state.teams.length} · ${(state.teams || []).map((team) => team.name).join(", ") || "ninguno"}</div><div class="result-actions"><input id="pg-tournament" placeholder="Torneo"><button id="pg-create-tournament">Crear torneo</button><input id="pg-category" placeholder="Categoría"><button id="pg-create-category">Crear categoría</button></div><div class="result-actions"><input id="pg-team" placeholder="Equipo"><button id="pg-add-team">Agregar equipo</button><button id="pg-fixture">Guardar fixture</button></div><div class="result-actions"><select id="pg-match"><option value="">Partido</option>${options}</select><input id="pg-date" type="datetime-local"><input id="pg-court" placeholder="Cancha"><button id="pg-schedule">Programar</button><input id="pg-local" type="number" placeholder="Local"><input id="pg-away" type="number" placeholder="Visitante"><button id="pg-result">Guardar resultado</button></div><h3>Estado recuperado</h3>${rows()}`;
    $("#pg-match").onchange = () => {
      state.selectedMatchId = $("#pg-match").value;
    };
    bind();
    const tools = document.createElement("section");
    tools.id = "pg-administration-tools";
    tools.innerHTML = `<h3>Administración de la organización sintética</h3><div class="result-actions"><input id="pg-season-name" placeholder="Temporada"><input id="pg-season-year" type="number" value="2027"><button id="pg-season-create">Crear temporada</button><button id="pg-users-refresh">Consultar usuarios</button></div><div class="result-actions"><select id="pg-category-state"><option value="draft">Borrador</option><option value="officialized">Oficializada</option><option value="closed">Cerrada</option></select><button id="pg-category-state-save">Guardar estado de categoría</button></div><div class="result-actions"><input id="pg-admin-user" placeholder="UUID de delegado"><button id="pg-membership-grant">Dar membresía</button><button id="pg-membership-revoke">Revocar membresía</button></div><div class="result-actions"><input id="pg-admin-team" placeholder="UUID de equipo"><button id="pg-assignment-grant">Asignar alcance</button><button id="pg-assignment-revoke">Revocar alcance</button></div><h3>Documentación sintética</h3><div class="result-actions"><input id="pg-player-id" placeholder="UUID jugador"><input id="pg-player-name" placeholder="Nombre ficticio"><input id="pg-player-team" placeholder="UUID equipo"><button id="pg-player-create">Registrar jugador</button></div><div class="result-actions"><input id="pg-document-id" placeholder="UUID requisito"><input id="pg-document-requirement" placeholder="Requisito"><select id="pg-document-status"><option value="submitted">Cargado</option><option value="observed">Observado</option><option value="approved">Aprobado por Asociación</option><option value="rejected">Rechazado</option></select><input id="pg-document-evidence" placeholder="Evidencia sintética"><button id="pg-document-review">Registrar revisión</button></div><p id="pg-admin-state">Estado de categoría: ${state.lifecycle.state}</p><div id="pg-users-state"></div>`;
    $("#view-association").appendChild(tools);
    $("#pg-category-state").value = state.lifecycle.state;
    bind();
    enhancePlayoffs();
  };
  const bind = () => {
    const on = (id, fn) => {
      const el = $(id);
      if (el) el.onclick = () => request(fn);
    };
    const selectedMatch = () => {
      const matchId = $("#pg-match").value;
      if (!matchId) throw new Error("Seleccioná un partido persistido.");
      return matchId;
    };
    on("#pg-login", async () => { await client.login($("#pg-login-user").value.trim()); status("Sesión de desarrollo iniciada."); await reload(); });
    on("#pg-logout", async () => { client.logout(); state.category = null; state.matches = []; state.teams = []; state.table = []; state.playoffs = null; renderAssociation(); status("Sesión cerrada."); });
    on("#pg-season-create", async () => { const season = await client.season({ id: crypto.randomUUID(), organizationId: developmentOrganizationId, name: $("#pg-season-name").value || "Temporada 2027", year: Number($("#pg-season-year").value) || 2027 }); status(`Temporada ${season.name} confirmada por PostgreSQL.`); });
    on("#pg-category-state-save", async () => { if (!state.category) throw new Error("Creá primero una categoría."); state.lifecycle = await client.lifecycle(state.category.id, $("#pg-category-state").value); $("#pg-admin-state").textContent = `Estado de categoría: ${state.lifecycle.state}`; status("Estado de categoría confirmado por PostgreSQL."); });
    on("#pg-users-refresh", async () => { state.users = await client.organizationUsers(developmentOrganizationId); $("#pg-users-state").textContent = state.users.map((user) => `${user.username} · ${user.role}`).join(" | ") || "Sin usuarios"; status("Usuarios y membresías recuperados."); });
    on("#pg-membership-grant", async () => { const userId = $("#pg-admin-user").value.trim(); if (!userId) throw new Error("Ingresá el UUID del usuario."); await client.membership({ userId, organizationId: developmentOrganizationId }); status("Membresía confirmada por PostgreSQL."); });
    on("#pg-membership-revoke", async () => { const userId = $("#pg-admin-user").value.trim(); if (!userId) throw new Error("Ingresá el UUID del usuario."); await client.revokeMembership({ userId, organizationId: developmentOrganizationId }); status("Membresía revocada por PostgreSQL."); });
    on("#pg-assignment-grant", async () => { if (!state.category) throw new Error("Creá primero una categoría."); const userId = $("#pg-admin-user").value.trim(); const teamId = $("#pg-admin-team").value.trim(); if (!userId || !teamId) throw new Error("Ingresá UUID de delegado y equipo."); await client.delegateAssignment({ userId, categoryId: state.category.id, teamId }); status("Alcance de delegado confirmado por PostgreSQL."); });
    on("#pg-assignment-revoke", async () => { if (!state.category) throw new Error("Creá primero una categoría."); const userId = $("#pg-admin-user").value.trim(); const teamId = $("#pg-admin-team").value.trim(); if (!userId || !teamId) throw new Error("Ingresá UUID de delegado y equipo."); await client.revokeDelegateAssignment({ userId, categoryId: state.category.id, teamId }); status("Alcance de delegado revocado por PostgreSQL."); });
    on("#pg-player-create", async () => { if (!state.category) throw new Error("Creá primero una categoría."); await client.player({ id: $("#pg-player-id").value.trim() || crypto.randomUUID(), categoryId: state.category.id, teamId: $("#pg-player-team").value.trim(), name: $("#pg-player-name").value.trim() }); status("Jugador sintético registrado por PostgreSQL."); });
    on("#pg-document-review", async () => { if (!state.category) throw new Error("Creá primero una categoría."); await client.reviewDocument({ id: $("#pg-document-id").value.trim() || crypto.randomUUID(), categoryId: state.category.id, requirement: $("#pg-document-requirement").value.trim(), status: $("#pg-document-status").value, evidenceRef: $("#pg-document-evidence").value.trim() }); status("Revisión documental registrada por PostgreSQL."); });
    on("#pg-create-tournament", async () => {
      window.pgTournament = await client.tournament({
        id: crypto.randomUUID(),
        organizationId: developmentOrganizationId,
        name: $("#pg-tournament").value || "Torneo PostgreSQL 2027",
        season: 2027,
      });
      localStorage.setItem("pg-tournament-id", window.pgTournament.id);
      status("Torneo confirmado por PostgreSQL.");
    });
    on("#pg-create-category", async () => {
      if (!window.pgTournament) throw new Error("Creá primero un torneo.");
      state.category = await client.category({
        id: crypto.randomUUID(),
        tournamentId: window.pgTournament.id,
        name: $("#pg-category").value || "Maxi +35 A",
      });
      state.matches = [];
      state.table = [];
      state.teams = [];
      localStorage.setItem("pg-category-id", state.category.id);
      status("Categoría confirmada por PostgreSQL.");
      renderAssociation();
    });
    on("#pg-add-team", async () => {
      const name = $("#pg-team").value.trim();
      if (!name) throw new Error("El nombre del equipo es obligatorio.");
      if (!state.category) throw new Error("Creá primero una categoría.");
      await client.team({
        id: crypto.randomUUID(),
        categoryId: state.category.id,
        name,
      });
      await reload();
      status("Equipo confirmado por PostgreSQL.");
    });
    on("#pg-fixture", async () => {
      if (state.teams.length < 4)
        throw new Error("El fixture requiere al menos cuatro equipos.");
      const matches = [];
      for (let i = 0; i < state.teams.length; i++)
        for (let j = i + 1; j < state.teams.length; j++)
          matches.push({
            id: crypto.randomUUID(),
            round: Math.floor(matches.length / 2),
            homeTeamId: state.teams[i].id,
            awayTeamId: state.teams[j].id,
          });
      await client.fixture({
        categoryId: state.category.id,
        actorId: crypto.randomUUID(),
        matches,
      });
      await reload();
      status("Fixture confirmado por PostgreSQL.");
    });
    on("#pg-schedule", async () => {
      await client.schedule(selectedMatch(), {
        actorId: crypto.randomUUID(),
        scheduledAt: new Date($("#pg-date").value).toISOString(),
        court: $("#pg-court").value,
      });
      await reload();
      status("Programación confirmada por PostgreSQL.");
    });
    on("#pg-result", async () => {
      await client.result(selectedMatch(), {
        actorId: crypto.randomUUID(),
        homeScore: Number($("#pg-local").value),
        awayScore: Number($("#pg-away").value),
      });
      await reload();
      status("Resultado confirmado por PostgreSQL.");
    });
  };
  window.addEventListener("load", async () => {
    $(".notice").textContent =
      "Modo persistente PostgreSQL local. No es autenticación productiva.";
    await request(async () => {
      await client.health();
      const savedCategory = localStorage.getItem("pg-category-id");
      if (savedCategory) {
        state.category = { id: savedCategory };
        await reload();
      } else {
        const tournaments = await client.tournaments();
        if (tournaments[0]) {
          const categories = await client.categories(tournaments[0].id);
          if (categories[0]) {
            state.category = categories[0];
            await reload();
          }
        }
      }
      status("PostgreSQL local conectado.");
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.onclick = () => {
        const view = button.dataset.view;
        document.querySelectorAll("[id^=view-]").forEach((panel) => {
          panel.hidden = panel.id !== `view-${view}`;
        });
        if (view === "association") renderAssociation();
        if (view === "public") renderPublic();
      };
    });
  });
  function playoffEngine() {
    const engine = new SyntheticDataProvider();
    engine.categories["maxi-a"].equipos = state.teams.map((team) => team.name);
    engine.matches["maxi-a"] = state.matches.map((match, index) => ({
      partido_numero: index + 1,
      local: match.local,
      visitante: match.visitante,
      puntos_local: match.puntos_local,
      puntos_visitante: match.puntos_visitante,
      estado_resultado: match.estado_resultado,
    }));
    if (state.playoffs)
      engine.playoffs["maxi-a"] = JSON.parse(JSON.stringify(state.playoffs));
    return engine;
  }
  function playoffRows() {
    if (!state.playoffs) return "<p>No hay playoffs persistidos.</p>";
    return `<p>Estado: <strong>${state.playoffs.estado}</strong>${state.playoffs.champion ? ` · Campeón: <strong>${state.playoffs.champion}</strong>` : ""}</p>${(state.playoffs.matches || []).map((match) => `<div class="row"><span>${match.ronda} · ${match.local} vs ${match.visitante}</span><strong>${match.puntos_local == null ? "Pendiente" : `${match.puntos_local} - ${match.puntos_visitante}`}</strong></div>`).join("")}`;
  }
  function enhancePlayoffs() {
    const panel = $("#view-association");
    if (!panel || $("#pg-playoffs")) return;
    const box = document.createElement("div");
    box.id = "pg-playoffs";
    box.innerHTML = `<h3>Playoffs persistentes</h3><div class="result-actions"><select id="pg-playoff-top"><option value="4">Top 4</option><option value="6">Top 6</option><option value="8">Top 8</option></select><select id="pg-playoff-rule"><option value="">Modalidad pendiente</option><option value="fixed">Opción A · Llaves fijas</option><option value="reseed">Opción B · Reordenamiento</option></select><button id="pg-playoff-rule-save">Guardar modalidad</button><button id="pg-playoff-generate">Generar proyección</button><button id="pg-playoff-officialize">Oficializar llave</button><select id="pg-playoff-match"><option value="">Partido playoff</option></select><input id="pg-playoff-local" type="number" placeholder="Local"><input id="pg-playoff-away" type="number" placeholder="Visitante"><button id="pg-playoff-result">Guardar resultado</button><button id="pg-playoff-advance">Avanzar ronda</button></div><div id="pg-playoff-state">${playoffRows()}</div>`;
    panel.appendChild(box);
    $("#pg-playoff-top").value = String(state.playoffFormat);
    $("#pg-playoff-rule").value = state.playoffRule.crossing_mode || "";
    $("#pg-playoff-top").onchange = () => { state.playoffFormat = Number($("#pg-playoff-top").value); };
    $("#pg-playoff-rule-save").onclick = () => request(async () => { if (!state.category) throw new Error("Creá primero una categoría."); state.playoffRule = await client.playoffRule(state.category.id, $("#pg-playoff-rule").value); status("Modalidad de cruces registrada para revisión APdB."); });
    const render = () => {
      const select = $("#pg-playoff-match");
      select.innerHTML = `<option value="">Partido playoff</option>${(
        state.playoffs?.matches || []
      )
        .filter((match) => match.puntos_local == null)
        .map(
          (match) =>
            `<option value="${match.partido_numero}">${match.ronda} · ${match.local} vs ${match.visitante}</option>`,
        )
        .join("")}`;
      $("#pg-playoff-state").innerHTML = playoffRows();
    };
    render();
    $("#pg-playoff-generate").onclick = () =>
      request(async () => {
        const engine = playoffEngine();
        const count = state.playoffFormat;
        const bracket = engine.generatePlayoffs("maxi-a", count, { seriesGames: count === 6 ? 2 : 1 });
        if (bracket.formato !== `top${count}`)
          throw new Error(`El formato generado (${bracket.formato}) no coincide con el seleccionado (top${count}).`);
        if (bracket.estado !== "listo")
          throw new Error("Faltan clasificados para preparar la llave.");
        state.playoffs = bracket;
        await client.savePlayoffs({
          categoryId: state.category.id,
          actorId: crypto.randomUUID(),
          format: `top${count}`,
          state: bracket.estado,
          publicationState: "projection",
          champion: bracket.champion,
          payload: bracket,
        });
        render();
        status("Playoffs confirmados por PostgreSQL.");
      });
    $("#pg-playoff-result").onclick = () =>
      request(async () => {
        if (!state.playoffs) throw new Error("Generá primero las llaves.");
        const matchNumber = Number($("#pg-playoff-match").value);
        if (!matchNumber)
          throw new Error("Seleccioná un partido playoff pendiente.");
        const engine = playoffEngine();
        engine.playoffs["maxi-a"] = state.playoffs;
        engine.loadPlayoffResult(
          "maxi-a",
          matchNumber,
          Number($("#pg-playoff-local").value),
          Number($("#pg-playoff-away").value),
        );
        state.playoffs = engine.getPlayoffs("maxi-a");
        await client.savePlayoffs({
          categoryId: state.category.id,
          actorId: crypto.randomUUID(),
          format: state.playoffs.formato,
          state: state.playoffs.estado,
          champion: state.playoffs.champion,
          payload: state.playoffs,
        });
        render();
        status("Resultado de playoff confirmado por PostgreSQL.");
      });
    $("#pg-playoff-advance").onclick = () =>
      request(async () => {
        if (!state.playoffs) throw new Error("Generá primero las llaves.");
        const engine = playoffEngine();
        engine.playoffs["maxi-a"] = state.playoffs;
        state.playoffs = engine.advancePlayoffs("maxi-a");
        await client.savePlayoffs({
          categoryId: state.category.id,
          actorId: crypto.randomUUID(),
          format: state.playoffs.formato,
          state: state.playoffs.estado,
          champion: state.playoffs.champion,
          payload: state.playoffs,
        });
        render();
        status("Avance de playoff confirmado por PostgreSQL.");
      });
    $("#pg-playoff-officialize").onclick = () => request(async () => {
      if (!state.category || !state.playoffs) throw new Error("Generá primero una proyección de playoffs.");
      state.playoffs = await client.officializePlayoffs(state.category.id);
      render();
      status("Llave oficializada por PostgreSQL.");
    });
  }
  enhancePlayoffs();
})();
