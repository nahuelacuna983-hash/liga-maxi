(() => {
  if (window.__LIGA_MAXI_APP_ALREADY_LOADED__) {
    console.warn("[Liga Maxi] app.js ya estaba cargado. Se cancela la segunda ejecución.");
    return;
  }
  window.__LIGA_MAXI_APP_ALREADY_LOADED__ = true;

  const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";

  function createSupabaseClientSafe() {
    try {
      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.warn("[Liga Maxi] No se cargó la librería de Supabase.");
        return null;
      }
      if (window.__LIGA_MAXI_SUPABASE_CLIENT__) {
        return window.__LIGA_MAXI_SUPABASE_CLIENT__;
      }
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.__LIGA_MAXI_SUPABASE_CLIENT__ = sb;
      return sb;
    } catch (error) {
      console.error("[Liga Maxi] Error creando cliente Supabase:", error);
      return null;
    }
  }

  const supabaseClient = createSupabaseClientSafe();
  window.__LIGA_MAXI_SB__ = supabaseClient;

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

  const STORAGE_KEY = "ligaMaxiFixturesV10";
  const SETTINGS_KEY = "ligaMaxiSettingsV10";

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
      "Maxi +48": { cantidad: 4, octavos: 1, cuartos: 1, semifinales: 1, final: 1 },
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

  function cargarFixtures() {
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

  function guardarFixtures() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures));
  }

  function cargarSettings() {
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

  function guardarSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  let fixtures = cargarFixtures();
  let settings = cargarSettings();

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
    if (gestionBloqueadaCard && gestionContenido) {
      if (gestionAbierta()) {
        gestionBloqueadaCard.style.display = "none";
        gestionContenido.style.display = "block";
        if (mensajeGestion) mensajeGestion.textContent = "";
      } else {
        gestionBloqueadaCard.style.display = "block";
        gestionContenido.style.display = "none";
      }
    }

    if (resultadosBloqueado && resultadosPanel) {
      if (resultadosAbiertos()) {
        resultadosBloqueado.style.display = "none";
        resultadosPanel.style.display = "block";
      } else {
        resultadosBloqueado.style.display = "block";
        resultadosPanel.style.display = "none";
      }
    }
  }

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
    actualizarEstadoAccesos();
  }

  function diaJuegoATexto(dia) {
    if (Number(dia) === 3) return "Miércoles";
    return "Domingo";
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
      for (let i = 1; i <= config.octavos; i++) entradas.push({ fase: "Octavos", etiqueta: `Octavos - Juego ${i}` });
    }
    if (series.cuartos) {
      for (let i = 1; i <= config.cuartos; i++) entradas.push({ fase: "Cuartos", etiqueta: `4tos - Juego ${i}` });
    }
    if (series.semifinales) {
      for (let i = 1; i <= config.semifinales; i++) entradas.push({ fase: "Semifinales", etiqueta: `Semifinales - Juego ${i}` });
    }
    if (series.final) {
      for (let i = 1; i <= config.final; i++) entradas.push({ fase: "Final", etiqueta: `Final - Juego ${i}` });
    }

    return entradas;
  }

  function calcularPartidosPlayoffReales(usaPlayoffs, config) {
    if (!usaPlayoffs) {
      return { partidos: 0, fechas: 0, detalle: "Sin playoffs." };
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

      local.gf += Number(partido.puntosLocal);
      local.gc += Number(partido.puntosVisitante);
      visitante.gf += Number(partido.puntosVisitante);
      visitante.gc += Number(partido.puntosLocal);

      if (Number(partido.puntosLocal) > Number(partido.puntosVisitante)) {
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
            estado: "Libre",
            fecha: ""
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
            estado: "Pendiente",
            fecha: ""
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
        estado: "Pendiente",
        fecha: ""
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

  function faseRegularCompleta(categoria) {
    const partidos = (fixtures[categoria] || []).filter((partido) => partido.estado !== "Libre");
    if (partidos.length === 0) return false;
    return partidos.every((partido) => partido.estado === "Jugado");
  }

  function obtenerClasificados(categoria, cantidad) {
    return calcularTabla(categoria).slice(0, cantidad);
  }

  function asignarFechasAFixture(categoria) {
    const calendario = obtenerCalendarioCategoria(categoria);
    const mapaFechas = calendario.regular || [];
    const partidos = fixtures[categoria] || [];

    partidos.forEach((partido) => {
      if (partido.estado === "Libre") {
        partido.fecha = "";
        return;
      }
      partido.fecha = mapaFechas[partido.jornada - 1] || "";
    });
  }

  function renderTabla(categoria) {
    if (!tablaBody) return;
    const tabla = calcularTabla(categoria);

    tablaBody.innerHTML = tabla.map((fila, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${fila.equipo}</td>
        <td>${fila.pj}</td>
        <td>${fila.pg}</td>
        <td>${fila.pp}</td>
        <td>${fila.gf}</td>
        <td>${fila.gc}</td>
        <td>${fila.df}</td>
        <td>${fila.pts}</td>
      </tr>
    `).join("");
  }

  function agruparPorJornada(partidos) {
    const mapa = new Map();
    partidos.forEach((partido) => {
      if (!mapa.has(partido.jornada)) mapa.set(partido.jornada, []);
      mapa.get(partido.jornada).push(partido);
    });
    return [...mapa.entries()].sort((a, b) => a[0] - b[0]);
  }

  function renderFixture(categoria) {
    if (!fixtureBody) return;

    const partidos = fixtures[categoria] || [];
    if (partidos.length === 0) {
      fixtureBody.innerHTML = `<div class="alerta-suave">Todavía no hay fixture generado para esta categoría.</div>`;
      if (badgeEtapa) badgeEtapa.textContent = "Sin generar";
      return;
    }

    if (badgeEtapa) badgeEtapa.textContent = "Fase regular";

    const jornadas = agruparPorJornada(partidos);

    fixtureBody.innerHTML = jornadas.map(([jornada, lista]) => `
      <div class="fixture-fecha">
        <h4>Fecha ${jornada}${lista[0]?.fecha ? ` — ${formatearFechaDisplay(lista[0].fecha)}` : ""}</h4>
        <div class="fixture-lista">
          ${lista.map((partido, index) => {
            if (partido.estado === "Libre") {
              return `<div class="fixture-item"><strong>${partido.local}</strong> queda libre</div>`;
            }

            const resultado = partido.estado === "Jugado"
              ? `<span class="resultado">${partido.puntosLocal} - ${partido.puntosVisitante}</span>`
              : `<span class="resultado pendiente">Pendiente</span>`;

            return `
              <div class="fixture-item">
                <span>${partido.local}</span>
                ${resultado}
                <span>${partido.visitante}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `).join("");
  }

  function renderPlayoffs(categoria) {
    if (!playoffBody || !playoffEstado) return;

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

    playoffBody.innerHTML = `
      <div class="alerta-suave">
        ${completa
          ? `La fase regular está completa. Así quedarían hoy los playoffs de ${categoria}.`
          : `La fase regular todavía no terminó. Esto muestra la proyección actual de los playoffs.`}
      </div>
      <ol>
        ${clasificados.map((equipo, idx) => `<li>${idx + 1}° ${equipo.equipo}</li>`).join("")}
      </ol>
    `;
  }

  function cargarSelectorPartidos(categoria) {
    if (!partidoSelect) return;

    const partidos = (fixtures[categoria] || []).filter((partido) => partido.visitante !== "LIBRE");
    if (partidos.length === 0) {
      partidoSelect.innerHTML = `<option value="">No hay partidos cargados</option>`;
      return;
    }

    partidoSelect.innerHTML = partidos.map((partido, index) => `
      <option value="${index}">
        Fecha ${partido.jornada} — ${partido.local} vs ${partido.visitante}
      </option>
    `).join("");

    cargarPartidoSeleccionado();
  }

  function obtenerPartidosEditables(categoria) {
    return (fixtures[categoria] || []).filter((partido) => partido.visitante !== "LIBRE");
  }

  function cargarPartidoSeleccionado() {
    if (!categoriaSelect || !partidoSelect || !puntosLocalInput || !puntosVisitanteInput) return;

    const categoria = categoriaSelect.value;
    const partidos = obtenerPartidosEditables(categoria);
    const idx = Number(partidoSelect.value);
    const partido = partidos[idx];

    if (!partido) {
      puntosLocalInput.value = "";
      puntosVisitanteInput.value = "";
      return;
    }

    puntosLocalInput.value = partido.puntosLocal ?? "";
    puntosVisitanteInput.value = partido.puntosVisitante ?? "";
  }

  function guardarResultado() {
    if (!resultadosAbiertos()) {
      if (mensajeEstado) mensajeEstado.textContent = "Necesitás habilitar la carga de resultados.";
      return;
    }

    const categoria = categoriaSelect.value;
    const idx = Number(partidoSelect.value);
    const puntosLocal = Number(puntosLocalInput.value);
    const puntosVisitante = Number(puntosVisitanteInput.value);

    if (Number.isNaN(puntosLocal) || Number.isNaN(puntosVisitante)) {
      if (mensajeEstado) mensajeEstado.textContent = "Ingresá ambos puntajes.";
      return;
    }

    const editables = obtenerPartidosEditables(categoria);
    const partidoEditable = editables[idx];
    if (!partidoEditable) return;

    const partidoReal = (fixtures[categoria] || []).find(
      (p) =>
        p.jornada === partidoEditable.jornada &&
        p.local === partidoEditable.local &&
        p.visitante === partidoEditable.visitante
    );

    if (!partidoReal) return;

    partidoReal.puntosLocal = puntosLocal;
    partidoReal.puntosVisitante = puntosVisitante;
    partidoReal.estado = "Jugado";

    guardarFixtures();
    renderCategoria();
    if (mensajeEstado) mensajeEstado.textContent = "Resultado guardado correctamente.";
  }

  function resetearResultado() {
    if (!resultadosAbiertos()) {
      if (mensajeEstado) mensajeEstado.textContent = "Necesitás habilitar la carga de resultados.";
      return;
    }

    const categoria = categoriaSelect.value;
    const idx = Number(partidoSelect.value);
    const editables = obtenerPartidosEditables(categoria);
    const partidoEditable = editables[idx];
    if (!partidoEditable) return;

    const partidoReal = (fixtures[categoria] || []).find(
      (p) =>
        p.jornada === partidoEditable.jornada &&
        p.local === partidoEditable.local &&
        p.visitante === partidoEditable.visitante
    );

    if (!partidoReal) return;

    partidoReal.puntosLocal = null;
    partidoReal.puntosVisitante = null;
    partidoReal.estado = "Pendiente";

    guardarFixtures();
    renderCategoria();
    if (mensajeEstado) mensajeEstado.textContent = "El partido volvió a estado Pendiente.";
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

  function cargarPlanificadorDesdeCategoria(categoria) {
    if (!plannerCategoria) return;

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

  function renderComparacionFormatos(categoria, fechaInicioISO, fechaFinISO, frecuencia, fechasBloqueadas, diaJuego) {
    if (!plannerComparacion) return;

    const equipos = categorias[categoria] || [];
    const comparaciones = [1, 2].map((ruedas) => {
      const fechasRegulares = contarFechasRegulares(equipos.length, ruedas);
      const config = obtenerConfigPlayoff(categoria);
      const entradas = construirEntradasPlayoff(settings.usaPlayoffsPorCategoria[categoria], config);
      const calendario = construirCalendarioReal(
        fechaInicioISO,
        fechaFinISO,
        frecuencia,
        fechasBloqueadas,
        diaJuego,
        fechasRegulares,
        entradas
      );

      return `
        <div class="alerta-suave">
          <strong>${ruedas} rueda${ruedas > 1 ? "s" : ""}:</strong>
          ${fechasRegulares} fechas regulares + ${entradas.length} de playoffs.
          ${calendario.alcanza ? "✅ Entra" : "❌ No entra"} en el calendario.
        </div>
      `;
    });

    plannerComparacion.innerHTML = comparaciones.join("");
  }

  function generarTorneoDesdePlanificador() {
    if (!gestionAbierta()) {
      if (mensajeGestion) mensajeGestion.textContent = "Necesitás abrir Gestión con clave de administrador.";
      return;
    }

    const categoria = plannerCategoria.value;
    const competencia = plannerCompetencia.value;
    const ruedas = Number(plannerRuedas.value);
    const diaJuego = Number(plannerDiaJuego.value);
    const usaPlayoffs = plannerPlayoffs.value === "si";
    const config = {
      cantidad: Number(plannerClasificados.value),
      octavos: Number(plannerOctavos.value),
      cuartos: Number(plannerCuartos.value),
      semifinales: Number(plannerSemis.value),
      final: Number(plannerFinal.value)
    };
    const fechaInicioISO = plannerInicio.value;
    const fechaFinISO = plannerFin.value;
    const frecuencia = Number(plannerFrecuencia.value);
    const { fechasISO, invalidas } = parsearFechasBloqueadas(plannerBloqueadas.value);

    if (!fechaInicioISO || !fechaFinISO) {
      plannerResultado.innerHTML = `<div class="alerta-suave">Completá fecha de inicio y fecha de fin.</div>`;
      return;
    }

    if (invalidas.length > 0) {
      plannerResultado.innerHTML = `<div class="alerta-suave">Hay fechas inválidas: ${invalidas.join(", ")}</div>`;
      return;
    }

    const equipos = categorias[categoria] || [];
    const partidos = ruedas === 2 ? generarDosRuedas(equipos) : generarRoundRobin(equipos);

    const fechasRegulares = contarFechasRegulares(equipos.length, ruedas);
    const entradasPlayoff = construirEntradasPlayoff(usaPlayoffs, config);
    const calendario = construirCalendarioReal(
      fechaInicioISO,
      fechaFinISO,
      frecuencia,
      fechasISO,
      diaJuego,
      fechasRegulares,
      entradasPlayoff
    );

    settings.competenciaPorCategoria[categoria] = competencia;
    settings.ruedasPorCategoria[categoria] = ruedas;
    settings.diaJuegoPorCategoria[categoria] = diaJuego;
    settings.usaPlayoffsPorCategoria[categoria] = usaPlayoffs;
    settings.playoffConfigPorCategoria[categoria] = config;
    settings.calendarioPorCategoria[categoria] = {
      regular: calendario.regular,
      playoffs: calendario.playoffs
    };
    settings.fechasBloqueadasPorCategoria[categoria] = fechasISO;
    settings.fechaInicioPorCategoria[categoria] = fechaInicioISO;
    settings.fechaFinPorCategoria[categoria] = fechaFinISO;
    settings.frecuenciaPorCategoria[categoria] = frecuencia;

    fixtures[categoria] = partidos;
    asignarFechasAFixture(categoria);

    guardarSettings();
    guardarFixtures();

    const infoPlayoff = calcularPartidosPlayoffReales(usaPlayoffs, config);
    const partidosRegulares = partidos.filter((p) => p.estado !== "Libre").length;
    const totalPartidos = partidosRegulares + infoPlayoff.partidos;
    const totalFechas = fechasRegulares + infoPlayoff.fechas;

    plannerResultado.innerHTML = `
      <div class="alerta-suave">
        <p><strong>Categoría:</strong> ${categoria}</p>
        <p><strong>Equipos:</strong> ${equipos.length}</p>
        <p><strong>Competencia:</strong> ${competencia}</p>
        <p><strong>Ruedas:</strong> ${ruedas}</p>
        <p><strong>Día de juego:</strong> ${diaJuegoATexto(diaJuego)}</p>
        <p><strong>Fase regular:</strong> ${partidosRegulares} partidos / ${fechasRegulares} fechas</p>
        <p><strong>Playoffs:</strong> ${infoPlayoff.partidos} partidos / ${infoPlayoff.fechas} fechas</p>
        <p><strong>Total necesario:</strong> ${totalPartidos} partidos / ${totalFechas} fechas</p>
        <p><strong>Detalle de playoffs:</strong> ${infoPlayoff.detalle}</p>
        <p><strong>Fechas disponibles:</strong> ${calendario.disponibles.length}</p>
        <p><strong>Diagnóstico:</strong> ${calendario.alcanza ? "✅ Entra en el calendario" : "❌ No entra en el calendario"}</p>
      </div>
    `;

    renderComparacionFormatos(categoria, fechaInicioISO, fechaFinISO, frecuencia, fechasISO, diaJuego);

    categoriaSelect.value = categoria;
    cargarPlanificadorDesdeCategoria(categoria);
    renderCategoria();
    mostrarLiga();
  }

  function acomodarFixtureCategoria() {
    if (!gestionAbierta()) {
      if (mensajeGestion) mensajeGestion.textContent = "Necesitás abrir Gestión con clave de administrador.";
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
      fixtures[categoria] = ruedas === 2
        ? generarDosRuedas(equiposMezclados)
        : generarRoundRobin(equiposMezclados);
      asignarFechasAFixture(categoria);
      mensajeAcomodar.textContent = `Fixture reordenado para ${categoria}.`;
    }

    if (modo === "invertir") {
      fixtures[categoria] = invertirLocalias(fixtures[categoria]);
      mensajeAcomodar.textContent = `Localías invertidas para ${categoria}.`;
    }

    guardarFixtures();
    categoriaSelect.value = categoria;
    renderCategoria();
  }

  function construirCrucesPosiblesTexto(categoria) {
    const clasificados = obtenerClasificados(categoria, obtenerConfigPlayoff(categoria).cantidad);
    const config = obtenerConfigPlayoff(categoria);

    if (config.cantidad === 4) {
      return [
        `1° ${clasificados[0]?.equipo || ""} vs 4° ${clasificados[3]?.equipo || ""}`,
        `2° ${clasificados[1]?.equipo || ""} vs 3° ${clasificados[2]?.equipo || ""}`
      ];
    }

    if (config.cantidad === 8) {
      return [
        `1° ${clasificados[0]?.equipo || ""} vs 8° ${clasificados[7]?.equipo || ""}`,
        `4° ${clasificados[3]?.equipo || ""} vs 5° ${clasificados[4]?.equipo || ""}`,
        `2° ${clasificados[1]?.equipo || ""} vs 7° ${clasificados[6]?.equipo || ""}`,
        `3° ${clasificados[2]?.equipo || ""} vs 6° ${clasificados[5]?.equipo || ""}`
      ];
    }

    return [];
  }

  function exportarPDF() {
    try {
      const categoria = categoriaSelect.value;
      const partidos = fixtures[categoria] || [];

      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("No se cargó la librería de PDF.");
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      let y = 12;

      function agregarLinea(texto, size = 11, bold = false, salto = 7) {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.text(String(texto), 10, y);
        y += salto;
        if (y > 280) {
          doc.addPage();
          y = 12;
        }
      }

      agregarLinea(`Liga Maxi Básquet La Plata`, 14, true, 8);
      agregarLinea(`Categoría: ${categoria}`, 12, true, 8);
      agregarLinea(``, 10, false, 3);

      agruparPorJornada(partidos).forEach(([jornada, lista]) => {
        agregarLinea(`Fecha ${jornada}${lista[0]?.fecha ? ` - ${formatearFechaDisplay(lista[0].fecha)}` : ""}`, 12, true, 7);
        lista.forEach((partido) => {
          if (partido.estado === "Libre") {
            agregarLinea(`${partido.local} queda libre`, 10, false, 6);
          } else {
            const marcador = partido.estado === "Jugado"
              ? `${partido.puntosLocal} - ${partido.puntosVisitante}`
              : "Pendiente";
            agregarLinea(`${partido.local} vs ${partido.visitante}  |  ${marcador}`, 10, false, 6);
          }
        });
        y += 2;
      });

      const calendario = obtenerCalendarioCategoria(categoria);
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

      const nombreArchivo = `fixture-${categoria.toLowerCase().replace(/\s+/g, "-").replace(/\+/g, "")}.pdf`;
      doc.save(nombreArchivo);
    } catch (error) {
      console.error(error);
      alert("No se pudo exportar el PDF.");
    }
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

      if (mensajeRespaldo) mensajeRespaldo.textContent = "Respaldo exportado correctamente.";
    } catch (error) {
      console.error(error);
      if (mensajeRespaldo) mensajeRespaldo.textContent = "No se pudo exportar el respaldo.";
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

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (!validarRespaldo(data)) {
          if (mensajeRespaldo) mensajeRespaldo.textContent = "El archivo no tiene un formato de respaldo válido.";
          return;
        }

        const confirmar = window.confirm(
          "Se va a reemplazar toda la información actual por la del respaldo importado. ¿Querés continuar?"
        );

        if (!confirmar) return;

        fixtures = data.fixtures;
        settings = data.settings;

        guardarFixtures();
        guardarSettings();

        categoriaSelect.value = "Maxi +35 A";
        cargarPlanificadorDesdeCategoria("Maxi +35 A");
        renderCategoria();

        if (mensajeRespaldo) mensajeRespaldo.textContent = "Respaldo importado correctamente.";
      } catch (error) {
        console.error(error);
        if (mensajeRespaldo) mensajeRespaldo.textContent = "No se pudo importar el respaldo.";
      }
    };

    reader.readAsText(file);
  }

  function renderCategoria() {
    const categoria = categoriaSelect.value;

    if (tablaTitulo) tablaTitulo.textContent = `Tabla de Posiciones`;
    if (fixtureTitulo) fixtureTitulo.textContent = `Fixture`;

    renderTabla(categoria);
    renderFixture(categoria);
    renderPlayoffs(categoria);
    cargarSelectorPartidos(categoria);
  }

  function inicializarEventos() {
    if (tabLiga) tabLiga.addEventListener("click", mostrarLiga);
    if (tabGestion) tabGestion.addEventListener("click", mostrarGestion);

    if (categoriaSelect) {
      categoriaSelect.addEventListener("change", () => {
        const categoria = categoriaSelect.value;
        cargarPlanificadorDesdeCategoria(categoria);
        renderCategoria();
      });
    }

    if (partidoSelect) partidoSelect.addEventListener("change", cargarPartidoSeleccionado);
    if (botonGuardar) botonGuardar.addEventListener("click", guardarResultado);
    if (botonResetear) botonResetear.addEventListener("click", resetearResultado);

    if (abrirResultadosBtn) {
      abrirResultadosBtn.addEventListener("click", () => {
        const clave = window.prompt("Ingresá la clave para habilitar carga de resultados:");
        if (clave === RESULTADOS_PASSWORD) {
          abrirResultadosSesion();
          if (mensajeEstado) mensajeEstado.textContent = "Carga habilitada.";
        } else if (clave !== null) {
          if (mensajeEstado) mensajeEstado.textContent = "Clave incorrecta.";
        }
      });
    }

    if (cerrarResultadosBtn) {
      cerrarResultadosBtn.addEventListener("click", () => {
        cerrarResultadosSesion();
        if (mensajeEstado) mensajeEstado.textContent = "Carga cerrada.";
      });
    }

    if (abrirGestionBtn) {
      abrirGestionBtn.addEventListener("click", () => {
        const clave = window.prompt("Ingresá la clave de administrador:");
        if (clave === ADMIN_PASSWORD) {
          abrirGestionSesion();
          if (mensajeGestion) mensajeGestion.textContent = "Gestión habilitada.";
        } else if (clave !== null) {
          if (mensajeGestion) mensajeGestion.textContent = "Clave incorrecta.";
        }
      });
    }

    if (cerrarGestionBtn) {
      cerrarGestionBtn.addEventListener("click", () => {
        cerrarGestionSesion();
        if (mensajeGestion) mensajeGestion.textContent = "Gestión cerrada.";
      });
    }

    if (plannerCategoria) {
      plannerCategoria.addEventListener("change", () => {
        cargarPlanificadorDesdeCategoria(plannerCategoria.value);
      });
    }

    if (plannerBotonGenerar) plannerBotonGenerar.addEventListener("click", generarTorneoDesdePlanificador);
    if (botonAcomodar) botonAcomodar.addEventListener("click", acomodarFixtureCategoria);
    if (botonExportarPDF) botonExportarPDF.addEventListener("click", exportarPDF);

    if (botonExportarRespaldo) botonExportarRespaldo.addEventListener("click", exportarRespaldo);

    if (botonImportarRespaldo && inputImportarRespaldo) {
      botonImportarRespaldo.addEventListener("click", () => inputImportarRespaldo.click());
      inputImportarRespaldo.addEventListener("change", (event) => {
        importarRespaldoDesdeArchivo(event.target.files?.[0]);
        event.target.value = "";
      });
    }
  }

  function init() {
    if (!categoriaSelect) {
      console.error("No se encontró el HTML completo de la app.");
      return;
    }

    inicializarEventos();
    actualizarEstadoAccesos();
    cargarPlanificadorDesdeCategoria(categoriaSelect.value || "Maxi +35 A");
    renderCategoria();
    mostrarLiga();
    console.log("[Liga Maxi] App inicializada correctamente.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
