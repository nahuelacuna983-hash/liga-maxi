// ===== CONFIG =====
const ADMIN_PASSWORD = "admin123";

// ===== DOM =====
const tabLiga = document.getElementById("tab-liga");
const tabGestion = document.getElementById("tab-gestion");
const vistaLiga = document.getElementById("vista-liga");
const vistaGestion = document.getElementById("vista-gestion");

const categoriaSelect = document.getElementById("categoria-select");
const tablaBody = document.getElementById("tabla-body");
const fixtureBody = document.getElementById("fixture-body");
const playoffBody = document.getElementById("playoff-body");

const abrirGestionBtn = document.getElementById("abrir-gestion-btn");
const cerrarGestionBtn = document.getElementById("cerrar-gestion-btn");
const gestionContenido = document.getElementById("gestion-contenido");

const generarBtn = document.getElementById("generar-fixture");

const partidoSelect = document.getElementById("partido-select");
const puntosLocal = document.getElementById("puntos-local");
const puntosVisitante = document.getElementById("puntos-visitante");
const guardarBtn = document.getElementById("guardar-resultado");

// ===== DATA =====
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

let fixtures = {};
let resultados = {};

// ===== TABS =====
tabLiga.onclick = () => {
  vistaLiga.style.display = "block";
  vistaGestion.style.display = "none";
};

tabGestion.onclick = () => {
  vistaLiga.style.display = "none";
  vistaGestion.style.display = "block";
};

// ===== GESTION =====
abrirGestionBtn.onclick = () => {
  const clave = prompt("Clave:");
  if (clave === ADMIN_PASSWORD) {
    gestionContenido.style.display = "block";
  }
};

cerrarGestionBtn.onclick = () => {
  gestionContenido.style.display = "none";
};

// ===== GENERAR FIXTURE =====
function generarFixture(equipos) {
  let partidos = [];

  for (let i = 0; i < equipos.length; i++) {
    for (let j = i + 1; j < equipos.length; j++) {
      partidos.push({
        local: equipos[i],
        visitante: equipos[j],
        pl: null,
        pv: null
      });
    }
  }

  return partidos;
}

generarBtn.onclick = () => {
  const cat = categoriaSelect.value;
  fixtures[cat] = generarFixture(categorias[cat]);
  render();
};

// ===== RESULTADOS =====
guardarBtn.onclick = () => {
  const cat = categoriaSelect.value;
  const index = partidoSelect.value;
  const partido = fixtures[cat][index];

  partido.pl = Number(puntosLocal.value);
  partido.pv = Number(puntosVisitante.value);

  render();
};

if (window.__APP_LIGA_MAXI__) {
  console.warn("[Liga Maxi] app ya inicializada. Se evita segunda ejecución.");
} else {
  window.__APP_LIGA_MAXI__ = true;

  const ADMIN_PASSWORD = "admin123";

  const tabLiga = document.getElementById("tab-liga");
  const tabGestion = document.getElementById("tab-gestion");
  const vistaLiga = document.getElementById("vista-liga");
  const vistaGestion = document.getElementById("vista-gestion");

  const categoriaSelect = document.getElementById("categoria-select");
  const tablaBody = document.getElementById("tabla-body");
  const fixtureBody = document.getElementById("fixture-body");
  const playoffBody = document.getElementById("playoff-body");

  const abrirGestionBtn = document.getElementById("abrir-gestion-btn");
  const cerrarGestionBtn = document.getElementById("cerrar-gestion-btn");
  const gestionContenido = document.getElementById("gestion-contenido");

  const generarBtn = document.getElementById("generar-fixture");

  const partidoSelect = document.getElementById("partido-select");
  const puntosLocal = document.getElementById("puntos-local");
  const puntosVisitante = document.getElementById("puntos-visitante");
  const guardarBtn = document.getElementById("guardar-resultado");

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

  let fixtures = {};

  function mostrarLiga() {
    vistaLiga.style.display = "block";
    vistaGestion.style.display = "none";
    tabLiga.classList.add("activo");
    tabGestion.classList.remove("activo");
  }

  function mostrarGestion() {
    vistaLiga.style.display = "none";
    vistaGestion.style.display = "block";
    tabLiga.classList.remove("activo");
    tabGestion.classList.add("activo");
  }

  function generarFixture(equipos) {
    const partidos = [];
    for (let i = 0; i < equipos.length; i++) {
      for (let j = i + 1; j < equipos.length; j++) {
        partidos.push({
          local: equipos[i],
          visitante: equipos[j],
          pl: null,
          pv: null
        });
      }
    }
    return partidos;
  }

  function calcularTabla(cat) {
    const tabla = {};

    categorias[cat].forEach((equipo) => {
      tabla[equipo] = {
        equipo,
        pj: 0,
        pg: 0,
        pp: 0,
        pts: 0
      };
    });

    (fixtures[cat] || []).forEach((p) => {
      if (p.pl == null || p.pv == null) return;

      tabla[p.local].pj += 1;
      tabla[p.visitante].pj += 1;

      if (p.pl > p.pv) {
        tabla[p.local].pg += 1;
        tabla[p.visitante].pp += 1;
        tabla[p.local].pts += 2;
      } else if (p.pv > p.pl) {
        tabla[p.visitante].pg += 1;
        tabla[p.local].pp += 1;
        tabla[p.visitante].pts += 2;
      }
    });

    return Object.values(tabla).sort((a, b) => b.pts - a.pts);
  }

  function render() {
    const cat = categoriaSelect.value;

    const tabla = calcularTabla(cat);
    tablaBody.innerHTML = tabla.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.equipo}</td>
        <td>${e.pj}</td>
        <td>${e.pg}</td>
        <td>${e.pp}</td>
        <td>${e.pts}</td>
      </tr>
    `).join("");

    const f = fixtures[cat] || [];
    fixtureBody.innerHTML = f.map((p) => `
      <p>${p.local} vs ${p.visitante} (${p.pl ?? "-"}-${p.pv ?? "-"})</p>
    `).join("");

    partidoSelect.innerHTML = f.map((p, i) => `
      <option value="${i}">${p.local} vs ${p.visitante}</option>
    `).join("");

    if (cat === "Maxi +48") {
      playoffBody.innerHTML = `
        <strong>Top 6</strong><br>
        1° y 2° pasan directo a semifinales<br>
        3° vs 6°<br>
        4° vs 5°
      `;
    } else {
      playoffBody.innerHTML = `
        <strong>Top 8</strong><br>
        1° vs 8°<br>
        4° vs 5°<br>
        2° vs 7°<br>
        3° vs 6°
      `;
    }
  }

  tabLiga.onclick = mostrarLiga;
  tabGestion.onclick = mostrarGestion;

  abrirGestionBtn.onclick = () => {
    const clave = prompt("Clave:");
    if (clave === ADMIN_PASSWORD) {
      gestionContenido.style.display = "block";
    }
  };

  cerrarGestionBtn.onclick = () => {
    gestionContenido.style.display = "none";
  };

  generarBtn.onclick = () => {
    const cat = categoriaSelect.value;
    fixtures[cat] = generarFixture(categorias[cat]);
    render();
  };

  guardarBtn.onclick = () => {
    const cat = categoriaSelect.value;
    const index = Number(partidoSelect.value);
    const partido = fixtures[cat]?.[index];
    if (!partido) return;

    partido.pl = Number(puntosLocal.value);
    partido.pv = Number(puntosVisitante.value);
    render();
  };

  categoriaSelect.onchange = render;

  Object.keys(categorias).forEach((cat) => {
    fixtures[cat] = generarFixture(categorias[cat]);
  });

  render();
  mostrarLiga();
}