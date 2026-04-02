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

// ===== TABLA =====
function calcularTabla(cat) {
  let tabla = {};

  categorias[cat].forEach(e => {
    tabla[e] = {
      equipo: e,
      pj: 0,
      pg: 0,
      pp: 0,
      pts: 0
    };
  });

  (fixtures[cat] || []).forEach(p => {
    if (p.pl == null) return;

    tabla[p.local].pj++;
    tabla[p.visitante].pj++;

    if (p.pl > p.pv) {
      tabla[p.local].pg++;
      tabla[p.visitante].pp++;
      tabla[p.local].pts += 2;
    } else {
      tabla[p.visitante].pg++;
      tabla[p.local].pp++;
      tabla[p.visitante].pts += 2;
    }
  });

  return Object.values(tabla).sort((a,b)=>b.pts-a.pts);
}
}

// ===== RENDER =====
function render() {
  const cat = categoriaSelect.value;

  // tabla
  const tabla = calcularTabla(cat);
  tablaBody.innerHTML = tabla.map((e,i)=>`
    <tr><td>${i+1}</td><td>${e.equipo}</td><td>${e.pts}</td></tr>
  `).join("");

  // fixture
  const f = fixtures[cat] || [];
  fixtureBody.innerHTML = f.map((p,i)=>`
    <p>${p.local} vs ${p.visitante} (${p.pl ?? "-"}-${p.pv ?? "-"})</p>
  `).join("");

  // selector
  partidoSelect.innerHTML = f.map((p,i)=>`
    <option value="${i}">${p.local} vs ${p.visitante}</option>
  `).join("");

  // playoffs
  if (cat === "Maxi +48") {
    playoffBody.innerHTML = "Top 6";
  } else {
    playoffBody.innerHTML = "Top 8";
  }
}

// ===== INIT =====
categoriaSelect.onchange = render;
render();