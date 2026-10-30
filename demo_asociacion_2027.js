(function () {
  "use strict";
  const categories = { "maxi-a": ["Sud América", "Gonnet", "Banco Provincia", "Estudiantes"], "maxi-b": ["Estrella de Berisso", "Mayo", "Universal", "Los Hornos"] };
  let currentFixture = [];
  const panelNames = ["inicio", "competencia", "documentacion", "torneos", "programacion", "administracion"];
  function renderTeams() { const teams = categories[document.querySelector("#fixture-category").value]; document.querySelector("#assoc-teams").innerHTML = `<p><strong>Equipos (${teams.length})</strong></p><p>${teams.join(" · ")}</p>`; }
  function renderCompetition() { document.querySelector("#assoc-competition").innerHTML = currentFixture.length ? currentFixture.map((match) => `<div class="assoc-row"><span>J${match.jornada} · ${match.fecha} · ${match.local} vs ${match.visitante}</span><strong>Programado</strong></div>`).join("") : '<p class="readonly">Todavía no hay fixture generado.</p>'; }
  function generateFixture() { const teams = categories[document.querySelector("#fixture-category").value]; currentFixture = Demo2027Fixture.generateFixture(teams, "2027-04-05", ["2027-04-12"] ).matches; renderCompetition(); document.querySelector("#assoc-status").textContent = `Fixture sintético regenerado: ${currentFixture.length} partidos.`; }
  function showPanel(panel) {
    if (!panelNames.includes(panel)) return;
    document.querySelectorAll(".assoc-panel").forEach((element) => { element.hidden = element.id !== `panel-${panel}`; });
    document.querySelectorAll("[data-panel]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.panel === panel)));
    document.querySelector("#assoc-status").textContent = `Panel ${panel} activo. Datos locales solamente.`;
    if (panel === "competencia") { renderTeams(); renderCompetition(); }
  }
  document.querySelectorAll("[data-panel]").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.panel)));
  document.querySelector("#fixture-category").addEventListener("change", () => { renderTeams(); currentFixture = []; renderCompetition(); });
  document.querySelector("#generate-fixture").addEventListener("click", generateFixture);
  document.querySelector("#assoc-category").addEventListener("change", (event) => { document.querySelector("#assoc-status").textContent = `Categoría ${event.target.value}. Datos sintéticos.`; });
  showPanel("inicio");
})();
