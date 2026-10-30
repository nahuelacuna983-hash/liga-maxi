(function () {
  "use strict";
  const matches = [["05/04/2027", "Sud América", "Gonnet", "62 - 55"], ["05/04/2027", "Banco Provincia", "Estudiantes", "58 - 54"], ["12/04/2027", "Sud América", "Banco Provincia", "Pendiente"], ["12/04/2027", "Gonnet", "Estudiantes", "Pendiente"]];
  const panelNames = ["inicio", "competencia", "documentacion", "torneos", "programacion", "administracion"];
  function renderCompetition() { document.querySelector("#assoc-competition").innerHTML = matches.map((match) => `<div class="assoc-row"><span>${match[0]} · ${match[1]} vs ${match[2]}</span><strong>${match[3]}</strong></div>`).join(""); }
  function showPanel(panel) {
    if (!panelNames.includes(panel)) return;
    document.querySelectorAll(".assoc-panel").forEach((element) => { element.hidden = element.id !== `panel-${panel}`; });
    document.querySelectorAll("[data-panel]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.panel === panel)));
    document.querySelector("#assoc-status").textContent = `Panel ${panel} activo. Datos locales solamente.`;
    if (panel === "competencia") renderCompetition();
  }
  document.querySelectorAll("[data-panel]").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.panel)));
  document.querySelector("#assoc-category").addEventListener("change", (event) => { document.querySelector("#assoc-status").textContent = `Categoría ${event.target.value}. Datos sintéticos.`; });
  showPanel("inicio");
})();
