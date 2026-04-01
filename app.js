// 🛑 Protección real contra doble ejecución
if (window.__APP_LIGA_MAXI__) {
  console.warn("[Liga Maxi] app ya inicializada. Se evita segunda ejecución.");
} else {
  window.__APP_LIGA_MAXI__ = true;

  console.log("[Liga Maxi] Inicio de app.js");
  const categoriaSelect = document.getElementById("categoria-select");
const tablaBody = document.getElementById("tabla-body");
const fixtureBody = document.getElementById("fixture-body");
const playoffBody = document.getElementById("playoff-body");

const tabLiga = document.getElementById("tab-liga");
const tabGestion = document.getElementById("tab-gestion");
const vistaLiga = document.getElementById("vista-liga");
const vistaGestion = document.getElementById("vista-gestion");

const categorias = {
  "Maxi +35 A": [
    "HOGAR SOCIAL",
    "SUD AMERICA",
    "UNION VECINAL",
    "VILLA SAN CARLOS",
    "U.N.L.P.",
    "BANCO PROVINCIA",
    "TOLOSANO",
    "MAYO",
    "UNIVERSAL",
    "MERIDIANO V"
  ],
  "Maxi +35 B": [
    "UNIDOS",
    "ESTRELLA",
    "MAX NORDAU",
    "RECONQUISTA",
    "GONNET",
    "VILLA ELISA",
    "JUVENTUD",
    "MACABI",
    "LOS HORNOS",
    "ESTUDIANTES"
  ],
  "Maxi +48": [
    "HOGAR SOCIAL",
    "VILLA SAN CARLOS",
    "VILLA ELISA",
    "PLATENSE",
    "JUVENTUD",
    "MERIDIANO",
    "EDELP"
  ],
  "Femenino": [
    "C. F. GONNET",
    "UNIVERSAL",
    "HOGAR SOCIAL",
    "PLATENSE",
    "MACABI",
    "ESTRELLA",
    "ASTILLERO",
    "DEP. SAN VICENTE",
    "MAX NORDAU"
  ]
};

function mostrarLiga() {
  if (tabLiga) tabLiga.classList.add("activo");
  if (tabGestion) tabGestion.classList.remove("activo");
  if (vistaLiga) vistaLiga.style.display = "block";
  if (vistaGestion) vistaGestion.style.display = "none";
}

function mostrarGestion() {
  if (tabGestion) tabGestion.classList.add("activo");
  if (tabLiga) tabLiga.classList.remove("activo");
  if (vistaGestion) vistaGestion.style.display = "block";
  if (vistaLiga) vistaLiga.style.display = "none";
}

function renderTablaInicial(categoria) {
  if (!tablaBody) return;

  const equipos = categorias[categoria] || [];
  tablaBody.innerHTML = equipos.map((equipo, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${equipo}</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
    </tr>
  `).join("");
}

function renderFixtureInicial(categoria) {
  if (!fixtureBody) return;
  fixtureBody.innerHTML = `
    <div class="alerta-suave">
      Fixture listo para ${categoria}. En el próximo paso volvemos a conectar la generación automática.
    </div>
  `;
}

function renderPlayoffInicial(categoria) {
  if (!playoffBody) return;
  playoffBody.innerHTML = `
    <div class="alerta-suave">
      Vista de playoffs lista para ${categoria}. En el próximo paso volvemos a conectar la lógica real.
    </div>
  `;
}

function renderCategoriaInicial() {
  const categoria = categoriaSelect ? categoriaSelect.value : "Maxi +35 A";
  renderTablaInicial(categoria);
  renderFixtureInicial(categoria);
  renderPlayoffInicial(categoria);
}

  // =========================
  // SUPABASE
  // =========================
  const SUPABASE_URL = "TU_URL";
  const SUPABASE_KEY = "TU_KEY";

  let supabase = null;

  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("[Liga Maxi] Cliente Supabase OK");
  } else {
    console.warn("[Liga Maxi] Supabase no cargó");
  }

  // =========================
  // DATOS
  // =========================
   // =========================
  // RENDER
  // =========================
  function render() {
    const tabla = document.getElementById("tabla-body");
    if (!tabla) return;

    tabla.innerHTML = "";

    categorias["Maxi +35 A"].forEach((equipo, i) => {
      tabla.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${equipo}</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
        </tr>
      `;
    });
  }

  // =========================
  // INICIO
  // =========================
  document.addEventListener("DOMContentLoaded", () => {

  if (tabLiga) tabLiga.addEventListener("click", mostrarLiga);
  if (tabGestion) tabGestion.addEventListener("click", mostrarGestion);

  if (categoriaSelect) {
    categoriaSelect.addEventListener("change", renderCategoriaInicial);
  }

  renderCategoriaInicial();
  mostrarLiga();

    console.log("[Liga Maxi] DOM listo");

});
}