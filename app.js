const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
const SUPABASE_KEY = "sb_publishable_HtooEUIqEorzX3ODP0wLXQ_iulhXEdL";

let supabase = null;

try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase inicializado correctamente");
  } else {
    console.warn("Supabase no cargó. La app seguirá en modo local.");
  }
} catch (error) {
  console.error("Error inicializando Supabase:", error);
}

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

const STORAGE_KEY = "ligaMaxiFixturesV12";
const SETTINGS_KEY = "ligaMaxiSettingsV12";

const ADMIN_PASSWORD = "admin123";
const RESULTADOS_PASSWORD = "resultados123";

const SESSION_GESTION_KEY = "ligaMaxiGestionOpen";
const SESSION_RESULTADOS_KEY = "ligaMaxiResultadosOpen";

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
  diaJuegoPorCategoria: {
    "Maxi +35 A": 0,
    "Maxi +35 B": 0,
    "Maxi +48": 3,
    "Femenino": 0
  },
  usaPlayoffsPorCategoria: {
    "Maxi +35 A": true,
    "Maxi +35 B": true,
    "Maxi +48": true,
    "Femenino": true
  },
  playoffConfigPorCategoria: {
    "Maxi +35 A": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 },
    "Maxi +35 B": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 },
    "Maxi +48": { cantidad: 6, octavos: 1, cuartos: 1, semifinales: 1, final: 1 },
    "Femenino": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 }
  },
  calendarioPorCategoria: {
    "Maxi +35 A": { regular: [], playoffs: [] },
    "Maxi +35 B": { regular: [], playoffs: [] },
    "Maxi +48": { regular: [], playoffs: [] },
    "Femenino": { regular: [], playoffs: [] }
  },
  fechasBloqueadasPorCategoria: {
    "Maxi +35 A": [],
    "Maxi +35 B": [],
    "Maxi +48": [],
    "Femenino": []
  },
  fechaInicioPorCategoria: {
    "Maxi +35 A": "",
    "Maxi +35 B": "",
    "Maxi +48": "",
    "Femenino": ""
  },
  fechaFinPorCategoria: {
    "Maxi +35 A": "",
    "Maxi +35 B": "",
    "Maxi +48": "",
    "Femenino": ""
  },
  frecuenciaPorCategoria: {
    "Maxi +35 A": 1,
    "Maxi +35 B": 1,
    "Maxi +48": 1,
    "Femenino": 1
  }
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
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

function normalizarCalendario(calParcial = {}) {
  return {
    regular: Array.isArray(calParcial.regular) ? calParcial.regular : [],
    playoffs: Array.isArray(calParcial.playoffs) ? calParcial.playoffs : []
  };
}

function cargarFixturesLocal() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY);

  if (datosGuardados) {
    try {
      return JSON.parse(datosGuardados);
    } catch (error) {
      console.error("Error leyendo fixtures guardados. Se usará la base inicial.", error);
    }
  }

  return deepClone(fixturesBase);
}

function cargarSettingsLocal() {
  const datosGuardados = localStorage.getItem(SETTINGS_KEY);

  if (datosGuardados) {
    try {
      const data = JSON.parse(datosGuardados);
      const base = deepClone(settingsBase);

      Object.keys(categorias).forEach((categoria) => {
        base.competenciaPorCategoria[categoria] =
          data.competenciaPorCategoria?.[categoria] || base.competenciaPorCategoria[categoria];

        base.ruedasPorCategoria[categoria] =
          Number(data.ruedasPorCategoria?.[categoria] ?? base.ruedasPorCategoria[categoria]);

        base.diaJuegoPorCategoria[categoria] =
          Number(data.diaJuegoPorCategoria?.[categoria] ?? base.diaJuegoPorCategoria[categoria]);

        base.usaPlayoffsPorCategoria[categoria] =
          Boolean(data.usaPlayoffsPorCategoria?.[categoria] ?? base.usaPlayoffsPorCategoria[categoria]);

        base.playoffConfigPorCategoria[categoria] = normalizarConfigPlayoff(
          data.playoffConfigPorCategoria?.[categoria]
        );

        base.calendarioPorCategoria[categoria] = normalizarCalendario(
          data.calendarioPorCategoria?.[categoria]
        );

        base.fechasBloqueadasPorCategoria[categoria] =
          Array.isArray(data.fechasBloqueadasPorCategoria?.[categoria])
            ? data.fechasBloqueadasPorCategoria[categoria]
            : [];

        base.fechaInicioPorCategoria[categoria] =
          data.fechaInicioPorCategoria?.[categoria] || "";

        base.fechaFinPorCategoria[categoria] =
          data.fechaFinPorCategoria?.[categoria] || "";

        base.frecuenciaPorCategoria[categoria] =
          Number(data.frecuenciaPorCategoria?.[categoria] ?? base.frecuenciaPorCategoria[categoria]);
      });

      return base;
    } catch (error) {
      console.error("Error leyendo configuración guardada. Se usará la base inicial.", error);
    }
  }

  return deepClone(settingsBase);
}

function guardarSettingsLocal() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let fixtures = cargarFixturesLocal();
let settings = cargarSettingsLocal();

Object.keys(categorias).forEach((categoria) => {
  if (!fixtures[categoria]) fixtures[categoria] = [];
  if (!settings.competenciaPorCategoria[categoria]) settings.competenciaPorCategoria[categoria] = "Apertura";
  if (!settings.ruedasPorCategoria[categoria]) settings.ruedasPorCategoria[categoria] = 1;
  if (settings.diaJuegoPorCategoria[categoria] === undefined || settings.diaJuegoPorCategoria[categoria] === null) {
    settings.diaJuegoPorCategoria[categoria] = categoria === "Maxi +48" ? 3 : 0;
  }
  settings.playoffConfigPorCategoria[categoria] = normalizarConfigPlayoff(
    settings.playoffConfigPorCategoria[categoria]
  );
  settings.calendarioPorCategoria[categoria] = normalizarCalendario(
    settings.calendarioPorCategoria[categoria]
  );
  if (!Array.isArray(settings.fechasBloqueadasPorCategoria[categoria])) {
    settings.fechasBloqueadasPorCategoria[categoria] = [];
  }
  if (!settings.frecuenciaPorCategoria[categoria]) settings.frecuenciaPorCategoria[categoria] = 1;
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
const resultadosBloqueado = document.getElementById("resultados-bloqueado");
const resultadosPanel = document.getElementById("resultados-panel");
const abrirResultadosBtn = document.getElementById("abrir-resultados-btn");
const cerrarResultadosBtn = document.getElementById("cerrar-resultados-btn");

const plannerCategoria = document.getElementById("planner-categoria");
const plannerCompetencia = document.getElementById("planner-competencia");
const plannerRuedas = document.getElementById("planner-ruedas");
const plannerDiaJuego = document.getElementById("planner-dia-juego");
const plannerPlayoffs = document.getElementById("planner-playoffs");
const plannerClasificados = document.getElementById("planner-clasificados");
const plannerOctavos = document.getElementById("planner-octavos");
const plannerCuartos = document.getElementById("planner-cuartos");
const plannerSemis = document.getElementById("planner-semis");
const plannerFinal = document.getElementById("planner-final");
const plannerInicio = document.getElementById("planner-inicio");
const plannerFin = document.getElementById("planner-fin");
const plannerFrecuencia = document.getElementById("planner-frecuencia");
const plannerBloqueadas = document.getElementById("planner-bloqueadas");
const plannerBotonGenerar = document.getElementById("planner-generar");
const plannerResultado = document.getElementById("planner-resultado");
const plannerComparacion = document.getElementById("planner-comparacion");

const acomodarCategoria = document.getElementById("acomodar-categoria");
const acomodarModo = document.getElementById("acomodar-modo");
const botonAcomodar = document.getElementById("acomodar-fixture");
const mensajeAcomodar = document.getElementById("mensaje-acomodar");

const botonExportarPDF = document.getElementById("exportar-pdf");
const botonExportarRespaldo = document.getElementById("exportar-respaldo");
const botonImportarRespaldo = document.getElementById("importar-respaldo-btn");
const inputImportarRespaldo = document.getElementById("importar-respaldo-input");
const mensajeRespaldo = document.getElementById("mensaje-respaldo");

const tabLiga = document.getElementById("tab-liga");
const tabGestion = document.getElementById("tab-gestion");
const vistaLiga = document.getElementById("vista-liga");
const vistaGestion = document.getElementById("vista-gestion");
const gestionBloqueadaCard = document.getElementById("gestion-bloqueada-card");
const gestionContenido = document.getElementById("gestion-contenido");
const abrirGestionBtn = document.getElementById("abrir-gestion-btn");
const cerrarGestionBtn = document.getElementById("cerrar-gestion-btn");
const mensajeGestion = document.getElementById("mensaje-gestion");

function gestionAbierta() {
  return sessionStorage.getItem(SESSION_GESTION_KEY) === "1";
}

function resultadosAbiertos() {
  return sessionStorage.getItem(SESSION_RESULTADOS_KEY) === "1";
}

function abrirGestionSesion() {
  sessionStorage.setItem(SESSION_GESTION_KEY, "1");
  actualizarEstadoAccesos();
}

function cerrarGestionSesion() {
  sessionStorage.removeItem(SESSION_GESTION_KEY);
  actualizarEstadoAccesos();
}

function abrirResultadosSesion() {
  sessionStorage.setItem(SESSION_RESULTADOS_KEY, "1");
  actualizarEstadoAccesos();
}

function cerrarResultadosSesion() {
  sessionStorage.removeItem(SESSION_RESULTADOS_KEY);
  actualizarEstadoAccesos();
}

function actualizarEstadoAccesos() {
  if (gestionAbierta()) {
    gestionBloqueadaCard.style.display = "none";
    gestionContenido.style.display = "block";
    mensajeGestion.textContent = "";
  } else {
    gestionBloqueadaCard.style.display = "block";
    gestionContenido.style.display = "none";
  }

  if (resultadosAbiertos()) {
    resultadosBloqueado.style.display = "none";
    resultadosPanel.style.display = "block";
  } else {
    resultadosBloqueado.style.display = "block";
    resultadosPanel.style.display = "none";
  }
}

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
  actualizarEstadoAccesos();
}

tabLiga.addEventListener("click", mostrarLiga);
tabGestion.addEventListener("click", mostrarGestion);

function diaJuegoATexto(dia) {
  return Number(dia) === 3 ? "Miércoles" : "Domingo";
}

function formatearFechaLargaISO(fechaISO) {
  if (!fechaISO) return "";
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatearFechaDisplay(fechaISO) {
  const texto = formatearFechaLargaISO(fechaISO);
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function convertirFechaArgentinaAISO(texto) {
  const limpio = texto.trim();
  const match = limpio.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (!match) return null;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const anio = Number(match[3]);

  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  const dd = String(dia).padStart(2, "0");
  const mm = String(mes).padStart(2, "0");

  return `${anio}-${mm}-${dd}`;
}

function parsearFechasBloqueadas(texto) {
  if (!texto.trim()) return { fechasISO: [], invalidas: [] };

  const items = texto
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");

  const fechasISO = [];
  const invalidas = [];

  items.forEach((item) => {
    const iso = convertirFechaArgentinaAISO(item);
    if (iso) fechasISO.push(iso);
    else invalidas.push(item);
  });

  return {
    fechasISO: [...new Set(fechasISO)],
    invalidas
  };
}

function fechasBloqueadasAInputArgentina(fechasISO) {
  return (fechasISO || [])
    .map((fechaISO) => {
      const [anio, mes, dia] = fechaISO.split("-");
      return `${Number(dia)}-${Number(mes)}-${anio}`;
    })
    .join(", ");
}

function obtenerConfigPlayoff(categoria) {
  return normalizarConfigPlayoff(settings.playoffConfigPorCategoria[categoria]);
}

function obtenerCalendarioCategoria(categoria) {
  return normalizarCalendario(settings.calendarioPorCategoria[categoria]);
}

function textoPartidos(cantidad) {
  return `${cantidad} partido${cantidad > 1 ? "s" : ""}`;
}

function contarSeriesPorCantidad(cantidadClasificados) {
  if (cantidadClasificados === 2) return { final: 1 };
  if (cantidadClasificados === 4) return { semifinales: 2, final: 1 };
  if (cantidadClasificados === 6) return { reclasificacion: 2, semifinales: 2, final: 1 };
  if (cantidadClasificados === 8) return { cuartos: 4, semifinales: 2, final: 1 };
  if (cantidadClasificados === 16) return { octavos: 8, cuartos: 4, semifinales: 2, final: 1 };
  return {};
}

function construirEntradasPlayoff(usaPlayoffs, config) {
  if (!usaPlayoffs) return [];

  const entradas = [];
  const cantidad = Number(config.cantidad);
  const series = contarSeriesPorCantidad(cantidad);

  if (series.octavos) {
    for (let i = 1; i <= config.octavos; i++) {
      entradas.push({ fase: "Octavos", etiqueta: `Octavos - Juego ${i}` });
    }
  }

  if (series.cuartos) {
    for (let i = 1; i <= config.cuartos; i++) {
      entradas.push({ fase: "Cuartos", etiqueta: `4tos - Juego ${i}` });
    }
  }

  if (series.reclasificacion) {
    for (let i = 1; i <= config.cuartos; i++) {
      entradas.push({ fase: "Reclasificación", etiqueta: `Reclasificación - Juego ${i}` });
    }
  }

  if (series.semifinales) {
    for (let i = 1; i <= config.semifinales; i++) {
      entradas.push({ fase: "Semifinales", etiqueta: `Semifinales - Juego ${i}` });
    }
  }

  if (series.final) {
    for (let i = 1; i <= config.final; i++) {
      entradas.push({ fase: "Final", etiqueta: `Final - Juego ${i}` });
    }
  }

  return entradas;
}

function calcularPartidosPlayoffReales(usaPlayoffs, config) {
  if (!usaPlayoffs) {
    return {
      partidos: 0,
      fechas: 0,
      detalle: "Sin playoffs."
    };
  }

  const cantidad = Number(config.cantidad);
  const series = contarSeriesPorCantidad(cantidad);
  let partidos = 0;
  let fechas = 0;
  const detalle = [];

  if (series.octavos) {
    partidos += series.octavos * Number(config.octavos);
    fechas += Number(config.octavos);
    detalle.push(`8vos a ${textoPartidos(Number(config.octavos))}`);
  }

  if (series.cuartos) {
    partidos += series.cuartos * Number(config.cuartos);
    fechas += Number(config.cuartos);
    detalle.push(`4tos a ${textoPartidos(Number(config.cuartos))}`);
  }

  if (series.reclasificacion) {
    partidos += series.reclasificacion * Number(config.cuartos);
    fechas += Number(config.cuartos);
    detalle.push(`reclasificación a ${textoPartidos(Number(config.cuartos))}`);
  }

  if (series.semifinales) {
    partidos += series.semifinales * Number(config.semifinales);
    fechas += Number(config.semifinales);
    detalle.push(`semifinales a ${textoPartidos(Number(config.semifinales))}`);
  }

  if (series.final) {
    partidos += series.final * Number(config.final);
    fechas += Number(config.final);
    detalle.push(`final a ${textoPartidos(Number(config.final))}`);
  }

  return {
    partidos,
    fechas,
    detalle: detalle.join(" + ") || "Sin playoffs."
  };
}

function contarFechasRegulares(equipos, ruedas) {
  if (equipos < 2) return 0;
  const unaRueda = equipos % 2 === 0 ? equipos - 1 : equipos;
  return unaRueda * ruedas;
}

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

function obtenerPrimerDiaJuegoDesde(fechaInicioISO, diaJuego) {
  const [anio, mes, dia] = fechaInicioISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  while (fecha.getDay() !== Number(diaJuego)) {
    fecha.setDate(fecha.getDate() + 1);
  }

  return fecha;
}

function fechaAISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function generarFechasDisponibles(fechaInicioISO, fechaFinISO, frecuencia, fechasBloqueadas, diaJuego) {
  if (!fechaInicioISO || !fechaFinISO) return [];

  const bloqueadas = new Set(fechasBloqueadas);
  const fechas = [];
  const fecha = obtenerPrimerDiaJuegoDesde(fechaInicioISO, diaJuego);
  const [anioFin, mesFin, diaFin] = fechaFinISO.split("-").map(Number);
  const fechaFin = new Date(anioFin, mesFin - 1, diaFin);

  while (fecha <= fechaFin) {
    const iso = fechaAISO(fecha);

    if (!bloqueadas.has(iso)) {
      fechas.push(iso);
    }

    fecha.setDate(fecha.getDate() + (7 * frecuencia));
  }

  return fechas;
}

function construirCalendarioReal(fechaInicioISO, fechaFinISO, frecuencia, fechasBloqueadas, diaJuego, fechasRegulares, entradasPlayoff) {
  const disponibles = generarFechasDisponibles(fechaInicioISO, fechaFinISO, frecuencia, fechasBloqueadas, diaJuego);
  const fechasNecesarias = fechasRegulares + entradasPlayoff.length;
  const alcanza = disponibles.length >= fechasNecesarias;

  const regular = disponibles.slice(0, fechasRegulares);
  const playoffs = disponibles
    .slice(fechasRegulares, fechasRegulares + entradasPlayoff.length)
    .map((fecha, index) => ({
      ...entradasPlayoff[index],
      fecha
    }));

  return {
    disponibles,
    regular,
    playoffs,
    fechasNecesarias,
    alcanza
  };
}

function crearEtiquetaEquipo(posicion, equipo) {
  if (!equipo) return `${posicion}° puesto`;
  return `${posicion}° ${equipo.equipo}`;
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

function agruparPlayoffFechasPorFase(categoria) {
  const calendario = obtenerCalendarioCategoria(categoria);
  const mapa = {};

  calendario.playoffs.forEach((item) => {
    if (!mapa[item.fase]) mapa[item.fase] = [];
    mapa[item.fase].push(item);
  });

  return mapa;
}

function renderFechasPlayoff(categoria) {
  const mapa = agruparPlayoffFechasPorFase(categoria);
  const fases = ["Octavos", "Cuartos", "Reclasificación", "Semifinales", "Final"];
  const disponibles = fases.filter((fase) => Array.isArray(mapa[fase]) && mapa[fase].length > 0);

  if (disponibles.length === 0) return "";

  return `
    <div class="playoff-fechas-grid">
      ${disponibles.map((fase) => `
        <div class="playoff-fecha-box">
          <h4>${fase}</h4>
          ${mapa[fase].map((item) => `<p><strong>${item.etiqueta}:</strong> ${formatearFechaDisplay(item.fecha)}</p>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
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

function renderBracketTop6(clasificados, config) {
  const r1A = clasificados[2] ? crearEtiquetaEquipo(3, clasificados[2]) : "3° puesto";
  const r1B = clasificados[5] ? crearEtiquetaEquipo(6, clasificados[5]) : "6° puesto";
  const r2A = clasificados[3] ? crearEtiquetaEquipo(4, clasificados[3]) : "4° puesto";
  const r2B = clasificados[4] ? crearEtiquetaEquipo(5, clasificados[4]) : "5° puesto";

  const semi1A = clasificados[0] ? crearEtiquetaEquipo(1, clasificados[0]) : "1° puesto";
  const semi2A = clasificados[1] ? crearEtiquetaEquipo(2, clasificados[1]) : "2° puesto";

  return `
    <div class="bracket">
      <div class="bracket-columna">
        <h4>Reclasificación</h4>

        <div class="llave">
          <div class="llave-nombre">Reclasificación 1</div>
          <div class="llave-serie">${textoPartidos(config.cuartos)}</div>
          <div class="llave-equipo">${r1A}</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo">${r1B}</div>
        </div>

        <div class="llave">
          <div class="llave-nombre">Reclasificación 2</div>
          <div class="llave-serie">${textoPartidos(config.cuartos)}</div>
          <div class="llave-equipo">${r2A}</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo">${r2B}</div>
        </div>
      </div>

      <div class="bracket-columna">
        <h4>Semifinales</h4>

        <div class="llave">
          <div class="llave-nombre">Semifinal 1</div>
          <div class="llave-serie">${textoPartidos(config.semifinales)}</div>
          <div class="llave-equipo">${semi1A}</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo placeholder">Ganador 4° vs 5°</div>
        </div>

        <div class="llave">
          <div class="llave-nombre">Semifinal 2</div>
          <div class="llave-serie">${textoPartidos(config.semifinales)}</div>
          <div class="llave-equipo">${semi2A}</div>
          <div class="llave-separador">vs</div>
          <div class="llave-equipo placeholder">Ganador 3° vs 6°</div>
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

        ${qf.map((partido, index) => `
          <div class="llave">
            <div class="llave-nombre">Cuarto ${index + 1}</div>
            <div class="llave-serie">${textoPartidos(config.cuartos)}</div>
            <div class="llave-equipo">${partido[0]}</div>
            <div class="llave-separador">vs</div>
            <div class="llave-equipo">${partido[1]}</div>
          </div>
        `).join("")}
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

function renderPlayoffs(categoria) {
  const usaPlayoffs = settings.usaPlayoffsPorCategoria[categoria];
  const config = obtenerConfigPlayoff(categoria);
  const equiposDisponibles = categorias[categoria]?.length || 0;

  if (!usaPlayoffs) {
    playoffEstado.textContent = "Sin playoffs";
    playoffBody.innerHTML = `<div class="alerta-suave">Para esta categoría el torneo está configurado sin playoffs.</div>`;
    return;
  }

  if (config.cantidad > equiposDisponibles) {
    playoffEstado.textContent = "No aplica";
    playoffBody.innerHTML = `<div class="alerta-suave">No alcanza la cantidad de equipos para un Top ${config.cantidad} en ${categoria}.</div>`;
    return;
  }

  const clasificados = obtenerClasificados(categoria, config.cantidad);
  const completa = faseRegularCompleta(categoria);

  playoffEstado.textContent = completa ? "Llaves confirmadas" : "Proyección actual";

  const descripcion = completa
    ? `La fase regular está completa. Así quedaría el cuadro de playoffs para ${categoria}.`
    : `La fase regular todavía no terminó. Este cuadro muestra cómo quedarían hoy los playoffs de ${categoria}.`;

  let bracketHTML = "";

  if (config.cantidad === 4) {
    bracketHTML = renderBracketTop4(clasificados, config);
  } else if (config.cantidad === 6) {
    bracketHTML = renderBracketTop6(clasificados, config);
  } else {
    bracketHTML = renderBracketTop8(clasificados, config);
  }

  playoffBody.innerHTML = `
    <p class="playoff-descripcion">${descripcion}</p>
    ${renderFechasPlayoff(categoria)}
    ${bracketHTML}
  `;
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

function renderCategoria() {
  const categoria = categoriaSelect.value;
  const equipos = categorias[categoria] || [];
  const tabla = calcularTabla(categoria);
  const partidos = fixtures[categoria] || [];
  const config = obtenerConfigPlayoff(categoria);
  const usaPlayoffs = settings.usaPlayoffsPorCategoria[categoria];
  const calendario = obtenerCalendarioCategoria(categoria);
  const diaJuego = settings.diaJuegoPorCategoria[categoria];

  tablaTitulo.textContent = `Tabla de Posiciones - ${categoria}`;
  fixtureTitulo.textContent = `Fixture - ${categoria}`;
  badgeEtapa.textContent = `${settings.competenciaPorCategoria[categoria]} · ${settings.ruedasPorCategoria[categoria]} rueda${settings.ruedasPorCategoria[categoria] > 1 ? "s" : ""} · ${diaJuegoATexto(diaJuego)}${usaPlayoffs ? ` · Top ${config.cantidad}` : " · Sin playoffs"}`;

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

      const fechaJornada = calendario.regular[jornadaActual - 1] || "";

      fixtureBody.innerHTML += `
        <div class="jornada-bloque">
          <div class="jornada-head">
            <h3>Fecha ${jornadaActual}</h3>
            <span class="fecha-chip">${fechaJornada ? formatearFechaDisplay(fechaJornada) : "Sin fecha asignada"}</span>
          </div>
      `;
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

function renderComparacionFormatos(categoria, fechaInicioISO, fechaFinISO, frecuencia, bloqueadas, diaJuego) {
  const equipos = categorias[categoria]?.length || 0;

  if (!fechaInicioISO || !fechaFinISO || equipos < 2) {
    plannerComparacion.innerHTML = "";
    return;
  }

  const configActual = {
    cantidad: Number(plannerClasificados.value),
    octavos: Number(plannerOctavos.value),
    cuartos: Number(plannerCuartos.value),
    semifinales: Number(plannerSemis.value),
    final: Number(plannerFinal.value)
  };

  const fechasDisponibles = generarFechasDisponibles(
    fechaInicioISO,
    fechaFinISO,
    frecuencia,
    bloqueadas,
    diaJuego
  ).length;

  const regular1 = contarFechasRegulares(equipos, 1);
  const regular2 = contarFechasRegulares(equipos, 2);
  const top4 = calcularPartidosPlayoffReales(true, { ...configActual, cantidad: 4 });
  const top6 = calcularPartidosPlayoffReales(true, { ...configActual, cantidad: 6 });
  const top8 = calcularPartidosPlayoffReales(true, { ...configActual, cantidad: 8 });

  const opciones = [
    { nombre: "1 rueda sin playoffs", fechas: regular1 },
    { nombre: "1 rueda + Top 4", fechas: regular1 + top4.fechas, valido: equipos >= 4 },
    { nombre: "1 rueda + Top 6", fechas: regular1 + top6.fechas, valido: equipos >= 6 },
    { nombre: "1 rueda + Top 8", fechas: regular1 + top8.fechas, valido: equipos >= 8 },
    { nombre: "2 ruedas sin playoffs", fechas: regular2 },
    { nombre: "2 ruedas + Top 4", fechas: regular2 + top4.fechas, valido: equipos >= 4 },
    { nombre: "2 ruedas + Top 6", fechas: regular2 + top6.fechas, valido: equipos >= 6 },
    { nombre: "2 ruedas + Top 8", fechas: regular2 + top8.fechas, valido: equipos >= 8 }
  ];

  let html = `<h3>Comparación de formatos</h3>`;

  opciones.forEach((op) => {
    const valido = op.valido !== false;

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

    const diferencia = fechasDisponibles - op.fechas;
    let estado = "⚠️ Entra justo";
    let margen = "Sin margen.";

    if (diferencia > 0) {
      estado = "✅ Entra cómodo";
      margen = `Sobran ${diferencia} fechas.`;
    } else if (diferencia < 0) {
      estado = "❌ No entra";
      margen = `Faltan ${Math.abs(diferencia)} fechas.`;
    }

    html += `
      <p>
        <strong>${op.nombre}</strong><br>
        Fechas necesarias: ${op.fechas}<br>
        Fechas disponibles: ${fechasDisponibles}<br>
        Resultado: ${estado}<br>
        Margen: ${margen}
      </p>
      <hr>
    `;
  });

  plannerComparacion.innerHTML = html;
}

async function guardarFixturesYCloud(categoria) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  if (!supabase) {
    console.warn("Supabase no disponible. Se guardó solo en local.");
    return;
  }

  const payload = {
    fixtures: fixtures[categoria] || [],
    settings
  };

  const { error } = await supabase
    .from("torneos")
    .upsert(
      {
        categoria,
        data: payload,
        updated_at: new Date().toISOString()
      },
      { onConflict: "categoria" }
    );

  if (error) {
    console.error("Error guardando en Supabase:", error);
  }
}

async function cargarDesdeSupabase(categoria) {
  if (!supabase) {
    console.warn("Supabase no disponible. Se usará solo almacenamiento local.");
    return;
  }

  const { data, error } = await supabase
    .from("torneos")
    .select("*")
    .eq("categoria", categoria)
    .maybeSingle();

  if (error) {
    console.error("Error leyendo desde Supabase:", error);
    return;
  }

  if (!data || !data.data) return;

  if (data.data.fixtures) {
    fixtures[categoria] = data.data.fixtures;
  }

  if (data.data.settings) {
    settings = data.data.settings;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function cargarCategoriaConFuenteRemota(categoria) {
  try {
    await cargarDesdeSupabase(categoria);
  } catch (error) {
    console.error(error);
  }

  acomodarCategoria.value = categoria;
  cargarPlanificadorDesdeCategoria(categoria);
  renderCategoria();
}

async function generarTorneoCompleto() {
  if (!gestionAbierta()) {
    mensajeGestion.textContent = "Necesitás abrir Gestión con clave de administrador.";
    return;
  }

  const categoria = plannerCategoria.value;
  const equipos = categorias[categoria] || [];
  const competencia = plannerCompetencia.value;
  const ruedas = Number(plannerRuedas.value);
  const diaJuego = Number(plannerDiaJuego.value);
  const usaPlayoffs = plannerPlayoffs.value === "si";
  const clasificados = Number(plannerClasificados.value);
  const configPlayoff = {
    cantidad: clasificados,
    octavos: Number(plannerOctavos.value),
    cuartos: Number(plannerCuartos.value),
    semifinales: Number(plannerSemis.value),
    final: Number(plannerFinal.value)
  };
  const fechaInicioISO = plannerInicio.value;
  const fechaFinISO = plannerFin.value;
  const frecuencia = Number(plannerFrecuencia.value);
  const parseoBloqueadas = parsearFechasBloqueadas(plannerBloqueadas.value);

  mensajeAcomodar.textContent = "";

  if (parseoBloqueadas.invalidas.length > 0) {
    plannerResultado.innerHTML = `
      <p>Estas fechas bloqueadas no tienen formato válido:</p>
      <p><strong>${parseoBloqueadas.invalidas.join(", ")}</strong></p>
      <p>Usá formato argentino: <strong>3-5-2026, 25-9-2026</strong></p>
    `;
    return;
  }

  const fechasBloqueadas = parseoBloqueadas.fechasISO;

  if (equipos.length < 2) {
    plannerResultado.innerHTML = `<p>La categoría no tiene equipos suficientes.</p>`;
    return;
  }

  if (!fechaInicioISO || !fechaFinISO) {
    plannerResultado.innerHTML = `<p>Completá fecha de inicio y fecha de fin.</p>`;
    return;
  }

  if (fechaInicioISO > fechaFinISO) {
    plannerResultado.innerHTML = `<p>La fecha de inicio no puede ser posterior a la fecha de fin.</p>`;
    return;
  }

  if (usaPlayoffs && clasificados > equipos.length) {
    plannerResultado.innerHTML = `<p>Los clasificados a playoffs no pueden superar la cantidad de equipos de la categoría.</p>`;
    return;
  }

  const hayDatosPrevios = (fixtures[categoria] || []).length > 0;

  if (hayDatosPrevios) {
    const confirmar = window.confirm(
      `Ya existe un torneo cargado para ${categoria}. Si continuás, se va a regenerar y se perderán los resultados actuales. ¿Querés seguir?`
    );

    if (!confirmar) return;
  }

  const fixtureGenerado = ruedas === 2 ? generarDosRuedas(equipos) : generarRoundRobin(equipos);
  const fechasRegulares = contarFechasRegulares(equipos.length, ruedas);
  const entradasPlayoff = construirEntradasPlayoff(usaPlayoffs, configPlayoff);
  const infoPlayoff = calcularPartidosPlayoffReales(usaPlayoffs, configPlayoff);
  const calendario = construirCalendarioReal(
    fechaInicioISO,
    fechaFinISO,
    frecuencia,
    fechasBloqueadas,
    diaJuego,
    fechasRegulares,
    entradasPlayoff
  );

  const partidosRegulares = fixtureGenerado.filter((p) => p.visitante !== "LIBRE").length;
  const totalPartidos = partidosRegulares + infoPlayoff.partidos;
  const totalFechas = fechasRegulares + infoPlayoff.fechas;

  if (!calendario.alcanza) {
    plannerResultado.innerHTML = `
      <h3>Resultado del formato</h3>
      <p><strong>Categoría:</strong> ${categoria}</p>
      <p><strong>Equipos:</strong> ${equipos.length}</p>
      <p><strong>Competencia:</strong> ${competencia}</p>
      <p><strong>Día de juego:</strong> ${diaJuegoATexto(diaJuego)}</p>
      <p><strong>Fase regular:</strong> ${partidosRegulares} partidos / ${fechasRegulares} fechas</p>
      <p><strong>Playoffs:</strong> ${infoPlayoff.partidos} partidos / ${infoPlayoff.fechas} fechas</p>
      <p><strong>Total necesario:</strong> ${totalPartidos} partidos / ${totalFechas} fechas</p>
      <hr>
      <p><strong>Fechas disponibles:</strong> ${calendario.disponibles.length}</p>
      <p><strong>Diagnóstico:</strong> ❌ No entra en el calendario.</p>
      <p><strong>Faltan:</strong> ${totalFechas - calendario.disponibles.length} fechas</p>
      <p><strong>Detalle de playoffs:</strong> ${infoPlayoff.detalle}</p>
    `;
    renderComparacionFormatos(categoria, fechaInicioISO, fechaFinISO, frecuencia, fechasBloqueadas, diaJuego);
    return;
  }

  fixtures[categoria] = fixtureGenerado;

  settings.competenciaPorCategoria[categoria] = competencia;
  settings.ruedasPorCategoria[categoria] = ruedas;
  settings.diaJuegoPorCategoria[categoria] = diaJuego;
  settings.usaPlayoffsPorCategoria[categoria] = usaPlayoffs;
  settings.playoffConfigPorCategoria[categoria] = configPlayoff;
  settings.calendarioPorCategoria[categoria] = {
    regular: calendario.regular,
    playoffs: calendario.playoffs
  };
  settings.fechasBloqueadasPorCategoria[categoria] = fechasBloqueadas;
  settings.fechaInicioPorCategoria[categoria] = fechaInicioISO;
  settings.fechaFinPorCategoria[categoria] = fechaFinISO;
  settings.frecuenciaPorCategoria[categoria] = frecuencia;

  guardarSettingsLocal();
  await guardarFixturesYCloud(categoria);

  categoriaSelect.value = categoria;
  acomodarCategoria.value = categoria;

  const calendarioRegularHTML = calendario.regular
    .map((fecha, index) => `<p><strong>Fecha ${index + 1}:</strong> ${formatearFechaDisplay(fecha)}</p>`)
    .join("");

  const calendarioPlayoffHTML = calendario.playoffs.length > 0
    ? calendario.playoffs
        .map((item) => `<p><strong>${item.etiqueta}:</strong> ${formatearFechaDisplay(item.fecha)}</p>`)
        .join("")
    : `<p>Sin playoffs.</p>`;

  const bloqueadasHTML = fechasBloqueadas.length > 0
    ? `
      <div class="bloqueadas-lista">
        <p><strong>Fechas bloqueadas</strong></p>
        ${fechasBloqueadas.map((fecha) => `<p>${formatearFechaDisplay(fecha)}</p>`).join("")}
      </div>
    `
    : "";

  plannerResultado.innerHTML = `
    <h3>Resultado del formato</h3>
    <p><strong>Categoría:</strong> ${categoria}</p>
    <p><strong>Equipos:</strong> ${equipos.length}</p>
    <p><strong>Competencia:</strong> ${competencia}</p>
    <p><strong>Ruedas:</strong> ${ruedas}</p>
    <p><strong>Día de juego:</strong> ${diaJuegoATexto(diaJuego)}</p>
    <p><strong>Fase regular:</strong> ${partidosRegulares} partidos / ${fechasRegulares} fechas</p>
    <p><strong>Playoffs:</strong> ${infoPlayoff.partidos} partidos / ${infoPlayoff.fechas} fechas</p>
    <p><strong>Total necesario:</strong> ${totalPartidos} partidos / ${totalFechas} fechas</p>
    <p><strong>Detalle de playoffs:</strong> ${infoPlayoff.detalle}</p>
    <hr>
    <p><strong>Fechas disponibles:</strong> ${calendario.disponibles.length}</p>
    <p><strong>Diagnóstico:</strong> ✅ Entra en el calendario</p>

    <div class="calendario-fases">
      <div class="calendario-fase-box">
        <h4>Fase regular</h4>
        ${calendarioRegularHTML}
      </div>

      <div class="calendario-fase-box">
        <h4>Playoffs</h4>
        ${calendarioPlayoffHTML}
      </div>
    </div>

    ${bloqueadasHTML}
  `;

  renderComparacionFormatos(categoria, fechaInicioISO, fechaFinISO, frecuencia, fechasBloqueadas, diaJuego);
  renderCategoria();
  mostrarLiga();
}

function mezclarArray(array) {
  const copia = [...array];

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

function invertirLocalias(partidos) {
  return partidos.map((partido) => {
    if (partido.estado === "Libre" || partido.visitante === "LIBRE") {
      return { ...partido };
    }

    return {
      ...partido,
      local: partido.visitante,
      visitante: partido.local
    };
  });
}

async function acomodarFixtureCategoria() {
  if (!gestionAbierta()) {
    mensajeGestion.textContent = "Necesitás abrir Gestión con clave de administrador.";
    return;
  }

  const categoria = acomodarCategoria.value;
  const modo = acomodarModo.value;
  const equipos = categorias[categoria] || [];
  const ruedas = Number(settings.ruedasPorCategoria[categoria] || 1);

  if ((fixtures[categoria] || []).length === 0) {
    mensajeAcomodar.textContent = "Primero generá el torneo completo en el planificador.";
    return;
  }

  const confirmar = window.confirm(
    `Se va a reacomodar el fixture de ${categoria}. Esto reiniciará los resultados cargados. ¿Querés continuar?`
  );

  if (!confirmar) return;

  if (modo === "sortear") {
    const equiposMezclados = mezclarArray(equipos);
    fixtures[categoria] = ruedas === 2 ? generarDosRuedas(equiposMezclados) : generarRoundRobin(equiposMezclados);
    mensajeAcomodar.textContent = `Fixture reordenado para ${categoria}.`;
  }

  if (modo === "invertir") {
    fixtures[categoria] = invertirLocalias(fixtures[categoria]);
    mensajeAcomodar.textContent = `Localías invertidas para ${categoria}.`;
  }

  await guardarFixturesYCloud(categoria);
  categoriaSelect.value = categoria;
  renderCategoria();
}

function cargarPlanificadorDesdeCategoria(categoria) {
  plannerCategoria.value = categoria;
  plannerCompetencia.value = settings.competenciaPorCategoria[categoria];
  plannerRuedas.value = String(settings.ruedasPorCategoria[categoria]);
  plannerDiaJuego.value = String(settings.diaJuegoPorCategoria[categoria] ?? (categoria === "Maxi +48" ? 3 : 0));
  plannerPlayoffs.value = settings.usaPlayoffsPorCategoria[categoria] ? "si" : "no";

  const config = obtenerConfigPlayoff(categoria);
  plannerClasificados.value = String(config.cantidad);
  plannerOctavos.value = String(config.octavos);
  plannerCuartos.value = String(config.cuartos);
  plannerSemis.value = String(config.semifinales);
  plannerFinal.value = String(config.final);

  plannerInicio.value = settings.fechaInicioPorCategoria[categoria] || "";
  plannerFin.value = settings.fechaFinPorCategoria[categoria] || "";
  plannerFrecuencia.value = String(settings.frecuenciaPorCategoria[categoria] || 1);
  plannerBloqueadas.value = fechasBloqueadasAInputArgentina(settings.fechasBloqueadasPorCategoria[categoria] || []);
}

function construirCrucesPosiblesTexto(categoria) {
  const usaPlayoffs = settings.usaPlayoffsPorCategoria[categoria];
  const config = obtenerConfigPlayoff(categoria);

  if (!usaPlayoffs) {
    return ["Sin playoffs."];
  }

  if (config.cantidad === 4) {
    return [
      `Semifinal 1: 1° vs 4° (${textoPartidos(config.semifinales)})`,
      `Semifinal 2: 2° vs 3° (${textoPartidos(config.semifinales)})`,
      `Final: Ganador SF1 vs Ganador SF2 (${textoPartidos(config.final)})`
    ];
  }

  if (config.cantidad === 6) {
    return [
      `Reclasificación 1: 3° vs 6° (${textoPartidos(config.cuartos)})`,
      `Reclasificación 2: 4° vs 5° (${textoPartidos(config.cuartos)})`,
      `Semifinal 1: 1° vs Ganador 4°/5° (${textoPartidos(config.semifinales)})`,
      `Semifinal 2: 2° vs Ganador 3°/6° (${textoPartidos(config.semifinales)})`,
      `Final: Ganador SF1 vs Ganador SF2 (${textoPartidos(config.final)})`
    ];
  }

  if (config.cantidad === 8) {
    return [
      `Cuarto 1: 1° vs 8° (${textoPartidos(config.cuartos)})`,
      `Cuarto 2: 4° vs 5° (${textoPartidos(config.cuartos)})`,
      `Cuarto 3: 2° vs 7° (${textoPartidos(config.cuartos)})`,
      `Cuarto 4: 3° vs 6° (${textoPartidos(config.cuartos)})`,
      `Semifinal 1: Ganador QF1 vs Ganador QF2 (${textoPartidos(config.semifinales)})`,
      `Semifinal 2: Ganador QF3 vs Ganador QF4 (${textoPartidos(config.semifinales)})`,
      `Final: Ganador SF1 vs Ganador SF2 (${textoPartidos(config.final)})`
    ];
  }

  return ["Cruces no definidos para este formato."];
}

function exportarFixturePDF() {
  const categoria = categoriaSelect.value;
  const partidos = fixtures[categoria] || [];
  const calendario = obtenerCalendarioCategoria(categoria);
  const usaPlayoffs = settings.usaPlayoffsPorCategoria[categoria];
  const config = obtenerConfigPlayoff(categoria);
  const diaJuego = settings.diaJuegoPorCategoria[categoria];
  const competencia = settings.competenciaPorCategoria[categoria];
  const ruedas = settings.ruedasPorCategoria[categoria];
  const bloqueadas = settings.fechasBloqueadasPorCategoria[categoria] || [];

  if (partidos.length === 0) {
    alert("Primero generá el torneo para esta categoría.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const margenIzq = 15;
  const margenDer = 195;
  let y = 15;

  const agregarLinea = (texto, tamaño = 11, negrita = false, salto = 7) => {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setFontSize(tamaño);

    const lineas = doc.splitTextToSize(texto, margenDer - margenIzq);
    lineas.forEach((linea) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(linea, margenIzq, y);
      y += salto;
    });
  };

  const agregarSeparador = () => {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
    doc.line(margenIzq, y, margenDer, y);
    y += 6;
  };

  agregarLinea("LIGA MAXI BASQUET LA PLATA", 18, true, 8);
  agregarLinea(`Fixture oficial - ${categoria}`, 15, true, 8);

  agregarSeparador();

  agregarLinea(`Competencia: ${competencia}`, 11, false);
  agregarLinea(`Ruedas: ${ruedas}`, 11, false);
  agregarLinea(`Día de juego: ${diaJuegoATexto(diaJuego)}`, 11, false);
  agregarLinea(`Playoffs: ${usaPlayoffs ? `Sí (Top ${config.cantidad})` : "No"}`, 11, false);

  if (bloqueadas.length > 0) {
    agregarLinea(`Fechas no jugables: ${bloqueadas.map(formatearFechaDisplay).join(" | ")}`, 10, false);
  }

  agregarSeparador();
  agregarLinea("FASE REGULAR", 14, true, 8);

  const jornadasMap = new Map();
  partidos.forEach((partido) => {
    if (!jornadasMap.has(partido.jornada)) jornadasMap.set(partido.jornada, []);
    jornadasMap.get(partido.jornada).push(partido);
  });

  Array.from(jornadasMap.keys()).sort((a, b) => a - b).forEach((jornada) => {
    const fecha = calendario.regular[jornada - 1] || "";
    agregarLinea(`Fecha ${jornada} - ${fecha ? formatearFechaDisplay(fecha) : "Sin fecha asignada"}`, 12, true, 7);

    jornadasMap.get(jornada).forEach((partido) => {
      if (partido.estado === "Libre" || partido.visitante === "LIBRE") {
        agregarLinea(`• ${partido.local} - LIBRE`, 10, false, 6);
      } else {
        agregarLinea(`• ${partido.local} vs ${partido.visitante}`, 10, false, 6);
      }
    });

    y += 2;
  });

  agregarSeparador();
  agregarLinea("PLAYOFFS", 14, true, 8);

  if (!usaPlayoffs) {
    agregarLinea("Sin playoffs.", 11, false, 7);
  } else {
    if (calendario.playoffs.length > 0) {
      agregarLinea("Fechas de playoffs", 12, true, 7);
      calendario.playoffs.forEach((item) => {
        agregarLinea(`• ${item.etiqueta}: ${formatearFechaDisplay(item.fecha)}`, 10, false, 6);
      });
      y += 2;
    }

    agregarLinea("Cruces posibles", 12, true, 7);
    construirCrucesPosiblesTexto(categoria).forEach((linea) => {
      agregarLinea(`• ${linea}`, 10, false, 6);
    });
  }

  const nombreArchivo = `fixture-${categoria.toLowerCase().replace(/\s+/g, "-").replace(/\+/g, "")}.pdf`;
  doc.save(nombreArchivo);
}

function exportarRespaldo() {
  try {
    const respaldo = {
      version: 1,
      fecha_exportacion: new Date().toISOString(),
      storage_key_fixtures: STORAGE_KEY,
      storage_key_settings: SETTINGS_KEY,
      fixtures,
      settings
    };

    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const fecha = new Date();
    const nombre = `respaldo-liga-maxi-${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}_${String(fecha.getHours()).padStart(2, "0")}-${String(fecha.getMinutes()).padStart(2, "0")}.json`;

    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mensajeRespaldo.textContent = "Respaldo exportado correctamente.";
  } catch (error) {
    console.error(error);
    mensajeRespaldo.textContent = "No se pudo exportar el respaldo.";
  }
}

function validarRespaldo(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.fixtures || typeof data.fixtures !== "object") return false;
  if (!data.settings || typeof data.settings !== "object") return false;
  return true;
}

function importarRespaldoDesdeArchivo(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);

      if (!validarRespaldo(data)) {
        mensajeRespaldo.textContent = "El archivo no tiene un formato de respaldo válido.";
        return;
      }

      const confirmar = window.confirm(
        "Se va a reemplazar toda la información actual por la del respaldo importado. ¿Querés continuar?"
      );

      if (!confirmar) return;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.fixtures));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));

      fixtures = cargarFixturesLocal();
      settings = cargarSettingsLocal();

      Object.keys(categorias).forEach((categoria) => {
        if (!fixtures[categoria]) fixtures[categoria] = [];
        if (!settings.competenciaPorCategoria[categoria]) settings.competenciaPorCategoria[categoria] = "Apertura";
        if (!settings.ruedasPorCategoria[categoria]) settings.ruedasPorCategoria[categoria] = 1;
        if (settings.diaJuegoPorCategoria[categoria] === undefined || settings.diaJuegoPorCategoria[categoria] === null) {
          settings.diaJuegoPorCategoria[categoria] = categoria === "Maxi +48" ? 3 : 0;
        }
        settings.playoffConfigPorCategoria[categoria] = normalizarConfigPlayoff(
          settings.playoffConfigPorCategoria[categoria]
        );
        settings.calendarioPorCategoria[categoria] = normalizarCalendario(
          settings.calendarioPorCategoria[categoria]
        );
        if (!Array.isArray(settings.fechasBloqueadasPorCategoria[categoria])) {
          settings.fechasBloqueadasPorCategoria[categoria] = [];
        }
        if (!settings.frecuenciaPorCategoria[categoria]) settings.frecuenciaPorCategoria[categoria] = 1;
      });

      guardarSettingsLocal();

      for (const categoria of Object.keys(categorias)) {
        await guardarFixturesYCloud(categoria);
      }

      cargarPlanificadorDesdeCategoria(categoriaSelect.value);
      acomodarCategoria.value = categoriaSelect.value;
      renderCategoria();

      mensajeRespaldo.textContent = "Respaldo importado correctamente.";
    } catch (error) {
      console.error(error);
      mensajeRespaldo.textContent = "No se pudo importar el respaldo. Revisá que sea un JSON válido.";
    }
  };

  reader.onerror = () => {
    mensajeRespaldo.textContent = "No se pudo leer el archivo.";
  };

  reader.readAsText(file);
}

abrirGestionBtn.addEventListener("click", () => {
  const clave = window.prompt("Ingresá la clave de administrador:");

  if (clave === null) return;

  if (clave === ADMIN_PASSWORD) {
    abrirGestionSesion();
    mensajeGestion.textContent = "Gestión habilitada.";
  } else {
    mensajeGestion.textContent = "Clave incorrecta.";
  }
});

cerrarGestionBtn.addEventListener("click", () => {
  cerrarGestionSesion();
  mensajeGestion.textContent = "Gestión cerrada.";
});

abrirResultadosBtn.addEventListener("click", () => {
  const clave = window.prompt("Ingresá la clave para carga de resultados:");

  if (clave === null) return;

  if (clave === RESULTADOS_PASSWORD) {
    abrirResultadosSesion();
    mensajeEstado.textContent = "Carga de resultados habilitada.";
  } else {
    mensajeEstado.textContent = "Clave incorrecta.";
  }
});

cerrarResultadosBtn.addEventListener("click", () => {
  cerrarResultadosSesion();
  mensajeEstado.textContent = "Carga de resultados cerrada.";
});

botonGuardar.addEventListener("click", async () => {
  if (!resultadosAbiertos()) {
    mensajeEstado.textContent = "Primero habilitá la carga de resultados con clave.";
    return;
  }

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

  await guardarFixturesYCloud(categoria);
  renderCategoria();
  partidoSelect.value = String(index);
  cargarDatosPartidoSeleccionado();
  mensajeEstado.textContent = "Resultado guardado correctamente.";
});

botonResetear.addEventListener("click", async () => {
  if (!resultadosAbiertos()) {
    mensajeEstado.textContent = "Primero habilitá la carga de resultados con clave.";
    return;
  }

  const categoria = categoriaSelect.value;
  const index = Number(partidoSelect.value);
  const partido = (fixtures[categoria] || [])[index];

  if (!partido || partido.estado === "Libre") return;

  partido.puntosLocal = null;
  partido.puntosVisitante = null;
  partido.estado = "Pendiente";

  await guardarFixturesYCloud(categoria);
  renderCategoria();
  partidoSelect.value = String(index);
  cargarDatosPartidoSeleccionado();
  mensajeEstado.textContent = "El partido volvió a estado Pendiente.";
});

plannerBotonGenerar.addEventListener("click", async () => {
  await generarTorneoCompleto();
});

botonAcomodar.addEventListener("click", async () => {
  await acomodarFixtureCategoria();
});

botonExportarPDF.addEventListener("click", exportarFixturePDF);
botonExportarRespaldo.addEventListener("click", exportarRespaldo);
botonImportarRespaldo.addEventListener("click", () => inputImportarRespaldo.click());
inputImportarRespaldo.addEventListener("change", (event) => {
  const file = event.target.files[0];
  importarRespaldoDesdeArchivo(file);
  event.target.value = "";
});

categoriaSelect.addEventListener("change", async () => {
  const categoria = categoriaSelect.value;
  await cargarCategoriaConFuenteRemota(categoria);
});

plannerCategoria.addEventListener("change", async () => {
  const categoria = plannerCategoria.value;
  categoriaSelect.value = categoria;
  await cargarCategoriaConFuenteRemota(categoria);
});

acomodarCategoria.addEventListener("change", async () => {
  const categoria = acomodarCategoria.value;
  categoriaSelect.value = categoria;
  await cargarCategoriaConFuenteRemota(categoria);
});

partidoSelect.addEventListener("change", cargarDatosPartidoSeleccionado);

async function inicializarApp() {
  mostrarLiga();
  cargarPlanificadorDesdeCategoria(categoriaSelect.value);
  acomodarCategoria.value = categoriaSelect.value;
  actualizarEstadoAccesos();
  await cargarCategoriaConFuenteRemota(categoriaSelect.value);
  renderCategoria();
}

inicializarApp();