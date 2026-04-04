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

// fixturesPorCategoria[cat] = {
//   meta: {...},
//   fechas: [
//     {
//       numero: 1,
//       fechaISO: "2026-04-12",
//       label: "Domingo 12/04/2026",
//       partidos: [{...}]
//     }
//   ]
// }
let fixturesPorCategoria = {};

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

  // ===== HELPERS UI =====
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

  // ===== HELPERS FECHAS =====
  const nombresDias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const nombresMeses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  function parseISODate(iso) {
    return new Date(`${iso}T12:00:00`);
  }

  function formatISO(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatFechaLarga(iso) {
    if (!iso) return "Sin fecha";
    const d = parseISODate(iso);
    return `${nombresDias[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  function formatFechaBonita(iso) {
    if (!iso) return "Sin fecha";
    const d = parseISODate(iso);
    return `${nombresDias[d.getDay()]} ${d.getDate()} de ${nombresMeses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function moverAlDiaSemana(fecha, diaSemana) {
    const d = new Date(fecha.getTime());
    while (d.getDay() !== diaSemana) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  function obtenerFechasDisponibles(inicioISO, finISO, diaSemana, frecuencia, bloqueadas) {
    if (!inicioISO || !finISO) return [];

    const inicio = moverAlDiaSemana(parseISODate(inicioISO), diaSemana);
    const fin = parseISODate(finISO);
    const bloqueadasSet = new Set(bloqueadas);

    const disponibles = [];
    const cursor = new Date(inicio.getTime());

    while (cursor <= fin) {
      const iso = formatISO(cursor);
      if (!bloqueadasSet.has(iso)) {
        disponibles.push(iso);
      }
      cursor.setDate(cursor.getDate() + (7 * frecuencia));
    }

    return disponibles;
  }

  function calcularFechaFinSugerida(inicioISO, diaSemana, frecuencia, cantidadJornadas, bloqueadas) {
    if (!inicioISO || cantidadJornadas <= 0) return null;

    const bloqueadasSet = new Set(bloqueadas);
    let cursor = moverAlDiaSemana(parseISODate(inicioISO), diaSemana);
    let agregadas = 0;
    let ultima = null;

    while (agregadas < cantidadJornadas) {
      const iso = formatISO(cursor);
      if (!bloqueadasSet.has(iso)) {
        agregadas += 1;
        ultima = iso;
      }
      cursor.setDate(cursor.getDate() + (7 * frecuencia));
    }

    return ultima;
  }

  // ===== HELPERS EQUIPOS =====
  function obtenerEquiposCategoria(categoria, cantidadSolicitada) {
    const base = categorias[categoria] ? [...categorias[categoria]] : [];
    const cantidad = Number(cantidadSolicitada);

    if (!Number.isFinite(cantidad) || cantidad < 2) {
      return base.length >= 2 ? base : ["Equipo 1", "Equipo 2"];
    }

    if (base.length >= cantidad) {
      return base.slice(0, cantidad);
    }

    const equipos = [...base];
    for (let i = base.length + 1; i <= cantidad; i++) {
      equipos.push(`Equipo ${i}`);
    }
    return equipos;
  }

  // ===== FIXTURE =====
  function generarRondaSimple(equiposOriginales) {
    const equipos = [...equiposOriginales];
    const usarLibre = equipos.length % 2 !== 0;

    if (usarLibre) {
      equipos.push("LIBRE");
    }

    const n = equipos.length;
    const rondas = [];
    let rotacion = [...equipos];

    for (let fecha = 0; fecha < n - 1; fecha++) {
      const partidos = [];

      for (let i = 0; i < n / 2; i++) {
        const a = rotacion[i];
        const b = rotacion[n - 1 - i];

        if (a !== "LIBRE" && b !== "LIBRE") {
          const local = fecha % 2 === 0 ? a : b;
          const visitante = fecha % 2 === 0 ? b : a;

          partidos.push({
            local,
            visitante,
            pl: null,
            pv: null
          });
        }
      }

      rondas.push(partidos);

      const fijo = rotacion[0];
      const resto = rotacion.slice(1);
      resto.unshift(resto.pop());
      rotacion = [fijo, ...resto];
    }

    return rondas;
  }

  function invertirRonda(partidos) {
    return partidos.map((p) => ({
      local: p.visitante,
      visitante: p.local,
      pl: null,
      pv: null
    }));
  }

  function generarRondasPorFormato(equipos, formato) {
    const ida = generarRondaSimple(equipos);

    if (formato === "anual") {
      const vuelta = ida.map(invertirRonda);
      return [...ida, ...vuelta];
    }

    if (formato === "apertura" || formato === "clausura") {
      return ida;
    }

    if (formato === "eliminacion") {
      return [
        [
          {
            local: "A definir",
            visitante: "A definir",
            pl: null,
            pv: null
          }
        ]
      ];
    }

    return ida;
  }

  function asignarFechasARondas(rondas, fechasDisponibles) {
    return rondas.map((partidos, index) => {
      const fechaISO = fechasDisponibles[index] || null;

      return {
        numero: index + 1,
        fechaISO,
        label: fechaISO ? formatFechaLarga(fechaISO) : `Fecha ${index + 1} sin programar`,
        partidos: partidos.map((p) => ({
          ...p,
          fechaNumero: index + 1,
          fechaISO
        }))
      };
    });
  }

  function contarJornadasBase(cantidadEquipos, formato) {
    if (formato === "eliminacion") {
      return Math.max(1, Math.ceil(Math.log2(cantidadEquipos)));
    }

    const porRueda = cantidadEquipos % 2 === 0 ? cantidadEquipos - 1 : cantidadEquipos;
    return formato === "anual" ? porRueda * 2 : porRueda;
  }

  function contarJornadasPlayoff(clasificados) {
    if (clasificados <= 2) return 1;
    if (clasificados === 4) return 2;
    if (clasificados === 6) return 3;
    if (clasificados === 8) return 3;

    return Math.ceil(Math.log2(clasificados));
  }

  function calcularCantidadTotalJornadas({ equipos, formato, playoffs, clasificados }) {
    const base = contarJornadasBase(equipos, formato);

    if (playoffs !== "si") return base;

    return base + contarJornadasPlayoff(clasificados);
  }

  function detectarSugerencias({
    entra,
    inicio,
    fin,
    diaJuego,
    frecuencia,
    bloqueadas,
    jornadasNecesarias,
    fechasDisponiblesActuales
  }) {
    const sugerencias = [];

    if (entra) {
      sugerencias.push("El calendario actual alcanza para el formato elegido.");
      return sugerencias;
    }

    const fechasSemanales = obtenerFechasDisponibles(
      inicio,
      fin,
      diaJuego,
      1,
      bloqueadas
    );

    if (frecuencia === 2 && fechasSemanales.length >= jornadasNecesarias) {
      sugerencias.push("Sugerencia: jugando todas las semanas, el torneo sí entra en el rango.");
    }

    const diaAlternativo = diaJuego === 0 ? 3 : 0;
    const fechasAlternativas = obtenerFechasDisponibles(
      inicio,
      fin,
      diaAlternativo,
      frecuencia,
      bloqueadas
    );

    if (fechasAlternativas.length >= jornadasNecesarias) {
      sugerencias.push(
        `Sugerencia: cambiando el día de juego a ${nombresDias[diaAlternativo]}, el torneo sí entra.`
      );
    }

    const fechaFinSugerida = calcularFechaFinSugerida(
      inicio,
      diaJuego,
      frecuencia,
      jornadasNecesarias,
      bloqueadas
    );

    if (fechaFinSugerida) {
      sugerencias.push(
        `Sugerencia: manteniendo este formato, necesitás llegar al menos hasta ${formatFechaBonita(fechaFinSugerida)}.`
      );
    }

    if (!sugerencias.length && fechasDisponiblesActuales < jornadasNecesarias) {
      sugerencias.push("No entra con la configuración actual. Hay que ampliar el rango, cambiar frecuencia o reducir etapas.");
    }

    return sugerencias;
  }

  function leerPlanner() {
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
      .map((f) => f.trim())
      .filter(Boolean);

    return {
      categoria,
      equipos,
      formato,
      playoffs,
      clasificados,
      diaJuego,
      inicio,
      fin,
      frecuencia,
      bloqueadas
    };
  }

  function calcularPlanificacion() {
    const data = leerPlanner();

    if (!data.inicio || !data.fin) {
      plannerResultado.innerHTML = "<p>Completá fecha de inicio y fin.</p>";
      plannerComparacion.innerHTML = "";
      return null;
    }

    if (data.equipos < 2) {
      plannerResultado.innerHTML = "<p>La cantidad de equipos debe ser mayor o igual a 2.</p>";
      plannerComparacion.innerHTML = "";
      return null;
    }

    const jornadasBase = contarJornadasBase(data.equipos, data.formato);
    const jornadasPlayoff = data.playoffs === "si" ? contarJornadasPlayoff(data.clasificados) : 0;
    const jornadasTotales = jornadasBase + jornadasPlayoff;

    const fechasDisponibles = obtenerFechasDisponibles(
      data.inicio,
      data.fin,
      data.diaJuego,
      data.frecuencia,
      data.bloqueadas
    );

    const entra = fechasDisponibles.length >= jornadasTotales;

    const sugerencias = detectarSugerencias({
      entra,
      inicio: data.inicio,
      fin: data.fin,
      diaJuego: data.diaJuego,
      frecuencia: data.frecuencia,
      bloqueadas: data.bloqueadas,
      jornadasNecesarias: jornadasTotales,
      fechasDisponiblesActuales: fechasDisponibles.length
    });

    plannerResultado.innerHTML = `
      <h4>Resultado del análisis</h4>
      <p><strong>Categoría:</strong> ${data.categoria}</p>
      <p><strong>Equipos:</strong> ${data.equipos}</p>
      <p><strong>Formato:</strong> ${data.formato}</p>
      <p><strong>Día de juego:</strong> ${nombresDias[data.diaJuego]}</p>
      <p><strong>Frecuencia:</strong> ${data.frecuencia === 1 ? "Cada semana" : "Semana por medio"}</p>
      <p><strong>Fechas base necesarias:</strong> ${jornadasBase}</p>
      <p><strong>Fechas extra por playoffs:</strong> ${jornadasPlayoff}</p>
      <p><strong>Total de jornadas necesarias:</strong> ${jornadasTotales}</p>
      <p><strong>Fechas disponibles:</strong> ${fechasDisponibles.length}</p>
      <p><strong>Estado:</strong> ${entra ? "Entra en el rango elegido." : "No entra en el rango elegido."}</p>
    `;

    const preview = fechasDisponibles.slice(0, jornadasTotales);
    plannerComparacion.innerHTML = `
      <h4>${entra ? "Fechas sugeridas para programar" : "Sugerencias de ajuste"}</h4>
      ${
        entra
          ? preview.map((f, i) => `<p><strong>Fecha ${i + 1}:</strong> ${formatFechaBonita(f)}</p>`).join("")
          : sugerencias.map((s) => `<p>${s}</p>`).join("")
      }
    `;

    return {
      ...data,
      jornadasBase,
      jornadasPlayoff,
      jornadasTotales,
      fechasDisponibles,
      entra
    };
  }

  function generarDesdePlanner() {
    const plan = calcularPlanificacion();
    if (!plan) return;

    const equipos = obtenerEquiposCategoria(plan.categoria, plan.equipos);
    const rondas = generarRondasPorFormato(equipos, plan.formato);

    const fixtureConFechas = asignarFechasARondas(
      rondas,
      plan.fechasDisponibles
    );

    fixturesPorCategoria[plan.categoria] = {
      meta: {
        categoria: plan.categoria,
        equipos: plan.equipos,
        formato: plan.formato,
        playoffs: plan.playoffs,
        clasificados: plan.clasificados,
        diaJuego: plan.diaJuego,
        inicio: plan.inicio,
        fin: plan.fin,
        frecuencia: plan.frecuencia,
        bloqueadas: plan.bloqueadas,
        jornadasBase: plan.jornadasBase,
        jornadasPlayoff: plan.jornadasPlayoff,
        jornadasTotales: plan.jornadasTotales
      },
      fechas: fixtureConFechas
    };

    categoriaSelect.value = plan.categoria;
    render();
    mostrarLiga();
  }

  // ===== TABLA =====
  function obtenerPartidosPlanos(cat) {
    const data = fixturesPorCategoria[cat];
    if (!data || !data.fechas) return [];
    return data.fechas.flatMap((f) => f.partidos);
  }

  function obtenerEquiposActivos(cat) {
    const data = fixturesPorCategoria[cat];
    if (data?.meta?.equipos) {
      return obtenerEquiposCategoria(cat, data.meta.equipos);
    }
    return categorias[cat] ? [...categorias[cat]] : [];
  }

  function calcularTabla(cat) {
    const equipos = obtenerEquiposActivos(cat);
    const tabla = {};

    equipos.forEach((equipo) => {
      tabla[equipo] = {
        equipo,
        pj: 0,
        pg: 0,
        pp: 0,
        pts: 0,
        pf: 0,
        pc: 0,
        dif: 0
      };
    });

    const partidos = obtenerPartidosPlanos(cat);

    partidos.forEach((p) => {
      if (p.pl == null || p.pv == null) return;
      if (!tabla[p.local] || !tabla[p.visitante]) return;

      tabla[p.local].pj += 1;
      tabla[p.visitante].pj += 1;

      tabla[p.local].pf += p.pl;
      tabla[p.local].pc += p.pv;
      tabla[p.visitante].pf += p.pv;
      tabla[p.visitante].pc += p.pl;

      if (p.pl > p.pv) {
        tabla[p.local].pg += 1;
        tabla[p.visitante].pp += 1;
        tabla[p.local].pts += 2;
        tabla[p.visitante].pts += 1;
      } else if (p.pv > p.pl) {
        tabla[p.visitante].pg += 1;
        tabla[p.local].pp += 1;
        tabla[p.visitante].pts += 2;
        tabla[p.local].pts += 1;
      } else {
        tabla[p.local].pts += 1;
        tabla[p.visitante].pts += 1;
      }
    });

    Object.values(tabla).forEach((e) => {
      e.dif = e.pf - e.pc;
    });

    return Object.values(tabla).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dif !== a.dif) return b.dif - a.dif;
      if (b.pf !== a.pf) return b.pf - a.pf;
      return a.equipo.localeCompare(b.equipo);
    });
  }

  // ===== RENDER =====
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
  const data = fixturesPorCategoria[cat];

  if (!data || !data.fechas || !data.fechas.length) {
    fixtureBody.innerHTML = "<p>No hay fixture generado.</p>";
    partidoSelect.innerHTML = "";
    return;
  }

  const maxPartidos = Math.max(...data.fechas.map(f => f.partidos.length));

  let html = `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th>Fecha</th>
          ${Array.from({length: maxPartidos}).map((_, i) => `
            <th>Partido ${i + 1}</th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  data.fechas.forEach((fechaObj) => {
    html += `
      <tr>
        <td><strong>F${fechaObj.numero}</strong><br>${fechaObj.label}</td>
        ${fechaObj.partidos.map(p => `
          <td>
            ${p.local} <br>
            vs <br>
            ${p.visitante}<br>
            (${p.pl ?? "-"} - ${p.pv ?? "-"})
          </td>
        `).join("")}
        ${Array.from({length: maxPartidos - fechaObj.partidos.length}).map(() => `<td></td>`).join("")}
      </tr>
    `;
  });

  html += "</tbody></table>";

  fixtureBody.innerHTML = html;

  // selector resultados (no lo tocamos)
  const partidos = obtenerPartidosPlanos(cat);
  partidoSelect.innerHTML = partidos.map((p, i) => `
    <option value="${i}">
      Fecha ${p.fechaNumero} - ${p.local} vs ${p.visitante}
    </option>
  `).join("");
}

  function renderPlayoffs(cat) {
    const data = fixturesPorCategoria[cat];
    const meta = data?.meta;

    if (!meta || meta.playoffs !== "si") {
      playoffBody.innerHTML = "<p>Sin playoffs configurados.</p>";
      return;
    }

    const clasificados = meta.clasificados;

    if (cat === "Maxi +48" && clasificados === 6) {
      playoffBody.innerHTML = `
        <strong>Playoffs Maxi +48 - Top 6</strong><br>
        1° y 2° avanzan directo a semifinales<br>
        3° vs 6°<br>
        4° vs 5°
      `;
      return;
    }

    if (clasificados === 4) {
      playoffBody.innerHTML = `
        <strong>Playoffs - Top 4</strong><br>
        1° vs 4°<br>
        2° vs 3°<br>
        Ganadores a la final
      `;
      return;
    }

    if (clasificados === 6) {
      playoffBody.innerHTML = `
        <strong>Playoffs - Top 6</strong><br>
        1° y 2° pasan directo a semifinales<br>
        3° vs 6°<br>
        4° vs 5°
      `;
      return;
    }

    if (clasificados === 8) {
      playoffBody.innerHTML = `
        <strong>Playoffs - Top 8</strong><br>
        1° vs 8°<br>
        4° vs 5°<br>
        2° vs 7°<br>
        3° vs 6°
      `;
      return;
    }

    playoffBody.innerHTML = `
      <strong>Playoffs - Top ${clasificados}</strong><br>
      Configuración preparada. En el próximo paso armamos los cruces automáticos para cualquier cantidad.
    `;
  }

  function render() {
    const cat = categoriaSelect.value;
    renderTabla(cat);
    renderFixture(cat);
    renderPlayoffs(cat);
  }

  // ===== RESULTADOS =====
  function guardarResultado() {
    const cat = categoriaSelect.value;
    const index = Number(partidoSelect.value);
    const partidos = obtenerPartidosPlanos(cat);
    const partido = partidos[index];

    if (!partido) return;

    partido.pl = puntosLocal.value === "" ? null : Number(puntosLocal.value);
    partido.pv = puntosVisitante.value === "" ? null : Number(puntosVisitante.value);

    puntosLocal.value = "";
    puntosVisitante.value = "";

    render();
  }

  // ===== SINCRONIZACION ENTRE SELECTORES =====
  plannerCategoria.addEventListener("change", () => {
    categoriaSelect.value = plannerCategoria.value;
    plannerEquipos.value = categorias[plannerCategoria.value]?.length || 10;
  });

  categoriaSelect.addEventListener("change", () => {
    plannerCategoria.value = categoriaSelect.value;
    if (!plannerEquipos.value || Number(plannerEquipos.value) < 2) {
      plannerEquipos.value = categorias[categoriaSelect.value]?.length || 10;
    }
    render();
  });

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

  plannerCalcular.onclick = calcularPlanificacion;
  generarBtn.onclick = generarDesdePlanner;
  guardarBtn.onclick = guardarResultado;

  // ===== INICIO =====
  Object.keys(categorias).forEach((cat) => {
    const equipos = categorias[cat];
    const rondas = generarRondasPorFormato(equipos, "apertura");
    const fechas = asignarFechasARondas(rondas, []);

    fixturesPorCategoria[cat] = {
      meta: {
        categoria: cat,
        equipos: equipos.length,
        formato: "apertura",
        playoffs: "no",
        clasificados: 4,
        diaJuego: 0,
        inicio: "",
        fin: "",
        frecuencia: 1,
        bloqueadas: [],
        jornadasBase: rondas.length,
        jornadasPlayoff: 0,
        jornadasTotales: rondas.length
      },
      fechas
    };
  });

  plannerCategoria.value = categoriaSelect.value;
  plannerEquipos.value = categorias[categoriaSelect.value]?.length || 10;
  render();
  mostrarLiga();
});