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
    { id: "m2", date: "05/04/2027", home: "c", away: "d", hs: 58, as: 58, state: "jugado" },
    { id: "m3", date: "12/04/2027", home: "a", away: "c", hs: null, as: null, state: "programado" },
    { id: "m4", date: "12/04/2027", home: "b", away: "d", hs: null, as: null, state: "programado" },
  ];

  const $ = (selector) => document.querySelector(selector);
  const teamName = (id) => teams.find((team) => team.id === id)?.name || "Equipo";

  function calculateTable() {
    const rows = Object.fromEntries(teams.map((team) => [team.id, { ...team, pj: 0, pts: 0, pf: 0, pc: 0 }]));
    matches.filter((match) => match.state === "jugado").forEach((match) => {
      const home = rows[match.home]; const away = rows[match.away];
      home.pj++; away.pj++; home.pf += match.hs; home.pc += match.as; away.pf += match.as; away.pc += match.hs;
      if (match.hs > match.as) { home.pts += 2; away.pts += 1; } else if (match.as > match.hs) { away.pts += 2; home.pts += 1; } else { home.pts += 1; away.pts += 1; }
    });
    return Object.values(rows).sort((left, right) => right.pts - left.pts || (right.pf - right.pc) - (left.pf - left.pc));
  }

  function renderFixture() {
    const rows = matches.map((match) => `<div class="demo-result"><div><strong>${match.date} · ${teamName(match.home)} vs ${teamName(match.away)}</strong><small>${match.state === "jugado" ? "Resultado registrado" : "Fecha programada"}</small></div><strong>${match.hs == null ? "—" : `${match.hs} - ${match.as}`}</strong></div>`).join("");
    $("#demo-main-panel").innerHTML = `<h2>Fixture de fase regular</h2>${rows}`;
  }

  function renderTable() {
    const rows = calculateTable().map((team, index) => `<tr><td>${index + 1}</td><td>${team.name}</td><td>${team.pj}</td><td>${team.pts}</td><td>${team.pf - team.pc > 0 ? "+" : ""}${team.pf - team.pc}</td></tr>`).join("");
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
