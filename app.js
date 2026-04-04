// ===== CONFIG =====
const ADMIN_PASSWORD = "admin123";

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

document.addEventListener("DOMContentLoaded", () => {
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

  const plannerCategoria = document.getElementById("planner-categoria");
  const plannerEquipos = document.getElementById("planner-equipos");
  const plannerFormato = document.getElementById("planner-formato");
  const plannerPlayoffs = document.getElementById("planner-playoffs");
  const plannerClasificados = document.getElementById("planner-clasificados");
  const plannerDiaJuego = document.getElementById("planner-dia-juego");
  const plannerInicio = document.getElementById("planner-inicio");
  const plannerFin = document.getElementById("planner-fin");
  const plannerFrecuencia = document.getElementById("planner-frecuencia");
  const plannerBloqueadas = document.getElementById("planner-bloqueadas");
  const plannerCalcular = document.getElementById("planner-calcular");
  const plannerResultado = document.getElementById("planner-resultado");
  const plannerComparacion = document.getElementById("planner-comparacion");

  const generarBtn = document.getElementById("generar-fixture");

  const partidoSelect = document.getElementById("partido-select");
  const puntosLocal = document.getElementById("puntos-local");
  const puntosVisitante = document.getElementById("puntos-visitante");
  const guardarBtn = document.getElementById("guardar-resultado");

  // ===== HELPERS =====
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

  function generarFixtureTodosContraTodos(equipos) {
    const lista = [...equipos];

    if (lista.length % 2 !== 0) {
      lista.push("LIBRE");
    }

    const totalFechas = lista.length - 1;
    const mitad = lista.length / 2;
    const fechas = [];

    for (let fecha = 0; fecha < totalFechas; fecha++) {
      const partidosFecha = [];

      for (let i = 0; i < mitad; i++) {
        const local = lista[i];
        const visitante = lista[lista.length - 1 - i];

        if (local !== "LIBRE" && visitante !== "LIBRE") {
          partidosFecha.push({
            fecha: fecha + 1,
            local: fecha % 2 === 0 ? local : visitante,
            visitante: fecha % 2 === 0 ? visitante : local,
            pl: null,
            pv: null
          });
        }
      }

      fechas.push(partidosFecha);

      const fijo = lista[0];
      const rotan = lista.slice(1);
      rotan.unshift(rotan.pop());
      lista.splice(0, lista.length, fijo, ...rotan);
    }

    return fechas;
  }

  function aplanarFixture(fechas) {
    return fechas.flat();
  }

  function calcularTabla(cat) {
    const tabla = {};

    (categorias[cat] || []).forEach((equipo) => {
      tabla[equipo] = {
        equipo,
        pj: 0,
        pg: 0,
        pp: 0,
        pts: 0
      };
    });

    const partidos = aplanarFixture(fixtures[cat] || []);

    partidos.forEach((p) => {
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

    return Object.values(tabla).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return a.equipo.localeCompare(b.equipo);
    });
  }

  function renderTabla(cat) {
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
  }

  function renderFixture(cat) {
    const fechas = fixtures[cat] || [];

    if (!fechas.length) {
      fixtureBody.innerHTML = "<p>No hay fixture generado.</p>";
      partidoSelect.innerHTML = "";
      return;
    }

    fixtureBody.innerHTML = fechas.map((partidos, idx) => `
      <div class="fixture-fecha">
        <h4>Fecha ${idx + 1}</h4>
        ${partidos.map((p) => `
          <p>${p.local} vs ${p.visitante} (${p.pl ?? "-"} - ${p.pv ?? "-"})</p>
        `).join("")}
      </div>
    `).join("");

    const partidosPlanos = aplanarFixture(fechas);
    partidoSelect.innerHTML = partidosPlanos.map((p, i) => `
      <option value="${i}">
        Fecha ${p.fecha} - ${p.local} vs ${p.visitante}
      </option>
    `).join("");
  }

  function renderPlayoffs(cat) {
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

  function render() {
    const cat = categoriaSelect.value;
    renderTabla(cat);
    renderFixture(cat);
    renderPlayoffs(cat);
  }

  function contarFechasSegunFormato(cantidadEquipos, formato) {
    if (formato === "eliminacion") {
      return Math.max(1, Math.ceil(Math.log2(cantidadEquipos)));
    }

    const ruedas = formato === "anual" ? 2 : 1;
    const fechasPorRueda = cantidadEquipos % 2 === 0
      ? cantidadEquipos - 1
      : cantidadEquipos;

    return fechasPorRueda * ruedas;
  }

  function obtenerFechasJuego(inicio, fin, diaSemana, frecuencia, bloqueadas) {
    const fechas = [];
    const actual = new Date(`${inicio}T12:00:00`);
    const fechaFin = new Date(`${fin}T12:00:00`);
    const bloqueadasSet = new Set(bloqueadas);

    while (actual.getDay() !== diaSemana) {
      actual.setDate(actual.getDate() + 1);
    }

    while (actual <= fechaFin) {
      const yyyy = actual.getFullYear();
      const mm = String(actual.getMonth() + 1).padStart(2, "0");
      const dd = String(actual.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;

      if (!bloqueadasSet.has(iso)) {
        fechas.push(iso);
      }

      actual.setDate(actual.getDate() + (7 * frecuencia));
    }

    return fechas;
  }

  function calcularPlanificacion() {
    const categoria = plannerCategoria.value;
    const equipos = Number(plannerEquipos.value);
    const formato = plannerFormato.value;
    const playoffs = plannerPlayoffs.value;
    const clasificados = Number(plannerClasificados.value);
    const diaJuego = Number(plannerDiaJuego.value);
    const inicio = plannerInicio.value;
    const fin = plannerFin.value;
    const frecuencia = Number(plannerFrecuencia.value);
    const bloqueadas = plannerBloqueadas.value
      .split(",")
      .map(f => f.trim())
      .filter(Boolean);

    if (!inicio || !fin) {
      plannerResultado.innerHTML = "<p>Completá fecha de inicio y fin.</p>";
      plannerComparacion.innerHTML = "";
      return;
    }

    const fechasBase = contarFechasSegunFormato(equipos, formato);
    let fechasTotales = fechasBase;

    if (playoffs === "si") {
      if (clasificados === 4) fechasTotales += 2;
      if (clasificados === 6) fechasTotales += 3;
      if (clasificados === 8) fechasTotales += 3;
    }

    const disponibles = obtenerFechasJuego(
      inicio,
      fin,
      diaJuego,
      frecuencia,
      bloqueadas
    );

    const entra = disponibles.length >= fechasTotales;

    plannerResultado.innerHTML = `
      <h4>Resultado del análisis</h4>
      <p><strong>Categoría:</strong> ${categoria}</p>
      <p><strong>Equipos:</strong> ${equipos}</p>
      <p><strong>Formato:</strong> ${formato}</p>
      <p><strong>Playoffs:</strong> ${playoffs === "si" ? `Sí, ${clasificados} clasificados` : "No"}</p>
      <p><strong>Fechas necesarias:</strong> ${fechasTotales}</p>
      <p><strong>Fechas disponibles:</strong> ${disponibles.length}</p>
      <p><strong>Estado:</strong> ${entra ? "El torneo entra en el calendario seleccionado." : "No entra en el calendario seleccionado."}</p>
    `;

    if (entra) {
      plannerComparacion.innerHTML = `
        <h4>Fechas sugeridas</h4>
        ${disponibles.slice(0, fechasTotales).map((f, i) => `<p>Fecha ${i + 1}: ${f}</p>`).join("")}
      `;
    } else {
      plannerComparacion.innerHTML = `
        <h4>Sugerencia</h4>
        <p>Probá ampliar la fecha de fin, reducir playoffs o usar semana por medio / día alternativo.</p>
      `;
    }
  }

  function generarDesdePlanner() {
    const categoria = plannerCategoria.value;
    categoriaSelect.value = categoria;

    const equiposCategoria = categorias[categoria];
    fixtures[categoria] = generarFixtureTodosContraTodos(equiposCategoria);

    render();
    mostrarLiga();
  }

  function guardarResultado() {
    const cat = categoriaSelect.value;
    const index = Number(partidoSelect.value);
    const partidos = aplanarFixture(fixtures[cat] || []);
    const partido = partidos[index];

    if (!partido) return;

    partido.pl = puntosLocal.value === "" ? null : Number(puntosLocal.value);
    partido.pv = puntosVisitante.value === "" ? null : Number(puntosVisitante.value);

    render();
  }

  // ===== EVENTOS =====
  tabLiga.onclick = mostrarLiga;
  tabGestion.onclick = mostrarGestion;

  abrirGestionBtn.onclick = () => {
    const clave = prompt("Clave:");
    if (clave === ADMIN_PASSWORD) {
      gestionContenido.style.display = "block";
    } else if (clave !== null) {
      alert("Clave incorrecta");
    }
  };

  cerrarGestionBtn.onclick = () => {
    gestionContenido.style.display = "none";
  };

  categoriaSelect.onchange = render;
  plannerCalcular.onclick = calcularPlanificacion;
  generarBtn.onclick = generarDesdePlanner;
  guardarBtn.onclick = guardarResultado;

  // ===== INICIO =====
  Object.keys(categorias).forEach((cat) => {
    fixtures[cat] = generarFixtureTodosContraTodos(categorias[cat]);
  });

  plannerCategoria.value = categoriaSelect.value;
  render();
  mostrarLiga();
});