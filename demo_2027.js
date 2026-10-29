(function () {
  "use strict";

  const teams = [
    { id: "a", name: "Sud América" },
    { id: "b", name: "Gonnet" },
    { id: "c", name: "Banco Provincia" },
    { id: "d", name: "Estudiantes" },
  ];
  const matches = [
    { id: "m1", date: "05/04/2027", home: "a", away: "b", hs: 62, as: 55, state: "jugado" },
    { id: "m2", date: "05/04/2027", home: "c", away: "d", hs: 58, as: 54, state: "jugado" },
    { id: "m3", date: "12/04/2027", home: "a", away: "c", hs: null, as: null, state: "programado" },
    { id: "m4", date: "12/04/2027", home: "b", away: "d", hs: null, as: null, state: "programado" },
  ];

  const $ = (selector) => document.querySelector(selector);
  const teamName = (id) => teams.find((team) => team.id === id)?.name || "Equipo";

  function renderFixture() {
    const rows = matches.map((match) => `<div class="demo-result"><div><strong>${match.date} · ${teamName(match.home)} vs ${teamName(match.away)}</strong><small>${match.state === "jugado" ? "Resultado registrado" : "Fecha programada"}</small></div><strong>${match.hs == null ? "—" : `${match.hs} - ${match.as}`}</strong></div>`).join("");
    $("#demo-main-panel").innerHTML = `<h2>Fixture de fase regular</h2>${rows}`;
  }

  function renderTable() {
    const sportMatches = matches.map((match) => ({ local: teamName(match.home), visitante: teamName(match.away), puntos_local: match.hs, puntos_visitante: match.as, estado_resultado: match.state === "jugado" ? "jugado" : "pendiente" }));
    const rows = Demo2027Sports.calcularTabla(sportMatches).map((team, index) => `<tr><td>${index + 1}</td><td>${team.equipo}</td><td>${team.pj}</td><td>${team.pg}</td><td>${team.pp}</td><td>${team.pf}</td><td>${team.pc}</td><td>${team.dif > 0 ? "+" : ""}${team.dif}</td><td>${team.pts}</td></tr>`).join("");
    $("#demo-main-panel").innerHTML = `<h2>Tabla de posiciones</h2><table class="demo-table"><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>Pts</th><th>DIF</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderResults() {
    const played = matches.filter((match) => match.state === "jugado");
    $("#demo-main-panel").innerHTML = `<h2>Resultados cargados</h2>${played.length ? played.map((match) => `<div class="demo-result"><strong>${teamName(match.home)}<br>${teamName(match.away)}</strong><strong>${match.hs} - ${match.as}</strong></div>`).join("") : '<p class="demo-empty">Todavía no hay resultados.</p>'}`;
  }

  function show(view) {
    document.querySelectorAll("[data-view]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
    if (view === "tabla") renderTable(); else if (view === "resultados") renderResults(); else renderFixture();
    $("#demo-status").textContent = `Vista activa: ${view}. Datos locales solamente.`;
  }

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => show(button.dataset.view)));
  show("fixture");
})();
