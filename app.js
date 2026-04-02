// app.js completo final para la versión estable de mañana

if (window.__APP_LIGA_MAXI__) {
  console.warn("[Liga Maxi] app ya inicializada. Se evita segunda ejecución.");
} else {
  window.__APP_LIGA_MAXI__ = true;

  console.log("[Liga Maxi] Inicio de app.js");

  // =========================
  // SUPABASE (preparado, no crítico para mañana)
  // =========================
  const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
  const SUPABASE_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";

  let supabase = null;

  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log("[Liga Maxi] Cliente Supabase OK");
    } else {
      console.warn("[Liga Maxi] Supabase no cargó");
    }
  } catch (error) {
    console.warn("[Liga Maxi] Error al crear cliente Supabase:", error);
  }

  // =========================
  // CONSTANTES Y STORAGE
  // =========================
  const STORAGE_KEY = "liga_maxi_app_estable_v1";
  const ADMIN_PASSWORD = "admin123";
  const RESULTADOS_PASSWORD = "resultados123";

  const SESSION_GESTION_KEY = "ligaMaxiGestionOpen";
  const SESSION_RESULTADOS_KEY = "ligaMaxiResultadosOpen";

  // =========================
  // DOM
  // =========================
  const categoriaSelect = document.getElementById("categoria-select");
  const tablaBody = document.getElementById("tabla-body");
  const fixtureBody = document.getElementById("fixture-body");
  const playoffBody = document.getElementById("playoff-body");

  const tabLiga = document.getElementById("tab-liga");
  const tabGestion = document.getElementById("tab-gestion");
  const vistaLiga = document.getElementById("vista-liga");
  const vistaGestion = document.getElementById("vista-gestion");

  const abrirResultadosBtn = document.getElementById("abrir-resultados-btn");
  const cerrarResultadosBtn = document.getElementById("cerrar-resultados-btn");
  const resultadosBloqueado = document.getElementById("resultados-bloqueado");
  const resultadosPanel = document.getElementById("resultados-panel");
  const mensajeEstado = document.getElementById("mensaje-estado");

  const gestionBloqueadaCard = document.getElementById("gestion-bloqueada-card");
  const gestionContenido = document.getElementById("gestion-contenido");
  const abrirGestionBtn = document.getElementById("abrir-gestion-btn");
  const cerrarGestionBtn = document.getElementById("cerrar-gestion-btn");
  const mensajeGestion = document.getElementById("mensaje-gestion");

  // =========================
  // DATOS DE TORNEO
  // =========================
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

  const configuracionTorneos = {
    "Maxi +35 A": {
      competencia: "Apertura",
      ruedas: 1,
      diaJuego: 0, // domingo
      inicio: "2026-04-12",
      fechasBloqueadas: ["2026-05-03"],
      playoffs: { cantidad: 8, descripcion: "Top 8" }
    },
    "Maxi +35 B": {
      competencia: "Apertura",
      ruedas: 1,
      diaJuego: 0, // domingo
      inicio: "2026-04-12",
      fechasBloqueadas: ["2026-05-03"],
      playoffs: { cantidad: 8, descripcion: "Top 8" }
    },
    "Maxi +48": {
      competencia: "Apertura",
      ruedas: 1,
      diaJuego: 3, // miércoles
      inicio: "2026-04-15",
      fechasBloqueadas: [],
      playoffs: { cantidad: 6, descripcion: "Top 6" }
    },
    "Femenino": {
      competencia: "Apertura",
      ruedas: 1,
      diaJuego: 0,
      inicio: "2026-04-12",
      fechasBloqueadas: ["2026-05-03"],
      playoffs: { cantidad: 4, descripcion: "Top 4" }
    }
  };

  // =========================
  // ESTADO
  // =========================
  let state = cargarEstado();

  function crearEstadoInicial() {
    const fixtures = {};
    const resultados = {};

    Object.keys(categorias).forEach((categoria) => {
      fixtures[categoria] = generarFixtureCategoria(categoria);
      resultados[categoria] = {};
    });

    return { fixtures, resultados };
  }

  function cargarEstado() {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (!guardado) return crearEstadoInicial();

    try {
      const data = JSON.parse(guardado);
      if (!data.fixtures || !data.resultados) return crearEstadoInicial();

      // Si falta alguna categoría nueva, la agregamos
      Object.keys(categorias).forEach((categoria) => {
        if (!data.fixtures[categoria]) data.fixtures[categoria] = generarFixtureCategoria(categoria);
        if (!data.resultados[categoria]) data.resultados[categoria] = {};
      });

      return data;
    } catch (error) {
      console.error("[Liga Maxi] Error leyendo storage:", error);
      return crearEstadoInicial();
    }
  }

  function guardarEstado() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // =========================
  // SESIONES
  // =========================
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

  // =========================
  // UTILIDADES
  // =========================
  function fechaAISO(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  }

  function parseISOToLocalDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatearFecha(iso) {
    if (!iso) return "";
    const fecha = parseISOToLocalDate(iso);
    return fecha.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function capitalizar(texto) {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function diaJuegoATexto(dia) {
    return Number(dia) === 3 ? "Miércoles" : "Domingo";
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getCategoriaActual() {
    return categoriaSelect ? categoriaSelect.value : "Maxi +35 A";
  }

  function getResultadoKey(partido) {
    return `${partido.jornada}__${partido.local}__${partido.visitante}`;
  }

  function getPartidosJugables(categoria) {
    return (state.fixtures[categoria] || []).filter((p) => p.visitante !== "LIBRE");
  }

  function getResultadoPartido(categoria, partido) {
    const key = getResultadoKey(partido);
    return state.resultados[categoria]?.[key] || null;
  }

  function setResultadoPartido(categoria, partido, puntosLocal, puntosVisitante) {
    const key = getResultadoKey(partido);
    if (!state.resultados[categoria]) state.resultados[categoria] = {};
    state.resultados[categoria][key] = {
      puntosLocal: Number(puntosLocal),
      puntosVisitante: Number(puntosVisitante)
    };
    guardarEstado();
  }

  function resetResultadoPartido(categoria, partido) {
    const key = getResultadoKey(partido);
    if (state.resultados[categoria]) {
      delete state.resultados[categoria][key];
      guardarEstado();
    }
  }

  // =========================
  // FIXTURE AUTOMÁTICO
  // =========================
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
            visitante: "LIBRE"
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
            visitante: equipoVisitante
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

  function obtenerFechasRegulares(categoria, cantidadFechas) {
    const config = configuracionTorneos[categoria];
    const fechas = [];
    const bloqueadas = new Set(config.fechasBloqueadas || []);
    const actual = parseISOToLocalDate(config.inicio);

    while (fechas.length < cantidadFechas) {
      const iso = fechaAISO(actual);
      if (!bloqueadas.has(iso)) {
        fechas.push(iso);
      }
      actual.setDate(actual.getDate() + 7);
    }

    return fechas;
  }

  function generarFixtureCategoria(categoria) {
    const equipos = categorias[categoria] || [];
    const rondas = generarRoundRobin(equipos);
    const maxFecha = Math.max(...rondas.map((p) => p.jornada));
    const fechas = obtenerFechasRegulares(categoria, maxFecha);

    return rondas.map((partido) => ({
      ...partido,
      fecha: partido.visitante === "LIBRE" ? "" : (fechas[partido.jornada - 1] || "")
    }));
  }

  // =========================
  // TABLA
  // =========================
  function calcularTabla(categoria) {
    const equipos = categorias[categoria] || [];
    const tabla = {};

    equipos.forEach((equipo) => {
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

    (state.fixtures[categoria] || []).forEach((partido) => {
      if (partido.visitante === "LIBRE") return;

      const resultado = getResultadoPartido(categoria, partido);
      if (!resultado) return;

      const local = tabla[partido.local];
      const visitante = tabla[partido.visitante];
      if (!local || !visitante) return;

      local.pj += 1;
      visitante.pj += 1;

      local.gf += resultado.puntosLocal;
      local.gc += resultado.puntosVisitante;
      visitante.gf += resultado.puntosVisitante;
      visitante.gc += resultado.puntosLocal;

      if (resultado.puntosLocal > resultado.puntosVisitante) {
        local.pg += 1;
        visitante.pp += 1;
        local.pts += 2;
        visitante.pts += 1;
      } else if (resultado.puntosVisitante > resultado.puntosLocal) {
        visitante.pg += 1;
        local.pp += 1;
        visitante.pts += 2;
        local.pts += 1;
      } else {
        // Si alguna vez cargás empate, no rompe
        local.pts += 1;
        visitante.pts += 1;
      }
    });

    const resultado = Object.values(tabla);
    resultado.forEach((equipo) => {
      equipo.df = equipo.gf - equipo.gc;
    });

    resultado.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.df !== a.df) return b.df - a.df;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.equipo.localeCompare(b.equipo, "es");
    });

    return resultado;
  }

  // =========================
  // RENDER
  // =========================
  function mostrarLiga() {
    if (vistaLiga) vistaLiga.style.display = "block";
    if (vistaGestion) vistaGestion.style.display = "none";

    if (tabLiga) tabLiga.classList.add("activo");
    if (tabGestion) tabGestion.classList.remove("activo");
  }

  function mostrarGestion() {
    if (vistaLiga) vistaLiga.style.display = "none";
    if (vistaGestion) vistaGestion.style.display = "block";

    if (tabLiga) tabLiga.classList.remove("activo");
    if (tabGestion) tabGestion.classList.add("activo");
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

    const partidos = state.fixtures[categoria] || [];
    const jornadas = agruparPorJornada(partidos);

    fixtureBody.innerHTML = jornadas.map(([jornada, lista]) => `
      <div class="card" style="margin-bottom:12px;">
        <h4>Fecha ${jornada}${lista[0]?.fecha ? ` — ${capitalizar(formatearFecha(lista[0].fecha))}` : ""}</h4>
        <div>
          ${lista.map((partido) => {
            if (partido.visitante === "LIBRE") {
              return `<p>• ${partido.local} - LIBRE</p>`;
            }

            const resultado = getResultadoPartido(categoria, partido);
            const marcador = resultado
              ? `${resultado.puntosLocal} - ${resultado.puntosVisitante}`
              : "Pendiente";

            return `<p>• ${partido.local} vs ${partido.visitante} — ${marcador}</p>`;
          }).join("")}
        </div>
      </div>
    `).join("");
  }

  function renderPlayoffs(categoria) {
    if (!playoffBody) return;

    const playoff = configuracionTorneos[categoria].playoffs;

    if (categoria === "Maxi +48") {
      playoffBody.innerHTML = `
        <div class="card">
          <h4>Playoffs ${playoff.descripcion}</h4>
          <ul>
            <li>1° y 2° pasan directo a semifinales</li>
            <li>3° vs 6°</li>
            <li>4° vs 5°</li>
            <li>Semifinal 1: 1° vs ganador 4°/5°</li>
            <li>Semifinal 2: 2° vs ganador 3°/6°</li>
            <li>Final</li>
          </ul>
        </div>
      `;
      return;
    }

    if (categoria === "Maxi +35 A" || categoria === "Maxi +35 B") {
      playoffBody.innerHTML = `
        <div class="card">
          <h4>Playoffs ${playoff.descripcion}</h4>
          <ul>
            <li>1° vs 8°</li>
            <li>4° vs 5°</li>
            <li>2° vs 7°</li>
            <li>3° vs 6°</li>
            <li>Semifinales</li>
            <li>Final</li>
          </ul>
        </div>
      `;
      return;
    }

    playoffBody.innerHTML = `
      <div class="card">
        <h4>Playoffs ${playoff.descripcion}</h4>
        <p>Clasifican ${playoff.cantidad} equipos.</p>
      </div>
    `;
  }

  function renderGestionContenido() {
    if (!gestionContenido) return;

    const categoria = getCategoriaActual();
    const config = configuracionTorneos[categoria];
    const tabla = calcularTabla(categoria);
    const top = tabla.slice(0, Math.min(config.playoffs.cantidad, tabla.length));

    gestionContenido.innerHTML = `
      <div class="card">
        <h4>Resumen de torneo</h4>
        <p><strong>Categoría:</strong> ${categoria}</p>
        <p><strong>Competencia:</strong> ${config.competencia}</p>
        <p><strong>Ruedas:</strong> ${config.ruedas}</p>
        <p><strong>Día de juego:</strong> ${diaJuegoATexto(config.diaJuego)}</p>
        <p><strong>Playoffs:</strong> ${config.playoffs.descripcion}</p>
      </div>

      <div class="card">
        <h4>Clasificados actuales</h4>
        <ol>
          ${top.map((equipo) => `<li>${equipo.equipo} (${equipo.pts} pts)</li>`).join("")}
        </ol>
      </div>
    `;
  }

  function renderResultadosPanel() {
    if (!resultadosPanel) return;

    const categoria = getCategoriaActual();
    const partidos = getPartidosJugables(categoria);

    resultadosPanel.innerHTML = `
      <div class="card">
        <h4>Cargar resultado</h4>

        <label for="partido-select">Partido</label>
        <select id="partido-select">
          ${partidos.map((partido, index) => {
            const resultado = getResultadoPartido(categoria, partido);
            const marcador = resultado
              ? ` (${resultado.puntosLocal}-${resultado.puntosVisitante})`
              : "";
            return `
              <option value="${index}">
                Fecha ${partido.jornada}: ${partido.local} vs ${partido.visitante}${marcador}
              </option>
            `;
          }).join("")}
        </select>

        <div style="margin-top:12px;">
          <label for="puntos-local">Puntos local</label>
          <input id="puntos-local" type="number" min="0" style="display:block; margin-bottom:8px;">

          <label for="puntos-visitante">Puntos visitante</label>
          <input id="puntos-visitante" type="number" min="0" style="display:block; margin-bottom:12px;">
        </div>

        <button id="guardar-resultado">Guardar resultado</button>
        <button id="resetear-resultado" type="button">Volver a pendiente</button>
      </div>
    `;

    const partidoSelectLocal = document.getElementById("partido-select");
    const puntosLocalInput = document.getElementById("puntos-local");
    const puntosVisitanteInput = document.getElementById("puntos-visitante");
    const botonGuardarLocal = document.getElementById("guardar-resultado");
    const botonResetearLocal = document.getElementById("resetear-resultado");

    function cargarSeleccion() {
      const idx = Number(partidoSelectLocal.value);
      const partido = partidos[idx];
      if (!partido) {
        puntosLocalInput.value = "";
        puntosVisitanteInput.value = "";
        return;
      }

      const resultado = getResultadoPartido(categoria, partido);
      puntosLocalInput.value = resultado ? resultado.puntosLocal : "";
      puntosVisitanteInput.value = resultado ? resultado.puntosVisitante : "";
    }

    partidoSelectLocal.addEventListener("change", cargarSeleccion);

    botonGuardarLocal.addEventListener("click", () => {
      const idx = Number(partidoSelectLocal.value);
      const partido = partidos[idx];
      if (!partido) return;

      const pl = Number(puntosLocalInput.value);
      const pv = Number(puntosVisitanteInput.value);

      if (Number.isNaN(pl) || Number.isNaN(pv)) {
        if (mensajeEstado) mensajeEstado.textContent = "Ingresá ambos puntajes.";
        return;
      }

      setResultadoPartido(categoria, partido, pl, pv);

      if (mensajeEstado) mensajeEstado.textContent = "Resultado guardado.";
      renderTodo();
    });

    botonResetearLocal.addEventListener("click", () => {
      const idx = Number(partidoSelectLocal.value);
      const partido = partidos[idx];
      if (!partido) return;

      resetResultadoPartido(categoria, partido);

      if (mensajeEstado) mensajeEstado.textContent = "Partido vuelto a pendiente.";
      renderTodo();
    });

    cargarSeleccion();
  }

  function renderTodo() {
    const categoria = getCategoriaActual();
    renderTabla(categoria);
    renderFixture(categoria);
    renderPlayoffs(categoria);
    renderGestionContenido();
    if (resultadosAbiertos()) {
      renderResultadosPanel();
    }
  }

  // =========================
  // EVENTOS
  // =========================
  function bindEventos() {
    if (tabLiga) tabLiga.addEventListener("click", mostrarLiga);

    if (tabGestion) {
      tabGestion.addEventListener("click", () => {
        mostrarGestion();
        renderGestionContenido();
        if (resultadosAbiertos()) renderResultadosPanel();
      });
    }

    if (categoriaSelect) {
      categoriaSelect.addEventListener("change", () => {
        renderTodo();
        if (vistaGestion && vistaGestion.style.display !== "none") {
          renderGestionContenido();
          if (resultadosAbiertos()) renderResultadosPanel();
        }
      });
    }

    if (abrirGestionBtn) {
      abrirGestionBtn.addEventListener("click", () => {
        const clave = window.prompt("Ingresá la clave de administrador:");
        if (clave === ADMIN_PASSWORD) {
          abrirGestionSesion();
          if (mensajeGestion) mensajeGestion.textContent = "Gestión habilitada.";
          renderGestionContenido();
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

    if (abrirResultadosBtn) {
      abrirResultadosBtn.addEventListener("click", () => {
        const clave = window.prompt("Ingresá la clave para habilitar carga de resultados:");
        if (clave === RESULTADOS_PASSWORD) {
          abrirResultadosSesion();
          if (mensajeEstado) mensajeEstado.textContent = "Carga habilitada.";
          renderResultadosPanel();
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
  }

  // =========================
  // INIT
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    bindEventos();
    actualizarEstadoAccesos();
    renderTodo();
    mostrarLiga();

    console.log("[Liga Maxi] DOM listo");
  });
}