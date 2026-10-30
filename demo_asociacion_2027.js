(function () {
  "use strict";
  const provider = new SyntheticDataProvider();
  const categories = Object.fromEntries(provider.getCategories().map((category) => [category.id === "cat-maxi-a" ? "maxi-a" : "maxi-b", category.equipos]));
  let currentFixture = [];
  const panelNames = ["inicio", "competencia", "delegados", "documentacion", "torneos", "programacion", "administracion"];
  function renderTeams() { const teams = categories[document.querySelector("#fixture-category").value]; document.querySelector("#assoc-teams").innerHTML = `<p><strong>Equipos (${teams.length})</strong></p><p>${teams.join(" · ")}</p>`; }
  function renderCompetition() { document.querySelector("#assoc-competition").innerHTML = currentFixture.length ? `<p><strong>${currentFixture.length} partidos · ${new Set(currentFixture.map((match) => match.jornada)).size} jornadas · última fecha ${currentFixture.at(-1).fecha}</strong></p>` + currentFixture.map((match) => `<div class="assoc-row"><span>J${match.jornada} · R${match.rueda || "—"} · ${match.fecha} · ${match.local} vs ${match.visitante}</span><strong>Programado</strong></div>`).join("") : '<p class="readonly">Todavía no hay fixture generado.</p>'; }
  function generateFixture() { const categoryId = document.querySelector("#fixture-category").value; const blocked = document.querySelector("#fixture-blocked").value.split(",").map((value) => value.trim()).filter(Boolean); currentFixture = provider.generateFixture("asoc-demo", categoryId, { start: document.querySelector("#fixture-start").value, blocked, wheels: Number(document.querySelector("#fixture-wheels").value), gameDay: Number(document.querySelector("#fixture-day").value) }).matches; renderCompetition(); document.querySelector("#assoc-status").textContent = `Fixture sintético regenerado: ${currentFixture.length} partidos.`; }
  function renderDelegateMatches() { const matches = provider.getDelegateMatches(document.querySelector("#delegate-select").value, document.querySelector("#delegate-category").value); document.querySelector("#delegate-matches").innerHTML = matches.length ? matches.map((match) => `<div class="assoc-row"><label><input type="radio" name="delegate-match" value="${match.partido_numero}"> ${match.fecha} · ${match.local} vs ${match.visitante}</label><strong>${match.puntos_local == null ? "Pendiente" : `${match.puntos_local} - ${match.puntos_visitante}`}</strong></div>`).join("") : '<p class="readonly">No hay partidos habilitados para este delegado.</p>'; }
  function saveDelegateResult() { const selected = document.querySelector("input[name=delegate-match]:checked"); if (!selected) { document.querySelector("#delegate-status").textContent = "Seleccioná un partido."; return; } try { provider.loadResult(document.querySelector("#delegate-category").value, Number(selected.value), Number(document.querySelector("#delegate-local").value), Number(document.querySelector("#delegate-away").value)); document.querySelector("#delegate-status").textContent = "Resultado ficticio cargado en memoria."; renderDelegateMatches(); } catch (error) { document.querySelector("#delegate-status").textContent = error.message; } }
  function showPanel(panel) {
    if (!panelNames.includes(panel)) return;
    document.querySelectorAll(".assoc-panel").forEach((element) => { element.hidden = element.id !== `panel-${panel}`; });
    document.querySelectorAll("[data-panel]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.panel === panel)));
    document.querySelector("#assoc-status").textContent = `Panel ${panel} activo. Datos locales solamente.`;
    if (panel === "competencia") { renderTeams(); renderCompetition(); }
    if (panel === "delegados") { if (!provider.getMatches("maxi-a").length) provider.generateFixture("asoc-demo", "maxi-a", { start: "2027-04-04", blocked: ["2027-04-11"], gameDay: 0 }); renderDelegateMatches(); }
  }
  document.querySelectorAll("[data-panel]").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.panel)));
  document.querySelector("#fixture-category").addEventListener("change", () => { renderTeams(); currentFixture = []; renderCompetition(); });
  document.querySelector("#generate-fixture").addEventListener("click", generateFixture);
  document.querySelector("#delegate-select").addEventListener("change", renderDelegateMatches);
  document.querySelector("#delegate-category").addEventListener("change", renderDelegateMatches);
  document.querySelector("#delegate-save").addEventListener("click", saveDelegateResult);
  document.querySelector("#assoc-category").addEventListener("change", (event) => { document.querySelector("#assoc-status").textContent = `Categoría ${event.target.value}. Datos sintéticos.`; });
  showPanel("inicio");
})();
