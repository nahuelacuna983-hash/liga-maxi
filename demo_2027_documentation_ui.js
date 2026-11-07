(function () {
  "use strict";
  const provider = window.demoCircuitProvider;
  if (!provider) return;
  const escape = (value) => String(value).replace(/[&<>"']/g, (item) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[item]));
  function statusText(value) { return value === "documentacion_completa" ? "Documentación completa" : value === "revision_humana_pendiente" ? "Revisión humana pendiente" : "Documentación incompleta"; }
  function addAssociationControls() {
    const panel = document.querySelector("#view-association .assoc-panel");
    if (!panel || !panel.textContent.includes("Jugadores y documentación") || panel.querySelector("#demo-doc-requirements")) return;
    const category = document.querySelector("#circuit-category")?.value;
    const teams = provider.getTeams(category);
    const box = document.createElement("div"); box.id = "demo-doc-requirements"; box.className = "notice";
    box.innerHTML = `<h4>Requisitos documentales sintéticos</h4><p>Configuración administrativa por categoría/equipo. No habilita automáticamente la competencia.</p><select id="demo-doc-team"><option value="">Toda la categoría</option>${teams.map((team) => `<option>${escape(team)}</option>`).join("")}</select><input id="demo-doc-requirement" placeholder="Nuevo requisito"><button id="demo-doc-save-requirement" type="button">Guardar requisito</button><span id="demo-doc-requirement-status" role="status"></span>`;
    panel.prepend(box);
    box.querySelector("button").onclick = () => { try { const team = box.querySelector("#demo-doc-team").value; const input = box.querySelector("#demo-doc-requirement"); provider.setDocumentRequirements("asoc-demo", category, team, provider.getDocumentRequirements(category, team).concat(input.value)); input.value = ""; box.querySelector("#demo-doc-requirement-status").textContent = "Requisito guardado en la demo."; } catch (error) { box.querySelector("#demo-doc-requirement-status").textContent = error.message; } };
  }
  function addDelegateControls() {
    const panel = document.querySelector("#view-delegate");
    if (!panel || panel.querySelector("#demo-delegate-documents")) return;
    const actor = document.querySelector("#active-delegate")?.value || "delegado-a";
    const players = provider.getPlayers(actor);
    const box = document.createElement("section"); box.id = "demo-delegate-documents"; box.className = "panel";
    box.innerHTML = `<h3>Obligaciones documentales</h3>${players.length ? players.map((player) => { const requirements = provider.getDocumentRequirements(player.categoria, player.equipo); const docs = provider.getPlayerDocuments(actor, player.id); return `<article class="row"><span><strong>${escape(player.nombre)}</strong> · ${escape(player.equipo)}<br><small>Estado: ${statusText(provider.getPlayerEligibility(actor, player.id))}</small><br>${requirements.map((item) => { const current = docs.find((doc) => doc.requirement === item); return `<label>${escape(item)} <input data-doc-player="${escape(player.id)}" data-doc-requirement="${escape(item)}" placeholder="Evidencia sintética" value="${escape(current?.evidence || "")}" ${current?.status === "aprobado" ? "disabled" : ""}><button data-doc-submit="${escape(player.id)}" data-doc-requirement="${escape(item)}" type="button">Presentar</button></label>`; }).join("<br>")}</span></article>`; }).join("") : "<p>No hay jugadoras asignadas a este delegado.</p>"}`;
    panel.appendChild(box);
    box.querySelectorAll("button[data-doc-submit]").forEach((button) => { button.onclick = () => { const playerId = button.dataset.docSubmit; const requirement = button.dataset.docRequirement; const input = box.querySelector(`[data-doc-player="${CSS.escape(playerId)}"][data-doc-requirement="${CSS.escape(requirement)}"]`); try { provider.submitDocument(actor, playerId, requirement, input.value); document.querySelector("#circuit-status").textContent = "Presentación documental sintética registrada. Queda pendiente de revisión humana."; addDelegateControls(); } catch (error) { document.querySelector("#circuit-status").textContent = error.message; } }; });
  }
  const observer = new MutationObserver(() => { addAssociationControls(); addDelegateControls(); });
  observer.observe(document.body, { childList: true, subtree: true });
  addAssociationControls(); addDelegateControls();
}());
