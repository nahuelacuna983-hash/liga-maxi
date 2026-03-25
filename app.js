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

const fixturesBase = {
  "Maxi +35 A": [],
  "Maxi +35 B": [],
  "Maxi +48": [],
  "Femenino": []
};

const STORAGE_KEY = "ligaMaxiFixturesV5";
const SETTINGS_KEY = "ligaMaxiSettingsV5";

const settingsBase = {
  competenciaPorCategoria: {
    "Maxi +35 A": "Apertura",
    "Maxi +35 B": "Apertura",
    "Maxi +48": "Apertura",
    "Femenino": "Apertura"
  },
  ruedasPorCategoria: {
    "Maxi +35 A": 1,
    "Maxi +35 B": 1,
    "Maxi +48": 1,
    "Femenino": 1
  },
  playoffConfigPorCategoria: {
    "Maxi +35 A": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 },
    "Maxi +35 B": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 },
    "Maxi +48": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 },
    "Femenino": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 }
  }
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function cargarFixtures() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY);

  if (datosGuardados) {
    try {
      return JSON.parse(datosGuardados);
    } catch (error) {
      console.error("Error leyendo fixtures guardados. Se usará la base inicial.", error);
      return deepClone(fixturesBase);
    }
  }

  return deepClone(fixturesBase);
}

function guardarFixtures() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures));
}

function normalizarConfigPlayoff(configParcial = {}) {
  return {
    cantidad: Number(configParcial.cantidad ?? 4),
    octavos: Number(configParcial.octavos ?? 1),
    cuartos: Number(configParcial.cuartos ?? 1),
    semifinales: Number(configParcial.semifinales ?? 1),
    final: Number(configParcial.final ?? 1)
  };
}

function cargarSettings() {
  const datosGuardados = localStorage.getItem(SETTINGS_KEY);

  if (datosGuardados) {
    try {
      const data = JSON.parse(datosGuardados);

      const playoffConfigPorCategoria = deepClone(settingsBase.playoffConfigPorCategoria);

      Object.keys(categorias).forEach((categoria) => {
        playoffConfigPorCategoria[categoria] = normalizarConfigPlayoff(
          (data.playoffConfigPorCategoria || {})[categoria]
        );
      });

      return {
        competenciaPorCategoria: {
          ...settingsBase.competenciaPorCategoria,
          ...(data.competenciaPorCategoria || {})
        },
        ruedasPorCategoria: {
          ...settingsBase.ruedasPorCategoria,
          ...(data.ruedasPorCategoria || {})
        },
        playoffConfigPorCategoria
      };
    } catch (error) {
      console.error("Error leyendo configuración guardada. Se usará la base inicial.", error);
    }
  }

  return deepClone(settingsBase);
}

function guardarSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let fixtures = cargarFixtures();
let settings = cargarSettings();

Object.keys(categorias).forEach((categoria) => {
  if (!fixtures[categoria]) fixtures[categoria] = [];
  if (!settings.competenciaPorCategoria[categoria]) settings.competenciaPorCategoria[categoria] = "Apertura";
  if (!settings.ruedasPorCategoria[categoria]) settings.ruedasPorCategoria[categoria] = 1;
  if (!settings.playoffConfigPorCategoria[categoria]) {
    settings.playoffConfigPorCategoria[categoria] = normalizarConfigPlayoff();
  } else {
    settings.playoffConfigPorCategoria[categoria] = normalizarConfigPlayoff(
      settings.playoffConfigPorCategoria[categoria]
    );
  }
});

const categoriaSelect = document.getElementById("categoria-select");
const tablaTitulo = document.getElementById("tabla-titulo");
const fixtureTitulo = document.getElementById("fixture-titulo");
const badgeEtapa = document.getElementById("badge-etapa");
const playoffEstado = document.getElementById("playoff-estado");
const tablaBody = document.getElementById("tabla-body");
const fixtureBody = document.getElementById("fixture-body");
const playoffBody = document.getElementById("playoff-body");

const partidoSelect = document.getElementById("partido-select");
const puntosLocalInput = document.getElementById("puntos-local");
const puntosVisitanteInput = document.getElementById("puntos-visitante");
const botonGuardar = document.getElementById("guardar-resultado");
const botonResetear = document.getElementById("resetear-resultado");
const mensajeEstado = document.getElementById("mensaje-estado");

const plannerEquipos = document.getElementById("planner-equipos");
const plannerFormato = document.getElementById("planner-formato");
const plannerPlayoffs = document.getElementById("planner-playoffs");
const plannerClasificados = document.getElementById("planner-clasificados");
const plannerBoton = document.getElementById("planner-calcular");
const plannerResultado = document.getElementById("planner-resultado");
const plannerComparacion = document.getElementById("planner-comparacion");
const plannerInicio = document.getElementById("planner-inicio");
const plannerFin = document.getElementById("planner-fin");
const plannerFrecuencia = document.getElementById("planner-frecuencia");

const fixtureCategoriaSelect = document.getElementById("fixture-categoria-select");
const fixtureEtapaSelect = document.getElementById("fixture-etapa-select");
const fixtureRuedasSelect = document.getElementById("fixture-ruedas-select");
const fixturePlayoffSelect = document.getElementById("fixture-playoff-select");
const fixtureOctavosSelect = document.getElementById("fixture-octavos-select");
const fixtureCuartosSelect = document.getElementById("fixture-cuartos-select");
const fixtureSemisSelect = document.getElementById("fixture-semis-select");
const fixtureFinalSelect = document.getElementById("fixture-final-select");
const botonGenerarFixture = document.getElementById("generar-fixture");
const mensajeFixture = document.getElementById("mensaje-fixture");

const tabLiga = document.getElementById("tab-liga");
const tabGestion = document.getElementById("tab-gestion");
const vistaLiga = document.getElementById("vista-liga");
const vistaGestion = document.getElementById("vista-gestion");

function mostrarLiga() {
  tabLiga.classList.add("activo");
  tabGestion.classList.remove("activo");
  vistaLiga.style.display = "block";
  vistaGestion.style.display = "none";
}

function mostrarGestion() {
  tabGestion.classList.add("activo");
  tabLiga.classList.remove("activo");
  vistaGestion.style.display = "block";
  vistaLiga.style.display = "none";
}

tabLiga.addEventListener("click", mostrarLiga);
tabGestion.addEventListener("click", mostrarGestion);

function calcularTabla(categoria) {
  const tabla = {};

  (categorias[categoria] || []).forEach((equipo) => {
    tabla[equipo] = {
      equipo,
      pj: 0,
      pg: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      df: 0,
      pts: 0
    };
  });

  (fixtures[categoria] || []).forEach((partido) => {
    if (partido.estado !== "Jugado") return;
    if (partido.visitante === "LIBRE") return;

    const local = tabla[partido.local];
    const visitante = tabla[partido.visitante];

    if (!local || !visitante) return;

    local.pj += 1;
    visitante.pj += 1;

    local.gf += partido.puntosLocal;
    local.gc += partido.puntosVisitante;
    visitante.gf += partido.puntosVisitante;
    visitante.gc += partido.puntosLocal;

    if (partido.puntosLocal > partido.puntosVisitante) {
      local.pg += 1;
      visitante.pp += 1;
      local.pts += 2;
      visitante.pts += 1;
    } else {
      visitante.pg += 1;
      local.pp += 1;
      visitante.pts += 2;
      local.pts += 1;
    }
  });

  const resultado = Object.values(tabla);

  resultado.forEach((equipo) => {
    equipo.df = equipo.gf - equipo.gc;
  });

  resultado.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.df !== a.df) return b.df - a.df;
    return b.gf - a.gf;
  });

  return resultado;
}

function obtenerGanador(partido) {
  if (partido.estado !== "Jugado") return null;
  return partido.puntosLocal > partido.puntosVisitante ? partido.local : partido.visitante;
}

function contarDomingos(inicio, fin) {
  let fecha = new Date(inicio + "T00:00:00");
  const fechaFin = new Date(fin + "T00:00:00");
  let domingos = 0;

  while (fecha <= fechaFin) {
    if (fecha.getDay() === 0) domingos++;
    fecha.setDate(fecha.getDate() + 1);
  }

  return domingos;
}

function esPotenciaDeDos(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

function calcularPlayoffsBasico(clasificados) {
  if (!esPotenciaDeDos(clasificados) || clasificados < 2) {
    return {
      partidos: 0,
      fechas: 0,
      detalle: "Cantidad de clasificados no válida."
    };
  }

  return {
    partidos: clasificados - 1,
    fechas: Math.log2(clasificados),
    detalle:
      clasificados === 4
        ? "Semifinales + final."
        : clasificados === 8
        ? "Cuartos + semifinales + final."
        : clasificados === 16
        ? "Octavos + cuartos + semifinales + final."
        : "Llaves eliminatorias."
  };
}

function calcularFechasPlayoffSegunConfig(cantidadClasificados, config) {
  if (!esPotenciaDeDos(cantidadClasificados) || cantidadClasificados < 2) {
    return {
      fechas: 0,
      detalle: "Cantidad de clasificados no válida."
    };
  }

  if (cantidadClasificados === 2) {
    return {
      fechas: Number(config.final || 1),
      detalle: `Final a ${textoPartidos(Number(config.final || 1))}.`
    };
  }

  if (cantidadClasificados === 4) {
    return {
      fechas: Number(config.semifinales || 1) + Number(config.final || 1),
      detalle: `Semifinales a ${textoPartidos(Number(config.semifinales || 1))} + final a ${textoPartidos(Number(config.final || 1))}.`
    };
  }

  if (cantidadClasificados === 8) {
    return {
      fechas: Number(config.cuartos || 1) + Number(config.semifinales || 1) + Number(config.final || 1),
      detalle: `4tos a ${textoPartidos(Number(config.cuartos || 1))} + semifinales a ${textoPartidos(Number(config.semifinales || 1))} + final a ${textoPartidos(Number(config.final || 1))}.`
    };
  }

  if (cantidadClasificados === 16) {
    return {
      fechas:
        Number(config.octavos || 1) +
        Number(config.cuartos || 1) +
        Number(config.semifinales || 1) +
        Number(config.final || 1),
      detalle: `8vos a ${textoPartidos(Number(config.octavos || 1))} + 4tos a ${textoPartidos(Number(config.cuartos || 1))} + semifinales a ${textoPartidos(Number(config.semifinales || 1))} + final a ${textoPartidos(Number(config.final || 1))}.`
    };
  }

  return {
    fechas: Math.log2(cantidadClasificados),
    detalle: "Llaves eliminatorias."
  };
}

function formatearFecha(fecha) {
  return fecha.toLocaleDateString("es-AR");
}

function generarCalendarioSugerido(inicio, frecuencia, totalFechas) {
  const fechas = [];
  let fecha = new Date(inicio + "T00:00:00");

  while (fecha.getDay() !== 0) {
    fecha.setDate(fecha.getDate() + 1);
  }

  for (let i = 0; i < totalFechas; i++) {
    fechas.push(new Date(fecha));
    fecha.setDate(fecha.getDate() + 7 * frecuencia);
  }

  return fechas;
}

function evaluarEstado(fechasNecesarias, domingosDisponibles) {
  if (fechasNecesarias < domingosDisponibles) return "✅ Entra cómodo";
  if (fechasNecesarias === domingosDisponibles) return "⚠️ Entra justo";
  return "❌ No entra";
}

function compararFormatos(equipos, inicio, fin, frecuencia) {
  if (!inicio || !fin) {
    plannerComparacion.innerHTML = "";
    return;
  }

  const domingos = Math.floor(contarDomingos(inicio, fin) / frecuencia);
  const fechasUnaRueda = equipos % 2 === 0 ? equipos - 1 : equipos;
  const fechasDosRuedas = fechasUnaRueda * 2;

  const configActual = {
    cantidad: Number(fixturePlayoffSelect.value),
    octavos: Number(fixtureOctavosSelect.value),
    cuartos: Number(fixtureCuartosSelect.value),
    semifinales: Number(fixtureSemisSelect.value),
    final: Number(fixtureFinalSelect.value)
  };

  const top4 = calcularFechasPlayoffSegunConfig(4, configActual);
  const top8 = calcularFechasPlayoffSegunConfig(8, configActual);

  const opciones = [
    { nombre: "Apertura", fechas: fechasUnaRueda },
    { nombre: "Clausura", fechas: fechasUnaRueda },
    { nombre: "Apertura + Top 4", fechas: fechasUnaRueda + top4.fechas },
    { nombre: "Apertura + Top 8", fechas: fechasUnaRueda + top8.fechas },
    { nombre: "Anual", fechas: fechasDosRuedas },
    { nombre: "Anual + Top 4", fechas: fechasDosRuedas + top4.fechas },
    { nombre: "Anual + Top 8", fechas: fechasDosRuedas + top8.fechas }
  ];

  let html = `<h3>Comparación de formatos</h3>`;

  opciones.forEach((op) => {
    let valido = true;

    if (op.nombre.includes("Top 4") && equipos < 4) valido = false;
    if (op.nombre.includes("Top 8") && equipos < 8) valido = false;

    if (!valido) {
      html += `
        <p>
          <strong>${op.nombre}</strong><br>
          No aplica para ${equipos} equipos.
        </p>
        <hr>
      `;
      return;
    }

    const diferencia = domingos - op.fechas;
    let margenTexto = "";

    if (diferencia > 0) margenTexto = `Sobran ${diferencia} domingos.`;
    else if (diferencia === 0) margenTexto = "Sin margen.";
    else margenTexto = `Faltan ${Math.abs(diferencia)} fechas.`;

    html += `
      <p>
        <strong>${op.nombre}</strong><br>
        Fechas necesarias: ${op.fechas}<br>
        Domingos disponibles: ${domingos}<br>
        Resultado: ${evaluarEstado(op.fechas, domingos)}<br>
        Margen: ${margenTexto}
      </p>
      <hr>
    `;
  });

  plannerComparacion.innerHTML = html;
}

function generarRoundRobin(equiposOriginales) {
  const equipos = [...equiposOriginales];
  const rondas = [];

  if (equipos.length % 2 !== 0) {
    equipos.push("LIBRE");
  }

  const cantidadRondas = equipos.length - 1;
  const mitad = equipos.length / 2;
  let rotacion = [...equipos];

  for (let jornada = 1; jornada <= cantidadRondas; jornada++) {
    const partidos = [];

    for (let i = 0; i < mitad; i++) {
      const local = rotacion[i];
      const visitante = rotacion[rotacion.length - 1 - i];

      if (local === "LIBRE" || visitante === "LIBRE") {
        const libre = local === "LIBRE" ? visitante : local;
        partidos.push({
          jornada,
          local: libre,
          visitante: "LIBRE",
          puntosLocal: null,
          puntosVisitante: null,
          estado: "Libre"
        });
      } else {
        let equipoLocal = local;
        let equipoVisitante = visitante;

        if (jornada % 2 === 0 && i === 0) {
          equipoLocal = visitante;
          equipoVisitante = local;
        }

        partidos.push({
          jornada,
          local: equipoLocal,
          visitante: equipoVisitante,
          puntosLocal: null,
          puntosVisitante: null,
          estado: "Pendiente"
        });
      }
    }

    rondas.push(...partidos);

    const fijo = rotacion[0];
    const resto = rotacion.slice(1);
    resto.unshift(resto.pop());
    rotacion = [fijo, ...resto];
  }

  return rondas;
}

function generarDosRuedas(equiposOriginales) {
  const ida = generarRoundRobin(equiposOriginales);
  const maxJornada = Math.max(...ida.map((p) => p.jornada));

  const vuelta = ida.map((partido) => {
    if (partido.estado === "Libre") {
      return {
        ...partido,
        jornada: partido.jornada + maxJornada
      };
    }

    return {
      jornada: partido.jornada + maxJornada,
      local: partido.visitante,
      visitante: partido.local,
      puntosLocal: null,
      puntosVisitante: null,
      estado: "Pendiente"
    };
  });

  return [...ida, ...vuelta];
}

function cargarSelectorPartidos(categoria) {
  partidoSelect.innerHTML = "";
  const partidos = fixtures[categoria] || [];

  if (partidos.length === 0) {
    partidoSelect.innerHTML = `<option value="">No hay partidos cargados</option>`;
    return;
  }

  partidos.forEach((partido, index) => {
    const textoResultado =
      partido.estado === "Jugado"
        ? ` (${partido.puntosLocal}-${partido.puntosVisitante})`
        : partido.estado === "Libre"
        ? " (Libre)"
        : " (Pendiente)";

    partidoSelect.innerHTML += `
      <option value="${index}">
        J${partido.jornada} - ${partido.local} vs ${partido.visitante}${textoResultado}
      </option>
    `;
  });
}

function cargarDatosPartidoSeleccionado() {
  const categoria = categoriaSelect.value;
  const index = Number(partidoSelect.value);
  const partido = (fixtures[categoria] || [])[index];

  if (!partido || partido.estado === "Libre") {
    puntosLocalInput.value = "";
    puntosVisitanteInput.value = "";
    return;
  }

  puntosLocalInput.value = partido.puntosLocal !== null ? partido.puntosLocal : "";
  puntosVisitanteInput.value = partido.puntosVisitante !== null ? partido.puntosVisitante : "";
}

function faseRegularCompleta(categoria) {
  const partidos = (fixtures[categoria] || []).filter((partido) => partido.estado !== "Libre");
  if (partidos.length === 0) return false;
  return partidos.every((partido) => partido.estado === "Jugado");
}

function obtenerClasificados(categoria, cantidad) {
  const tabla = calcularTabla(categoria);
  return tabla.slice(0, cantidad);
}

function crearEtiquetaEquipo(posicion, equipo) {
  if (!equipo) return `${posicion}° puesto`;
  return `${posicion}° ${equipo.equipo}`;
}

function textoPartidos(cantidad) {
  return `${cantidad} partido${cantidad > 1 ? "s" : ""}`;
}

function obtenerConfigPlayoff(categoria) {
  return normalizarConfigPlayoff(settings.playoffConfigPorCategoria[categoria]);
}

function renderBracketTop4(clasificados, config) {
  const semi1A = clasificados[0] ? crearEtiquetaEquipo(1, clasificados[0]) : "1° puesto";
  const semi1B = clasificados[3] ? crearEtiquetaEquipo(4, clasificados[3]) : "4° puesto";
  const semi2A = clasificados[1] ? crearEtiquetaEquipo(2, clasificados[1]) : "2° puesto";
  const semi2B = clasificados[2] ? crearEtiquetaEquipo(3, clasificados[2]) : "3° puesto";

  return `
    <div class="bracket round-2">
      <div class="bracket-columna">
        <h4>Semifinales</h4>

        <div class="llave">
          <div class="llave-nombre">Semifinal 1</div>
          <div class="llave-serie">${textoPartidos(config.semifinales)}</div>
          <div class="llave-equipo">${semi1A}</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo">${semi1B}</div>
        </div>

        <div class="llave">
          <div class="llave-nombre">Semifinal 2</div>
          <div class="llave-serie">${textoPartidos(config.semifinales)}</div>
          <div class="llave-equipo">${semi2A}</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo">${semi2B}</div>
        </div>
      </div>

      <div class="bracket-columna">
        <h4>Final</h4>
        <div class="llave">
          <div class="llave-nombre">Final</div>
          <div class="llave-serie">${textoPartidos(config.final)}</div>
          <div class="llave-equipo placeholder">Ganador SF1</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo placeholder">Ganador SF2</div>
        </div>
      </div>
    </div>
  `;
}

function renderBracketTop8(clasificados, config) {
  const qf = [
    [1, 8],
    [4, 5],
    [2, 7],
    [3, 6]
  ].map(([a, b]) => [
    clasificados[a - 1] ? crearEtiquetaEquipo(a, clasificados[a - 1]) : `${a}° puesto`,
    clasificados[b - 1] ? crearEtiquetaEquipo(b, clasificados[b - 1]) : `${b}° puesto`
  ]);

  return `
    <div class="bracket">
      <div class="bracket-columna">
        <h4>4tos</h4>

        ${qf
          .map(
            (partido, index) => `
            <div class="llave">
              <div class="llave-nombre">Cuarto ${index + 1}</div>
              <div class="llave-serie">${textoPartidos(config.cuartos)}</div>
              <div class="llave-equipo">${partido[0]}</div>
              <div class="llave-separador">vs</div>
              <div class="llave-equipo">${partido[1]}</div>
            </div>
          `
          )
          .join("")}
      </div>

      <div class="bracket-columna">
        <h4>Semifinales</h4>

        <div class="llave">
          <div class="llave-nombre">Semifinal 1</div>
          <div class="llave-serie">${textoPartidos(config.semifinales)}</div>
          <div class="llave-equipo placeholder">Ganador QF1</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo placeholder">Ganador QF2</div>
        </div>

        <div class="llave">
          <div class="llave-nombre">Semifinal 2</div>
          <div class="llave-serie">${textoPartidos(config.semifinales)}</div>
          <div class="llave-equipo placeholder">Ganador QF3</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo placeholder">Ganador QF4</div>
        </div>
      </div>

      <div class="bracket-columna">
        <h4>Final</h4>
        <div class="llave">
          <div class="llave-nombre">Final</div>
          <div class="llave-serie">${textoPartidos(config.final)}</div>
          <div class="llave-equipo placeholder">Ganador SF1</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo placeholder">Ganador SF2</div>
        </div>
      </div>
    </div>
  `;
}

function renderResumenFormato(config) {
  return `
    <div class="planner-resultado" style="margin-top:12px;">
      <p><strong>Formato configurado</strong></p>
      <p>8vos: ${textoPartidos(config.octavos)}</p>
      <p>4tos: ${textoPartidos(config.cuartos)}</p>
      <p>Semi: ${textoPartidos(config.semifinales)}</p>
      <p>Final: ${textoPartidos(config.final)}</p>
    </div>
  `;
}

function renderPlayoffs(categoria) {
  const config = obtenerConfigPlayoff(categoria);
  const cantidad = Number(config.cantidad);
  const equiposDisponibles = categorias[categoria]?.length || 0;

  if (cantidad > equiposDisponibles) {
    playoffBody.innerHTML = `<div class="alerta-suave">No alcanza la cantidad de equipos para un Top ${cantidad} en ${categoria}.</div>`;
    playoffEstado.textContent = "No aplica";
    return;
  }

  const clasificados = obtenerClasificados(categoria, cantidad);
  const completa = faseRegularCompleta(categoria);

  playoffEstado.textContent = completa ? "Llaves confirmadas" : "Proyección actual";

  const descripcion = completa
    ? `La fase regular está completa. Así quedaría el cuadro de playoffs para ${categoria}.`
    : `La fase regular todavía no terminó. Este cuadro muestra cómo quedarían hoy los playoffs de ${categoria}.`;

  playoffBody.innerHTML = `
    <p class="playoff-descripcion">${descripcion}</p>
    ${renderResumenFormato(config)}
    ${cantidad === 4 ? renderBracketTop4(clasificados, config) : renderBracketTop8(clasificados, config)}
  `;
}

function renderCategoria() {
  const categoria = categoriaSelect.value;
  const equipos = categorias[categoria] || [];
  const tabla = calcularTabla(categoria);
  const partidos = fixtures[categoria] || [];
  const config = obtenerConfigPlayoff(categoria);

  tablaTitulo.textContent = `Tabla de Posiciones - ${categoria}`;
  fixtureTitulo.textContent = `Fixture - ${categoria}`;
  badgeEtapa.textContent = `${settings.competenciaPorCategoria[categoria]} · ${settings.ruedasPorCategoria[categoria]} rueda${settings.ruedasPorCategoria[categoria] > 1 ? "s" : ""} · Top ${config.cantidad}`;

  tablaBody.innerHTML = "";
  fixtureBody.innerHTML = "";
  mensajeEstado.textContent = "";

  if (equipos.length === 0) {
    tablaBody.innerHTML = `
      <tr>
        <td colspan="9">Categoría sin equipos cargados por el momento.</td>
      </tr>
    `;
    fixtureBody.innerHTML = `<p>La categoría <strong>${categoria}</strong> todavía no tiene equipos cargados.</p>`;
    playoffBody.innerHTML = `<div class="alerta-suave">No hay datos suficientes para mostrar playoffs.</div>`;
    partidoSelect.innerHTML = `<option value="">No hay partidos cargados</option>`;
    puntosLocalInput.value = "";
    puntosVisitanteInput.value = "";
    return;
  }

  tabla.forEach((equipo, index) => {
    tablaBody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${equipo.equipo}</td>
        <td>${equipo.pj}</td>
        <td>${equipo.pg}</td>
        <td>${equipo.pp}</td>
        <td>${equipo.gf}</td>
        <td>${equipo.gc}</td>
        <td>${equipo.df}</td>
        <td>${equipo.pts}</td>
      </tr>
    `;
  });

  if (partidos.length === 0) {
    fixtureBody.innerHTML = `<p>Fixture de <strong>${categoria}</strong> pendiente de generación.</p>`;
    partidoSelect.innerHTML = `<option value="">No hay partidos cargados</option>`;
    puntosLocalInput.value = "";
    puntosVisitanteInput.value = "";
    renderPlayoffs(categoria);
    return;
  }

  let jornadaActual = null;
  let bloqueAbierto = false;

  partidos.forEach((partido, index) => {
    if (partido.jornada !== jornadaActual) {
      if (bloqueAbierto) fixtureBody.innerHTML += `</div>`;
      jornadaActual = partido.jornada;
      bloqueAbierto = true;
      fixtureBody.innerHTML += `<div class="jornada-bloque"><h3>Jornada ${jornadaActual}</h3>`;
    }

    if (partido.estado === "Libre") {
      fixtureBody.innerHTML += `
        <div class="partido pendiente">
          <span class="equipo equipo-local">${partido.local}</span>
          <strong class="marcador">LIBRE</strong>
          <span class="equipo equipo-visitante">-</span>
          <em class="estado-pendiente">Libre</em>
        </div>
      `;
    } else {
      const ganador = obtenerGanador(partido);
      const claseEstado = partido.estado === "Jugado" ? "jugado" : "pendiente";
      const claseTextoEstado = partido.estado === "Jugado" ? "estado-jugado" : "estado-pendiente";
      const localEsGanador = ganador === partido.local ? "ganador" : "";
      const visitanteEsGanador = ganador === partido.visitante ? "ganador" : "";

      fixtureBody.innerHTML += `
        <div class="partido ${claseEstado}">
          <span class="equipo equipo-local ${localEsGanador}">${partido.local}</span>
          <strong class="marcador">
            ${partido.estado === "Jugado" ? `${partido.puntosLocal} - ${partido.puntosVisitante}` : "vs"}
          </strong>
          <span class="equipo equipo-visitante ${visitanteEsGanador}">${partido.visitante}</span>
          <em class="${claseTextoEstado}">${partido.estado}</em>
          ${ganador ? `<div class="ganador-linea">Ganador: ${ganador}</div>` : ""}
        </div>
      `;
    }

    if (index === partidos.length - 1 && bloqueAbierto) {
      fixtureBody.innerHTML += `</div>`;
    }
  });

  cargarSelectorPartidos(categoria);
  cargarDatosPartidoSeleccionado();
  renderPlayoffs(categoria);
}

function calcularPlanificador() {
  const equipos = Number(plannerEquipos.value);
  const formato = plannerFormato.value;
  const tienePlayoffs = plannerPlayoffs.value === "si";
  const clasificados = Number(plannerClasificados.value);
  const inicio = plannerInicio.value;
  const fin = plannerFin.value;
  const frecuencia = Number(plannerFrecuencia.value);

  const configActual = {
    cantidad: Number(fixturePlayoffSelect.value),
    octavos: Number(fixtureOctavosSelect.value),
    cuartos: Number(fixtureCuartosSelect.value),
    semifinales: Number(fixtureSemisSelect.value),
    final: Number(fixtureFinalSelect.value)
  };

  if (Number.isNaN(equipos) || equipos < 2) {
    plannerResultado.innerHTML = `<p>Ingresá una cantidad válida de equipos.</p>`;
    plannerComparacion.innerHTML = "";
    return;
  }

  let partidosRegular = 0;
  let fechasRegular = 0;
  let descripcionFormato = "";

  if (formato === "apertura") {
    partidosRegular = (equipos * (equipos - 1)) / 2;
    fechasRegular = equipos % 2 === 0 ? equipos - 1 : equipos;
    descripcionFormato = "Apertura (1 rueda)";
  }

  if (formato === "clausura") {
    partidosRegular = (equipos * (equipos - 1)) / 2;
    fechasRegular = equipos % 2 === 0 ? equipos - 1 : equipos;
    descripcionFormato = "Clausura (1 rueda)";
  }

  if (formato === "anual") {
    partidosRegular = equipos * (equipos - 1);
    fechasRegular = (equipos % 2 === 0 ? equipos - 1 : equipos) * 2;
    descripcionFormato = "Anual (2 ruedas)";
  }

  if (formato === "eliminacion") {
    partidosRegular = 0;
    fechasRegular = 0;
    descripcionFormato = "Eliminación directa";
  }

  let partidosPlayoff = 0;
  let fechasPlayoff = 0;
  let detallePlayoff = "Sin playoffs.";

  if (formato === "eliminacion") {
    const directo = calcularPlayoffsBasico(equipos);
    partidosPlayoff = directo.partidos;
    fechasPlayoff = directo.fechas;
    detallePlayoff = directo.detalle;
  } else if (tienePlayoffs) {
    if (clasificados > equipos) {
      plannerResultado.innerHTML = `<p>Los clasificados a playoffs no pueden superar la cantidad de equipos.</p>`;
      plannerComparacion.innerHTML = "";
      return;
    }

    const playoffBasico = calcularPlayoffsBasico(clasificados);
    const playoffReal = calcularFechasPlayoffSegunConfig(clasificados, configActual);

    partidosPlayoff = playoffBasico.partidos;
    fechasPlayoff = playoffReal.fechas;
    detallePlayoff = playoffReal.detalle;
  }

  const totalPartidos = partidosRegular + partidosPlayoff;
  const totalFechas = fechasRegular + fechasPlayoff;

  let domingosDisponibles = 0;

  if (inicio && fin) {
    domingosDisponibles = contarDomingos(inicio, fin);
    domingosDisponibles = Math.floor(domingosDisponibles / frecuencia);
  }

  let diagnostico = "Sin calendario definido.";
  let recomendacion = "";

  if (domingosDisponibles > 0) {
    const diferencia = domingosDisponibles - totalFechas;

    if (diferencia > 0) {
      diagnostico = `El formato entra. Sobran ${diferencia} domingos.`;
      recomendacion = "Se puede absorber una suspensión o dejar libre una fecha sensible.";
    } else if (diferencia === 0) {
      diagnostico = "El formato entra justo en el calendario.";
      recomendacion = "Conviene evitar suspensiones o prever reprogramación.";
    } else {
      diagnostico = `No entra. Faltan ${Math.abs(diferencia)} fechas.`;
      recomendacion = "Haría falta adelantar una fecha entresemana o cambiar el formato.";
    }
  }

  let calendarioHTML = "";

  if (inicio) {
    const calendario = generarCalendarioSugerido(inicio, frecuencia, totalFechas);
    calendarioHTML = `
      <hr>
      <h3>Calendario sugerido</h3>
      ${calendario.map((fecha, index) => `<p><strong>Fecha ${index + 1}:</strong> ${formatearFecha(fecha)}</p>`).join("")}
    `;
  }

  plannerResultado.innerHTML = `
    <h3>Resultado del formato</h3>
    <p><strong>Equipos:</strong> ${equipos}</p>
    <p><strong>Competencia:</strong> ${descripcionFormato}</p>
    <p><strong>Fase regular:</strong> ${partidosRegular} partidos / ${fechasRegular} fechas</p>
    <p><strong>Playoffs:</strong> ${partidosPlayoff} partidos / ${fechasPlayoff} fechas</p>
    <p><strong>Total necesario:</strong> ${totalPartidos} partidos / ${totalFechas} fechas</p>
    <p><strong>Detalle de playoffs:</strong> ${detallePlayoff}</p>
    <hr>
    <p><strong>Domingos disponibles:</strong> ${domingosDisponibles}</p>
    <p><strong>Diagnóstico:</strong> ${diagnostico}</p>
    <p><strong>Recomendación:</strong> ${recomendacion}</p>
    ${calendarioHTML}
  `;

  compararFormatos(equipos, inicio, fin, frecuencia);
}

function cargarConfigGestion(categoria) {
  const config = obtenerConfigPlayoff(categoria);
  fixtureEtapaSelect.value = settings.competenciaPorCategoria[categoria];
  fixtureRuedasSelect.value = String(settings.ruedasPorCategoria[categoria]);
  fixturePlayoffSelect.value = String(config.cantidad);
  fixtureOctavosSelect.value = String(config.octavos);
  fixtureCuartosSelect.value = String(config.cuartos);
  fixtureSemisSelect.value = String(config.semifinales);
  fixtureFinalSelect.value = String(config.final);
}

botonGuardar.addEventListener("click", () => {
  const categoria = categoriaSelect.value;
  const index = Number(partidoSelect.value);
  const partido = (fixtures[categoria] || [])[index];

  if (!partido || partido.estado === "Libre") return;

  const puntosLocal = Number(puntosLocalInput.value);
  const puntosVisitante = Number(puntosVisitanteInput.value);

  if (
    Number.isNaN(puntosLocal) ||
    Number.isNaN(puntosVisitante) ||
    puntosLocalInput.value === "" ||
    puntosVisitanteInput.value === ""
  ) {
    mensajeEstado.textContent = "Completá ambos puntajes.";
    return;
  }

  if (puntosLocal === puntosVisitante) {
    mensajeEstado.textContent = "No puede haber empate en básquet.";
    return;
  }

  partido.puntosLocal = puntosLocal;
  partido.puntosVisitante = puntosVisitante;
  partido.estado = "Jugado";

  guardarFixtures();
  renderCategoria();
  partidoSelect.value = String(index);
  cargarDatosPartidoSeleccionado();
  mensajeEstado.textContent = "Resultado guardado correctamente.";
});

botonResetear.addEventListener("click", () => {
  const categoria = categoriaSelect.value;
  const index = Number(partidoSelect.value);
  const partido = (fixtures[categoria] || [])[index];

  if (!partido || partido.estado === "Libre") return;

  partido.puntosLocal = null;
  partido.puntosVisitante = null;
  partido.estado = "Pendiente";

  guardarFixtures();
  renderCategoria();
  partidoSelect.value = String(index);
  cargarDatosPartidoSeleccionado();
  mensajeEstado.textContent = "El partido volvió a estado Pendiente.";
});

botonGenerarFixture.addEventListener("click", () => {
  const textoOriginal = botonGenerarFixture.textContent;
  botonGenerarFixture.textContent = "Generando...";

  const categoria = fixtureCategoriaSelect.value;
  const equipos = categorias[categoria];
  const ruedas = Number(fixtureRuedasSelect.value);
  const etapa = fixtureEtapaSelect.value;

  const playoffConfig = {
    cantidad: Number(fixturePlayoffSelect.value),
    octavos: Number(fixtureOctavosSelect.value),
    cuartos: Number(fixtureCuartosSelect.value),
    semifinales: Number(fixtureSemisSelect.value),
    final: Number(fixtureFinalSelect.value)
  };

  if (!equipos || equipos.length < 2) {
    mensajeFixture.textContent = `La categoría ${categoria} todavía no tiene equipos suficientes para generar fixture.`;
    botonGenerarFixture.textContent = textoOriginal;
    return;
  }

  const hayDatosPrevios = (fixtures[categoria] || []).some(
    (partido) => partido.estado === "Jugado" || partido.estado === "Pendiente" || partido.estado === "Libre"
  );

  if (hayDatosPrevios) {
    const confirmar = window.confirm(`Ya existe un fixture para ${categoria}. Si lo regenerás, vas a perder los resultados cargados. ¿Querés continuar?`);
    if (!confirmar) {
      botonGenerarFixture.textContent = textoOriginal;
      return;
    }
  }

  fixtures[categoria] = ruedas === 2 ? generarDosRuedas(equipos) : generarRoundRobin(equipos);

  settings.competenciaPorCategoria[categoria] = etapa;
  settings.ruedasPorCategoria[categoria] = ruedas;
  settings.playoffConfigPorCategoria[categoria] = playoffConfig;

  guardarFixtures();
  guardarSettings();

  mensajeFixture.textContent = `${etapa} generado correctamente para ${categoria} (${ruedas} rueda${ruedas > 1 ? "s" : ""}).`;
  categoriaSelect.value = categoria;

  renderCategoria();
  mostrarLiga();

  botonGenerarFixture.textContent = textoOriginal;
});

categoriaSelect.addEventListener("change", renderCategoria);

fixtureCategoriaSelect.addEventListener("change", () => {
  cargarConfigGestion(fixtureCategoriaSelect.value);
  calcularPlanificador();
});

[
  plannerEquipos,
  plannerFormato,
  plannerPlayoffs,
  plannerClasificados,
  plannerInicio,
  plannerFin,
  plannerFrecuencia,
  fixturePlayoffSelect,
  fixtureOctavosSelect,
  fixtureCuartosSelect,
  fixtureSemisSelect,
  fixtureFinalSelect
].forEach((elemento) => {
  elemento.addEventListener("change", calcularPlanificador);
});

partidoSelect.addEventListener("change", cargarDatosPartidoSeleccionado);
plannerBoton.addEventListener("click", calcularPlanificador);

mostrarLiga();

cargarConfigGestion(fixtureCategoriaSelect.value);
renderCategoria();
calcularPlanificador();