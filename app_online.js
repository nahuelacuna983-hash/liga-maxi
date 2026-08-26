console.log("APP ONLINE NUEVA CARGADA");
const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";
const TORNEO_ID_FALLBACK = "7d0971e3-66ee-4791-bcbf-bace1d2fefb9";
let TORNEO_ID = TORNEO_ID_FALLBACK;
const APP_PUBLIC_URL = "https://nahuelacuna983-hash.github.io/liga-maxi/";
let deferredInstallPrompt = null;

const APP_CONFIG = {
  producto: {
    nombre: "Gestor de Torneos",
    subtitulo: "Plataforma operativa para torneos, documentación, resultados y programación.",
    storageRoot: "gestor-torneos"
  },
  organizacionActiva: {
    id: "apdb",
    nombre: "APdB",
    torneoLabel: "Liga Maxi",
    storageSlug: "apdb"
  }
};

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIAS_BASE = [
  { nombre: "Femenino" },
  { nombre: "Maxi +35 A" },
  { nombre: "Maxi +35 B" },
  { nombre: "Maxi +48" }
];

const estado = {
  torneoActivo: null,
  torneoTrabajo: null,
  categorias: [],
  partidosPorCategoria: {},
  playoffsPorCategoria: {},
  programacionPorCategoriaId: {},
  equiposPorCategoriaId: {},
  requisitosDocumentales: [],
  documentosPorCategoriaId: {},
  jugadoresPorCategoriaId: {},
  documentosJugadoresPorCategoriaId: {},
  driveDocumentosPorCategoriaId: {},
  auditoriaDocumentalPorCategoriaId: {},
  filasDocumentacionAsociacion: [],
  eventosUso: [],
  ultimaSimulacionPlanner: null,
  publicoCargaActual: 0,
  publicacionFixtureEnCurso: false,
  delegadoDesbloqueado: false,
  delegado: null,
  asociacionDesbloqueada: false,
  usuarioAsociacion: null,
  authSession: null,
  authUser: null,
  permisosAuth: [],
  asociacionInicializada: false
};

function $(id) {
  return document.getElementById(id);
}

function aplicarConfiguracionVisual() {
  const producto = APP_CONFIG.producto;
  const organizacion = APP_CONFIG.organizacionActiva;
  const titulo = `${producto.nombre} · ${organizacion.nombre}`;

  document.title = titulo;

  const appTitle = $("app-title");
  if (appTitle) appTitle.textContent = titulo;

  const appSubtitle = $("app-subtitle");
  if (appSubtitle) {
    appSubtitle.textContent = `${organizacion.torneoLabel} · ${producto.subtitulo}`;
  }
}

function setStatus(element, text, kind = "") {
  if (!element) return;
  element.textContent = text || "";
  element.className = `status${kind ? " " + kind : ""}`;
}

function claveCachePublica(tipo, nombreCategoria) {
  return `${APP_CONFIG.producto.storageRoot}_${APP_CONFIG.organizacionActiva.id}_${tipo}_${slugify(nombreCategoria || "general")}`;
}

function claveProgramacionEmailDestino() {
  return `${APP_CONFIG.producto.storageRoot}_${APP_CONFIG.organizacionActiva.id}_programacion_email_destino`;
}

function claveSimulacionesPlanner() {
  return `${APP_CONFIG.producto.storageRoot}_${APP_CONFIG.organizacionActiva.id}_planner_simulaciones`;
}

function leerCachePublica(tipo, nombreCategoria, maxEdadMs = 10 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(claveCachePublica(tipo, nombreCategoria));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > maxEdadMs) return null;
    return parsed.data || null;
  } catch (error) {
    return null;
  }
}

function guardarCachePublica(tipo, nombreCategoria, data) {
  try {
    localStorage.setItem(claveCachePublica(tipo, nombreCategoria), JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (error) {
    // Si el navegador no permite guardar cache, la app sigue funcionando online.
  }
}

async function cargarTorneoActivo() {
  const { data: torneosTrabajo, error: errorTrabajo } = await supabaseClient
    .from("torneos")
    .select("id, nombre, temporada, tipo, estado")
    .eq("estado", "activo")
    .order("created_at", { ascending: false })
    .limit(1);

  if (errorTrabajo) {
    console.warn("No se pudo cargar torneo de trabajo:", errorTrabajo.message);
  }

  estado.torneoTrabajo = torneosTrabajo?.[0] || null;

  const { data: torneosVisibles, error: errorVisibles } = await supabaseClient
    .from("torneos")
    .select("id, nombre, temporada, tipo, estado")
    .in("estado", ["publicado", "en_juego"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (errorVisibles) {
    console.warn("No se pudo cargar torneo visible:", errorVisibles.message);
  }

  let torneo = torneosVisibles?.[0] || null;
  if (!torneo && estado.torneoTrabajo?.id) {
    const partidosTrabajo = await contarPartidosTorneo(estado.torneoTrabajo.id);
    if (partidosTrabajo > 0) {
      torneo = estado.torneoTrabajo;
    }
  }

  if (!torneo) {
    const { data: fallback, error: errorFallback } = await supabaseClient
      .from("torneos")
      .select("id, nombre, temporada, tipo, estado")
      .eq("id", TORNEO_ID_FALLBACK)
      .maybeSingle();

    if (errorFallback) {
      console.warn("No se pudo cargar torneo fallback:", errorFallback.message);
    }
    torneo = fallback || null;
  }

  if (torneo?.id) {
    const torneoAnterior = TORNEO_ID;
    TORNEO_ID = torneo.id;
    estado.torneoActivo = torneo;
    if (torneoAnterior !== TORNEO_ID) {
      estado.partidosPorCategoria = {};
      estado.playoffsPorCategoria = {};
      estado.programacionPorCategoriaId = {};
    }
    APP_CONFIG.organizacionActiva.torneoLabel = [torneo.nombre, torneo.temporada].filter(Boolean).join(" · ");
    aplicarConfiguracionVisual();
  }

  return estado.torneoActivo;
}

async function contarPartidosTorneo(torneoId) {
  if (!torneoId) return 0;

  const { data: categorias, error: errorCategorias } = await supabaseClient
    .from("categorias")
    .select("id")
    .eq("torneo_id", torneoId);

  if (errorCategorias) {
    console.warn("No se pudieron contar categorias del torneo:", errorCategorias.message);
    return 0;
  }

  const ids = (categorias || []).map((cat) => cat.id).filter(Boolean);
  if (!ids.length) return 0;

  const { count, error } = await supabaseClient
    .from("partidos")
    .select("id", { count: "exact", head: true })
    .in("categoria_id", ids);

  if (error) {
    console.warn("No se pudieron contar partidos del torneo:", error.message);
    return 0;
  }

  return count || 0;
}

function obtenerSesionUso() {
  const key = `${APP_CONFIG.producto.storageRoot}_${APP_CONFIG.organizacionActiva.id}_usage_session_id`;
  let sessionId = "";

  try {
    sessionId = localStorage.getItem(key) || "";
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, sessionId);
    }
  } catch (error) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  return sessionId;
}

function obtenerTipoDispositivo() {
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  if (width <= 640) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

async function registrarUso(eventType, detalle = {}) {
  try {
    await supabaseClient
      .from("app_usage_events")
      .insert({
        event_type: eventType,
        area: detalle.area || null,
        categoria_nombre: detalle.categoria || null,
        equipo_nombre: detalle.equipo || null,
        user_role: detalle.role || estado.delegado?.rol || estado.usuarioAsociacion?.role || null,
        user_label: detalle.user || estado.delegado?.nombre || estado.usuarioAsociacion?.display_name || null,
        session_id: obtenerSesionUso(),
        device_type: obtenerTipoDispositivo(),
        path: window.location.pathname || "/",
        user_agent: navigator.userAgent || null
      });
  } catch (error) {
    console.warn("No se pudo registrar uso:", error.message);
  }
}

function contarEventos(filas, filtro) {
  return filas.filter(filtro).length;
}

function fechaLocalCorta(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function topEventos(filas, campo, limite = 5) {
  const conteo = {};

  filas.forEach((fila) => {
    const valor = fila[campo] || "Sin dato";
    conteo[valor] = (conteo[valor] || 0) + 1;
  });

  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limite);
}

function mostrarVista(nombre) {
  if (nombre === "asociacion") {
    inicializarNavegacionAsociacion();
  }
  if (nombre === "acceso") {
    renderAccesoApp();
  }

  const tabs = {
    publico: $("tab-publico"),
    fecha: $("tab-fecha"),
    acceso: $("tab-acceso"),
    delegados: $("tab-delegados"),
    asociacion: $("tab-asociacion")
  };

  const views = {
    publico: $("vista-publico"),
    fecha: $("vista-fecha"),
    acceso: $("vista-acceso"),
    delegados: $("vista-delegados"),
    asociacion: $("vista-asociacion")
  };

  Object.entries(tabs).forEach(([key, btn]) => {
    if (btn) btn.classList.toggle("activo", key === nombre);
  });

  Object.entries(views).forEach(([key, view]) => {
    if (view) view.classList.toggle("activa", key === nombre);
  });
}

function urlPublicaApp() {
  if (location.protocol === "http:" || location.protocol === "https:") {
    return APP_PUBLIC_URL;
  }
  return APP_PUBLIC_URL;
}

function renderAccesoApp() {
  const url = urlPublicaApp();
  const link = $("access-app-url");
  const qr = $("access-qr");
  const installButton = $("access-install-app");

  if (link) link.textContent = url;
  if (qr) {
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`;
  }
  if (installButton) {
    installButton.disabled = !deferredInstallPrompt;
    installButton.textContent = deferredInstallPrompt ? "Instalar app" : "Instalar desde navegador";
  }
}

async function copiarLinkAccesoApp() {
  const status = $("access-status");
  const url = urlPublicaApp();
  try {
    await navigator.clipboard.writeText(url);
    setStatus(status, "Link copiado. Ya podés pegarlo en WhatsApp, mail o redes.", "ok");
  } catch (error) {
    setStatus(status, `No se pudo copiar automaticamente. Link: ${url}`, "warn");
  }
}

function abrirLinkAccesoApp() {
  window.open(urlPublicaApp(), "_blank", "noopener");
}

async function instalarAccesoApp() {
  const status = $("access-status");
  if (!deferredInstallPrompt) {
    setStatus(status, "Si el botón no instala, usá el menú del navegador: Agregar a pantalla principal o Instalar app.", "warn");
    return;
  }

  deferredInstallPrompt.prompt();
  const resultado = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  renderAccesoApp();
  setStatus(
    status,
    resultado?.outcome === "accepted"
      ? "Instalacion iniciada."
      : "Instalacion cancelada. Podés intentarlo de nuevo desde el navegador.",
    resultado?.outcome === "accepted" ? "ok" : "warn"
  );
}

function obtenerParametrosVista() {
  const params = new URLSearchParams(window.location.search);
  const vista = params.get("vista") || "publico";
  return {
    categoria: params.get("categoria") || params.get("cat") || "",
    vista: ["publico", "fecha"].includes(vista) ? vista : "publico"
  };
}

function normalizarCategoriaUrl(value) {
  return normalizarTexto(value || "")
    .replace(/\+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolverCategoriaUrl(categorias, categoriaUrl) {
  if (!categoriaUrl) return "";
  const buscada = normalizarCategoriaUrl(categoriaUrl);
  return (categorias || []).find((cat) => normalizarCategoriaUrl(cat.nombre) === buscada)?.nombre || "";
}

function actualizarUrlCategoria(categoria, vista = "publico") {
  if (!window.history?.replaceState) return;

  const url = new URL(window.location.href);
  if (categoria) url.searchParams.set("categoria", categoria);
  if (vista && vista !== "publico") {
    url.searchParams.set("vista", vista);
  } else {
    url.searchParams.delete("vista");
  }
  window.history.replaceState({}, "", url);
}

function aplicarBloqueoDelegado() {
  const enabled = !!estado.delegadoDesbloqueado;

  if ($("delegado-categoria")) $("delegado-categoria").disabled = !enabled;
  if ($("delegado-partido")) $("delegado-partido").disabled = !enabled;
  if ($("delegado-puntos-local")) $("delegado-puntos-local").disabled = !enabled;
  if ($("delegado-puntos-visitante")) $("delegado-puntos-visitante").disabled = !enabled;
  if ($("delegado-guardar")) $("delegado-guardar").disabled = !enabled;
}

function aplicarBloqueoAsociacion() {
  const enabled = !!estado.asociacionDesbloqueada;
  const view = $("vista-asociacion");
  if (!view) return;

  view.classList.toggle("asociacion-locked", !enabled);

  view.querySelectorAll("input, select, button").forEach((element) => {
    const isAccessControl = element.id === "asociacion-clave" || element.id === "asociacion-desbloquear";
    if (!isAccessControl) element.disabled = !enabled;
  });
}

function panelPrincipalAsociacion(panel = "documentacion") {
  if (panel === "habilitados") return "documentacion";
  if (panel === "auditoria-documental") return "documentacion";
  if (panel === "informes" || panel === "cierres") return "operacion";
  if (panel === "uso") return "permisos";
  return panel;
}

function panelActualAsociacion() {
  return document.querySelector(".assoc-panel.activa")?.dataset.asociacionPanelView || "";
}

function mostrarPanelAsociacion(panel = "documentacion") {
  const panelPrincipal = panelPrincipalAsociacion(panel);
  document.querySelectorAll(".assoc-nav-btn").forEach((button) => {
    button.classList.toggle("activo", button.dataset.asociacionPanel === panelPrincipal);
  });

  document.querySelectorAll(".assoc-panel").forEach((section) => {
    section.classList.toggle("activa", section.dataset.asociacionPanelView === panel);
  });

  if (panel === "uso" && estado.asociacionDesbloqueada) {
    actualizarEstadisticasUso();
  }
  if (panel === "inicio" && estado.asociacionDesbloqueada) {
    renderInicioAsociacion($("asociacion-categoria")?.value || "");
  }
  if (panel === "habilitados" && estado.asociacionDesbloqueada) {
    renderListaHabilitadosArbitros($("asociacion-categoria")?.value || "");
  }
  if (panel === "auditoria-documental" && estado.asociacionDesbloqueada) {
    renderAuditoriaDocumentalAsociacion($("asociacion-categoria")?.value || "");
  }
  if (panel === "cierres" && estado.asociacionDesbloqueada) {
    renderCierreAsociacion($("asociacion-categoria")?.value || "");
  }
}

function renderInicioAsociacion(nombreCategoria) {
  const resumen = $("asociacion-inicio-resumen");
  const alertas = $("asociacion-inicio-alertas");
  if (!resumen || !alertas) return;

  if (!nombreCategoria) {
    resumen.innerHTML = "";
    alertas.innerHTML = `<div class="empty">Elegi una categoria para ver el estado operativo.</div>`;
    return;
  }

  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const partidosJugados = partidos.filter(partidoTieneResultado).length;
  const partidosPendientes = partidos.length - partidosJugados;
  const filasProgramacion = obtenerFilasProgramacion(nombreCategoria);
  const programacionSinDatos = filasProgramacion.filter((fila) => !filaProgramacionLista(fila)).length;
  const programacionEnviada = filasProgramacion.filter((fila) => fila.estado === "enviado" || fila.estado === "confirmado").length;
  const documentosEquipo = categoria ? estado.documentosPorCategoriaId[categoria.id] || [] : [];
  const documentosJugador = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
  const docsSinAprobar = documentosEquipo
    .concat(documentosJugador)
    .filter((doc) => (doc.status || "pendiente") !== "aprobado").length;
  const habilitados = calcularHabilitadosCategoria(nombreCategoria);
  const habilitadosSi = habilitados.filter((fila) => fila.habilitado === "SI").length;
  const habilitadosNo = habilitados.filter((fila) => fila.habilitado !== "SI").length;
  const cierre = calcularEstadoCierreTorneo(nombreCategoria);

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${partidosPendientes}</strong><span>Partidos pendientes</span></div>
    <div class="doc-pill ${programacionSinDatos ? "doc-pill-alert" : ""}"><strong>${programacionSinDatos}</strong><span>Sin programar</span></div>
    <div class="doc-pill"><strong>${programacionEnviada}</strong><span>Informados</span></div>
    <div class="doc-pill ${docsSinAprobar ? "doc-pill-alert" : ""}"><strong>${docsSinAprobar}</strong><span>Docs sin aprobar</span></div>
    <div class="doc-pill"><strong>${habilitadosSi}</strong><span>Habilitados</span></div>
    <div class="doc-pill ${habilitadosNo ? "doc-pill-alert" : ""}"><strong>${habilitadosNo}</strong><span>No habilitados</span></div>
    <div class="doc-pill ${cierre.listoParaCerrar ? "" : "doc-pill-alert"}"><strong>${cierre.listoParaCerrar ? "Si" : "No"}</strong><span>Listo para cierre</span></div>
  `;

  const items = [];
  if (partidosPendientes) items.push(`Quedan ${partidosPendientes} partido(s) de fase regular sin resultado.`);
  if (cierre.playoffsPendientes) items.push(`Quedan ${cierre.playoffsPendientes} partido(s) de playoffs sin resultado.`);
  if (programacionSinDatos) items.push(`Hay ${programacionSinDatos} partido(s) sin dia, hora o cancha.`);
  if (docsSinAprobar) items.push(`Hay ${docsSinAprobar} documento(s) pendientes de aprobacion.`);
  if (habilitadosNo) items.push(`Hay ${habilitadosNo} jugador(es) no habilitados o con requisitos faltantes.`);
  if (!items.length) items.push("No se detectan alertas principales para esta categoria.");

  alertas.innerHTML = `
    <div class="assoc-detail-box">
      <h3>Alertas operativas</h3>
      <ul class="assoc-home-alerts">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function inicializarNavegacionAsociacion() {
  const view = $("vista-asociacion");
  if (!view || view.dataset.navReady === "true") return;

  view.dataset.navReady = "true";
  view.addEventListener("click", (event) => {
    const button = event.target.closest(".assoc-nav-btn");
    if (!button) return;

    mostrarPanelAsociacion(button.dataset.asociacionPanel || "documentacion");
  });

  view.addEventListener("click", (event) => {
    const button = event.target.closest(".assoc-shortcut-btn");
    if (!button) return;

    mostrarPanelAsociacion(button.dataset.asociacionShortcut || "inicio");
  });

  mostrarPanelAsociacion("inicio");
}

async function cargarCategorias() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("id, nombre, torneo_id, estado, formato, playoffs, clasificados, dia_juego, fecha_inicio, fecha_fin, frecuencia, fechas_bloqueadas, series_playoff")
    .eq("torneo_id", TORNEO_ID)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  }

  const categorias = deduplicarCategoriasPorNombre(data || []);
  const conteoPartidos = await contarPartidosPorCategoria(categorias.map((cat) => cat.id));
  const categoriasConPartidos = categorias.filter((cat) => (conteoPartidos[cat.id] || 0) > 0);
  estado.categorias = categoriasConPartidos.length ? categoriasConPartidos : categorias;
  guardarCachePublica("categorias", TORNEO_ID, estado.categorias);
  return estado.categorias;
}

async function contarPartidosPorCategoria(categoriaIds) {
  const ids = (categoriaIds || []).filter(Boolean);
  if (!ids.length) return {};

  const { data, error } = await supabaseClient
    .from("partidos")
    .select("categoria_id")
    .in("categoria_id", ids);

  if (error) {
    console.warn("No se pudieron contar partidos por categoria:", error.message);
    return {};
  }

  return (data || []).reduce((acc, partido) => {
    acc[partido.categoria_id] = (acc[partido.categoria_id] || 0) + 1;
    return acc;
  }, {});
}

function deduplicarCategoriasPorNombre(categorias) {
  const vistas = new Set();

  return (categorias || []).filter((cat) => {
    const key = normalizarTexto(cat.nombre || "");
    if (!key || vistas.has(key)) return false;
    vistas.add(key);
    return true;
  });
}

function poblarSelectCategorias(selectId, categorias) {
  const select = $(selectId);
  if (!select) return;

  select.innerHTML = "";

  deduplicarCategoriasPorNombre(categorias || []).forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.nombre;
    option.textContent = cat.nombre;
    select.appendChild(option);
  });
}

const DELEGADOS = {
  "admin123": {
    nombre: "ADMIN",
    categorias: ["Femenino", "Maxi +35 A", "Maxi +35 B", "Maxi +48"],
    equipos: [
      "UNIVERSAL",
      "MERIDIANO V",
      "UNION VECINAL",
      "VILLA SAN CARLOS",
      "BANCO PROVINCIA",
      "U.N.L.P.",
      "TOLOSANO",
      "MAYO",
      "HOGAR SOCIAL",
      "SUD AMERICA",
      "GONNET",
      "ESTUDIANTES",
      "MAX NORDAU",
      "LOS HORNOS",
      "RECONQUISTA",
      "JUVENTUD",
      "ESTRELLA DE BERISSO",
      "MACABI",
      "UNIDOS DEL DIQUE",
      "VILLA ELISA",
      "PLATENSE",
      "ASTILLERO",
      "SAN VICENTE"
    ]
  },

  "universal123": {
    nombre: "UNIVERSAL",
    categorias: ["Maxi +35 A", "Femenino"],
    equipos: ["UNIVERSAL"]
  },
  "meridiano123": {
    nombre: "MERIDIANO V",
    categorias: ["Maxi +35 A", "Maxi +48"],
    equipos: ["MERIDIANO V"]
  },
  "union123": {
    nombre: "UNION VECINAL",
    categorias: ["Maxi +35 A"],
    equipos: ["UNION VECINAL"]
  },
  "vsc123": {
    nombre: "VILLA SAN CARLOS",
    categorias: ["Maxi +35 A", "Maxi +48"],
    equipos: ["VILLA SAN CARLOS"]
  },
  "banco123": {
    nombre: "BANCO PROVINCIA",
    categorias: ["Maxi +35 A"],
    equipos: ["BANCO PROVINCIA"]
  },
  "unlp123": {
    nombre: "U.N.L.P.",
    categorias: ["Maxi +35 A"],
    equipos: ["U.N.L.P."]
  },
  "tolosano123": {
    nombre: "TOLOSANO",
    categorias: ["Maxi +35 A"],
    equipos: ["TOLOSANO"]
  },
  "mayo123": {
    nombre: "MAYO",
    categorias: ["Maxi +35 A"],
    equipos: ["MAYO"]
  },
  "hogar123": {
    nombre: "HOGAR SOCIAL",
    categorias: ["Maxi +35 A", "Maxi +48", "Femenino"],
    equipos: ["HOGAR SOCIAL"]
  },
  "sud123": {
    nombre: "SUD AMERICA",
    categorias: ["Maxi +35 A"],
    equipos: ["SUD AMERICA"]
  },

  "gonnet123": {
    nombre: "GONNET",
    categorias: ["Maxi +35 B", "Femenino"],
    equipos: ["GONNET"]
  },
  "estudiantes123": {
    nombre: "ESTUDIANTES",
    categorias: ["Maxi +35 B", "Maxi +48"],
    equipos: ["ESTUDIANTES"]
  },
  "max123": {
    nombre: "MAX NORDAU",
    categorias: ["Maxi +35 B", "Femenino"],
    equipos: ["MAX NORDAU"]
  },
  "hornos123": {
    nombre: "LOS HORNOS",
    categorias: ["Maxi +35 B"],
    equipos: ["LOS HORNOS"]
  },
  "reconquista123": {
    nombre: "RECONQUISTA",
    categorias: ["Maxi +35 B"],
    equipos: ["RECONQUISTA"]
  },
  "juventud123": {
    nombre: "JUVENTUD",
    categorias: ["Maxi +35 B", "Maxi +48"],
    equipos: ["JUVENTUD"]
  },
  "estrella123": {
    nombre: "ESTRELLA DE BERISSO",
    categorias: ["Maxi +35 B"],
    equipos: ["ESTRELLA DE BERISSO"]
  },
  "macabi123": {
    nombre: "MACABI",
    categorias: ["Maxi +35 B", "Femenino"],
    equipos: ["MACABI"]
  },
  "unidos123": {
    nombre: "UNIDOS DEL DIQUE",
    categorias: ["Maxi +35 B"],
    equipos: ["UNIDOS DEL DIQUE"]
  },
  "velisa123": {
    nombre: "VILLA ELISA",
    categorias: ["Maxi +35 B", "Maxi +48"],
    equipos: ["VILLA ELISA"]
  },

  "platense123": {
    nombre: "PLATENSE",
    categorias: ["Maxi +48", "Femenino"],
    equipos: ["PLATENSE"]
  },

  "astillerofem123": {
    nombre: "ASTILLERO",
    categorias: ["Femenino"],
    equipos: ["ASTILLERO"]
  },
  "estrellafem123": {
    nombre: "ESTRELLA DE BERISSO",
    categorias: ["Femenino"],
    equipos: ["ESTRELLA DE BERISSO"]
  },
  "sanvicentefem123": {
    nombre: "SAN VICENTE",
    categorias: ["Femenino"],
    equipos: ["SAN VICENTE"]
  }
};

const CLAVES_ASOCIACION = ["admin123"];

function validarDelegado(clave) {
  const claveLimpia = String(clave || "").trim();
  return DELEGADOS[claveLimpia] || null;
}

async function cargarPermisosPorClave(clave) {
  const claveLimpia = String(clave || "").trim();
  if (!claveLimpia) return [];

  const { data, error } = await supabaseClient
    .from("v_app_user_permissions")
    .select("display_name, role, legacy_key, active, emergency_access, categoria_nombre, equipo_nombre, can_load_results, can_load_documents, can_review_documents, can_correct_results, can_manage_tournaments, can_manage_users, can_emergency_override")
    .eq("legacy_key", claveLimpia);

  if (error) {
    console.warn("No se pudieron cargar permisos de usuario:", error.message);
    return [];
  }

  return (data || []).filter((permiso) => permiso.active !== false);
}

async function cargarPermisosUsuarioActual() {
  const { data, error } = await supabaseClient.rpc("get_current_app_user_permissions");
  if (error) {
    console.warn("No se pudieron cargar permisos por Auth:", error.message);
    return [];
  }

  return (data || []).filter((permiso) => permiso.active !== false);
}

function delegadoDesdePermisos(permisos, respaldo = null) {
  if (!permisos.length) return respaldo;

  const rol = permisos[0].role;
  if (rol === "admin_general") {
    return {
      ...(respaldo || DELEGADOS.admin123),
      nombre: permisos[0].display_name || respaldo?.nombre || "ADMIN",
      rol,
      permisos
    };
  }

  if (rol !== "delegado") return respaldo;

  const categorias = Array.from(new Set([
    ...(respaldo?.categorias || []),
    ...permisos.map((permiso) => permiso.categoria_nombre).filter(Boolean)
  ]));
  const equipos = Array.from(new Set([
    ...(respaldo?.equipos || []),
    ...permisos.map((permiso) => permiso.equipo_nombre).filter(Boolean)
  ]));

  if (!categorias.length || !equipos.length) return respaldo;

  return {
    nombre: permisos[0].display_name || respaldo?.nombre || "Delegado",
    categorias,
    equipos,
    rol,
    permisos
  };
}

async function validarDelegadoConPermisos(clave) {
  const respaldo = validarDelegado(clave);
  const permisos = await cargarPermisosPorClave(clave);
  return delegadoDesdePermisos(permisos, respaldo);
}

function puedeAccederAsociacion(permisos) {
  return permisos.some((permiso) =>
    permiso.role === "admin_general" ||
    permiso.role === "asociacion" ||
    permiso.can_review_documents ||
    permiso.can_correct_results ||
    permiso.can_manage_tournaments ||
    permiso.can_emergency_override
  );
}

const DOCUMENTOS_REQUERIDOS = [
  "Lista de buena fe",
  "Certificado medico",
  "Seguro",
  "Declaracion jurada",
  "Imagenes para redes",
  "Pase"
];

const DOCUMENTOS_POR_JUGADOR = [
  "certificado medico",
  "declaracion jurada",
  "pase"
];

const DOCUMENTOS_MULTIPLE_ARCHIVO = [
  "imagenes para redes"
];

const DOCUMENTOS_JUGADOR_NO_BLOQUEANTES = [
  "pase"
];

const ESCUDOS_EQUIPOS = {
  "astillero": "assets/escudos/astillero.png",
  "banco provincia": "assets/escudos/banco-provincia.png",
  "estrella de berisso": "assets/escudos/estrella-berisso.jpeg",
  "estudiantes": "assets/escudos/estudiantes.png",
  "gonnet": "assets/escudos/gonnet.png",
  "hogar social": "assets/escudos/hogar-social.png",
  "juventud": "assets/escudos/juventud.png",
  "los hornos": "assets/escudos/los-hornos.png",
  "macabi": "assets/escudos/macabi.png",
  "max nordau": "assets/escudos/max-nordau.jpeg",
  "mayo": "assets/escudos/mayo.png",
  "meridiano v": "assets/escudos/meridiano-v.png",
  "platense": "assets/escudos/platense.png",
  "reconquista": "assets/escudos/reconquista.png",
  "sud america": "assets/escudos/sud-america.png",
  "sud américa": "assets/escudos/sud-america.png",
  "san vicente": "assets/escudos/san-vicente.jpeg",
  "tolosano": "assets/escudos/tolosano.png",
  "u.n.l.p": "assets/escudos/unlp.png",
  "u.n.l.p.": "assets/escudos/unlp.png",
  "unidos del dique": "assets/escudos/unidos-del-dique.png",
  "union vecinal": "assets/escudos/union-vecinal.png",
  "unión vecinal": "assets/escudos/union-vecinal.png",
  "unon vecinal": "assets/escudos/union-vecinal.png",
  "universal": "assets/escudos/universal.png",
  "villa elisa": "assets/escudos/villa-elisa.jpg",
  "villa san carlos": "assets/escudos/villa-san-carlos.png"
};

function obtenerDocumentosRequeridos() {
  if (estado.requisitosDocumentales.length) {
    return estado.requisitosDocumentales.map((requisito) => requisito.nombre);
  }

  return DOCUMENTOS_REQUERIDOS;
}

function esDocumentoPorJugador(nombre) {
  const requisito = obtenerRequisitoDocumental(nombre);
  if (requisito?.scope) return requisito.scope === "player";

  const normalized = normalizarTexto(nombre);
  return DOCUMENTOS_POR_JUGADOR.some((documento) => normalized.includes(documento));
}

function obtenerDocumentosEquipo() {
  return obtenerDocumentosRequeridos().filter((nombre) => !esDocumentoPorJugador(nombre));
}

function obtenerDocumentosJugador() {
  return obtenerDocumentosRequeridos().filter(esDocumentoPorJugador);
}

function permiteMultiplesArchivos(nombre) {
  const requisito = obtenerRequisitoDocumental(nombre);
  if (typeof requisito?.allows_multiple_files === "boolean") {
    return requisito.allows_multiple_files;
  }

  const normalized = normalizarTexto(nombre);
  return DOCUMENTOS_MULTIPLE_ARCHIVO.some((documento) => normalized.includes(documento));
}

function esDocumentoJugadorBloqueante(nombre) {
  const normalized = normalizarTexto(nombre);
  return !DOCUMENTOS_JUGADOR_NO_BLOQUEANTES.some((documento) => normalized.includes(documento));
}

function obtenerRequisitoDocumental(nombre) {
  return estado.requisitosDocumentales.find((requisito) =>
    normalizarTexto(requisito.nombre) === normalizarTexto(nombre)
  ) || null;
}

async function cargarRequisitosDocumentales() {
  const { data, error } = await supabaseClient
    .from("document_requirements")
    .select("id, nombre, categoria_id, obligatorio, requiere_vencimiento, activo, scope, allows_multiple_files")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.warn("No se pudieron cargar requisitos documentales:", error.message);
    estado.requisitosDocumentales = [];
    return estado.requisitosDocumentales;
  }

  estado.requisitosDocumentales = data || [];
  return estado.requisitosDocumentales;
}

async function cargarEquiposCategoria(categoriaId) {
  if (!categoriaId) return [];

  if (estado.equiposPorCategoriaId[categoriaId]) {
    return estado.equiposPorCategoriaId[categoriaId];
  }

  const { data, error } = await supabaseClient
    .from("equipos")
    .select("id, nombre, categoria_id, activo")
    .eq("categoria_id", categoriaId)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.warn("No se pudieron cargar equipos documentales:", error.message);
    estado.equiposPorCategoriaId[categoriaId] = [];
    return estado.equiposPorCategoriaId[categoriaId];
  }

  estado.equiposPorCategoriaId[categoriaId] = data || [];
  return estado.equiposPorCategoriaId[categoriaId];
}

async function cargarDocumentosCategoria(categoriaId, force = false) {
  if (!categoriaId) return [];

  if (!force && estado.documentosPorCategoriaId[categoriaId]) {
    return estado.documentosPorCategoriaId[categoriaId];
  }

  const { data, error } = await supabaseClient
    .from("v_team_documents_admin")
    .select("id, requirement_id, requirement_nombre, categoria_id, equipo_id, equipo_nombre, status, vencimiento, observacion, storage_path, file_name, file_type, file_size")
    .eq("categoria_id", categoriaId);

  if (error) {
    console.warn("No se pudieron cargar documentos por equipo:", error.message);
    estado.documentosPorCategoriaId[categoriaId] = [];
    return estado.documentosPorCategoriaId[categoriaId];
  }

  estado.documentosPorCategoriaId[categoriaId] = data || [];
  return estado.documentosPorCategoriaId[categoriaId];
}

async function cargarJugadoresCategoria(categoriaId, force = false) {
  if (!categoriaId) return [];

  if (!force && estado.jugadoresPorCategoriaId[categoriaId]) {
    return estado.jugadoresPorCategoriaId[categoriaId];
  }

  const { data, error } = await supabaseClient
    .from("v_player_documents_admin")
    .select("*")
    .eq("categoria_id", categoriaId)
    .order("equipo_nombre", { ascending: true })
    .order("jugador_nombre", { ascending: true });

  if (error) {
    console.warn("No se pudieron cargar jugadores documentales:", error.message);
    estado.jugadoresPorCategoriaId[categoriaId] = [];
    return estado.jugadoresPorCategoriaId[categoriaId];
  }

  estado.jugadoresPorCategoriaId[categoriaId] = normalizarJugadoresDesdeDocumentos(data || []);
  return estado.jugadoresPorCategoriaId[categoriaId];
}

async function cargarDocumentosJugadoresCategoria(categoriaId, force = false) {
  if (!categoriaId) return [];

  if (!force && estado.documentosJugadoresPorCategoriaId[categoriaId]) {
    return estado.documentosJugadoresPorCategoriaId[categoriaId];
  }

  const { data, error } = await supabaseClient
    .from("v_player_documents_admin")
    .select("*")
    .eq("categoria_id", categoriaId);

  if (error) {
    console.warn("No se pudieron cargar documentos por jugador:", error.message);
    estado.documentosJugadoresPorCategoriaId[categoriaId] = [];
    return estado.documentosJugadoresPorCategoriaId[categoriaId];
  }

  estado.documentosJugadoresPorCategoriaId[categoriaId] = data || [];
  if (!estado.jugadoresPorCategoriaId[categoriaId]?.length) {
    estado.jugadoresPorCategoriaId[categoriaId] = normalizarJugadoresDesdeDocumentos(data || []);
  }
  return estado.documentosJugadoresPorCategoriaId[categoriaId];
}

async function cargarDocumentosDriveCategoria(categoriaId, force = false) {
  if (!categoriaId) return [];

  if (!force && estado.driveDocumentosPorCategoriaId[categoriaId]) {
    return estado.driveDocumentosPorCategoriaId[categoriaId];
  }

  const { data, error } = await supabaseClient
    .from("v_drive_player_documents_admin")
    .select("id, categoria_id, equipo_id, equipo_nombre, player_id, player_name, player_dni, player_dorsal, document_type, title, drive_file_id, drive_url, mime_type, status, observation, match_status, source_folder, reviewed_by, reviewed_at, created_at")
    .eq("categoria_id", categoriaId)
    .order("match_status", { ascending: false })
    .order("player_name", { ascending: true });

  if (error) {
    console.warn("No se pudieron cargar metadatos documentales de Drive:", error.message);
    estado.driveDocumentosPorCategoriaId[categoriaId] = [];
    estado.driveDocumentosError = error.message;
    return estado.driveDocumentosPorCategoriaId[categoriaId];
  }

  estado.driveDocumentosError = "";
  estado.driveDocumentosPorCategoriaId[categoriaId] = data || [];
  return estado.driveDocumentosPorCategoriaId[categoriaId];
}

async function cargarAuditoriaDocumentalCategoria(categoriaId, force = false) {
  if (!categoriaId) return [];

  if (!force && estado.auditoriaDocumentalPorCategoriaId[categoriaId]) {
    return estado.auditoriaDocumentalPorCategoriaId[categoriaId];
  }

  const { data, error } = await supabaseClient
    .from("v_document_audit_results_admin")
    .select("id, categoria_id, categoria_nombre, equipo_nombre, player_name, alcance, planilla_arbitro, document_type, declared_status, located_status, validated_status, valid_until, audit_status, risk_level, risk_order, observation, evidence_url, source_sheet, cutoff_date, created_at")
    .eq("categoria_id", categoriaId)
    .order("risk_order", { ascending: true })
    .order("equipo_nombre", { ascending: true })
    .order("player_name", { ascending: true });

  if (error) {
    console.warn("No se pudo cargar auditoria documental:", error.message);
    estado.auditoriaDocumentalPorCategoriaId[categoriaId] = [];
    estado.auditoriaDocumentalError = error.message;
    return estado.auditoriaDocumentalPorCategoriaId[categoriaId];
  }

  estado.auditoriaDocumentalError = "";
  estado.auditoriaDocumentalPorCategoriaId[categoriaId] = data || [];
  return estado.auditoriaDocumentalPorCategoriaId[categoriaId];
}

function normalizarJugadoresDesdeDocumentos(rows) {
  const jugadoresMap = new Map();

  rows.forEach((row) => {
    if (!row.player_id || jugadoresMap.has(row.player_id)) return;

    jugadoresMap.set(row.player_id, {
      id: row.player_id,
      categoria_id: row.categoria_id,
      equipo_id: row.equipo_id,
      equipo_nombre: row.equipo_nombre,
      nombre: row.jugador_nombre,
      dni: row.jugador_dni,
      dorsal: row.jugador_dorsal,
      activo: true,
      baja_solicitada: !!row.baja_solicitada,
      baja_motivo: row.baja_motivo || "",
      baja_solicitada_por: row.baja_solicitada_por || "",
      baja_solicitada_en: row.baja_solicitada_en || ""
    });
  });

  return Array.from(jugadoresMap.values())
    .sort((a, b) =>
      String(a.equipo_nombre || "").localeCompare(String(b.equipo_nombre || "")) ||
      String(a.nombre || "").localeCompare(String(b.nombre || ""))
    );
}

function docStateHtml(text = "Pendiente", status = "") {
  const className = `doc-state ${status ? `doc-state-${status}` : ""}`.trim();
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

function normalizarTexto(value) {
  return String(value || "").trim().toLowerCase();
}

function nombresEquipoCoinciden(a, b) {
  const uno = normalizarTexto(a);
  const dos = normalizarTexto(b);
  if (!uno || !dos) return false;
  return uno === dos || uno.includes(dos) || dos.includes(uno);
}

function escudoEquipoUrl(equipo) {
  return ESCUDOS_EQUIPOS[normalizarTexto(equipo)] || "";
}

function inicialesEquipo(equipo) {
  return String(equipo || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function escudoEquipoHtml(equipo, size = "sm") {
  const url = escudoEquipoUrl(equipo);
  const nombre = escapeHtml(equipo);

  if (url) {
    return `<span class="team-crest team-crest-${size}"><img src="${escapeHtml(url)}" alt="${nombre}" loading="lazy"></span>`;
  }

  return `<span class="team-crest team-crest-${size} team-crest-fallback">${escapeHtml(inicialesEquipo(equipo))}</span>`;
}

function nombreEquipoHtml(equipo, size = "sm") {
  return `<span class="team-name-with-crest">${escudoEquipoHtml(equipo, size)}<span>${escapeHtml(equipo)}</span></span>`;
}

function obtenerDocumentoEquipo(nombreCategoria, equipo, requisito) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const documentos = categoria ? estado.documentosPorCategoriaId[categoria.id] || [] : [];
  const requisitoNormalizado = normalizarTexto(requisito);

  return documentos.find((documento) =>
    nombresEquipoCoinciden(documento.equipo_nombre, equipo) &&
    normalizarTexto(documento.requirement_nombre) === requisitoNormalizado
  ) || null;
}

function obtenerDocumentoPorId(documentId) {
  const documentos = Object.values(estado.documentosPorCategoriaId).flat();
  return documentos.find((documento) => documento.id === documentId) || null;
}

function obtenerJugadorPorId(playerId) {
  const jugadores = Object.values(estado.jugadoresPorCategoriaId).flat();
  return jugadores.find((jugador) => jugador.id === playerId) || null;
}

function obtenerJugadoresEquipo(nombreCategoria, equipo) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const jugadoresCache = categoria ? estado.jugadoresPorCategoriaId[categoria.id] || [] : [];
  const documentosJugador = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
  const jugadoresPorDocumentos = normalizarJugadoresDesdeDocumentos(
    documentosJugador.filter((documento) =>
      nombresEquipoCoinciden(documento.equipo_nombre, equipo)
    )
  );
  const jugadores = jugadoresPorDocumentos.length ? jugadoresPorDocumentos : jugadoresCache;

  return jugadores.filter((jugador) =>
    nombresEquipoCoinciden(jugador.equipo_nombre, equipo)
  );
}

function normalizarDocumentoIdentidad(value) {
  return String(value || "").replace(/\D/g, "");
}

function jugadorYaExiste(categoriaNombre, equipoNombre, nombre, dni, dorsal) {
  const jugadores = obtenerJugadoresEquipo(categoriaNombre, equipoNombre);
  const nombreNormalizado = normalizarTexto(nombre);
  const dniNormalizado = normalizarDocumentoIdentidad(dni);
  const dorsalNormalizado = normalizarTexto(dorsal);

  return jugadores.some((jugador) => {
    const mismoDni = dniNormalizado && normalizarDocumentoIdentidad(jugador.dni) === dniNormalizado;
    const mismoNombre = normalizarTexto(jugador.nombre) === nombreNormalizado;
    const mismoDorsal = dorsalNormalizado && normalizarTexto(jugador.dorsal) === dorsalNormalizado;

    return mismoDni || (mismoNombre && (!dorsalNormalizado || mismoDorsal));
  });
}

function obtenerDocumentoJugadorPorId(documentId) {
  const documentos = Object.values(estado.documentosJugadoresPorCategoriaId).flat();
  return documentos.find((documento) => documento.id === documentId) || null;
}

function obtenerDocumentoJugador(nombreCategoria, playerId, requisito) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const documentos = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
  const requisitoNormalizado = normalizarTexto(requisito);

  return documentos.find((documento) =>
    documento.player_id === playerId &&
    normalizarTexto(documento.requirement_nombre) === requisitoNormalizado
  ) || null;
}

function buscarDocumentoEquipoPorTerminos(nombreCategoria, equipo, terminos) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const documentos = categoria ? estado.documentosPorCategoriaId[categoria.id] || [] : [];
  const terminosNormalizados = terminos.map(normalizarTexto);
  return documentos.find((documento) =>
    nombresEquipoCoinciden(documento.equipo_nombre, equipo) &&
    terminosNormalizados.some((termino) => normalizarTexto(documento.requirement_nombre).includes(termino))
  ) || null;
}

function buscarDocumentoJugadorPorTerminos(nombreCategoria, playerId, terminos) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const documentos = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
  const terminosNormalizados = terminos.map(normalizarTexto);
  return documentos.find((documento) =>
    documento.player_id === playerId &&
    terminosNormalizados.some((termino) => normalizarTexto(documento.requirement_nombre).includes(termino))
  ) || null;
}

function documentoAprobadoVigente(documento) {
  if (!documento || documento.status !== "aprobado") return false;
  return estadoVencimientoDocumento(documento) !== "vencido";
}

function siNoDocumento(documento) {
  return documentoAprobadoVigente(documento) ? "SI" : "NO";
}

function estadoCeldaHabilitado(valor) {
  return `<span class="doc-state doc-state-${valor === "SI" ? "aprobado" : "rechazado"}">${escapeHtml(valor)}</span>`;
}

function calcularEstadoHabilitacionJugador(nombreCategoria, jugador) {
  const buenaFe = buscarDocumentoEquipoPorTerminos(nombreCategoria, jugador.equipo_nombre, ["buena fe"]);
  const seguro = buscarDocumentoEquipoPorTerminos(nombreCategoria, jugador.equipo_nombre, ["seguro"]);
  const certificado = buscarDocumentoJugadorPorTerminos(nombreCategoria, jugador.id, ["certificado", "estudio"]);
  const deslinde = buscarDocumentoJugadorPorTerminos(nombreCategoria, jugador.id, ["declaracion", "deslinde"]);
  const pase = buscarDocumentoJugadorPorTerminos(nombreCategoria, jugador.id, ["pase"]);
  const estados = {
    buenaFe: siNoDocumento(buenaFe),
    seguro: siNoDocumento(seguro),
    certificado: siNoDocumento(certificado),
    deslinde: siNoDocumento(deslinde),
    pase: siNoDocumento(pase)
  };
  const faltantes = [
    estados.buenaFe === "SI" ? "" : "Lista de buena fe",
    estados.seguro === "SI" ? "" : "Seguro",
    estados.certificado === "SI" ? "" : "Certificado/estudio",
    estados.deslinde === "SI" ? "" : "Deslinde/declaracion jurada"
  ].filter(Boolean);

  return {
    ...estados,
    habilitado: faltantes.length ? "NO" : "SI",
    faltantes: faltantes.join("; ")
  };
}

function calcularHabilitadosCategoria(nombreCategoria) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const jugadores = categoria ? estado.jugadoresPorCategoriaId[categoria.id] || [] : [];
  const equipoFiltro = $("habilitados-filtro-equipo")?.value || "";
  const estadoFiltro = $("habilitados-filtro-estado")?.value || "";
  const partidoFiltro = $("habilitados-filtro-partido")?.value || "";
  const partidoFiltroDatos = obtenerPartidoHabilitadosSeleccionado(nombreCategoria, partidoFiltro);
  const equiposPartido = partidoFiltroDatos
    ? [partidoFiltroDatos.local, partidoFiltroDatos.visitante].filter(Boolean)
    : [];

  return jugadores
    .filter((jugador) => {
      if (equiposPartido.length) {
        return equiposPartido.some((equipo) => nombresEquipoCoinciden(jugador.equipo_nombre, equipo));
      }
      return !equipoFiltro || nombresEquipoCoinciden(jugador.equipo_nombre, equipoFiltro);
    })
    .map((jugador) => {
      const estadoHabilitacion = calcularEstadoHabilitacionJugador(nombreCategoria, jugador);

      return {
        categoria: nombreCategoria,
        equipo: jugador.equipo_nombre || "",
        apellidoNombre: jugador.nombre || "",
        dni: jugador.dni || "",
        dorsal: jugador.dorsal || "",
        ...estadoHabilitacion
      };
    })
    .filter((fila) => !estadoFiltro || fila.habilitado === estadoFiltro)
    .sort((a, b) =>
      String(a.equipo).localeCompare(String(b.equipo)) ||
      String(a.apellidoNombre).localeCompare(String(b.apellidoNombre))
    );
}

function obtenerPartidoHabilitadosSeleccionado(nombreCategoria, partidoId = "") {
  if (!partidoId) return null;
  return (estado.partidosPorCategoria[nombreCategoria] || []).find((partido) => String(partido.id) === String(partidoId)) || null;
}

function actualizarFiltroPartidosHabilitados(nombreCategoria) {
  const select = $("habilitados-filtro-partido");
  if (!select) return;
  const valorActual = select.value;
  const partidos = (estado.partidosPorCategoria[nombreCategoria] || [])
    .filter((partido) => partido.id && partido.local && partido.visitante)
    .sort((a, b) =>
      Number(a.jornada || 0) - Number(b.jornada || 0) ||
      String(a.fecha || "").localeCompare(String(b.fecha || "")) ||
      String(a.local || "").localeCompare(String(b.local || ""))
    );

  select.innerHTML = `<option value="">Todos los partidos</option>${partidos.map((partido) => {
    const fecha = partido.fecha ? ` - ${fechaPartidoLabel(partido.fecha)}` : "";
    return `<option value="${escapeHtml(partido.id)}">Fecha ${escapeHtml(partido.jornada || "-")}${escapeHtml(fecha)} - ${escapeHtml(partido.local)} vs ${escapeHtml(partido.visitante)}</option>`;
  }).join("")}`;

  if (partidos.some((partido) => String(partido.id) === String(valorActual))) {
    select.value = valorActual;
  }
}

function actualizarFiltroEquiposHabilitados(nombreCategoria) {
  const select = $("habilitados-filtro-equipo");
  if (!select) return;
  const valorActual = select.value;
  const equipos = obtenerEquiposCategoria(nombreCategoria);
  select.innerHTML = `<option value="">Elegir club</option>${equipos.map((equipo) =>
    `<option value="${escapeHtml(equipo)}">${escapeHtml(equipo)}</option>`
  ).join("")}`;
  if (equipos.some((equipo) => nombresEquipoCoinciden(equipo, valorActual))) {
    select.value = valorActual;
  }
}

function equipoOperativoSeleccionado() {
  return $("habilitados-filtro-equipo")?.value || "";
}

function resumenHabilitadosPorEquipo(filas) {
  const mapa = new Map();
  filas.forEach((fila) => {
    const key = fila.equipo || "Sin equipo";
    if (!mapa.has(key)) {
      mapa.set(key, { equipo: key, total: 0, habilitados: 0, noHabilitados: 0 });
    }
    const item = mapa.get(key);
    item.total += 1;
    if (fila.habilitado === "SI") item.habilitados += 1;
    else item.noHabilitados += 1;
  });

  return Array.from(mapa.values()).sort((a, b) => String(a.equipo).localeCompare(String(b.equipo)));
}

function renderSelectorHabilitadosPorEquipo(filas, estadoFiltro) {
  const resumen = resumenHabilitadosPorEquipo(filas);
  const totalJugadores = filas.length;
  const totalHabilitados = filas.filter((fila) => fila.habilitado === "SI").length;

  return `
    <div class="card habilitados-panel">
      <div class="habilitados-head">
        <div>
          <h3>Habilitados para arbitros</h3>
          <p class="note">${totalHabilitados} habilitado${totalHabilitados === 1 ? "" : "s"} de ${totalJugadores} jugador${totalJugadores === 1 ? "" : "es"}${estadoFiltro ? ` - filtro ${escapeHtml(estadoFiltro)}` : ""}. Elegi un club para ver habilitados, documentos y auditoria sin mezclar equipos.</p>
        </div>
      </div>
      <div class="habilitados-team-grid">
        ${resumen.map((item) => `
          <button class="habilitados-team-card ${item.noHabilitados ? "habilitados-team-card-warn" : "habilitados-team-card-ok"}" type="button" data-habilitados-equipo="${escapeHtml(item.equipo)}">
            <strong>${escapeHtml(item.equipo)}</strong>
            <span>${item.habilitados}/${item.total} habilitados</span>
            ${item.noHabilitados ? `<small>${item.noHabilitados} con faltantes</small>` : `<small>Completo</small>`}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderVistaRapidaHabilitados(filas) {
  const habilitados = filas.filter((fila) => fila.habilitado === "SI").length;
  const noHabilitados = filas.length - habilitados;

  return `
    <div class="habilitados-quick">
      <div class="habilitados-quick-summary">
        <div class="habilitados-counter habilitados-counter-ok">
          <strong>${habilitados}</strong>
          <span>Habilitados</span>
        </div>
        <div class="habilitados-counter ${noHabilitados ? "habilitados-counter-no" : "habilitados-counter-ok"}">
          <strong>${noHabilitados}</strong>
          <span>No habilitados</span>
        </div>
      </div>
      <div class="habilitados-player-grid">
        ${filas.map((fila) => `
          <div class="habilitados-player-card ${fila.habilitado === "SI" ? "is-ok" : "is-no"}">
            <div class="habilitados-player-main">
              <strong>${escapeHtml(fila.apellidoNombre)}</strong>
              <span>${escapeHtml([fila.dorsal ? `#${fila.dorsal}` : "", fila.dni ? `DNI ${fila.dni}` : ""].filter(Boolean).join(" · ") || "Sin datos")}</span>
            </div>
            <div class="habilitados-player-state">${fila.habilitado === "SI" ? "HABILITADO" : "NO HABILITADO"}</div>
            ${fila.faltantes
              ? `<div class="habilitados-missing">${escapeHtml(fila.faltantes)}</div>`
              : `<div class="habilitados-missing habilitados-missing-ok">Documentacion obligatoria completa</div>`}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderVistaHabilitadosPorPartido(filas, partido) {
  const equipos = [partido.local, partido.visitante].filter(Boolean);

  return `
    <div class="habilitados-match-head">
      <strong>Fecha ${escapeHtml(partido.jornada || "-")} - ${escapeHtml(partido.local)} vs ${escapeHtml(partido.visitante)}</strong>
      <span>${escapeHtml(partido.fecha ? fechaPartidoLabel(partido.fecha) : "Fecha a confirmar")}</span>
    </div>
    <div class="habilitados-match-grid">
      ${equipos.map((equipo) => {
        const jugadoresEquipo = filas.filter((fila) => nombresEquipoCoinciden(fila.equipo, equipo));
        const habilitados = jugadoresEquipo.filter((fila) => fila.habilitado === "SI").length;
        const noHabilitados = jugadoresEquipo.length - habilitados;
        return `
          <section class="habilitados-match-team">
            <div class="habilitados-match-team-title">
              <strong>${escapeHtml(equipo)}</strong>
              <span class="${noHabilitados ? "is-no" : "is-ok"}">${habilitados}/${jugadoresEquipo.length} habilitados</span>
            </div>
            ${renderVistaRapidaHabilitados(jugadoresEquipo)}
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderListaHabilitadosArbitros(nombreCategoria) {
  const container = $("habilitados-tabla");
  if (!container) return;

  actualizarFiltroPartidosHabilitados(nombreCategoria);
  actualizarFiltroEquiposHabilitados(nombreCategoria);
  const filas = calcularHabilitadosCategoria(nombreCategoria);
  const habilitados = filas.filter((fila) => fila.habilitado === "SI").length;
  const equipoFiltro = equipoOperativoSeleccionado();
  const estadoFiltro = $("habilitados-filtro-estado")?.value || "";
  const partidoFiltro = $("habilitados-filtro-partido")?.value || "";
  const partidoSeleccionado = obtenerPartidoHabilitadosSeleccionado(nombreCategoria, partidoFiltro);

  if (!filas.length) {
    container.innerHTML = `
      <div class="card">
        <h3>Habilitados para arbitros</h3>
        <div class="empty">No hay jugadores${estadoFiltro ? ` con estado ${escapeHtml(estadoFiltro)}` : ""}${equipoFiltro ? ` para ${escapeHtml(equipoFiltro)}` : ""}.</div>
      </div>
    `;
    return;
  }

  if (partidoSeleccionado) {
    container.innerHTML = `
      <div class="card habilitados-panel">
        <h3>Habilitados para arbitros</h3>
        <p class="note">${habilitados} habilitado${habilitados === 1 ? "" : "s"} de ${filas.length} jugador${filas.length === 1 ? "" : "es"} para este partido${estadoFiltro ? ` - filtro ${escapeHtml(estadoFiltro)}` : ""}. No expone archivos ni enlaces sensibles.</p>
        ${renderVistaHabilitadosPorPartido(filas, partidoSeleccionado)}
      </div>
    `;
    return;
  }

  if (!equipoFiltro) {
    container.innerHTML = renderSelectorHabilitadosPorEquipo(filas, estadoFiltro);
    return;
  }

  container.innerHTML = `
    <div class="card habilitados-panel">
      <h3>Habilitados para arbitros</h3>
      <p class="note">${habilitados} habilitado${habilitados === 1 ? "" : "s"} de ${filas.length} jugador${filas.length === 1 ? "" : "es"}${equipoFiltro ? ` - ${escapeHtml(equipoFiltro)}` : ""}${estadoFiltro ? ` - filtro ${escapeHtml(estadoFiltro)}` : ""}. Bloquean habilitacion: buena fe, seguro, certificado/estudio y deslinde/declaracion jurada. El pase queda como control informativo para traspasos.</p>
      ${renderVistaRapidaHabilitados(filas)}
      <table class="doc-table habilitados-table">
        <thead>
          <tr>
            <th>Jugador</th>
            <th>DNI</th>
            <th>Nro</th>
            <th>Buena fe</th>
            <th>Seguro</th>
            <th>Estudio/Cert.</th>
            <th>Deslinde</th>
            <th>Pase</th>
            <th>Habilitado</th>
            <th>Faltantes</th>
          </tr>
        </thead>
        <tbody>
          ${filas.map((fila) => `
            <tr class="${fila.habilitado === "SI" ? "habilitados-row-ok" : "habilitados-row-no"}">
              <td>${escapeHtml(fila.apellidoNombre)}</td>
              <td>${escapeHtml(fila.dni)}</td>
              <td>${escapeHtml(fila.dorsal)}</td>
              <td>${estadoCeldaHabilitado(fila.buenaFe)}</td>
              <td>${estadoCeldaHabilitado(fila.seguro)}</td>
              <td>${estadoCeldaHabilitado(fila.certificado)}</td>
              <td>${estadoCeldaHabilitado(fila.deslinde)}</td>
              <td>${estadoCeldaHabilitado(fila.pase)}</td>
              <td>${estadoCeldaHabilitado(fila.habilitado)}</td>
              <td>${escapeHtml(fila.faltantes || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function estadoDocumentoLabel(documento) {
  if (!documento) return "Pendiente";

  const labels = {
    pendiente: "Pendiente",
    cargado: "Cargado",
    observado: "Observado",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    vencido: "Vencido"
  };

  return labels[documento.status] || documento.status || "Pendiente";
}

function estadoDocumentoClase(documento) {
  return normalizarTexto(documento?.status || "pendiente");
}

function formatearFecha(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function diasHastaFecha(value) {
  if (!value) return null;

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;

  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function estadoVencimientoDocumento(documento) {
  const requisito = obtenerRequisitoDocumental(documento?.requirement_nombre);
  if (!requisito?.requiere_vencimiento) return "no_aplica";
  if (!documento?.vencimiento) return "sin_fecha";

  const dias = diasHastaFecha(documento.vencimiento);
  if (dias == null) return "sin_fecha";
  if (dias < 0) return "vencido";
  if (dias <= 30) return "por_vencer";

  return "vigente";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sin-nombre";
}

function nombreArchivoSeguro(value) {
  const nombre = String(value || "documento").trim();
  const partes = nombre.split(".");
  const extension = partes.length > 1 ? partes.pop().toLowerCase() : "";
  const base = slugify(partes.join(".") || nombre);
  return extension ? `${base}.${extension}` : base;
}

function validarArchivoDocumento(file, soloImagenes = false) {
  const tiposPermitidos = soloImagenes
    ? ["image/jpeg", "image/png"]
    : ["application/pdf", "image/jpeg", "image/png"];
  const maxBytes = 10 * 1024 * 1024;

  if (!file) return "Seleccioná un archivo.";
  if (!tiposPermitidos.includes(file.type)) {
    return soloImagenes ? "Formato no permitido. Usá JPG o PNG." : "Formato no permitido. Usá PDF, JPG o PNG.";
  }
  if (file.size > maxBytes) return "El archivo supera 10 MB.";

  return "";
}

function obtenerEquiposCategoria(nombreCategoria) {
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const equiposSupabase = categoria ? estado.equiposPorCategoriaId[categoria.id] || [] : [];

  if (equiposSupabase.length) {
    return equiposSupabase.map((equipo) => equipo.nombre).sort((a, b) => a.localeCompare(b));
  }

  const equipos = new Set();

  partidos.forEach((p) => {
    if (p.local) equipos.add(p.local);
    if (p.visitante) equipos.add(p.visitante);
    if (p.libre) equipos.add(p.libre);
  });

  return Array.from(equipos).sort((a, b) => a.localeCompare(b));
}

function renderDocumentacionAsociacion(nombreCategoria) {
  const resumen = $("documentacion-resumen");
  const tabla = $("documentacion-tabla");

  if (!resumen || !tabla) return;

  const equipoOperativo = equipoOperativoSeleccionado();
  const equiposCategoria = obtenerEquiposCategoria(nombreCategoria);
  const equipos = equipoOperativo
    ? equiposCategoria.filter((equipo) => nombresEquipoCoinciden(equipo, equipoOperativo))
    : [];
  const documentosRequeridos = obtenerDocumentosEquipo();
  const documentosJugador = obtenerDocumentosJugador();
  const filtroEstado = $("documentacion-filtro-estado")?.value || "";
  const filtroVencimiento = $("documentacion-filtro-vencimiento")?.value || "";
  const filtroTexto = normalizarTexto($("documentacion-buscar")?.value || "");
  const documentosJugadoresTodos = estado.documentosJugadoresPorCategoriaId[estado.categorias.find((cat) => cat.nombre === nombreCategoria)?.id] || [];
  const documentosJugadores = equipoOperativo
    ? documentosJugadoresTodos.filter((documento) => nombresEquipoCoinciden(documento.equipo_nombre, equipoOperativo))
    : documentosJugadoresTodos;
  const totalEsperado = equipos.length * documentosRequeridos.length;
  const documentos = equipos.flatMap((equipo) =>
    documentosRequeridos.map((requisito) => obtenerDocumentoEquipo(nombreCategoria, equipo, requisito))
  );
  renderListaHabilitadosArbitros(nombreCategoria);
  const resumenEstados = documentos.reduce((acc, documento) => {
    const status = documento?.status || "pendiente";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const resumenVencimientos = documentos.reduce((acc, documento) => {
    const estadoVencimiento = estadoVencimientoDocumento(documento);
    acc[estadoVencimiento] = (acc[estadoVencimiento] || 0) + 1;
    return acc;
  }, {});

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${equipoOperativo ? 1 : equiposCategoria.length}</strong><span>${equipoOperativo ? "Club" : "Equipos"}</span></div>
    <div class="doc-pill"><strong>${documentosRequeridos.length}</strong><span>Requisitos</span></div>
    <div class="doc-pill"><strong>${documentosJugadores.length}</strong><span>Docs jugador</span></div>
    <div class="doc-pill"><strong>${resumenEstados.pendiente || 0}</strong><span>Pendientes</span></div>
    <div class="doc-pill"><strong>${resumenEstados.cargado || 0}</strong><span>Para revisar</span></div>
    <div class="doc-pill"><strong>${resumenEstados.aprobado || 0}</strong><span>Aprobados</span></div>
    <div class="doc-pill"><strong>${(resumenEstados.observado || 0) + (resumenEstados.rechazado || 0)}</strong><span>Observados/Rechazados</span></div>
    <div class="doc-pill doc-pill-alert"><strong>${(resumenVencimientos.vencido || 0) + (resumenVencimientos.por_vencer || 0)}</strong><span>Vencidos/por vencer</span></div>
    <div class="doc-pill"><strong>${totalEsperado}</strong><span>Total esperado</span></div>
  `;

  if (!equipoOperativo) {
    estado.filasDocumentacionAsociacion = [];
    tabla.innerHTML = `
      <div class="doc-scope-note">
        <strong>Elegí un club operativo</strong>
        <span>La documentación, los jugadores y la lista para árbitros se filtran por el club seleccionado para evitar mezclar planteles.</span>
      </div>
    `;
    return;
  }

  if (!equipos.length) {
    estado.filasDocumentacionAsociacion = [];
    tabla.innerHTML = `<div class="empty">No hay equipos detectados para esta categoría.</div>`;
    return;
  }

  const filas = equipos.flatMap((equipo) =>
    documentosRequeridos.map((requisito) => {
      const documento = obtenerDocumentoEquipo(nombreCategoria, equipo, requisito);
      const status = documento?.status || "pendiente";
      const vencimientoStatus = estadoVencimientoDocumento(documento);
      const textoFila = normalizarTexto([
        equipo,
        requisito,
        documento?.file_name,
        documento?.observacion,
        estadoDocumentoLabel(documento),
        vencimientoStatus
      ].join(" "));

      return {
        equipo,
        requisito,
        documento,
        status,
        vencimientoStatus,
        visible:
          (!filtroEstado || status === filtroEstado) &&
          (!filtroVencimiento || vencimientoStatus === filtroVencimiento) &&
          (!filtroTexto || textoFila.includes(filtroTexto))
      };
    })
  ).filter((fila) => fila.visible);
  estado.filasDocumentacionAsociacion = filas;

  if (!filas.length) {
    tabla.innerHTML = `
      ${renderAvisoDocumentosJugador(documentosJugador)}
      ${renderGestionJugadoresAsociacion(nombreCategoria)}
      ${renderDocumentacionJugadoresAsociacion(nombreCategoria, documentosJugador)}
      <div class="empty">No hay documentos de equipo que coincidan con los filtros.</div>
    `;
    return;
  }

  tabla.innerHTML = `
    ${renderAvisoDocumentosJugador(documentosJugador)}
    ${renderGestionJugadoresAsociacion(nombreCategoria)}
    <table class="doc-table">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>Estado</th>
          <th>Documento</th>
          <th>Archivo</th>
          <th>Vencimiento</th>
          <th>Observacion</th>
          <th>Revision</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map((fila, index) => {
          const equipoAnterior = filas[index - 1]?.equipo;

          return `
            <tr class="${fila.equipo !== equipoAnterior ? "doc-team-start" : ""}">
              <td>${escapeHtml(fila.equipo)}</td>
              <td>${docStateHtml(
                estadoDocumentoLabel(fila.documento),
                estadoDocumentoClase(fila.documento)
              )}</td>
              <td>${escapeHtml(fila.requisito)}</td>
              <td>${fila.documento?.file_name ? `<span class="doc-file-name">${escapeHtml(fila.documento.file_name)}</span>` : `<span class="doc-action-muted">Sin archivo</span>`}</td>
              <td>${renderVencimientoDocumento(fila.documento)}</td>
              <td>${escapeHtml(fila.documento?.observacion || "")}</td>
              <td>${renderAccionRevisionAsociacion(fila.documento)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
    ${renderDocumentacionJugadoresAsociacion(nombreCategoria, documentosJugador)}
  `;
}

function driveDocEstadoLabel(valor) {
  const labels = {
    cargado: "Cargado",
    pendiente: "Pendiente",
    revisar: "Revisar",
    vencido: "Vencido"
  };
  return labels[valor] || valor || "Pendiente";
}

function driveDocMatchLabel(valor) {
  const labels = {
    exacto: "Exacto",
    dudoso: "Dudoso",
    sin_jugador: "Sin jugador",
    sin_asociar: "Sin asociar"
  };
  return labels[valor] || valor || "Sin asociar";
}

function driveDocStateClass(valor) {
  if (valor === "exacto") return "aprobado";
  if (valor === "dudoso" || valor === "revisar" || valor === "sin_jugador") return "observado";
  if (valor === "vencido") return "vencido";
  return "pendiente";
}

function renderDocumentacionDriveAsociacion(nombreCategoria) {
  const resumen = $("drive-doc-resumen");
  const tabla = $("drive-doc-tabla");
  if (!resumen || !tabla) return;

  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const rows = categoria ? estado.driveDocumentosPorCategoriaId[categoria.id] || [] : [];
  const equipoOperativo = equipoOperativoSeleccionado();
  const filtroEstado = $("drive-doc-estado")?.value || "";
  const filtroMatch = $("drive-doc-match")?.value || "";
  const filtroTexto = normalizarTexto($("drive-doc-buscar")?.value || "");

  if (estado.driveDocumentosError) {
    resumen.innerHTML = "";
    tabla.innerHTML = `
      <div class="empty">
        Todavia no esta activa la vista de Drive en Supabase. Ejecuta <strong>docs/ejecutar-en-supabase-documentacion-drive.sql</strong> y luego actualiza esta seccion.
      </div>
    `;
    return;
  }

  const rowsEquipo = equipoOperativo
    ? rows.filter((row) => nombresEquipoCoinciden(row.equipo_nombre, equipoOperativo))
    : rows;

  const filtradas = rowsEquipo.filter((row) => {
    const texto = normalizarTexto([
      row.equipo_nombre,
      row.player_name,
      row.document_type,
      row.title,
      row.observation,
      row.match_status,
      row.status
    ].join(" "));

    return (!filtroEstado || row.status === filtroEstado) &&
      (!filtroMatch || row.match_status === filtroMatch) &&
      (!filtroTexto || texto.includes(filtroTexto));
  });

  const resumenEstados = rowsEquipo.reduce((acc, row) => {
    acc[row.status || "pendiente"] = (acc[row.status || "pendiente"] || 0) + 1;
    acc[row.match_status || "sin_asociar"] = (acc[row.match_status || "sin_asociar"] || 0) + 1;
    return acc;
  }, {});

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${rowsEquipo.length}</strong><span>Drive</span></div>
    <div class="doc-pill"><strong>${resumenEstados.exacto || 0}</strong><span>Exactos</span></div>
    <div class="doc-pill doc-pill-alert"><strong>${(resumenEstados.dudoso || 0) + (resumenEstados.sin_jugador || 0) + (resumenEstados.sin_asociar || 0)}</strong><span>Para revisar</span></div>
    <div class="doc-pill"><strong>${resumenEstados.vencido || 0}</strong><span>Vencidos</span></div>
  `;

  if (!rowsEquipo.length) {
    tabla.innerHTML = `<div class="empty">No hay metadatos de Drive importados para esta categoria.</div>`;
    return;
  }

  if (!filtradas.length) {
    tabla.innerHTML = `<div class="empty">No hay documentos de Drive que coincidan con los filtros.</div>`;
    return;
  }

  tabla.innerHTML = `
    <table class="doc-table drive-doc-table">
      <thead>
        <tr>
          <th>Jugador</th>
          <th>Equipo</th>
          <th>Tipo</th>
          <th>Archivo Drive</th>
          <th>Estado</th>
          <th>Asociacion</th>
          <th>Observacion</th>
          <th>Accion</th>
        </tr>
      </thead>
      <tbody>
        ${filtradas.map((row) => `
          <tr>
            <td>
              <strong>${escapeHtml(row.player_name || "Sin jugador")}</strong>
              ${row.player_dni ? `<small>DNI ${escapeHtml(row.player_dni)}</small>` : ""}
            </td>
            <td>${escapeHtml(row.equipo_nombre || "-")}</td>
            <td>${escapeHtml(row.document_type || "-")}</td>
            <td>
              <span class="doc-file-name">${escapeHtml(row.title || "-")}</span>
              <a class="drive-doc-link" href="${escapeHtml(row.drive_url)}" target="_blank" rel="noopener noreferrer">Ver</a>
            </td>
            <td>${docStateHtml(driveDocEstadoLabel(row.status), driveDocStateClass(row.status))}</td>
            <td>${docStateHtml(driveDocMatchLabel(row.match_status), driveDocStateClass(row.match_status))}</td>
            <td>${escapeHtml(row.observation || "")}</td>
            <td>${renderAccionesDriveDocumento(row)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function auditoriaPrioridadClase(valor) {
  const normalized = normalizarTexto(valor);
  if (normalized.includes("critica") || normalized.includes("crítica")) return "rechazado";
  if (normalized.includes("alta")) return "observado";
  if (normalized.includes("media")) return "cargado";
  if (normalized.includes("validado") || normalized.includes("conforme")) return "aprobado";
  return "pendiente";
}

function poblarFiltroAuditoriaEquipos(rows) {
  const select = $("auditoria-filtro-equipo");
  if (!select) return;

  const valorActual = select.value || "";
  const equipos = Array.from(new Set((rows || []).map((row) => row.equipo_nombre).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  select.innerHTML = `<option value="">Todos los clubes</option>${equipos.map((equipo) =>
    `<option value="${escapeHtml(equipo)}">${escapeHtml(equipo)}</option>`
  ).join("")}`;

  if (equipos.includes(valorActual)) select.value = valorActual;
}

function renderAuditoriaDocumentalAsociacion(nombreCategoria) {
  const resumen = $("auditoria-resumen");
  const tabla = $("auditoria-tabla");
  if (!resumen || !tabla) return;

  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const rows = categoria ? estado.auditoriaDocumentalPorCategoriaId[categoria.id] || [] : [];

  if (estado.auditoriaDocumentalError) {
    resumen.innerHTML = "";
    tabla.innerHTML = `
      <div class="empty">
        Todavia no esta activa la tabla de auditoria documental. Ejecuta <strong>docs/ejecutar-en-supabase-auditoria-documental.sql</strong> y luego importa los datos de la planilla.
      </div>
    `;
    return;
  }

  poblarFiltroAuditoriaEquipos(rows);

  const filtroEquipo = $("auditoria-filtro-equipo")?.value || "";
  const filtroPrioridad = $("auditoria-filtro-prioridad")?.value || "";
  const filtroTexto = normalizarTexto($("auditoria-buscar")?.value || "");
  const filtradas = rows.filter((row) => {
    const texto = normalizarTexto([
      row.equipo_nombre,
      row.player_name,
      row.alcance,
      row.document_type,
      row.audit_status,
      row.risk_level,
      row.observation
    ].join(" "));

    return (!filtroEquipo || nombresEquipoCoinciden(row.equipo_nombre, filtroEquipo)) &&
      (!filtroPrioridad || normalizarTexto(row.risk_level || row.audit_status).includes(normalizarTexto(filtroPrioridad))) &&
      (!filtroTexto || texto.includes(filtroTexto));
  });

  const criticas = rows.filter((row) => auditoriaPrioridadClase(row.risk_level || row.audit_status) === "rechazado").length;
  const altas = rows.filter((row) => auditoriaPrioridadClase(row.risk_level || row.audit_status) === "observado").length;
  const medias = rows.filter((row) => auditoriaPrioridadClase(row.risk_level || row.audit_status) === "cargado").length;
  const validadas = rows.filter((row) => auditoriaPrioridadClase(row.risk_level || row.audit_status) === "aprobado").length;

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${rows.length}</strong><span>Registros</span></div>
    <div class="doc-pill doc-pill-alert"><strong>${criticas}</strong><span>Criticas</span></div>
    <div class="doc-pill doc-pill-alert"><strong>${altas}</strong><span>Altas</span></div>
    <div class="doc-pill"><strong>${medias}</strong><span>Medias</span></div>
    <div class="doc-pill"><strong>${validadas}</strong><span>Validadas</span></div>
    <div class="doc-pill"><strong>${filtradas.length}</strong><span>Filtradas</span></div>
  `;

  if (!rows.length) {
    tabla.innerHTML = `
      <div class="empty">
        No hay auditoria importada para ${escapeHtml(nombreCategoria || "esta categoria")}. La pantalla ya esta lista para recibir los datos de la planilla.
      </div>
    `;
    return;
  }

  if (!filtradas.length) {
    tabla.innerHTML = `<div class="empty">No hay hallazgos que coincidan con los filtros.</div>`;
    return;
  }

  tabla.innerHTML = `
    <table class="doc-table audit-table">
      <thead>
        <tr>
          <th>Prioridad</th>
          <th>Club</th>
          <th>Jugador / alcance</th>
          <th>Documento</th>
          <th>Declarado</th>
          <th>Localizado</th>
          <th>Validado</th>
          <th>Vigencia</th>
          <th>Motivo</th>
          <th>Evidencia</th>
        </tr>
      </thead>
      <tbody>
        ${filtradas.map((row) => `
          <tr>
            <td>${docStateHtml(row.risk_level || row.audit_status || "Pendiente", auditoriaPrioridadClase(row.risk_level || row.audit_status))}</td>
            <td>${escapeHtml(row.equipo_nombre || "")}</td>
            <td>
              <strong>${escapeHtml(row.player_name || row.alcance || "Plantel")}</strong>
              ${row.planilla_arbitro ? `<small>Planilla arbitro: ${escapeHtml(row.planilla_arbitro)}</small>` : ""}
            </td>
            <td>${escapeHtml(row.document_type || "")}</td>
            <td>${escapeHtml(row.declared_status || "")}</td>
            <td>${escapeHtml(row.located_status || "")}</td>
            <td>${escapeHtml(row.validated_status || "")}</td>
            <td>${escapeHtml(row.valid_until || "")}</td>
            <td>${escapeHtml(row.observation || row.audit_status || "")}</td>
            <td>${row.evidence_url ? `<a class="drive-doc-link" href="${escapeHtml(row.evidence_url)}" target="_blank" rel="noopener noreferrer">Ver</a>` : `<span class="doc-action-muted">Sin enlace</span>`}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderAccionesDriveDocumento(row) {
  const disabled = estado.asociacionDesbloqueada ? "" : " disabled";
  return `
    <div class="doc-review-actions">
      <button class="doc-review-btn drive-doc-review-btn doc-review-ok" type="button" data-drive-doc-id="${escapeHtml(row.id)}" data-status="cargado" data-match-status="exacto"${disabled}>Exacto</button>
      <button class="doc-review-btn drive-doc-review-btn doc-review-warn" type="button" data-drive-doc-id="${escapeHtml(row.id)}" data-status="revisar" data-match-status="dudoso"${disabled}>Revisar</button>
      <button class="doc-review-btn drive-doc-create-player-btn" type="button" data-drive-doc-id="${escapeHtml(row.id)}"${disabled}>Crear jugador</button>
    </div>
  `;
}

function renderGestionJugadoresAsociacion(nombreCategoria) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const jugadores = categoria ? estado.jugadoresPorCategoriaId[categoria.id] || [] : [];

  if (!jugadores.length) return "";

  const documentos = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
  const resumenPorJugador = documentos.reduce((acc, documento) => {
    const playerId = documento.player_id;
    if (!playerId) return acc;
    if (!acc[playerId]) acc[playerId] = { cargados: 0, aprobados: 0, pendientes: 0 };
    if (documento.status === "aprobado") acc[playerId].aprobados += 1;
    if (documento.status === "cargado") acc[playerId].cargados += 1;
    if (!documento.status || documento.status === "pendiente") acc[playerId].pendientes += 1;
    return acc;
  }, {});

  return `
    <div class="doc-player-admin">
      <div>
        <h4>Jugadores cargados</h4>
        <p class="note">Control administrativo de altas hechas por delegados. Si no tiene actividad se elimina; si tiene documentacion se da de baja conservando auditoria.</p>
      </div>
      <table class="doc-table doc-player-admin-table">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Jugador</th>
            <th>Documentos</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          ${jugadores.map((jugador) => {
            const resumen = resumenPorJugador[jugador.id] || { cargados: 0, aprobados: 0, pendientes: 0 };
            return `
              <tr>
                <td>${escapeHtml(jugador.equipo_nombre || "-")}</td>
                <td>
                  <strong>${escapeHtml(jugador.nombre)}</strong>
                  <span class="doc-player-meta">${jugador.dni ? `DNI ${escapeHtml(jugador.dni)}` : ""}${jugador.dorsal ? ` #${escapeHtml(jugador.dorsal)}` : ""}</span>
                </td>
                <td>
                  <span class="doc-action-muted">${resumen.aprobados} aprobados · ${resumen.cargados} para revisar · ${resumen.pendientes} pendientes</span>
                </td>
                <td>
                  ${jugador.baja_solicitada ? `<span class="doc-review-current doc-review-current-warn">Baja solicitada</span>` : ""}
                  <button class="doc-player-remove-btn" type="button" data-player-id="${escapeHtml(jugador.id)}" data-player-name="${escapeHtml(jugador.nombre)}">
                    ${jugador.baja_solicitada ? "Aprobar baja" : "Eliminar / dar de baja"}
                  </button>
                  ${jugador.baja_motivo ? `<span class="doc-player-meta">Motivo: ${escapeHtml(jugador.baja_motivo)}</span>` : ""}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAvisoDocumentosJugador(documentosJugador) {
  if (!documentosJugador.length) return "";

  return `
    <div class="doc-scope-note">
      <strong>Documentos por jugador</strong>
      <span>${documentosJugador.map(escapeHtml).join(", ")} se cargan individualmente por jugador.</span>
    </div>
  `;
}

function renderAccionRevisionAsociacion(documento, scope = "team") {
  if (!documento) {
    return `<span class="doc-action-muted">Sin registro</span>`;
  }

  if (!documento.file_name) {
    return `<span class="doc-action-muted">Esperando carga</span>`;
  }

  const scopeAttr = escapeHtml(scope);
  const documentId = escapeHtml(documento.id);
  const multiple = scope === "team" && permiteMultiplesArchivos(documento.requirement_nombre);
  const verLabel = multiple ? "Ver archivos" : "Ver";

  if (documento.status === "aprobado") {
    return `
      <div class="doc-review-actions">
        <button class="doc-view-btn" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}">${verLabel}</button>
        <span class="doc-review-current doc-review-current-ok">Aprobado</span>
      </div>
    `;
  }

  return `
    <div class="doc-review-actions">
      <button class="doc-view-btn" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}">${verLabel}</button>
      <button class="doc-review-btn doc-review-ok" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}" data-status="aprobado">Aprobar</button>
      ${documento.status !== "observado" ? `<button class="doc-review-btn doc-review-warn" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}" data-status="observado">Observar</button>` : `<span class="doc-review-current doc-review-current-warn">Observado</span>`}
      ${documento.status !== "rechazado" ? `<button class="doc-review-btn doc-review-danger" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}" data-status="rechazado">Rechazar</button>` : `<span class="doc-review-current doc-review-current-danger">Rechazado</span>`}
    </div>
  `;
}

function renderDocumentacionJugadoresAsociacion(nombreCategoria, documentosJugador) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const documentos = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
  const equipoOperativo = equipoOperativoSeleccionado();
  const filtroEstado = $("documentacion-filtro-estado")?.value || "";
  const filtroTexto = normalizarTexto($("documentacion-buscar")?.value || "");

  if (!documentosJugador.length) return "";

  if (!documentos.length) {
    return `
      <div class="doc-player-section">
        <h4>Documentos por jugador</h4>
        <div class="empty">Todavía no hay jugadores cargados para esta categoría.</div>
      </div>
    `;
  }

  const filas = documentos.filter((documento) => {
    const status = documento?.status || "pendiente";
    const textoFila = normalizarTexto([
      documento.equipo_nombre,
      documento.jugador_nombre,
      documento.jugador_dni,
      documento.jugador_dorsal,
      documento.requirement_nombre,
      documento.file_name,
      documento.observacion,
      estadoDocumentoLabel(documento)
    ].join(" "));

    return (!equipoOperativo || nombresEquipoCoinciden(documento.equipo_nombre, equipoOperativo)) &&
      (!filtroEstado || status === filtroEstado) &&
      (!filtroTexto || textoFila.includes(filtroTexto));
  });

  if (!filas.length) {
    return `
      <div class="doc-player-section">
        <h4>Documentos por jugador</h4>
        <div class="empty">No hay documentos de jugador que coincidan con los filtros.</div>
      </div>
    `;
  }

  return `
    <div class="doc-player-section">
      <h4>Documentos por jugador</h4>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Jugador</th>
            <th>Estado</th>
            <th>Documento</th>
            <th>Archivo</th>
            <th>Observación</th>
            <th>Revisión</th>
          </tr>
        </thead>
        <tbody>
          ${filas.map((documento) => `
            <tr>
              <td>${escapeHtml(documento.equipo_nombre)}</td>
              <td>
                <strong>${escapeHtml(documento.jugador_nombre)}</strong>
                <span class="doc-player-meta">${documento.jugador_dni ? `DNI ${escapeHtml(documento.jugador_dni)}` : ""}${documento.jugador_dorsal ? ` #${escapeHtml(documento.jugador_dorsal)}` : ""}</span>
              </td>
              <td>${docStateHtml(
                estadoDocumentoLabel(documento),
                estadoDocumentoClase(documento)
              )}</td>
              <td>${escapeHtml(documento.requirement_nombre)}</td>
              <td>${documento.file_name ? `<span class="doc-file-name">${escapeHtml(documento.file_name)}</span>` : `<span class="doc-action-muted">Sin archivo</span>`}</td>
              <td>${escapeHtml(documento.observacion || "")}</td>
              <td>${renderAccionRevisionAsociacion(documento, "player")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function cargarEventosUso() {
  const desde = new Date();
  desde.setDate(desde.getDate() - 30);

  const { data, error } = await supabaseClient
    .from("app_usage_events")
    .select("created_at, event_type, area, categoria_nombre, equipo_nombre, user_role, user_label, device_type, session_id")
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  estado.eventosUso = data || [];
  return estado.eventosUso;
}

function renderEstadisticasUso() {
  const resumen = $("uso-resumen");
  const detalle = $("uso-detalle");
  if (!resumen || !detalle) return;

  const filas = estado.eventosUso || [];
  const ahora = Date.now();
  const diaMs = 24 * 60 * 60 * 1000;
  const enRango = (fila, dias) => {
    const fecha = new Date(fila.created_at).getTime();
    return Number.isFinite(fecha) && ahora - fecha <= dias * diaMs;
  };
  const sesiones = new Set(filas.map((fila) => fila.session_id).filter(Boolean));
  const categorias = topEventos(filas.filter((fila) => fila.categoria_nombre), "categoria_nombre");
  const dispositivos = topEventos(filas, "device_type", 3);

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${contarEventos(filas, (fila) => enRango(fila, 1))}</strong><span>Eventos 24 h</span></div>
    <div class="doc-pill"><strong>${contarEventos(filas, (fila) => enRango(fila, 7))}</strong><span>Eventos 7 días</span></div>
    <div class="doc-pill"><strong>${filas.length}</strong><span>Eventos 30 días</span></div>
    <div class="doc-pill"><strong>${sesiones.size}</strong><span>Dispositivos aprox.</span></div>
    <div class="doc-pill"><strong>${contarEventos(filas, (fila) => fila.event_type === "resultado_cargado")}</strong><span>Resultados</span></div>
    <div class="doc-pill"><strong>${contarEventos(filas, (fila) => fila.event_type === "documento_cargado" || fila.event_type === "documento_jugador_cargado")}</strong><span>Documentos</span></div>
  `;

  detalle.innerHTML = `
    <div class="usage-grid">
      <div>
        <h4>Categorías más consultadas</h4>
        ${categorias.length ? categorias.map(([nombre, total]) => `<p>${escapeHtml(nombre)} <strong>${total}</strong></p>`).join("") : `<p class="note">Sin datos todavía.</p>`}
      </div>
      <div>
        <h4>Dispositivos</h4>
        ${dispositivos.length ? dispositivos.map(([nombre, total]) => `<p>${escapeHtml(nombre)} <strong>${total}</strong></p>`).join("") : `<p class="note">Sin datos todavía.</p>`}
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Área</th>
            <th>Categoría</th>
            <th>Equipo/usuario</th>
          </tr>
        </thead>
        <tbody>
          ${filas.slice(0, 40).map((fila) => `
            <tr>
              <td>${fechaLocalCorta(fila.created_at)}</td>
              <td>${escapeHtml(fila.event_type || "")}</td>
              <td>${escapeHtml(fila.area || "")}</td>
              <td>${escapeHtml(fila.categoria_nombre || "")}</td>
              <td>${escapeHtml(fila.equipo_nombre || fila.user_label || "")}</td>
            </tr>
          `).join("") || `<tr><td colspan="5">Todavía no hay eventos registrados.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

async function actualizarEstadisticasUso() {
  const status = $("uso-status");

  try {
    if (status) setStatus(status, "Cargando estadísticas...", "");
    await cargarEventosUso();
    renderEstadisticasUso();
    if (status) setStatus(status, "Estadísticas actualizadas.", "ok");
  } catch (error) {
    if ($("uso-resumen")) $("uso-resumen").innerHTML = "";
    if ($("uso-detalle")) {
      $("uso-detalle").innerHTML = `<div class="empty">Todavía falta correr el SQL de estadísticas de uso en Supabase.</div>`;
    }
    if (status) setStatus(status, `No se pudieron cargar estadísticas: ${error.message}`, "warn");
  }
}

function renderDocumentacionDelegado() {
  const container = $("delegado-documentacion");
  if (!container) return;

  if (!estado.delegadoDesbloqueado || !estado.delegado) {
    container.innerHTML = `<div class="empty">Habilitá edición con tu clave para ver la documentación requerida.</div>`;
    return;
  }

  const categoria = $("delegado-categoria")?.value;
  const equiposCategoria = obtenerEquiposCategoria(categoria);
  const equipoPrincipal = equiposCategoria.find((equipo) => nombresEquipoCoinciden(equipo, estado.delegado.nombre));
  const equiposPermitidos = estado.delegado.equipos || [];
  const equiposDelegado = equipoPrincipal
    ? [equipoPrincipal]
    : equiposCategoria.filter((equipo) =>
        equiposPermitidos.some((equipoPermitido) => nombresEquipoCoinciden(equipo, equipoPermitido))
      );

  if (!equiposDelegado.length) {
    container.innerHTML = `<div class="empty">No hay equipos vinculados a esta categoría para este delegado.</div>`;
    return;
  }

  const documentosEquipo = obtenerDocumentosEquipo();
  const documentosJugador = obtenerDocumentosJugador();

  container.innerHTML = `
    <div class="doc-delegate-summary">
      ${equiposDelegado.map((equipo) => renderResumenDocumentalDelegado(categoria, equipo, documentosEquipo)).join("")}
    </div>
    ${renderAlertasVencimientoDelegado(categoria, equiposDelegado, documentosEquipo, documentosJugador)}
    ${renderAvisoDocumentosJugador(documentosJugador)}
    <table class="doc-table">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>Documento</th>
          <th>Estado</th>
          <th>Vencimiento</th>
          <th>Observacion</th>
          <th>Accion</th>
        </tr>
      </thead>
      <tbody>
        ${equiposDelegado.map((equipo) =>
          documentosEquipo.map((documento) => {
            const documentoEquipo = obtenerDocumentoEquipo(categoria, equipo, documento);

            return `
              <tr>
                <td>${escapeHtml(equipo)}</td>
                <td>${escapeHtml(documento)}</td>
                <td>${docStateHtml(
                  estadoDocumentoLabel(documentoEquipo),
                  estadoDocumentoClase(documentoEquipo)
                )}</td>
                <td>${renderVencimientoDocumento(documentoEquipo)}</td>
                <td>${renderObservacionDocumento(documentoEquipo)}</td>
                <td>${renderAccionDocumentoDelegado(documentoEquipo)}</td>
              </tr>
            `;
          }).join("")
        ).join("")}
      </tbody>
    </table>
    ${renderDocumentacionJugadoresDelegado(categoria, equiposDelegado, documentosJugador)}
  `;
}

function obtenerAlertasVencimientoDelegado(categoria, equiposDelegado, documentosEquipo, documentosJugador) {
  const alertas = [];

  equiposDelegado.forEach((equipo) => {
    documentosEquipo.forEach((requisitoNombre) => {
      const requisito = obtenerRequisitoDocumental(requisitoNombre);
      if (!requisito?.requiere_vencimiento) return;

      const documento = obtenerDocumentoEquipo(categoria, equipo, requisitoNombre);
      const estadoVencimiento = estadoVencimientoDocumento(documento);
      if (!["vencido", "por_vencer", "sin_fecha"].includes(estadoVencimiento)) return;

      alertas.push({
        tipo: "equipo",
        entidad: equipo,
        requisito: requisitoNombre,
        estado: estadoVencimiento,
        dias: diasHastaFecha(documento?.vencimiento),
        vencimiento: documento?.vencimiento || ""
      });
    });

    const jugadores = obtenerJugadoresEquipo(categoria, equipo);
    jugadores.forEach((jugador) => {
      documentosJugador.forEach((requisitoNombre) => {
        const requisito = obtenerRequisitoDocumental(requisitoNombre);
        if (!requisito?.requiere_vencimiento) return;

        const documento = obtenerDocumentoJugador(categoria, jugador.id, requisitoNombre);
        const estadoVencimiento = estadoVencimientoDocumento(documento);
        if (!["vencido", "por_vencer", "sin_fecha"].includes(estadoVencimiento)) return;

        alertas.push({
          tipo: "jugador",
          entidad: jugador.nombre,
          requisito: requisitoNombre,
          estado: estadoVencimiento,
          dias: diasHastaFecha(documento?.vencimiento),
          vencimiento: documento?.vencimiento || ""
        });
      });
    });
  });

  return alertas.sort((a, b) => {
    const prioridad = { vencido: 0, sin_fecha: 1, por_vencer: 2 };
    return (prioridad[a.estado] ?? 9) - (prioridad[b.estado] ?? 9) ||
      (a.dias ?? 9999) - (b.dias ?? 9999) ||
      String(a.entidad).localeCompare(String(b.entidad));
  });
}

function renderAlertasVencimientoDelegado(categoria, equiposDelegado, documentosEquipo, documentosJugador) {
  const alertas = obtenerAlertasVencimientoDelegado(categoria, equiposDelegado, documentosEquipo, documentosJugador);

  if (!alertas.length) {
    return `
      <div class="doc-scope-note">
        <strong>Alertas para el delegado</strong>
        <span>No hay vencimientos detectados en los próximos 30 días para tu equipo.</span>
      </div>
    `;
  }

  const resumen = alertas.reduce((acc, alerta) => {
    acc[alerta.estado] = (acc[alerta.estado] || 0) + 1;
    return acc;
  }, {});

  const estadoLabel = {
    vencido: "Vencido",
    por_vencer: "Por vencer",
    sin_fecha: "Falta fecha"
  };

  const detalleLabel = (alerta) => {
    if (alerta.estado === "vencido") {
      return `Venció el ${formatearFecha(alerta.vencimiento)}`;
    }
    if (alerta.estado === "por_vencer") {
      return `Vence el ${formatearFecha(alerta.vencimiento)} (${alerta.dias} día${alerta.dias === 1 ? "" : "s"})`;
    }
    return "Tiene vencimiento obligatorio sin fecha cargada";
  };

  return `
    <div class="doc-scope-note">
      <strong>Alertas para el delegado</strong>
      <span>La app marca vencidos, documentos por vencer dentro de 30 días y fechas obligatorias faltantes.</span>
      <div class="doc-summary">
        <div class="doc-pill doc-pill-alert"><strong>${resumen.vencido || 0}</strong><span>Vencidos</span></div>
        <div class="doc-pill doc-pill-alert"><strong>${resumen.por_vencer || 0}</strong><span>Por vencer</span></div>
        <div class="doc-pill"><strong>${resumen.sin_fecha || 0}</strong><span>Sin fecha</span></div>
      </div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Alcance</th>
            <th>Documento</th>
            <th>Estado</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          ${alertas.slice(0, 12).map((alerta) => `
            <tr>
              <td>${escapeHtml(alerta.tipo === "jugador" ? `Jugador: ${alerta.entidad}` : `Equipo: ${alerta.entidad}`)}</td>
              <td>${escapeHtml(alerta.requisito)}</td>
              <td>${docStateHtml(estadoLabel[alerta.estado] || alerta.estado, alerta.estado === "por_vencer" ? "observado" : "rechazado")}</td>
              <td>${escapeHtml(detalleLabel(alerta))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${alertas.length > 12 ? `<p class="note">Hay ${alertas.length - 12} alerta(s) más. Revisá el detalle documental completo del equipo.</p>` : ""}
    </div>
  `;
}

function renderDocumentacionJugadoresDelegado(categoria, equiposDelegado, documentosJugador) {
  if (!documentosJugador.length) return "";
  if (categoria === "Femenino") {
    return `
      <div class="doc-player-section">
        <h4>Documentos por jugador</h4>
        <div class="empty">La carga de jugadores no esta habilitada para Femenino desde Delegados.</div>
      </div>
    `;
  }

  return `
    <div class="doc-player-section">
      <h4>Documentos por jugador</h4>
      <div class="doc-player-create">
        <div class="field">
          <label for="jugador-equipo">Equipo</label>
          <select id="jugador-equipo">
            ${equiposDelegado.map((equipo) => `<option value="${escapeHtml(equipo)}">${escapeHtml(equipo)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="jugador-nombre">Jugador</label>
          <input id="jugador-nombre" type="text" placeholder="Nombre y apellido" />
        </div>
        <div class="field">
          <label for="jugador-dni">DNI</label>
          <input id="jugador-dni" type="text" placeholder="Opcional" />
        </div>
        <div class="field">
          <label for="jugador-dorsal">N°</label>
          <input id="jugador-dorsal" type="text" placeholder="Opcional" />
        </div>
        <div class="field doc-player-create-action">
          <button id="jugador-agregar" class="primary" type="button">Agregar jugador</button>
        </div>
      </div>
      ${equiposDelegado.map((equipo) => renderJugadoresEquipoDelegado(categoria, equipo, documentosJugador)).join("")}
    </div>
  `;
}

function renderJugadoresEquipoDelegado(categoria, equipo, documentosJugador) {
  const jugadores = obtenerJugadoresEquipo(categoria, equipo);

  if (!jugadores.length) {
    return `
      <div class="doc-player-team">
        <h5>${escapeHtml(equipo)}</h5>
        <div class="empty">Todavía no hay jugadores cargados para este equipo.</div>
      </div>
    `;
  }

  return `
    <div class="doc-player-team">
      <h5>${escapeHtml(equipo)}</h5>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Pre-habilitación</th>
            <th>Falta</th>
            <th>Documento</th>
            <th>Estado</th>
            <th>Observación</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${jugadores.map((jugador) =>
            documentosJugador.map((requisito, requisitoIndex) => {
              const documento = obtenerDocumentoJugador(categoria, jugador.id, requisito);
              const estadoHabilitacion = calcularEstadoHabilitacionJugador(categoria, jugador);

              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(jugador.nombre)}</strong>
                    <span class="doc-player-meta">${jugador.dni ? `DNI ${escapeHtml(jugador.dni)}` : ""}${jugador.dorsal ? ` #${escapeHtml(jugador.dorsal)}` : ""}</span>
                    ${requisitoIndex === 0 ? renderAccionBajaJugadorDelegado(jugador) : ""}
                  </td>
                  <td>${requisitoIndex === 0 ? docStateHtml(
                    estadoHabilitacion.habilitado === "SI" ? "Pre-habilitado" : "Pendiente",
                    estadoHabilitacion.habilitado === "SI" ? "aprobado" : "observado"
                  ) : ""}</td>
                  <td>${requisitoIndex === 0
                    ? `<span class="doc-action-muted">${escapeHtml(estadoHabilitacion.faltantes || "OK documental, sujeto a aprobación final")}</span>`
                    : ""}</td>
                  <td>${escapeHtml(requisito)}</td>
                  <td>${docStateHtml(
                    estadoDocumentoLabel(documento),
                    estadoDocumentoClase(documento)
                  )}</td>
                  <td>${renderObservacionDocumento(documento)}</td>
                  <td>${renderAccionDocumentoJugadorDelegado(documento)}</td>
                </tr>
              `;
            }).join("")
          ).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAccionDocumentoJugadorDelegado(documento) {
  if (!documento) {
    return `<span class="doc-action-muted">Sin registro</span>`;
  }

  const botonVer = renderBotonVerDocumentoDelegado(documento, "player");
  const nombreArchivo = documento.file_name
    ? `<span class="doc-file-name">${escapeHtml(documento.file_name)}</span>`
    : "";

  if (documento.status === "aprobado") {
    return `${botonVer}${nombreArchivo}<span class="doc-action-muted">Aprobado</span>`;
  }

  const marcaCargado = documento.file_name
    ? `<span class="doc-uploaded-mark">Cargado, pendiente de revisión</span>`
    : "";

  return `
    ${botonVer}
    <label class="doc-upload-button">
      <span>${documento.file_name ? "Reemplazar" : "Subir"}</span>
      <input
        class="player-doc-upload-input"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        data-document-id="${escapeHtml(documento.id)}"
      >
    </label>
    ${nombreArchivo}
    ${marcaCargado}
`;
}

function renderBotonVerDocumentoDelegado(documento, scope = "team") {
  if (!documento?.file_name || !documento?.storage_path) return "";
  const multiple = scope === "team" && permiteMultiplesArchivos(documento.requirement_nombre);
  return `
    <button
      class="doc-view-btn doc-view-delegate-btn"
      type="button"
      data-document-id="${escapeHtml(documento.id)}"
      data-document-scope="${escapeHtml(scope)}"
    >${multiple ? "Ver archivos" : "Ver"}</button>
  `;
}

function esUrlDocumentoExterno(storagePath) {
  return /^https?:\/\//i.test(String(storagePath || ""));
}

function abrirDocumentoExterno(documento, status) {
  window.open(documento.storage_path, "_blank", "noopener");
  setStatus(status, "Archivo abierto desde Drive en una pestaña nueva.", "ok");
}

function renderResumenDocumentalDelegado(categoria, equipo, documentosRequeridos) {
  const documentos = documentosRequeridos.map((requisito) =>
    obtenerDocumentoEquipo(categoria, equipo, requisito)
  );
  const total = documentosRequeridos.length;
  const cargados = documentos.filter((documento) => !!documento?.file_name).length;
  const aprobados = documentos.filter((documento) => documento?.status === "aprobado").length;
  const observados = documentos.filter((documento) =>
    documento?.status === "observado" || documento?.status === "rechazado"
  ).length;
  const porcentaje = total ? Math.round((cargados / total) * 100) : 0;

  return `
    <div class="doc-progress-card">
      <div>
        <strong>${escapeHtml(equipo)}</strong>
        <span>${cargados}/${total} cargados - ${aprobados} aprobados - ${observados} con observación</span>
      </div>
      <div class="doc-progress-bar" aria-label="${porcentaje}% cargado">
        <span style="width:${porcentaje}%"></span>
      </div>
    </div>
  `;
}

function renderObservacionDocumento(documento) {
  if (!documento?.observacion) {
    return `<span class="doc-action-muted">Sin observación</span>`;
  }

  const important = documento.status === "observado" || documento.status === "rechazado";
  return `<span class="${important ? "doc-observation doc-observation-important" : "doc-observation"}">${escapeHtml(documento.observacion)}</span>`;
}

function renderVencimientoDocumento(documento) {
  const requisito = obtenerRequisitoDocumental(documento?.requirement_nombre);

  if (!requisito?.requiere_vencimiento) {
    return `<span class="doc-action-muted">No aplica</span>`;
  }

  if (!documento?.vencimiento) {
    return `<span class="doc-observation doc-observation-important">Falta fecha</span>`;
  }

  const estadoVencimiento = estadoVencimientoDocumento(documento);
  const dias = diasHastaFecha(documento.vencimiento);
  const labels = {
    vencido: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`,
    por_vencer: `Vence en ${dias} día${dias === 1 ? "" : "s"}`,
    vigente: "Vigente"
  };
  const className = estadoVencimiento === "vencido" || estadoVencimiento === "por_vencer"
    ? "doc-observation doc-observation-important"
    : "doc-observation doc-observation-ok";

  return `
    <span class="${className}">
      ${escapeHtml(formatearFecha(documento.vencimiento))}
      <small>${escapeHtml(labels[estadoVencimiento] || "")}</small>
    </span>
  `;
}

function renderAccionDocumentoDelegado(documento) {
  if (!documento) {
    return `<span class="doc-action-muted">Sin registro</span>`;
  }

  const botonVer = renderBotonVerDocumentoDelegado(documento, "team");
  const nombreArchivo = documento.file_name
    ? `<span class="doc-file-name">${escapeHtml(documento.file_name)}</span>`
    : "";
  const requisito = obtenerRequisitoDocumental(documento.requirement_nombre);
  const multiple = permiteMultiplesArchivos(documento.requirement_nombre);
  const vencimientoInput = requisito?.requiere_vencimiento
    ? `
      <label class="doc-expiry-field">
        <span>Vencimiento obligatorio</span>
        <input
          class="doc-expiry-input"
          type="date"
          data-document-id="${escapeHtml(documento.id)}"
          value="${escapeHtml(documento.vencimiento || "")}"
        >
        <small>Requerido para subir este documento.</small>
      </label>
    `
    : "";

  if (documento.status === "aprobado") {
    return `${botonVer}${nombreArchivo}<span class="doc-action-muted">Aprobado</span>`;
  }

  const marcaCargado = documento.file_name
    ? `<span class="doc-uploaded-mark">Cargado, pendiente de revisión</span>`
    : "";

  return `
    ${vencimientoInput}
    ${botonVer}
    <label class="doc-upload-button">
      <span>${multiple ? (documento.file_name ? "Agregar" : "Subir imágenes") : (documento.file_name ? "Reemplazar" : "Subir")}</span>
      <input
        class="doc-upload-input"
        type="file"
        accept="${multiple ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"}"
        data-document-id="${escapeHtml(documento.id)}"
        ${multiple ? "multiple" : ""}
      >
    </label>
    ${nombreArchivo}
    ${marcaCargado}
  `;
}

async function cargarPartidosCategoria(nombreCategoria) {
  const { data, error } = await supabaseClient
    .from("partidos")
    .select(`
      id,
      local,
      visitante,
      puntos_local,
      puntos_visitante,
      jornada,
      fecha,
      libre,
      estado_resultado,
      cargado_por,
      cargado_en,
      categoria_id,
      categorias!inner(nombre, torneo_id)
    `)
    .eq("categorias.nombre", nombreCategoria)
    .eq("categorias.torneo_id", TORNEO_ID)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los partidos de ${nombreCategoria}: ${error.message}`);
  }

  estado.partidosPorCategoria[nombreCategoria] = data || [];
  guardarCachePublica("partidos", `${TORNEO_ID}_${nombreCategoria}`, estado.partidosPorCategoria[nombreCategoria]);
  return estado.partidosPorCategoria[nombreCategoria];
}

async function cargarResultadosPlayoffCategoria(nombreCategoria, force = false) {
  if (!force && estado.playoffsPorCategoria[nombreCategoria]) {
    return estado.playoffsPorCategoria[nombreCategoria];
  }

  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  if (!categoria?.id) {
    estado.playoffsPorCategoria[nombreCategoria] = [];
    return [];
  }

  const { data, error } = await supabaseClient
    .from("playoff_matches")
    .select("*")
    .eq("categoria_id", categoria.id)
    .order("orden", { ascending: true })
    .order("partido_numero", { ascending: true });

  if (error) {
    console.warn("No se pudieron cargar resultados de playoffs:", error.message);
    estado.playoffsPorCategoria[nombreCategoria] = [];
    return [];
  }

  estado.playoffsPorCategoria[nombreCategoria] = data || [];
  return estado.playoffsPorCategoria[nombreCategoria];
}

async function cargarProgramacionCategoria(categoriaId, force = false) {
  if (!categoriaId) return [];
  if (!force && estado.programacionPorCategoriaId[categoriaId]) {
    return estado.programacionPorCategoriaId[categoriaId];
  }

  const { data, error } = await supabaseClient
    .from("match_schedules")
    .select("*")
    .eq("categoria_id", categoriaId)
    .order("jornada", { ascending: true })
    .order("hora", { ascending: true });

  if (error) {
    console.warn("No se pudo cargar programacion:", error.message);
    estado.programacionPorCategoriaId[categoriaId] = [];
    return [];
  }

  estado.programacionPorCategoriaId[categoriaId] = data || [];
  return estado.programacionPorCategoriaId[categoriaId];
}

function calcularTabla(partidos) {
  const tabla = {};

  partidos.forEach((p) => {
    if (!tabla[p.local]) {
      tabla[p.local] = { equipo: p.local, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, dif: 0, pts: 0 };
    }
    if (!tabla[p.visitante]) {
      tabla[p.visitante] = { equipo: p.visitante, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, dif: 0, pts: 0 };
    }

    if (!partidoTieneResultado(p)) return;

    tabla[p.local].pj += 1;
    tabla[p.visitante].pj += 1;

    tabla[p.local].pf += p.puntos_local;
    tabla[p.local].pc += p.puntos_visitante;
    tabla[p.visitante].pf += p.puntos_visitante;
    tabla[p.visitante].pc += p.puntos_local;

    if (esResolucionAdministrativa(p)) {
      if (p.estado_resultado === "resolucion_local") {
        tabla[p.local].pg += 1;
        tabla[p.visitante].pp += 1;
        tabla[p.local].pts += 2;
      } else {
        tabla[p.visitante].pg += 1;
        tabla[p.local].pp += 1;
        tabla[p.visitante].pts += 2;
      }
      return;
    }

    if (p.puntos_local > p.puntos_visitante) {
      tabla[p.local].pg += 1;
      tabla[p.visitante].pp += 1;
      tabla[p.local].pts += 2;
      tabla[p.visitante].pts += 1;
    } else if (p.puntos_visitante > p.puntos_local) {
      tabla[p.visitante].pg += 1;
      tabla[p.local].pp += 1;
      tabla[p.visitante].pts += 2;
      tabla[p.local].pts += 1;
    } else {
      tabla[p.local].pts += 1;
      tabla[p.visitante].pts += 1;
    }
  });

  const salida = Object.values(tabla);
  salida.forEach((e) => {
    e.dif = e.pf - e.pc;
  });

  salida.sort((a, b) => compararEquiposTabla(a, b, salida, partidos));

  return salida;
}

function compararEquiposTabla(a, b, tablaCompleta, partidos) {
  if (b.pts !== a.pts) return b.pts - a.pts;

  const empatados = tablaCompleta
    .filter((equipo) => equipo.pts === a.pts)
    .map((equipo) => equipo.equipo);

  if (empatados.length > 1) {
    const miniTabla = calcularMiniTablaOlimpica(empatados, partidos);
    const miniA = miniTabla[a.equipo] || { pts: 0, dif: 0, pf: 0 };
    const miniB = miniTabla[b.equipo] || { pts: 0, dif: 0, pf: 0 };

    if (miniB.pts !== miniA.pts) return miniB.pts - miniA.pts;
    if (miniB.dif !== miniA.dif) return miniB.dif - miniA.dif;
    if (miniB.pf !== miniA.pf) return miniB.pf - miniA.pf;
  }

  if (b.dif !== a.dif) return b.dif - a.dif;
  if (b.pf !== a.pf) return b.pf - a.pf;
  return a.equipo.localeCompare(b.equipo);
}

function calcularMiniTablaOlimpica(equipos, partidos) {
  const setEquipos = new Set(equipos);
  const miniTabla = {};

  equipos.forEach((equipo) => {
    miniTabla[equipo] = { pts: 0, pf: 0, pc: 0, dif: 0 };
  });

  partidos.forEach((p) => {
    if (!setEquipos.has(p.local) || !setEquipos.has(p.visitante)) return;
    if (!partidoTieneResultado(p)) return;

    miniTabla[p.local].pf += p.puntos_local;
    miniTabla[p.local].pc += p.puntos_visitante;
    miniTabla[p.visitante].pf += p.puntos_visitante;
    miniTabla[p.visitante].pc += p.puntos_local;

    if (esResolucionAdministrativa(p)) {
      if (p.estado_resultado === "resolucion_local") {
        miniTabla[p.local].pts += 2;
      } else {
        miniTabla[p.visitante].pts += 2;
      }
      return;
    }

    if (p.puntos_local > p.puntos_visitante) {
      miniTabla[p.local].pts += 2;
      miniTabla[p.visitante].pts += 1;
    } else if (p.puntos_visitante > p.puntos_local) {
      miniTabla[p.visitante].pts += 2;
      miniTabla[p.local].pts += 1;
    } else {
      miniTabla[p.local].pts += 1;
      miniTabla[p.visitante].pts += 1;
    }
  });

  Object.values(miniTabla).forEach((equipo) => {
    equipo.dif = equipo.pf - equipo.pc;
  });

  return miniTabla;
}

function renderTablaSimple(nombreCategoria, partidos) {
  const wrap = document.getElementById("publico-tabla-wrap");
  if (!wrap) return;

  const filas = calcularTabla(partidos);

  if (!filas.length) {
    wrap.innerHTML = `<div class="empty">Todavía no hay resultados cargados para esta categoría.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Equipo</th>
          <th>PJ</th>
          <th>PG</th>
          <th>PP</th>
          <th>PF</th>
          <th>PC</th>
          <th>DIF</th>
          <th>PTS</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map((e, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${nombreEquipoHtml(e.equipo)}</td>
            <td>${e.pj}</td>
            <td>${e.pg}</td>
            <td>${e.pp}</td>
            <td>${e.pf}</td>
            <td>${e.pc}</td>
            <td>${e.dif}</td>
            <td>${e.pts}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function fechaPartidoLabel(fecha) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-");
  if (!anio || !mes || !dia) return "";
  return `${dia}/${mes}/${anio}`;
}

function esResolucionAdministrativa(partido) {
  return partido?.estado_resultado === "resolucion_local" || partido?.estado_resultado === "resolucion_visitante";
}

function renderAccionBajaJugadorDelegado(jugador) {
  if (jugador.baja_solicitada) {
    return `
      <span class="doc-player-meta doc-player-remove-pending">
        Baja solicitada${jugador.baja_motivo ? `: ${escapeHtml(jugador.baja_motivo)}` : ""}
      </span>
    `;
  }

  return `
    <button
      class="doc-player-request-remove-btn"
      type="button"
      data-player-id="${escapeHtml(jugador.id)}"
      data-player-name="${escapeHtml(jugador.nombre)}"
    >
      Solicitar baja/correccion
    </button>
  `;
}

function partidoTieneResultado(partido) {
  return esResolucionAdministrativa(partido) || (partido.puntos_local != null && partido.puntos_visitante != null);
}

function resultadoPartidoLabel(partido) {
  if (esResolucionAdministrativa(partido)) {
    return partido.estado_resultado === "resolucion_local"
      ? "20 - 0 (resolucion administrativa)"
      : "0 - 20 (resolucion administrativa)";
  }

  return partidoTieneResultado(partido)
    ? `${partido.puntos_local} - ${partido.puntos_visitante}`
    : "Pendiente";
}

function renderPartidoResultadoHtml(partido) {
  const tieneResultado = partidoTieneResultado(partido);
  const puntosLocal = tieneResultado ? partido.puntos_local : "–";
  const puntosVisitante = tieneResultado ? partido.puntos_visitante : "–";
  const detalleCarga = partido.cargado_por
    ? `
      <details class="result-detail">
        <summary>Ver detalle</summary>
        <div>
          Cargado por: ${escapeHtml(partido.cargado_por)}<br>
          ${escapeHtml(partido.cargado_en || "")}
        </div>
      </details>
    `
    : "";

  return `
    <div class="result-match${tieneResultado ? "" : " result-match-pending"}">
      <div class="result-team">
        ${escudoEquipoHtml(partido.local, "lg")}
        <span>${escapeHtml(partido.local)}</span>
      </div>
      <div class="result-scoreboard">
        <div class="result-scoreline">
          <span>${puntosLocal}</span>
          <small>-</small>
          <span>${puntosVisitante}</span>
        </div>
        <div class="result-state">${tieneResultado ? "Final" : "Pendiente"}</div>
      </div>
      <div class="result-team result-team-away">
        ${escudoEquipoHtml(partido.visitante, "lg")}
        <span>${escapeHtml(partido.visitante)}</span>
      </div>
      ${detalleCarga}
    </div>
  `;
}

function agruparPartidosPorJornada(partidos) {
  return (partidos || []).reduce((acc, partido) => {
    const jornada = partido.jornada || 0;
    if (!acc[jornada]) acc[jornada] = [];
    acc[jornada].push(partido);
    return acc;
  }, {});
}

function renderFixturePublico(nombreCategoria) {
  const container = document.getElementById("publico-fixture");
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];

  if (!partidos.length) {
    container.innerHTML = `<div class="empty">No hay partidos cargados.</div>`;
    return;
  }

  const porJornada = agruparPartidosPorJornada(partidos);

  const jornadasOrdenadas = Object.keys(porJornada)
    .map(Number)
    .sort((a, b) => a - b);

  let html = "";

  jornadasOrdenadas.forEach((jornada) => {
    const partidosJornada = porJornada[jornada] || [];

    let titulo = `Fecha ${jornada}`;
    const fechaPartido = partidosJornada[0]?.fecha;

    if (fechaPartido) {
      const [anio, mes, dia] = fechaPartido.split("-");
      titulo += ` · ${dia}/${mes}/${anio}`;
    }

    html += `<div class="card result-date-card"><div class="result-date-head"><h3>${titulo}</h3><span>${escapeHtml(nombreCategoria)}</span></div>`;

    const libre = partidosJornada[0]?.libre;
    if (libre) {
      html += `<div class="empty">Libre: ${libre}</div>`;
    }

    partidosJornada.forEach((p) => {
      html += renderPartidoResultadoHtml(p);
    });

    html += `</div>`;
  });

  container.innerHTML = html;
}

function renderFechaDestacada(nombreCategoria) {
  const container = $("fecha-destacada");
  if (!container) return;

  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const partidosConResultado = partidos.filter(partidoTieneResultado);

  if (!partidos.length) {
    container.innerHTML = `<div class="card"><div class="empty">No hay partidos cargados para esta categoría.</div></div>`;
    return;
  }

  if (!partidosConResultado.length) {
    container.innerHTML = `<div class="card"><div class="empty">Todavía no hay resultados cargados para esta categoría.</div></div>`;
    return;
  }

  const resultadosPorJornada = partidosConResultado.reduce((acc, partido) => {
    const numero = Number(partido.jornada || 0);
    acc[numero] = (acc[numero] || 0) + 1;
    return acc;
  }, {});
  const jornadasConResultados = Object.keys(resultadosPorJornada).map(Number).sort((a, b) => b - a);
  const jornada =
    jornadasConResultados.find((numero) => resultadosPorJornada[numero] > 1) ||
    jornadasConResultados[0];
  const partidosJornada = partidos.filter((p) => Number(p.jornada || 0) === jornada);
  const posterioresConResultado = partidosConResultado.filter((p) => Number(p.jornada || 0) > jornada).length;
  const fechaPartido = partidosJornada[0]?.fecha;
  const fechaTexto = fechaPartido ? fechaPartidoLabel(fechaPartido) : "";

  container.innerHTML = `
    <div class="card result-date-card result-feature-card">
      <div class="result-date-head">
        <div>
          <span>${escapeHtml(nombreCategoria)}</span>
          <h3>Resultados · Fecha ${jornada}</h3>
        </div>
        ${fechaTexto ? `<span>${fechaTexto}</span>` : ""}
      </div>
      ${posterioresConResultado ? `<div class="empty">Hay ${posterioresConResultado} resultado${posterioresConResultado === 1 ? "" : "s"} cargado${posterioresConResultado === 1 ? "" : "s"} en fechas posteriores. Revisar en Asociacion.</div>` : ""}
      ${partidosJornada.map(renderPartidoResultadoHtml).join("")}
    </div>
  `;
}

function renderPlayoffsSimple(nombreCategoria, partidos) {
  const container = document.getElementById("publico-playoffs");
  if (!container) return;

  const equipos = {};

  partidos.forEach((p) => {
    if (p.local) equipos[p.local] = true;
    if (p.visitante) equipos[p.visitante] = true;
  });

  const cantidadEquipos = Object.keys(equipos).length;

  if (!cantidadEquipos) {
    container.innerHTML = "";
    return;
  }

  let html = `<div class="card"><h3>Playoffs</h3>`;

  const clasificados = clasificadosPlayoffCategoria(nombreCategoria);

  if (clasificados === 8 && cantidadEquipos >= 8) {
    html += `
      <div class="match"><div class="teams"><span>1°</span><span class="vs">vs</span><span>8°</span></div></div>
      <div class="match"><div class="teams"><span>4°</span><span class="vs">vs</span><span>5°</span></div></div>
      <div class="match"><div class="teams"><span>2°</span><span class="vs">vs</span><span>7°</span></div></div>
      <div class="match"><div class="teams"><span>3°</span><span class="vs">vs</span><span>6°</span></div></div>
    `;
  }

  if (clasificados === 6 && cantidadEquipos >= 6) {
    html += `
      <div class="match"><div class="teams"><span>1°</span><span class="vs">directo a semifinal</span></div></div>
      <div class="match"><div class="teams"><span>2°</span><span class="vs">directo a semifinal</span></div></div>
      <div class="match"><div class="teams"><span>3°</span><span class="vs">vs</span><span>6°</span></div></div>
      <div class="match"><div class="teams"><span>4°</span><span class="vs">vs</span><span>5°</span></div></div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function renderPlayoffSlot(posicion, equipo, textoFallback = "") {
  const nombre = equipo?.equipo || textoFallback || "Por definir";

  return `
    <div class="playoff-slot${equipo ? "" : " playoff-slot-empty"}">
      <span class="playoff-seed">${posicion}&deg;</span>
      ${equipo ? escudoEquipoHtml(nombre, "sm") : ""}
      <span class="playoff-team-name">${escapeHtml(nombre)}</span>
    </div>
  `;
}

function renderPlayoffPendiente(texto) {
  return `
    <div class="playoff-slot playoff-slot-empty">
      <span class="playoff-seed">-</span>
      <span class="playoff-team-name">${escapeHtml(texto)}</span>
    </div>
  `;
}

function renderPlayoffSlotDinamico(texto) {
  if (esPlaceholderPlayoff(texto)) return renderPlayoffPendiente(texto || "Por definir");

  return `
    <div class="playoff-slot">
      <span class="playoff-seed">-</span>
      ${escudoEquipoHtml(texto, "sm")}
      <span class="playoff-team-name">${escapeHtml(texto)}</span>
    </div>
  `;
}

function renderPlayoffMatch(titulo, slotA, slotB, resultado = "") {
  return `
    <div class="playoff-match">
      <span class="playoff-match-title">${escapeHtml(titulo)}</span>
      ${slotA}
      ${slotB}
      ${resultado}
    </div>
  `;
}

function playoffKey(partido) {
  return `${partido.fase || ""}|${partido.llave || ""}|${partido.partido_numero || 1}`;
}

function crearPlayoffMatch(fase, llave, titulo, orden, partidoNumero, local, visitante, fecha = "") {
  return {
    fase,
    llave,
    titulo,
    orden,
    partido_numero: partidoNumero || 1,
    local: local || "",
    visitante: visitante || "",
    fecha: fecha || "",
    puntos_local: null,
    puntos_visitante: null,
    estado: "pendiente",
    observacion: ""
  };
}

function generarPartidosPlayoff(nombreCategoria, tabla) {
  const equipo = (posicion) => tabla[posicion - 1]?.equipo || "";
  const partidos = [];
  const clasificados = clasificadosPlayoffCategoria(nombreCategoria);

  if (clasificados === 8 && tabla.length >= 8) {
    const datosCuartos = obtenerDatosRondaPlayoff(nombreCategoria, "cuartos");
    const datosSemis = obtenerDatosRondaPlayoff(nombreCategoria, "semifinales");
    const datosFinal = obtenerDatosRondaPlayoff(nombreCategoria, "final");

    partidos.push(crearPlayoffMatch("cuartos", "llave_a", "Llave A", 10, 1, equipo(1), equipo(8), datosCuartos.fecha || ""));
    partidos.push(crearPlayoffMatch("cuartos", "llave_b", "Llave B", 20, 1, equipo(4), equipo(5), datosCuartos.fecha || ""));
    partidos.push(crearPlayoffMatch("cuartos", "llave_c", "Llave C", 30, 1, equipo(2), equipo(7), datosCuartos.fecha || ""));
    partidos.push(crearPlayoffMatch("cuartos", "llave_d", "Llave D", 40, 1, equipo(3), equipo(6), datosCuartos.fecha || ""));
    partidos.push(crearPlayoffMatch("semifinales", "semi_1", "Semi 1", 50, 1, "Ganador 1/8", "Ganador 4/5", datosSemis.fecha || ""));
    partidos.push(crearPlayoffMatch("semifinales", "semi_2", "Semi 2", 60, 1, "Ganador 2/7", "Ganador 3/6", datosSemis.fecha || ""));
    (datosFinal.fechas || [datosFinal.fecha || ""]).forEach((fecha, index) => {
      partidos.push(crearPlayoffMatch("final", "final", `Final ${index + 1}`, 70 + index, index + 1, "Ganador Semi 1", "Ganador Semi 2", fecha || ""));
    });
  }

  if (clasificados === 6 && tabla.length >= 6) {
    const datosRepechaje = obtenerDatosRondaPlayoff(nombreCategoria, "clasificacion");
    const datosSemis = obtenerDatosRondaPlayoff(nombreCategoria, "semifinales");
    const datosFinal = obtenerDatosRondaPlayoff(nombreCategoria, "final");

    partidos.push(crearPlayoffMatch("repechaje", "repechaje_1", "Repechaje 1", 10, 1, equipo(3), equipo(6), datosRepechaje.fecha || ""));
    partidos.push(crearPlayoffMatch("repechaje", "repechaje_2", "Repechaje 2", 20, 1, equipo(4), equipo(5), datosRepechaje.fecha || ""));
    (datosSemis.fechas || [datosSemis.fecha || ""]).forEach((fecha, index) => {
      partidos.push(crearPlayoffMatch("semifinales", "semi_1", `Semi 1 - Partido ${index + 1}`, 30 + index, index + 1, equipo(1), "Peor ganador de repechaje", fecha || ""));
      partidos.push(crearPlayoffMatch("semifinales", "semi_2", `Semi 2 - Partido ${index + 1}`, 40 + index, index + 1, equipo(2), "Mejor ganador de repechaje", fecha || ""));
    });
    (datosFinal.fechas || [datosFinal.fecha || ""]).forEach((fecha, index) => {
      partidos.push(crearPlayoffMatch("final", "final", `Final ${index + 1}`, 60 + index, index + 1, "Ganador Semi 1", "Ganador Semi 2", fecha || ""));
    });
  }

  return partidos;
}

function mezclarPartidosPlayoff(generados, guardados) {
  const mapa = new Map((guardados || []).map((partido) => [playoffKey(partido), partido]));
  const usados = new Set();
  const salida = generados.map((partido) => {
    const guardado = mapa.get(playoffKey(partido));
    if (guardado) usados.add(playoffKey(partido));
    return {
      ...partido,
      ...(guardado || {}),
      titulo: guardado?.titulo || partido.titulo,
      local: guardado?.local || partido.local,
      visitante: guardado?.visitante || partido.visitante,
      fecha: guardado?.fecha || partido.fecha
    };
  });

  (guardados || []).forEach((partido) => {
    if (!usados.has(playoffKey(partido))) salida.push(partido);
  });

  return salida.sort((a, b) => (Number(a.orden || 0) - Number(b.orden || 0)) || (Number(a.partido_numero || 1) - Number(b.partido_numero || 1)));
}

function partidoPlayoffTieneResultado(partido) {
  return partido?.puntos_local != null && partido?.puntos_visitante != null;
}

function ganadorPartidoPlayoff(partido) {
  if (!partidoPlayoffTieneResultado(partido)) return "";
  const puntosLocal = Number(partido.puntos_local);
  const puntosVisitante = Number(partido.puntos_visitante);
  if (puntosLocal > puntosVisitante) return partido.local || "";
  if (puntosVisitante > puntosLocal) return partido.visitante || "";
  return "";
}

function ganadorSeriePlayoff(partidos, llave) {
  const serie = (partidos || []).filter((partido) => partido.llave === llave);
  if (!serie.length || serie.some((partido) => !partidoPlayoffTieneResultado(partido))) return "";

  const totales = {};
  serie.forEach((partido) => {
    const local = partido.local || "";
    const visitante = partido.visitante || "";
    if (!local || !visitante) return;
    totales[local] = (totales[local] || 0) + Number(partido.puntos_local || 0);
    totales[visitante] = (totales[visitante] || 0) + Number(partido.puntos_visitante || 0);
  });

  const ordenados = Object.entries(totales).sort((a, b) => b[1] - a[1]);
  if (ordenados.length < 2 || ordenados[0][1] === ordenados[1][1]) return "";
  return ordenados[0][0];
}

function posicionEquipoEnTabla(tabla, nombreEquipo) {
  return tabla.findIndex((fila) => nombresEquipoCoinciden(fila.equipo, nombreEquipo)) + 1;
}

function esPlaceholderPlayoff(texto) {
  const normalizado = normalizarTexto(texto || "");
  return !normalizado || normalizado.includes("ganador") || normalizado.includes("mejor ganador") || normalizado.includes("peor ganador");
}

function aplicarAvanceAutomaticoPlayoffs(nombreCategoria, tabla, partidosPlayoff) {
  const buscar = (fase, llave, partidoNumero = 1) =>
    partidosPlayoff.find((partido) => partido.fase === fase && partido.llave === llave && Number(partido.partido_numero || 1) === partidoNumero);

  const actualizarEquipo = (partido, lado, equipo) => {
    if (!partido || !equipo) return;
    if (esPlaceholderPlayoff(partido[lado])) partido[lado] = equipo;
  };

  const clasificados = clasificadosPlayoffCategoria(nombreCategoria);

  if (clasificados === 8) {
    const ganadorA = ganadorPartidoPlayoff(buscar("cuartos", "llave_a"));
    const ganadorB = ganadorPartidoPlayoff(buscar("cuartos", "llave_b"));
    const ganadorC = ganadorPartidoPlayoff(buscar("cuartos", "llave_c"));
    const ganadorD = ganadorPartidoPlayoff(buscar("cuartos", "llave_d"));
    const semi1 = buscar("semifinales", "semi_1");
    const semi2 = buscar("semifinales", "semi_2");

    actualizarEquipo(semi1, "local", ganadorA);
    actualizarEquipo(semi1, "visitante", ganadorB);
    actualizarEquipo(semi2, "local", ganadorC);
    actualizarEquipo(semi2, "visitante", ganadorD);

    const ganadorSemi1 = ganadorSeriePlayoff(partidosPlayoff, "semi_1");
    const ganadorSemi2 = ganadorSeriePlayoff(partidosPlayoff, "semi_2");
    const final = buscar("final", "final", 1);
    actualizarEquipo(final, "local", ganadorSemi1);
    actualizarEquipo(final, "visitante", ganadorSemi2);
  }

  if (clasificados === 6) {
    const ganadoresRepechaje = [
      ganadorPartidoPlayoff(buscar("repechaje", "repechaje_1")),
      ganadorPartidoPlayoff(buscar("repechaje", "repechaje_2"))
    ].filter(Boolean).map((equipo) => ({
      equipo,
      posicion: posicionEquipoEnTabla(tabla, equipo) || 99
    })).sort((a, b) => a.posicion - b.posicion);

    if (ganadoresRepechaje.length === 2) {
      const mejorGanador = ganadoresRepechaje[0].equipo;
      const peorGanador = ganadoresRepechaje[1].equipo;

      partidosPlayoff
        .filter((partido) => partido.llave === "semi_1")
        .forEach((partido) => actualizarEquipo(partido, "visitante", peorGanador));
      partidosPlayoff
        .filter((partido) => partido.llave === "semi_2")
        .forEach((partido) => actualizarEquipo(partido, "visitante", mejorGanador));
    }

    const ganadorSemi1 = ganadorSeriePlayoff(partidosPlayoff, "semi_1");
    const ganadorSemi2 = ganadorSeriePlayoff(partidosPlayoff, "semi_2");
    partidosPlayoff
      .filter((partido) => partido.llave === "final")
      .forEach((partido) => {
        actualizarEquipo(partido, "local", ganadorSemi1);
        actualizarEquipo(partido, "visitante", ganadorSemi2);
      });
  }

  return partidosPlayoff;
}

function renderResultadoPlayoff(partido) {
  if (!partidoPlayoffTieneResultado(partido)) {
    return `<span class="playoff-result pending">Pendiente</span>`;
  }

  return `<span class="playoff-result">${escapeHtml(String(partido.puntos_local))} - ${escapeHtml(String(partido.puntos_visitante))}</span>`;
}

function renderPlayoffMatchGuardado(titulo, partido, slotA, slotB) {
  return renderPlayoffMatch(titulo, slotA, slotB, renderResultadoPlayoff(partido));
}

function renderResumenResultadosPlayoff(partidos) {
  const jugados = (partidos || []).filter(partidoPlayoffTieneResultado);
  if (!jugados.length) return "";

  return `
    <div class="playoff-results-summary">
      <h4>Resultados de playoffs</h4>
      ${jugados.map((partido) => `
        <div class="playoff-results-row">
          <span>${escapeHtml(partido.titulo || partido.llave || partido.fase || "Playoff")}</span>
          <strong>${escapeHtml(partido.local)} ${escapeHtml(String(partido.puntos_local))} - ${escapeHtml(String(partido.puntos_visitante))} ${escapeHtml(partido.visitante)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function obtenerCategoriaPorNombre(nombreCategoria) {
  return estado.categorias.find((cat) => cat.nombre === nombreCategoria) || null;
}

function categoriaUsaPlayoffsPublicos(nombreCategoria) {
  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  const resultadosPlayoffGuardados = estado.playoffsPorCategoria[nombreCategoria] || [];
  return !!categoria?.playoffs ||
    Number(categoria?.clasificados || 0) > 0 ||
    resultadosPlayoffGuardados.some(partidoPlayoffTieneResultado);
}

function clasificadosPlayoffCategoria(nombreCategoria) {
  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  return Number(categoria?.clasificados || 0);
}

function normalizarClaveRonda(nombre) {
  return normalizarTexto(nombre).replace(/\s+/g, "_");
}

function obtenerDatosRondaPlayoff(nombreCategoria, ronda) {
  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  const series = categoria?.series_playoff || {};
  const clave = normalizarClaveRonda(ronda);
  const posiblesClaves = {
    cuartos: ["cuartos", "cuartos_de_final"],
    clasificacion: ["clasificacion", "repechaje", "repechajes"],
    semifinales: ["semifinales", "semi", "semis"],
    final: ["final"]
  }[clave] || [clave];

  for (const posible of posiblesClaves) {
    if (series[posible]) return series[posible];
  }

  return obtenerDatosRondaPlayoffFallback(nombreCategoria, clave);
}

function obtenerDatosRondaPlayoffFallback(nombreCategoria, clave) {
  if (nombreCategoria === "Maxi +35 A" || nombreCategoria === "Maxi +35 B") {
    const datos35 = {
      cuartos: { partidos: 1, fecha: "2026-06-21" },
      semifinales: { partidos: 1, fecha: "2026-06-28" },
      final: { partidos: 3, fechas: ["2026-07-05", "2026-07-12", "2026-07-19"] }
    };
    return datos35[clave] || {};
  }

  if (nombreCategoria === "Maxi +48") {
    const datos48 = {
      clasificacion: { partidos: 1, fecha: "2026-06-17" },
      semifinales: { partidos: 2, fechas: ["2026-06-24", "2026-07-01"] },
      final: { partidos: 2, fechas: ["2026-07-08", "2026-07-15"] }
    };
    return datos48[clave] || {};
  }

  return {};
}

function renderMetaRondaPlayoff(nombreCategoria, ronda) {
  const datos = obtenerDatosRondaPlayoff(nombreCategoria, ronda);
  const partidos = datos.partidos || datos.cantidad_partidos || datos.juegos || datos.mejor_de || "";
  const fechas = Array.isArray(datos.fechas) ? datos.fechas : [];
  const fecha = datos.fecha || datos.fecha_inicio || datos.dia || fechas[0] || "";
  const partes = [];

  if (partidos) {
    partes.push(Number(partidos) === 1 ? "1 partido" : `${partidos} partidos`);
  } else {
    partes.push("Partidos a confirmar");
  }

  if (fechas.length > 1) {
    partes.push(fechas.map((item) => fechaPartidoLabel(item) || item).join(", "));
  } else {
    partes.push(fecha ? fechaPartidoLabel(fecha) || fecha : "Fecha a confirmar");
  }

  return `<span class="playoff-round-meta">${partes.map(escapeHtml).join(" - ")}</span>`;
}

function renderPlayoffRoundTitulo(titulo, nombreCategoria, ronda) {
  return `<h4>${escapeHtml(titulo)}${renderMetaRondaPlayoff(nombreCategoria, ronda)}</h4>`;
}

function renderEquipoEstadoCompetencia(posicion, equipo, estadoTexto, detalle = "") {
  return `
    <div class="playoff-status-row">
      <div class="playoff-status-team">
        <span class="playoff-seed">${posicion}</span>
        ${equipo ? escudoEquipoHtml(equipo.equipo, "sm") : ""}
        <strong>${escapeHtml(equipo?.equipo || "Por definir")}</strong>
      </div>
      <div>
        <span class="playoff-status-label">${escapeHtml(estadoTexto)}</span>
        ${detalle ? `<small>${escapeHtml(detalle)}</small>` : ""}
      </div>
    </div>
  `;
}

function renderPromocionDescenso(nombreCategoria, tabla) {
  if (nombreCategoria === "Maxi +35 A") {
    return `
      <div class="playoff-status-box">
        <h4>Promocion y descenso</h4>
        ${renderEquipoEstadoCompetencia("9no", tabla[8], "Promocion", "Juega contra el subcampeon de playoffs de Maxi +35 B.")}
        ${renderEquipoEstadoCompetencia("10mo", tabla[9], "Descenso directo", "Desciende a Maxi +35 B.")}
      </div>
    `;
  }

  if (nombreCategoria === "Maxi +35 B") {
    return `
      <div class="playoff-status-box">
        <h4>Ascenso y promocion</h4>
        ${renderEquipoEstadoCompetencia("Campeon", null, "Ascenso directo", "El campeon de playoffs asciende a Maxi +35 A.")}
        ${renderEquipoEstadoCompetencia("Subcampeon", null, "Promocion", "El subcampeon de playoffs juega contra el 9no de Maxi +35 A.")}
      </div>
    `;
  }

  return "";
}

function renderPlayoffBracketVacio(nombreCategoria, cantidadEquipos) {
  const clasificados = clasificadosPlayoffCategoria(nombreCategoria);

  if (clasificados === 8 && cantidadEquipos >= 8) {
    return `
      <div class="playoff-bracket playoff-bracket-three">
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Cuartos", nombreCategoria, "cuartos")}
          ${renderPlayoffMatch("Llave A", renderPlayoffSlot(1, null), renderPlayoffSlot(8, null))}
          ${renderPlayoffMatch("Llave B", renderPlayoffSlot(4, null), renderPlayoffSlot(5, null))}
          ${renderPlayoffMatch("Llave C", renderPlayoffSlot(2, null), renderPlayoffSlot(7, null))}
          ${renderPlayoffMatch("Llave D", renderPlayoffSlot(3, null), renderPlayoffSlot(6, null))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Semifinales", nombreCategoria, "semifinales")}
          ${renderPlayoffMatch("Semi 1", renderPlayoffPendiente("Ganador 1/8"), renderPlayoffPendiente("Ganador 4/5"))}
          ${renderPlayoffMatch("Semi 2", renderPlayoffPendiente("Ganador 2/7"), renderPlayoffPendiente("Ganador 3/6"))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Final", nombreCategoria, "final")}
          ${renderPlayoffMatch("Final", renderPlayoffPendiente("Ganador Semi 1"), renderPlayoffPendiente("Ganador Semi 2"))}
        </div>
      </div>
    `;
  }

  if (clasificados === 6 && cantidadEquipos >= 6) {
    return `
      <div class="playoff-bracket playoff-bracket-three">
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Repechaje", nombreCategoria, "clasificacion")}
          ${renderPlayoffMatch("Repechaje 1", renderPlayoffSlot(3, null), renderPlayoffSlot(6, null))}
          ${renderPlayoffMatch("Repechaje 2", renderPlayoffSlot(4, null), renderPlayoffSlot(5, null))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Semifinales", nombreCategoria, "semifinales")}
          ${renderPlayoffMatch("Semi 1", renderPlayoffSlot(1, null, "Directo"), renderPlayoffPendiente("Peor ganador de repechaje"))}
          ${renderPlayoffMatch("Semi 2", renderPlayoffSlot(2, null, "Directo"), renderPlayoffPendiente("Mejor ganador de repechaje"))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Final", nombreCategoria, "final")}
          ${renderPlayoffMatch("Final", renderPlayoffPendiente("Ganador Semi 1"), renderPlayoffPendiente("Ganador Semi 2"))}
        </div>
      </div>
    `;
  }

  return "";
}

function renderPlayoffsSimple(nombreCategoria, partidos) {
  const containerPrincipal = document.getElementById("publico-playoffs-principal");
  const containerSecundario = document.getElementById("publico-playoffs");
  if (!containerPrincipal && !containerSecundario) return;

  if (containerPrincipal) containerPrincipal.innerHTML = "";
  if (containerSecundario) containerSecundario.innerHTML = "";

  const tabla = calcularTabla(partidos);
  const cantidadEquipos = tabla.length;
  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  const llaveConfigurada = !!categoria?.playoffs || Number(categoria?.clasificados || 0) > 0;
  const resultadosPlayoffGuardados = estado.playoffsPorCategoria[nombreCategoria] || [];
  const playoffsConActividad = resultadosPlayoffGuardados.some(partidoTieneResultado);
  const faseRegularCerrada = partidos.length > 0 && (partidos.every(partidoTieneResultado) || playoffsConActividad);

  if (!llaveConfigurada && !playoffsConActividad) {
    return;
  }

  const partidosPlayoff = aplicarAvanceAutomaticoPlayoffs(nombreCategoria, tabla, mezclarPartidosPlayoff(
    generarPartidosPlayoff(nombreCategoria, tabla),
    resultadosPlayoffGuardados
  ));
  const buscarPlayoff = (fase, llave, partidoNumero = 1) =>
    partidosPlayoff.find((partido) => partido.fase === fase && partido.llave === llave && Number(partido.partido_numero || 1) === partidoNumero) ||
    crearPlayoffMatch(fase, llave, "", 0, partidoNumero, "", "");

  if (!cantidadEquipos) {
    return;
  }

  const equipo = (posicion) => tabla[posicion - 1] || null;
  let bracket = "";

  const clasificados = clasificadosPlayoffCategoria(nombreCategoria);

  if (clasificados === 8 && cantidadEquipos >= 8) {
    const qfA = buscarPlayoff("cuartos", "llave_a");
    const qfB = buscarPlayoff("cuartos", "llave_b");
    const qfC = buscarPlayoff("cuartos", "llave_c");
    const qfD = buscarPlayoff("cuartos", "llave_d");
    const semi1 = buscarPlayoff("semifinales", "semi_1");
    const semi2 = buscarPlayoff("semifinales", "semi_2");
    const final1 = buscarPlayoff("final", "final", 1);

    bracket = `
      <div class="playoff-bracket playoff-bracket-three">
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Cuartos", nombreCategoria, "cuartos")}
          ${renderPlayoffMatchGuardado("Llave A", qfA, renderPlayoffSlot(1, equipo(1)), renderPlayoffSlot(8, equipo(8)))}
          ${renderPlayoffMatchGuardado("Llave B", qfB, renderPlayoffSlot(4, equipo(4)), renderPlayoffSlot(5, equipo(5)))}
          ${renderPlayoffMatchGuardado("Llave C", qfC, renderPlayoffSlot(2, equipo(2)), renderPlayoffSlot(7, equipo(7)))}
          ${renderPlayoffMatchGuardado("Llave D", qfD, renderPlayoffSlot(3, equipo(3)), renderPlayoffSlot(6, equipo(6)))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Semifinales", nombreCategoria, "semifinales")}
          ${renderPlayoffMatchGuardado("Semi 1", semi1, renderPlayoffSlotDinamico(semi1.local || "Ganador 1/8"), renderPlayoffSlotDinamico(semi1.visitante || "Ganador 4/5"))}
          ${renderPlayoffMatchGuardado("Semi 2", semi2, renderPlayoffSlotDinamico(semi2.local || "Ganador 2/7"), renderPlayoffSlotDinamico(semi2.visitante || "Ganador 3/6"))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Final", nombreCategoria, "final")}
          ${renderPlayoffMatchGuardado("Final", final1, renderPlayoffSlotDinamico(final1.local || "Ganador Semi 1"), renderPlayoffSlotDinamico(final1.visitante || "Ganador Semi 2"))}
        </div>
      </div>
    `;
  }

  if (clasificados === 6 && cantidadEquipos >= 6) {
    const repechaje1 = buscarPlayoff("repechaje", "repechaje_1");
    const repechaje2 = buscarPlayoff("repechaje", "repechaje_2");
    const semi1p1 = buscarPlayoff("semifinales", "semi_1", 1);
    const semi2p1 = buscarPlayoff("semifinales", "semi_2", 1);
    const final1 = buscarPlayoff("final", "final", 1);

    bracket = `
      <div class="playoff-bracket playoff-bracket-three">
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Repechaje", nombreCategoria, "clasificacion")}
          ${renderPlayoffMatchGuardado("Repechaje 1", repechaje1, renderPlayoffSlot(3, equipo(3)), renderPlayoffSlot(6, equipo(6)))}
          ${renderPlayoffMatchGuardado("Repechaje 2", repechaje2, renderPlayoffSlot(4, equipo(4)), renderPlayoffSlot(5, equipo(5)))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Semifinales", nombreCategoria, "semifinales")}
          ${renderPlayoffMatchGuardado("Semi 1", semi1p1, renderPlayoffSlot(1, equipo(1), "1 directo"), renderPlayoffSlotDinamico(semi1p1.visitante || "Peor ganador de repechaje"))}
          ${renderPlayoffMatchGuardado("Semi 2", semi2p1, renderPlayoffSlot(2, equipo(2), "2 directo"), renderPlayoffSlotDinamico(semi2p1.visitante || "Mejor ganador de repechaje"))}
        </div>
        <div class="playoff-round">
          ${renderPlayoffRoundTitulo("Final", nombreCategoria, "final")}
          ${renderPlayoffMatchGuardado("Final", final1, renderPlayoffSlotDinamico(final1.local || "Ganador Semi 1"), renderPlayoffSlotDinamico(final1.visitante || "Ganador Semi 2"))}
        </div>
      </div>
    `;
  }

  if (!bracket) {
    return;
  }

  const playoffsProtagonistas = faseRegularCerrada || playoffsConActividad;
  const container = playoffsProtagonistas && containerPrincipal
    ? containerPrincipal
    : containerSecundario || containerPrincipal;
  const cardClass = playoffsProtagonistas
    ? "card playoff-card playoff-card-featured"
    : "playoff-card playoff-card-secondary";

  const bracketVacio = renderPlayoffBracketVacio(nombreCategoria, cantidadEquipos);
  const promocionDescenso = renderPromocionDescenso(nombreCategoria, tabla);
  const resumenResultadosPlayoff = renderResumenResultadosPlayoff(partidosPlayoff);
  const descripcionPlayoffs = faseRegularCerrada
    ? `Llave oficial segun tabla final de ${escapeHtml(nombreCategoria)}.`
    : `Llave base y proyeccion segun la tabla actual de ${escapeHtml(nombreCategoria)}.`;
  const contenidoPlayoffs = faseRegularCerrada
    ? `
      <div class="playoff-empty-title">Llave de playoffs</div>
      ${bracket}
      ${resumenResultadosPlayoff}
      ${promocionDescenso}
    `
    : `
      <div class="playoff-empty-title">Llave de playoffs</div>
      ${bracketVacio}
      <details class="playoff-preview">
        <summary>Completar con tabla de hoy</summary>
        ${bracket}
        ${resumenResultadosPlayoff}
        ${promocionDescenso}
      </details>
    `;

  container.innerHTML = `
    <div class="${cardClass}">
      <div class="playoff-head">
        <div>
          <h3>Playoffs</h3>
          <p>${descripcionPlayoffs}</p>
        </div>
      </div>
      ${contenidoPlayoffs}
    </div>
  `;
}

async function renderPublicoCategoria(nombreCategoria) {
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  if (categoriaUsaPlayoffsPublicos(nombreCategoria)) {
    await cargarResultadosPlayoffCategoria(nombreCategoria, true);
  }
  renderTablaSimple(nombreCategoria, partidos);
  renderFixturePublico(nombreCategoria);
  renderFechaDestacada(nombreCategoria);
  renderPlayoffsSimple(nombreCategoria, partidos);
}

function mostrarCargaPublico(nombreCategoria) {
  const tabla = $("publico-tabla-wrap");
  const fixture = $("publico-fixture");
  const fecha = $("fecha-destacada");
  const playoffsPrincipal = $("publico-playoffs-principal");
  const playoffs = $("publico-playoffs");
  const mensaje = `<div class="empty">Cargando ${escapeHtml(nombreCategoria || "categoría")}...</div>`;

  if (tabla) tabla.innerHTML = mensaje;
  if (fixture) fixture.innerHTML = mensaje;
  if (fecha) fecha.innerHTML = `<div class="card">${mensaje}</div>`;
  if (playoffsPrincipal) playoffsPrincipal.innerHTML = "";
  if (playoffs) playoffs.innerHTML = "";
}

async function refrescarPublicoCategoria(nombreCategoria) {
  if (!nombreCategoria) return;

  const cargaId = ++estado.publicoCargaActual;
  const partidosCache = leerCachePublica("partidos", `${TORNEO_ID}_${nombreCategoria}`);
  if (partidosCache?.length) {
    estado.partidosPorCategoria[nombreCategoria] = partidosCache;
    renderTablaSimple(nombreCategoria, partidosCache);
    renderFixturePublico(nombreCategoria);
    renderFechaDestacada(nombreCategoria);
    renderPlayoffsSimple(nombreCategoria, partidosCache);
  } else {
    mostrarCargaPublico(nombreCategoria);
  }

  try {
    const cargas = [cargarPartidosCategoria(nombreCategoria)];
    if (categoriaUsaPlayoffsPublicos(nombreCategoria)) {
      cargas.push(cargarResultadosPlayoffCategoria(nombreCategoria, true));
    }
    await Promise.all(cargas);

    const categoriaActual = $("publico-categoria")?.value || "";
    if (cargaId !== estado.publicoCargaActual || categoriaActual !== nombreCategoria) {
      return;
    }

    renderPublicoCategoria(nombreCategoria);
    registrarUso("categoria_publico", {
      area: "publico",
      categoria: nombreCategoria
    });
  } catch (error) {
    if (cargaId !== estado.publicoCargaActual) return;

    const tabla = $("publico-tabla-wrap");
    if (tabla) {
      tabla.innerHTML = `<div class="empty">No se pudo cargar la categoría: ${escapeHtml(error.message)}</div>`;
    }
  }
}

function inicializarDatosInternosEnSegundoPlano(categoriaInicial) {
  window.setTimeout(async () => {
    try {
      await inicializarSesionAuth();
      await cargarRequisitosDocumentales();
      await refrescarCategoria(categoriaInicial, {
        actualizarPublico: false,
        incluirPartidos: false,
        incluirPlayoffs: false,
        incluirProgramacion: false
      });

      if ($("delegado-categoria")) $("delegado-categoria").value = categoriaInicial;
      poblarSelectPartidosDelegado(categoriaInicial);
      aplicarBloqueoDelegado();
      renderDocumentacionDelegado();

      await inicializarAsociacion();
    } catch (error) {
      console.warn("No se pudieron cargar datos internos iniciales:", error);
    }
  }, 0);
}

function completarInputsPartidoSeleccionado() {
  const categoria = $("delegado-categoria").value;
  const partidoId = $("delegado-partido").value;
  const partidos = estado.partidosPorCategoria[categoria] || [];
  const partido = partidos.find((p) => p.id === partidoId);

  $("delegado-puntos-local").value = partido?.puntos_local ?? "";
  $("delegado-puntos-visitante").value = partido?.puntos_visitante ?? "";
}

function poblarSelectPartidosDelegado(nombreCategoria) {
  const select = $("delegado-partido");
  if (!select) return;

  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const partidosFiltrados = partidos.filter((p) =>
    estado.delegado &&
    (
      estado.delegado.equipos.includes(p.local) ||
      estado.delegado.equipos.includes(p.visitante) ||
      estado.delegado.equipos.includes(p.libre)
    )
  );

  select.innerHTML = "";

  if (!partidosFiltrados.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No hay partidos cargados";
    select.appendChild(option);

    $("delegado-puntos-local").value = "";
    $("delegado-puntos-visitante").value = "";
    if ($("delegado-guardar")) $("delegado-guardar").disabled = !estado.delegadoDesbloqueado;
    return;
  }

  partidosFiltrados.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `Fecha ${p.jornada || "-"} · ${p.local} vs ${p.visitante}`;
    select.appendChild(option);
  });

  completarInputsPartidoSeleccionado();
}

async function refrescarCategoria(nombreCategoria, opciones = {}) {
  const {
    incluirDocumentacion = true,
    actualizarPublico = true,
    incluirPartidos = true,
    incluirPlayoffs = true,
    incluirProgramacion = true,
    incluirAuditoria = true
  } = opciones;
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  if (categoria && incluirDocumentacion) {
    await cargarEquiposCategoria(categoria.id);
    await cargarDocumentosCategoria(categoria.id);
    await cargarJugadoresCategoria(categoria.id);
    await cargarDocumentosJugadoresCategoria(categoria.id);
  }
  if (categoria?.id && incluirAuditoria) await cargarAuditoriaDocumentalCategoria(categoria.id);

  if (incluirPartidos) await cargarPartidosCategoria(nombreCategoria);
  if (incluirPlayoffs) await cargarResultadosPlayoffCategoria(nombreCategoria, true);
  if (categoria?.id && incluirProgramacion) await cargarProgramacionCategoria(categoria.id);
  if (actualizarPublico) renderPublicoCategoria(nombreCategoria);
}

async function guardarResultadoDelegado() {
  const categoria = $("delegado-categoria").value;
  const partidoId = $("delegado-partido").value;
  const puntosLocal = $("delegado-puntos-local").value;
  const puntosVisitante = $("delegado-puntos-visitante").value;
  const status = $("delegado-status");

  if (!estado.delegadoDesbloqueado) {
    setStatus(status, "Primero habilitá edición con la clave.", "warn");
    return;
  }

  if (!partidoId) {
    setStatus(status, "Seleccioná un partido.", "warn");
    return;
  }

  if (puntosLocal === "" || puntosVisitante === "") {
    setStatus(status, "Completá ambos tanteadores.", "warn");
    return;
  }

  const pl = Number(puntosLocal);
  const pv = Number(puntosVisitante);

  if (!Number.isFinite(pl) || !Number.isFinite(pv) || pl < 0 || pv < 0) {
    setStatus(status, "Los tanteadores deben ser números válidos.", "warn");
    return;
  }

  const confirmar = confirm(`¿Confirmás ${pl} - ${pv}?`);
  if (!confirmar) {
    setStatus(status, "Operación cancelada.", "warn");
    return;
  }

  setStatus(status, "Guardando resultado...", "");

  const { error } = await supabaseClient
    .from("partidos")
    .update({
      puntos_local: pl,
      puntos_visitante: pv,
      estado_resultado: "jugado",
      cargado_por: estado.delegado?.nombre || null,
      cargado_en: new Date().toISOString()
    })
    .eq("id", partidoId);

  if (error) {
    setStatus(status, `No se pudo guardar: ${error.message}`, "error");
    return;
  }

  $("publico-categoria").value = categoria;
  await refrescarCategoria(categoria);
  poblarSelectPartidosDelegado(categoria);
  registrarUso("resultado_cargado", {
    area: "delegados",
    categoria,
    user: estado.delegado?.nombre || null,
    role: estado.delegado?.rol || "delegado"
  });

  setStatus(status, "Resultado guardado correctamente.", "ok");
}

async function subirDocumentoDelegado(event) {
  const input = event.target;
  if (!input?.classList?.contains("doc-upload-input")) return;

  const status = $("delegado-status");
  const files = Array.from(input.files || []);
  const documentId = input.dataset.documentId;
  const documento = obtenerDocumentoPorId(documentId);
  const multiple = permiteMultiplesArchivos(documento?.requirement_nombre);
  const validationError = files.length
    ? files.map((file) => validarArchivoDocumento(file, multiple)).find(Boolean)
    : "Seleccioná un archivo.";

  if (validationError) {
    setStatus(status, validationError, "warn");
    input.value = "";
    return;
  }

  if (!estado.delegadoDesbloqueado || !estado.delegado) {
    setStatus(status, "Primero habilitá edición con la clave.", "warn");
    input.value = "";
    return;
  }

  const categoriaNombre = $("delegado-categoria")?.value || "";
  const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);

  if (!documento || !categoria) {
    setStatus(status, "No se encontró el registro documental.", "error");
    input.value = "";
    return;
  }

  const requisito = obtenerRequisitoDocumental(documento.requirement_nombre);
  const vencimientoInput = document.querySelector(`.doc-expiry-input[data-document-id="${documentId}"]`);
  const vencimiento = vencimientoInput?.value || null;

  if (requisito?.requiere_vencimiento && !vencimiento) {
    setStatus(status, "Completá la fecha de vencimiento antes de subir este documento.", "warn");
    input.value = "";
    return;
  }

  const equipoPermitido = estado.delegado.equipos.includes(documento.equipo_nombre);
  if (!equipoPermitido) {
    setStatus(status, "Ese documento no pertenece a tu equipo.", "error");
    input.value = "";
    return;
  }

  input.disabled = true;
  setStatus(status, `Subiendo ${files.length} archivo${files.length === 1 ? "" : "s"}...`, "");

  for (const file of files) {
    const storagePath = [
      APP_CONFIG.organizacionActiva.storageSlug,
      "2026",
      slugify(categoriaNombre),
      documento.equipo_id || slugify(documento.equipo_nombre),
      documento.requirement_id,
      `${Date.now()}-${nombreArchivoSeguro(file.name)}`
    ].join("/");

    const { error: uploadError } = await supabaseClient.storage
      .from("documentos")
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      input.disabled = false;
      input.value = "";
      setStatus(status, `No se pudo subir ${file.name}: ${uploadError.message}`, "error");
      return;
    }

    const rpcName = multiple ? "add_team_document_file" : "mark_team_document_uploaded";
    const rpcPayload = multiple
      ? {
          p_document_id: documento.id,
          p_uploaded_by: estado.delegado.nombre,
          p_storage_path: storagePath,
          p_file_name: file.name,
          p_file_type: file.type,
          p_file_size: file.size
        }
      : {
          p_document_id: documento.id,
          p_uploaded_by: estado.delegado.nombre,
          p_storage_path: storagePath,
          p_file_name: file.name,
          p_file_type: file.type,
          p_file_size: file.size,
          p_vencimiento: vencimiento
        };
    const { error: rpcError } = await supabaseClient.rpc(rpcName, rpcPayload);

    if (rpcError) {
      input.disabled = false;
      input.value = "";
      setStatus(status, `El archivo subió, pero no se pudo registrar: ${rpcError.message}`, "error");
      return;
    }
  }

  await cargarDocumentosCategoria(categoria.id, true);
  renderDocumentacionDelegado();

  if ($("asociacion-categoria")?.value === categoriaNombre) {
    renderDocumentacionAsociacion(categoriaNombre);
  }

  registrarUso("documento_cargado", {
    area: "delegados",
    categoria: categoriaNombre,
    equipo: documento.equipo_nombre,
    user: estado.delegado?.nombre || null,
    role: estado.delegado?.rol || "delegado"
  });

  setStatus(status, "Documento cargado correctamente. Queda pendiente de revisión.", "ok");
}

async function agregarJugadorDelegado() {
  const status = $("delegado-status");

  if (!estado.delegadoDesbloqueado || !estado.delegado) {
    setStatus(status, "Primero habilitá edición con la clave.", "warn");
    return;
  }

  const categoriaNombre = $("delegado-categoria")?.value || "";
  const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);
  const equipoNombre = $("jugador-equipo")?.value || "";
  const nombre = $("jugador-nombre")?.value?.trim() || "";
  const dni = $("jugador-dni")?.value?.trim() || "";
  const dorsal = $("jugador-dorsal")?.value?.trim() || "";

  if (!categoria || !equipoNombre) {
    setStatus(status, "Seleccioná categoría y equipo.", "warn");
    return;
  }

  if (categoriaNombre === "Femenino") {
    setStatus(status, "La carga de jugadores no esta habilitada para Femenino desde Delegados.", "warn");
    return;
  }

  if (!nombre) {
    setStatus(status, "Ingresá el nombre del jugador.", "warn");
    return;
  }

  if (!estado.delegado.equipos.includes(equipoNombre)) {
    setStatus(status, "Ese equipo no está habilitado para tu clave.", "error");
    return;
  }

  if (jugadorYaExiste(categoriaNombre, equipoNombre, nombre, dni, dorsal)) {
    setStatus(status, "Ese jugador ya figura en este equipo. Revisá la tabla de documentos por jugador.", "warn");
    return;
  }

  const equipo = (estado.equiposPorCategoriaId[categoria.id] || [])
    .find((item) => normalizarTexto(item.nombre) === normalizarTexto(equipoNombre));

  setStatus(status, "Agregando jugador...", "");

  const { error } = await supabaseClient.rpc("add_team_player", {
    p_organizacion_id: null,
    p_torneo_id: TORNEO_ID,
    p_categoria_id: categoria.id,
    p_equipo_id: equipo?.id || null,
    p_equipo_nombre: equipoNombre,
    p_nombre: nombre,
    p_dni: dni || null,
    p_dorsal: dorsal || null,
    p_created_by: estado.delegado.nombre
  });

  if (error) {
    setStatus(status, `No se pudo agregar el jugador: ${error.message}`, "error");
    return;
  }

  $("jugador-nombre").value = "";
  $("jugador-dni").value = "";
  $("jugador-dorsal").value = "";

  await cargarJugadoresCategoria(categoria.id, true);
  await cargarDocumentosJugadoresCategoria(categoria.id, true);
  renderDocumentacionDelegado();

  if ($("asociacion-categoria")?.value === categoriaNombre) {
    renderDocumentacionAsociacion(categoriaNombre);
  }

  registrarUso("jugador_agregado", {
    area: "delegados",
    categoria: categoriaNombre,
    equipo: equipoNombre,
    user: estado.delegado?.nombre || null,
    role: estado.delegado?.rol || "delegado"
  });

  setStatus(status, "Jugador agregado. Ya podés cargar sus documentos.", "ok");
}

async function solicitarBajaJugadorDelegado(event) {
  const button = event.target.closest(".doc-player-request-remove-btn");
  if (!button) return;

  const status = $("delegado-status");
  const categoriaNombre = $("delegado-categoria")?.value || "";
  const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);
  const playerId = button.dataset.playerId;
  const playerName = button.dataset.playerName || "jugador";

  if (!estado.delegadoDesbloqueado || !estado.delegado) {
    setStatus(status, "Primero habilita edicion con la clave.", "warn");
    return;
  }

  if (!categoria || !playerId) {
    setStatus(status, "No se encontro el jugador seleccionado.", "error");
    return;
  }

  const motivo = prompt(`Motivo de solicitud para ${playerName}:`, "Cargado por error / corregir jugador");
  if (motivo === null) {
    setStatus(status, "Operacion cancelada.", "warn");
    return;
  }

  button.disabled = true;
  setStatus(status, "Enviando solicitud a Asociacion...", "");

  const { error } = await supabaseClient.rpc("request_team_player_deactivation", {
    p_player_id: playerId,
    p_actor: estado.delegado.nombre,
    p_reason: motivo || "Solicitud de baja/correccion"
  });

  if (error) {
    button.disabled = false;
    setStatus(status, `No se pudo enviar la solicitud: ${error.message}. Si la funcion no existe, corre docs/ejecutar-en-supabase-baja-jugadores.sql.`, "error");
    return;
  }

  await cargarJugadoresCategoria(categoria.id, true);
  await cargarDocumentosJugadoresCategoria(categoria.id, true);
  renderDocumentacionDelegado();
  registrarUso("jugador_solicitud_baja", {
    area: "delegados",
    categoria: categoriaNombre,
    user: estado.delegado?.nombre || null,
    role: estado.delegado?.rol || "delegado"
  });
  setStatus(status, "Solicitud enviada a Asociacion para revisar.", "ok");
}

async function subirDocumentoJugadorDelegado(event) {
  const input = event.target;
  if (!input?.classList?.contains("player-doc-upload-input")) return;

  const status = $("delegado-status");
  const file = input.files?.[0] || null;
  const documentId = input.dataset.documentId;
  const documento = obtenerDocumentoJugadorPorId(documentId);
  const validationError = file ? validarArchivoDocumento(file, false) : "Seleccioná un archivo.";

  if (validationError) {
    setStatus(status, validationError, "warn");
    input.value = "";
    return;
  }

  if (!estado.delegadoDesbloqueado || !estado.delegado) {
    setStatus(status, "Primero habilitá edición con la clave.", "warn");
    input.value = "";
    return;
  }

  if (!documento) {
    setStatus(status, "No se encontró el documento del jugador.", "error");
    input.value = "";
    return;
  }

  const categoriaNombre = $("delegado-categoria")?.value || "";
  const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);

  if (!categoria) {
    setStatus(status, "No se encontró la categoría.", "error");
    input.value = "";
    return;
  }

  if (!estado.delegado.equipos.includes(documento.equipo_nombre)) {
    setStatus(status, "Ese jugador no pertenece a tu equipo habilitado.", "error");
    input.value = "";
    return;
  }

  input.disabled = true;
  setStatus(status, "Subiendo documento del jugador...", "");

  const storagePath = [
    APP_CONFIG.organizacionActiva.storageSlug,
    "2026",
    slugify(categoriaNombre),
    documento.equipo_id || slugify(documento.equipo_nombre),
    "jugadores",
    documento.player_id,
    documento.requirement_id,
    `${Date.now()}-${nombreArchivoSeguro(file.name)}`
  ].join("/");

  const { error: uploadError } = await supabaseClient.storage
    .from("documentos")
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    input.disabled = false;
    input.value = "";
    setStatus(status, `No se pudo subir ${file.name}: ${uploadError.message}`, "error");
    return;
  }

  const { error: rpcError } = await supabaseClient.rpc("mark_player_document_uploaded", {
    p_document_id: documento.id,
    p_uploaded_by: estado.delegado.nombre,
    p_storage_path: storagePath,
    p_file_name: file.name,
    p_file_type: file.type,
    p_file_size: file.size,
    p_vencimiento: null
  });

  if (rpcError) {
    input.disabled = false;
    input.value = "";
    setStatus(status, `El archivo subió, pero no se pudo registrar: ${rpcError.message}`, "error");
    return;
  }

  await cargarDocumentosJugadoresCategoria(categoria.id, true);
  renderDocumentacionDelegado();

  if ($("asociacion-categoria")?.value === categoriaNombre) {
    renderDocumentacionAsociacion(categoriaNombre);
  }

  registrarUso("documento_jugador_cargado", {
    area: "delegados",
    categoria: categoriaNombre,
    equipo: documento.equipo_nombre,
    user: estado.delegado?.nombre || null,
    role: estado.delegado?.rol || "delegado"
  });

  setStatus(status, "Documento del jugador cargado correctamente. Queda pendiente de revisión.", "ok");
}

async function desbloquearDelegado() {
  const clave = $("delegado-clave").value.trim();
  const status = $("delegado-status");

  setStatus(status, "Validando acceso...", "");
  const delegado = await validarDelegadoConPermisos(clave);

  if (!delegado) {
    estado.delegado = null;
    estado.delegadoDesbloqueado = false;
    aplicarBloqueoDelegado();
    renderDocumentacionDelegado();
    setStatus(status, "Clave incorrecta.", "error");
    return;
  }

  estado.delegado = delegado;
  estado.delegadoDesbloqueado = true;
  aplicarBloqueoDelegado();
  registrarUso("acceso_delegado", {
    area: "delegados",
    user: delegado.nombre,
    role: delegado.rol || "delegado"
  });

  poblarSelectCategorias(
    "delegado-categoria",
    estado.categorias.filter((cat) => delegado.categorias.includes(cat.nombre))
  );

  const primeraCategoria = $("delegado-categoria").value;
  if (primeraCategoria) {
    refrescarCategoria(primeraCategoria, { actualizarPublico: false }).then(() => {
      poblarSelectPartidosDelegado(primeraCategoria);
      renderDocumentacionDelegado();
    });
  }

  setStatus(status, `Edición habilitada para ${delegado.nombre}.`, "ok");

  const info = $("delegado-info");
  if (info) {
    info.innerHTML = `
      Delegado: ${delegado.nombre}<br>
      Categorías: ${delegado.categorias.join(", ")}
    `;
  }

  renderDocumentacionDelegado();
}

function poblarSelectPartidosAsociacion(nombreCategoria) {
  const select = $("asociacion-partido");
  if (!select) return;

  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  select.innerHTML = "";

  if (!partidos.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No hay partidos cargados";
    select.appendChild(option);

    $("asociacion-puntos-local").value = "";
    $("asociacion-puntos-visitante").value = "";
    $("asociacion-detalle").innerHTML = "No hay partidos cargados para esta categoría.";
    return;
  }

  partidos.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `Fecha ${p.jornada || "-"} · ${p.local} vs ${p.visitante}`;
    select.appendChild(option);
  });

  completarInputsAsociacion();
}

function completarInputsAsociacion() {
  const categoria = $("asociacion-categoria").value;
  const partidoId = $("asociacion-partido").value;
  const partidos = estado.partidosPorCategoria[categoria] || [];
  const partido = partidos.find((p) => p.id === partidoId);

  $("asociacion-puntos-local").value = partido?.puntos_local ?? "";
  $("asociacion-puntos-visitante").value = partido?.puntos_visitante ?? "";

  const detalle = $("asociacion-detalle");
  if (!detalle) return;

  if (!partido) {
    detalle.innerHTML = "Seleccioná un partido para ver quién lo cargó y cuándo.";
    return;
  }

  detalle.innerHTML = `
    <strong>${partido.local} vs ${partido.visitante}</strong><br>
    Estado: ${escapeHtml(resultadoPartidoLabel(partido))}<br>
    Cargado por: ${partido.cargado_por || "Sin registro"}<br>
    Fecha/hora: ${partido.cargado_en || "Sin registro"}
  `;
}

async function guardarResultadoAsociacion() {
  const categoria = $("asociacion-categoria").value;
  const partidoId = $("asociacion-partido").value;
  const puntosLocal = $("asociacion-puntos-local").value;
  const puntosVisitante = $("asociacion-puntos-visitante").value;
  const status = $("asociacion-status");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilitá Asociación con la clave administrativa.", "warn");
    return;
  }

  if (!partidoId) {
    setStatus(status, "Seleccioná un partido.", "warn");
    return;
  }

  if (puntosLocal === "" || puntosVisitante === "") {
    setStatus(status, "Completá ambos tanteadores.", "warn");
    return;
  }

  const pl = Number(puntosLocal);
  const pv = Number(puntosVisitante);

  if (!Number.isFinite(pl) || !Number.isFinite(pv) || pl < 0 || pv < 0) {
    setStatus(status, "Los tanteadores deben ser números válidos.", "warn");
    return;
  }

  const confirmar = confirm(`¿Confirmás la corrección ${pl} - ${pv}?`);
  if (!confirmar) {
    setStatus(status, "Operación cancelada.", "warn");
    return;
  }

  setStatus(status, "Guardando corrección...", "");

  const { error } = await supabaseClient
    .from("partidos")
    .update({
      puntos_local: pl,
      puntos_visitante: pv,
      estado_resultado: "jugado",
      cargado_por: "ADMIN",
      cargado_en: new Date().toISOString()
    })
    .eq("id", partidoId);

  if (error) {
    setStatus(status, `No se pudo guardar: ${error.message}`, "error");
    return;
  }

  await refrescarCategoria(categoria, {
    actualizarPublico: $("publico-categoria")?.value === categoria
  });
  poblarSelectPartidosAsociacion(categoria);
  renderPlayoffsAsociacion(categoria);
  completarInputsAsociacion();
  registrarUso("resultado_corregido", {
    area: "asociacion",
    categoria,
    user: estado.usuarioAsociacion?.display_name || "Asociación",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });

  setStatus(status, "Corrección guardada correctamente.", "ok");
}

async function resolverPartidoAdministrativamente(ganador) {
  const categoria = $("asociacion-categoria").value;
  const partidoId = $("asociacion-partido").value;
  const status = $("asociacion-status");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return;
  }

  if (!partidoId) {
    setStatus(status, "Selecciona un partido.", "warn");
    return;
  }

  const partidos = estado.partidosPorCategoria[categoria] || [];
  const partido = partidos.find((p) => p.id === partidoId);
  const ganaLocal = ganador === "local";
  const equipoGanador = ganaLocal ? partido?.local : partido?.visitante;
  const equipoPerdedor = ganaLocal ? partido?.visitante : partido?.local;
  const resultado = ganaLocal ? "20-0" : "0-20";
  const confirmar = confirm(`Confirmas resolucion administrativa ${resultado}? ${equipoGanador || "Ganador"} suma 2 puntos de tabla y ${equipoPerdedor || "perdedor"} suma 0.`);

  if (!confirmar) {
    setStatus(status, "Operacion cancelada.", "warn");
    return;
  }

  setStatus(status, "Guardando resolucion administrativa...", "");

  const { error } = await supabaseClient
    .from("partidos")
    .update({
      puntos_local: ganaLocal ? 20 : 0,
      puntos_visitante: ganaLocal ? 0 : 20,
      estado_resultado: ganaLocal ? "resolucion_local" : "resolucion_visitante",
      cargado_por: "ADMIN - RESOLUCION",
      cargado_en: new Date().toISOString()
    })
    .eq("id", partidoId);

  if (error) {
    setStatus(status, `No se pudo guardar la resolucion: ${error.message}`, "error");
    return;
  }

  await refrescarCategoria(categoria, {
    actualizarPublico: $("publico-categoria")?.value === categoria
  });
  poblarSelectPartidosAsociacion(categoria);
  renderPlayoffsAsociacion(categoria);
  completarInputsAsociacion();
  registrarUso("resultado_resolucion_admin", {
    area: "asociacion",
    categoria,
    user: estado.usuarioAsociacion?.display_name || "Asociacion",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });

  setStatus(status, "Resolucion administrativa guardada. Resultado 20-0 y tabla con puntos 2-0.", "ok");
}

async function anularResultadoAsociacion() {
  const categoria = $("asociacion-categoria").value;
  const partidoId = $("asociacion-partido").value;
  const status = $("asociacion-status");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return;
  }

  if (!partidoId) {
    setStatus(status, "Selecciona un partido.", "warn");
    return;
  }

  const partidos = estado.partidosPorCategoria[categoria] || [];
  const partido = partidos.find((p) => p.id === partidoId);
  const confirmar = confirm(`Anulas el resultado de ${partido?.local || "local"} vs ${partido?.visitante || "visitante"}? El partido quedara pendiente.`);
  if (!confirmar) {
    setStatus(status, "Operacion cancelada.", "warn");
    return;
  }

  setStatus(status, "Anulando resultado...", "");

  const { error } = await supabaseClient
    .from("partidos")
    .update({
      puntos_local: null,
      puntos_visitante: null,
      estado_resultado: "pendiente",
      cargado_por: "ADMIN - ANULADO",
      cargado_en: new Date().toISOString()
    })
    .eq("id", partidoId);

  if (error) {
    setStatus(status, `No se pudo anular: ${error.message}`, "error");
    return;
  }

  await refrescarCategoria(categoria, {
    actualizarPublico: $("publico-categoria")?.value === categoria
  });
  poblarSelectPartidosAsociacion(categoria);
  renderPlayoffsAsociacion(categoria);
  completarInputsAsociacion();
  registrarUso("resultado_anulado", {
    area: "asociacion",
    categoria,
    user: estado.usuarioAsociacion?.display_name || "Asociacion",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });

  setStatus(status, "Resultado anulado. El partido quedo pendiente.", "ok");
}

function obtenerPartidosPlayoffEditables(nombreCategoria) {
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const tabla = calcularTabla(partidos);
  return aplicarAvanceAutomaticoPlayoffs(nombreCategoria, tabla, mezclarPartidosPlayoff(
    generarPartidosPlayoff(nombreCategoria, tabla),
    estado.playoffsPorCategoria[nombreCategoria] || []
  ));
}

function renderPlayoffsAsociacion(nombreCategoria) {
  const container = $("asociacion-playoffs");
  if (!container) return;

  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  const partidos = obtenerPartidosPlayoffEditables(nombreCategoria);

  if (!categoria || !partidos.length) {
    container.innerHTML = `
      <h3>Playoffs</h3>
      <div class="empty">No hay llave de playoffs configurada para esta categoría.</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="assoc-playoff-head">
      <div>
        <h3>Playoffs</h3>
        <p class="note">Carga independiente de la fase regular. Estos resultados se muestran en la llave pública.</p>
      </div>
    </div>
    <div class="assoc-playoff-list">
      ${partidos.map((partido) => `
        <div class="assoc-playoff-row" data-playoff-key="${escapeHtml(playoffKey(partido))}">
          <div class="assoc-playoff-title">
            <strong>${escapeHtml(partido.titulo || partido.llave || "Playoff")}</strong>
            <span>${escapeHtml(partido.fase || "")}${partido.fecha ? ` · ${escapeHtml(fechaPartidoLabel(partido.fecha))}` : ""}</span>
          </div>
          <div class="field">
            <label>Local</label>
            <input class="playoff-local" type="text" value="${escapeHtml(partido.local || "")}" />
          </div>
          <div class="field">
            <label>Visitante</label>
            <input class="playoff-visitante" type="text" value="${escapeHtml(partido.visitante || "")}" />
          </div>
          <div class="field score-field">
            <label>Pts local</label>
            <input class="playoff-puntos-local" type="number" min="0" value="${partido.puntos_local ?? ""}" />
          </div>
          <div class="field score-field">
            <label>Pts visitante</label>
            <input class="playoff-puntos-visitante" type="number" min="0" value="${partido.puntos_visitante ?? ""}" />
          </div>
          <button class="secondary playoff-save-btn" type="button"
            data-fase="${escapeHtml(partido.fase || "")}"
            data-llave="${escapeHtml(partido.llave || "")}"
            data-titulo="${escapeHtml(partido.titulo || "")}"
            data-orden="${escapeHtml(String(partido.orden || 0))}"
            data-partido-numero="${escapeHtml(String(partido.partido_numero || 1))}"
            data-fecha="${escapeHtml(partido.fecha || "")}"
          >
            Guardar
          </button>
        </div>
      `).join("")}
    </div>
  `;
}

async function guardarResultadoPlayoffAsociacion(event) {
  const button = event.target.closest(".playoff-save-btn");
  if (!button) return;

  const status = $("asociacion-status");
  const categoriaNombre = $("asociacion-categoria")?.value || "";
  const categoria = obtenerCategoriaPorNombre(categoriaNombre);
  const row = button.closest(".assoc-playoff-row");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return;
  }

  if (!categoria || !row) {
    setStatus(status, "No se encontro la categoria o el partido de playoff.", "error");
    return;
  }

  const local = row.querySelector(".playoff-local")?.value?.trim() || "";
  const visitante = row.querySelector(".playoff-visitante")?.value?.trim() || "";
  const puntosLocalRaw = row.querySelector(".playoff-puntos-local")?.value ?? "";
  const puntosVisitanteRaw = row.querySelector(".playoff-puntos-visitante")?.value ?? "";

  if (!local || !visitante) {
    setStatus(status, "Completa local y visitante del cruce.", "warn");
    return;
  }

  if (puntosLocalRaw === "" || puntosVisitanteRaw === "") {
    setStatus(status, "Completa ambos tanteadores de playoff.", "warn");
    return;
  }

  const puntosLocal = Number(puntosLocalRaw);
  const puntosVisitante = Number(puntosVisitanteRaw);

  if (!Number.isFinite(puntosLocal) || !Number.isFinite(puntosVisitante) || puntosLocal < 0 || puntosVisitante < 0) {
    setStatus(status, "Los tanteadores de playoff deben ser numeros validos.", "warn");
    return;
  }

  button.disabled = true;
  setStatus(status, "Guardando resultado de playoff...", "");

  const payload = {
    categoria_id: categoria.id,
    categoria_nombre: categoriaNombre,
    fase: button.dataset.fase,
    llave: button.dataset.llave,
    titulo: button.dataset.titulo,
    orden: Number(button.dataset.orden || 0),
    partido_numero: Number(button.dataset.partidoNumero || 1),
    fecha: button.dataset.fecha || null,
    local,
    visitante,
    puntos_local: puntosLocal,
    puntos_visitante: puntosVisitante,
    estado: "jugado",
    cargado_por: estado.usuarioAsociacion?.display_name || "ADMIN",
    cargado_en: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from("playoff_matches")
    .upsert(payload, { onConflict: "categoria_id,fase,llave,partido_numero" });

  if (error) {
    button.disabled = false;
    setStatus(status, `No se pudo guardar playoff: ${error.message}. Si la tabla no existe, corre docs/ejecutar-en-supabase-playoffs.sql.`, "error");
    return;
  }

  await cargarResultadosPlayoffCategoria(categoriaNombre, true);
  renderPlayoffsAsociacion(categoriaNombre);
  renderCierreAsociacion(categoriaNombre);
  if ($("publico-categoria")?.value === categoriaNombre) {
    renderPublicoCategoria(categoriaNombre);
  }
  registrarUso("resultado_playoff_cargado", {
    area: "asociacion",
    categoria: categoriaNombre,
    user: estado.usuarioAsociacion?.display_name || "Asociacion",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });
  setStatus(status, "Resultado de playoff guardado y visible en la llave publica.", "ok");
}

function obtenerFilasProgramacion(nombreCategoria) {
  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  if (!categoria?.id) return [];

  const programacion = estado.programacionPorCategoriaId[categoria.id] || [];
  const porPartido = new Map(programacion.map((fila) => [fila.partido_id, fila]));
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];

  return partidos
    .filter((partido) => partido.local && partido.visitante)
    .map((partido) => {
      const guardado = porPartido.get(partido.id) || {};
      return {
        ...guardado,
        partido_id: partido.id,
        categoria_id: categoria.id,
        categoria_nombre: nombreCategoria,
        jornada: partido.jornada,
        local: guardado.local || partido.local,
        visitante: guardado.visitante || partido.visitante,
        fecha_partido: guardado.fecha_partido || partido.fecha || "",
        hora: guardado.hora || "",
        cancha: guardado.cancha || "",
        estado: guardado.estado || "pendiente",
        observacion: guardado.observacion || ""
      };
    })
    .sort((a, b) => Number(a.jornada || 0) - Number(b.jornada || 0));
}

function estadoProgramacionLabel(estadoFila) {
  const labels = {
    pendiente: "Pendiente",
    listo: "Listo para informar",
    enviado: "Enviado",
    confirmado: "Confirmado"
  };
  return labels[estadoFila] || labels.pendiente;
}

function filaProgramacionLista(fila) {
  return !!fila.fecha_partido && !!fila.hora && !!fila.cancha;
}

function renderProgramacionAsociacion(nombreCategoria) {
  const tabla = $("programacion-tabla");
  const resumen = $("programacion-resumen");
  if (!tabla || !resumen) return;

  const filas = obtenerFilasProgramacion(nombreCategoria);
  const listas = filas.filter(filaProgramacionLista).length;
  const enviadas = filas.filter((fila) => fila.estado === "enviado" || fila.estado === "confirmado").length;
  const pendientes = filas.length - listas;

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${filas.length}</strong><span>Partidos</span></div>
    <div class="doc-pill"><strong>${listas}</strong><span>Listos</span></div>
    <div class="doc-pill"><strong>${enviadas}</strong><span>Informados</span></div>
    <div class="doc-pill"><strong>${pendientes}</strong><span>Sin datos</span></div>
  `;

  if (!filas.length) {
    tabla.innerHTML = `<div class="empty">No hay partidos cargados para programar en esta categoria.</div>`;
    return;
  }

  tabla.innerHTML = `
    <div class="programacion-list">
      ${filas.map((fila) => `
        <div class="programacion-row" data-partido-id="${escapeHtml(fila.partido_id)}">
          <div class="programacion-match">
            <strong>Fecha ${escapeHtml(fila.jornada || "-")} · ${escapeHtml(fila.local)} vs ${escapeHtml(fila.visitante)}</strong>
            <span class="programacion-state">${escapeHtml(estadoProgramacionLabel(fila.estado))}</span>
          </div>
          <div class="field">
            <label>Dia</label>
            <input class="programacion-fecha" type="date" value="${escapeHtml(fila.fecha_partido || "")}">
          </div>
          <div class="field">
            <label>Hora</label>
            <input class="programacion-hora" type="time" value="${escapeHtml(fila.hora || "")}">
          </div>
          <div class="field">
            <label>Cancha</label>
            <input class="programacion-cancha" type="text" value="${escapeHtml(fila.cancha || "")}" placeholder="Ej: Hogar Social">
          </div>
          <div class="field">
            <label>Obs.</label>
            <input class="programacion-observacion" type="text" value="${escapeHtml(fila.observacion || "")}" placeholder="Opcional">
          </div>
          <div class="programacion-actions">
            <button class="secondary programacion-save-btn" type="button">Guardar</button>
            <button class="secondary programacion-send-btn" type="button" ${filaProgramacionLista(fila) ? "" : "disabled"}>Marcar enviado</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function obtenerPartidosPlayoffConAvance(nombreCategoria) {
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const tabla = calcularTabla(partidos);
  const guardados = estado.playoffsPorCategoria[nombreCategoria] || [];
  return aplicarAvanceAutomaticoPlayoffs(
    nombreCategoria,
    tabla,
    mezclarPartidosPlayoff(generarPartidosPlayoff(nombreCategoria, tabla), guardados)
  );
}

function renderSesionAuth() {
  const bar = $("auth-session-bar");
  if (!bar) return;

  const permiso = estado.permisosAuth?.[0];
  if (!estado.authUser) {
    bar.className = "auth-session-bar is-off";
    bar.innerHTML = `<span>Sin usuario iniciado. El acceso por claves sigue disponible durante la migracion.</span>`;
    if ($("auth-logout")) $("auth-logout").disabled = true;
    return;
  }

  bar.className = "auth-session-bar";
  bar.innerHTML = `
    <span>Usuario: ${escapeHtml(permiso?.display_name || estado.authUser.email || "Usuario")} · Rol: ${escapeHtml(permiso?.role || "sin permisos")}</span>
    <button class="secondary" type="button" onclick="document.getElementById('auth-logout')?.click()">Cerrar sesion</button>
  `;
  if ($("auth-logout")) $("auth-logout").disabled = false;
}

function aplicarPermisosAutenticados(permisos) {
  estado.permisosAuth = permisos || [];
  const status = $("auth-status");

  if (!estado.authUser) {
    renderSesionAuth();
    return;
  }

  if (!permisos.length) {
    setStatus(status, "Usuario iniciado, pero todavia no tiene permisos vinculados en la app.", "warn");
    renderSesionAuth();
    return;
  }

  const accesoAsociacion = puedeAccederAsociacion(permisos);
  if (accesoAsociacion) {
    estado.asociacionDesbloqueada = true;
    estado.usuarioAsociacion = permisos[0];
    aplicarBloqueoAsociacion();
    cargarDatosAsociacionActual().catch((error) => {
      setStatus($("asociacion-status"), `No se pudieron cargar datos de asociacion: ${error.message}`, "error");
    });
  }

  const delegado = delegadoDesdePermisos(permisos, null);
  if (delegado && !accesoAsociacion) {
    estado.delegado = delegado;
    estado.delegadoDesbloqueado = true;
    aplicarBloqueoDelegado();
    poblarSelectCategorias(
      "delegado-categoria",
      estado.categorias.filter((cat) => delegado.categorias.includes(cat.nombre))
    );
    const primeraCategoria = $("delegado-categoria")?.value;
    if (primeraCategoria) {
      refrescarCategoria(primeraCategoria, { actualizarPublico: false }).then(() => {
        poblarSelectPartidosDelegado(primeraCategoria);
        renderDocumentacionDelegado();
      });
    }
    const info = $("delegado-info");
    if (info) {
      info.innerHTML = `
        Delegado: ${escapeHtml(delegado.nombre)}<br>
        Categorías: ${escapeHtml(delegado.categorias.join(", "))}
      `;
    }
  }

  setStatus(status, `Ingreso correcto: ${permisos[0].display_name}.`, "ok");
  renderSesionAuth();
}

async function iniciarSesionAuth() {
  const email = $("auth-email")?.value.trim() || "";
  const password = $("auth-password")?.value || "";
  const status = $("auth-status");

  if (!email || !password) {
    setStatus(status, "Cargá email y contraseña.", "warn");
    return;
  }

  setStatus(status, "Validando usuario...", "");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus(status, `No se pudo ingresar: ${error.message}`, "error");
    return;
  }

  estado.authSession = data.session || null;
  estado.authUser = data.user || null;
  const permisos = await cargarPermisosUsuarioActual();
  aplicarPermisosAutenticados(permisos);
}

async function cerrarSesionAuth() {
  await supabaseClient.auth.signOut();
  estado.authSession = null;
  estado.authUser = null;
  estado.permisosAuth = [];
  setStatus($("auth-status"), "Sesion cerrada.", "ok");
  renderSesionAuth();
}

async function inicializarSesionAuth() {
  const { data } = await supabaseClient.auth.getSession();
  estado.authSession = data?.session || null;
  estado.authUser = data?.session?.user || null;

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    estado.authSession = session || null;
    estado.authUser = session?.user || null;
    if (estado.authUser) {
      const permisos = await cargarPermisosUsuarioActual();
      aplicarPermisosAutenticados(permisos);
    } else {
      estado.permisosAuth = [];
      renderSesionAuth();
    }
  });

  if (estado.authUser) {
    const permisos = await cargarPermisosUsuarioActual();
    aplicarPermisosAutenticados(permisos);
  } else {
    renderSesionAuth();
  }
}

function calcularEstadoCierreTorneo(nombreCategoria) {
  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const tabla = calcularTabla(partidos);
  const equipos = obtenerEquiposCategoria(nombreCategoria);
  const playoffs = obtenerPartidosPlayoffConAvance(nombreCategoria);
  const partidosRegularJugados = partidos.filter(partidoTieneResultado).length;
  const partidosRegularPendientes = partidos.length - partidosRegularJugados;
  const playoffsJugados = playoffs.filter(partidoPlayoffTieneResultado).length;
  const playoffsPendientes = playoffs.filter((partido) => !partidoPlayoffTieneResultado(partido)).length;
  const finalPartidos = playoffs.filter((partido) => partido.fase === "final");
  const campeon = ganadorSeriePlayoff(playoffs, "final");
  const finalPendiente = finalPartidos.length > 0 && !campeon;
  const documentosEquipo = categoria ? estado.documentosPorCategoriaId[categoria.id] || [] : [];
  const documentosJugador = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
  const docsEquipoPendientes = documentosEquipo.filter((doc) => (doc.status || "pendiente") !== "aprobado").length;
  const docsJugadorPendientes = documentosJugador.filter((doc) => (doc.status || "pendiente") !== "aprobado").length;
  const listoParaCerrar =
    !!partidos.length &&
    partidosRegularPendientes === 0 &&
    (!playoffs.length || (!!campeon && !finalPendiente)) &&
    docsEquipoPendientes === 0 &&
    docsJugadorPendientes === 0;

  const pendientes = [];
  if (!partidos.length) pendientes.push("No hay fixture de fase regular cargado.");
  if (partidosRegularPendientes) pendientes.push(`Quedan ${partidosRegularPendientes} partido(s) de fase regular sin resultado.`);
  if (playoffs.length && finalPendiente) pendientes.push("Falta completar la final de playoffs para determinar campeon.");
  if (playoffsPendientes && !campeon) pendientes.push(`Hay ${playoffsPendientes} partido(s) de playoffs sin resultado.`);
  if (docsEquipoPendientes) pendientes.push(`Hay ${docsEquipoPendientes} documento(s) de equipo sin aprobar.`);
  if (docsJugadorPendientes) pendientes.push(`Hay ${docsJugadorPendientes} documento(s) de jugador sin aprobar.`);

  return {
    nombreCategoria,
    equipos,
    tabla,
    partidos,
    playoffs,
    campeon,
    listoParaCerrar,
    pendientes,
    partidosRegularJugados,
    partidosRegularPendientes,
    playoffsJugados,
    playoffsPendientes,
    docsEquipoPendientes,
    docsJugadorPendientes
  };
}

function renderCierreAsociacion(nombreCategoria) {
  const resumen = $("cierre-resumen");
  const detalle = $("cierre-detalle");
  if (!resumen || !detalle) return;

  const cierre = calcularEstadoCierreTorneo(nombreCategoria);
  const subcampeon = cierre.playoffs
    .filter((partido) => partido.fase === "final")
    .flatMap((partido) => [partido.local, partido.visitante])
    .find((equipo) => equipo && !nombresEquipoCoinciden(equipo, cierre.campeon) && !esPlaceholderPlayoff(equipo)) || "";

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${cierre.equipos.length}</strong><span>Equipos</span></div>
    <div class="doc-pill"><strong>${cierre.partidosRegularPendientes}</strong><span>Pendientes fase regular</span></div>
    <div class="doc-pill"><strong>${cierre.playoffsPendientes}</strong><span>Pendientes playoffs</span></div>
    <div class="doc-pill"><strong>${cierre.docsEquipoPendientes + cierre.docsJugadorPendientes}</strong><span>Docs sin aprobar</span></div>
    <div class="doc-pill ${cierre.listoParaCerrar ? "" : "doc-pill-alert"}"><strong>${cierre.listoParaCerrar ? "Si" : "No"}</strong><span>Listo para cierre</span></div>
  `;

  detalle.innerHTML = `
    <div class="closure-grid">
      <div class="closure-box">
        <h4>Resultado deportivo</h4>
        <ul class="closure-list">
          <li><span>Categoria</span><strong>${escapeHtml(nombreCategoria)}</strong></li>
          <li><span>Campeon</span><strong>${escapeHtml(cierre.campeon || "A definir")}</strong></li>
          <li><span>Subcampeon</span><strong>${escapeHtml(subcampeon || "A definir")}</strong></li>
          <li><span>1ro tabla regular</span><strong>${escapeHtml(cierre.tabla[0]?.equipo || "A definir")}</strong></li>
          <li><span>Ultimo tabla regular</span><strong>${escapeHtml(cierre.tabla[cierre.tabla.length - 1]?.equipo || "A definir")}</strong></li>
        </ul>
      </div>

      <div class="closure-box">
        <h4>Control de datos</h4>
        <ul class="closure-list">
          <li><span>Fase regular</span><strong>${cierre.partidosRegularJugados} cargados / ${cierre.partidosRegularPendientes} pendientes</strong></li>
          <li><span>Playoffs</span><strong>${cierre.playoffsJugados} cargados / ${cierre.playoffsPendientes} pendientes</strong></li>
          <li><span>Documentos equipo sin aprobar</span><strong>${cierre.docsEquipoPendientes}</strong></li>
          <li><span>Documentos jugador sin aprobar</span><strong>${cierre.docsJugadorPendientes}</strong></li>
        </ul>
      </div>

      <div class="closure-box">
        <h4>Pendientes antes de oficializar</h4>
        ${cierre.pendientes.length
          ? `<ul class="closure-list">${cierre.pendientes.map((item) => `<li><span>${escapeHtml(item)}</span></li>`).join("")}</ul>`
          : `<p class="note">No se detectan pendientes criticos. Se puede preparar el cierre oficial.</p>`}
      </div>
    </div>
  `;
}

function generarActaCierreTorneo() {
  const categoria = $("asociacion-categoria")?.value || "";
  const status = $("cierre-status") || $("asociacion-status");
  if (!categoria) {
    setStatus(status, "Selecciona una categoria para generar el acta.", "warn");
    return;
  }

  const cierre = calcularEstadoCierreTorneo(categoria);
  const fechaGeneracion = new Date().toLocaleString("es-AR");
  const filasTabla = cierre.tabla.map((fila, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(fila.equipo)}</td>
      <td>${fila.pj}</td>
      <td>${fila.pg}</td>
      <td>${fila.pp}</td>
      <td>${fila.pf}</td>
      <td>${fila.pc}</td>
      <td>${fila.dif}</td>
      <td>${fila.pts}</td>
    </tr>
  `).join("");
  const filasPlayoffs = cierre.playoffs.map((partido) => `
    <tr>
      <td>${escapeHtml(partido.titulo || partido.fase || "-")}</td>
      <td>${escapeHtml(fechaPartidoLabel(partido.fecha) || "A confirmar")}</td>
      <td>${escapeHtml(partido.local || "-")}</td>
      <td>${escapeHtml(partido.visitante || "-")}</td>
      <td>${partidoPlayoffTieneResultado(partido) ? `${escapeHtml(String(partido.puntos_local))} - ${escapeHtml(String(partido.puntos_visitante))}` : "Pendiente"}</td>
    </tr>
  `).join("");
  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Acta de cierre ${escapeHtml(categoria)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 28px; }
        h1 { margin: 0 0 4px; font-size: 26px; }
        h2 { margin: 22px 0 8px; font-size: 18px; color: #1f4d78; }
        .muted { color: #4b5563; margin: 0 0 12px; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; margin: 12px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border-bottom: 1px solid #d1d5db; padding: 7px 6px; font-size: 12px; text-align: left; }
        th { background: #eef2ff; font-weight: 800; }
        .print-actions { margin: 18px 0; }
        .print-actions button { padding: 10px 14px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 700; }
        @media print { .print-actions { display: none; } body { margin: 12mm; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(APP_CONFIG.producto.nombre)} - Acta de cierre</h1>
      <p class="muted">${escapeHtml(APP_CONFIG.organizacionActiva.nombre)} - ${escapeHtml(categoria)} - Generado ${escapeHtml(fechaGeneracion)}</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>
      <div class="box">
        <p><strong>Campeon:</strong> ${escapeHtml(cierre.campeon || "A definir")}</p>
        <p><strong>Estado:</strong> ${escapeHtml(cierre.listoParaCerrar ? "Listo para cierre oficial" : "Con pendientes")}</p>
        <p><strong>Pendientes:</strong> ${escapeHtml(cierre.pendientes.join(" | ") || "Sin pendientes criticos")}</p>
      </div>
      <h2>Tabla final / actual</h2>
      <table>
        <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>PF</th><th>PC</th><th>DIF</th><th>PTS</th></tr></thead>
        <tbody>${filasTabla || `<tr><td colspan="9">Sin tabla disponible.</td></tr>`}</tbody>
      </table>
      <h2>Playoffs</h2>
      <table>
        <thead><tr><th>Instancia</th><th>Fecha</th><th>Local</th><th>Visitante</th><th>Resultado</th></tr></thead>
        <tbody>${filasPlayoffs || `<tr><td colspan="5">Sin playoffs cargados.</td></tr>`}</tbody>
      </table>
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `acta-cierre-${categoria}`);
  abrirInformeHtml(html);
  setStatus(status, `Acta descargada como ${nombre}.`, "ok");
  mostrarCartelInforme(`Se descargo ${nombre} en la carpeta Descargas.`, "ok");
}

function obtenerDatosFilaProgramacion(row) {
  return {
    fecha_partido: row.querySelector(".programacion-fecha")?.value || null,
    hora: row.querySelector(".programacion-hora")?.value || "",
    cancha: row.querySelector(".programacion-cancha")?.value?.trim() || "",
    observacion: row.querySelector(".programacion-observacion")?.value?.trim() || ""
  };
}

async function guardarProgramacionFila(row, estadoForzado = null) {
  const categoriaNombre = $("asociacion-categoria")?.value || "";
  const categoria = obtenerCategoriaPorNombre(categoriaNombre);
  const partidoId = row?.dataset?.partidoId || "";
  const partido = (estado.partidosPorCategoria[categoriaNombre] || []).find((item) => item.id === partidoId);
  const status = $("asociacion-status");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return false;
  }

  if (!categoria || !partido) {
    setStatus(status, "No se encontro el partido para programar.", "error");
    return false;
  }

  const datos = obtenerDatosFilaProgramacion(row);
  const estadoCalculado = estadoForzado || (datos.fecha_partido && datos.hora && datos.cancha ? "listo" : "pendiente");
  const now = new Date().toISOString();
  const payload = {
    partido_id: partido.id,
    categoria_id: categoria.id,
    categoria_nombre: categoriaNombre,
    jornada: partido.jornada || null,
    local: partido.local,
    visitante: partido.visitante,
    fecha_partido: datos.fecha_partido,
    hora: datos.hora || null,
    cancha: datos.cancha || null,
    estado: estadoCalculado,
    observacion: datos.observacion || null,
    updated_at: now
  };

  if (estadoForzado === "enviado") {
    payload.informado_por = estado.usuarioAsociacion?.display_name || "ADMIN";
    payload.informado_en = now;
  }

  const { error } = await supabaseClient
    .from("match_schedules")
    .upsert(payload, { onConflict: "partido_id" });

  if (error) {
    setStatus(status, `No se pudo guardar programacion: ${error.message}. Si la tabla no existe, corre docs/ejecutar-en-supabase-programacion.sql.`, "error");
    return false;
  }

  await cargarProgramacionCategoria(categoria.id, true);
  renderProgramacionAsociacion(categoriaNombre);
  return true;
}

async function manejarProgramacionClick(event) {
  const saveButton = event.target.closest(".programacion-save-btn");
  const sendButton = event.target.closest(".programacion-send-btn");
  const status = $("asociacion-status");

  if (!saveButton && !sendButton) return;

  const row = event.target.closest(".programacion-row");
  const ok = await guardarProgramacionFila(row, sendButton ? "enviado" : null);
  if (!ok) return;

  registrarUso(sendButton ? "programacion_informada" : "programacion_guardada", {
    area: "asociacion",
    categoria: $("asociacion-categoria")?.value || "",
    user: estado.usuarioAsociacion?.display_name || "Asociacion",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });

  setStatus(status, sendButton ? "Partido marcado como enviado." : "Programacion guardada.", "ok");
}

function generarTextoProgramacion(nombreCategoria) {
  const filas = obtenerFilasProgramacion(nombreCategoria)
    .filter(filaProgramacionLista)
    .sort((a, b) => `${a.fecha_partido} ${a.hora}`.localeCompare(`${b.fecha_partido} ${b.hora}`));

  if (!filas.length) return "";

  const grupos = {};
  filas.forEach((fila) => {
    const clave = `${fila.fecha_partido}|${fila.cancha}`;
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(fila);
  });

  const partes = [`Programacion ${APP_CONFIG.organizacionActiva.torneoLabel} - ${APP_CONFIG.organizacionActiva.nombre} - ${nombreCategoria}`];
  Object.entries(grupos).forEach(([clave, partidosGrupo]) => {
    const [fecha, cancha] = clave.split("|");
    partes.push("");
    partes.push(`${fechaPartidoLabel(fecha)} - Cancha: ${cancha}`);
    partidosGrupo.forEach((fila) => {
      partes.push(`${fila.hora} - Fecha ${fila.jornada || "-"} - ${fila.local} vs ${fila.visitante}${fila.observacion ? ` (${fila.observacion})` : ""}`);
    });
  });

  partes.push("");
  partes.push("Por favor confirmar recepcion y asignacion arbitral.");
  return partes.join("\n");
}

function generarAsuntoProgramacion(nombreCategoria) {
  const filas = obtenerFilasProgramacion(nombreCategoria)
    .filter(filaProgramacionLista)
    .sort((a, b) => `${a.fecha_partido} ${a.hora}`.localeCompare(`${b.fecha_partido} ${b.hora}`));

  const fechas = [...new Set(filas.map((fila) => fechaPartidoLabel(fila.fecha_partido)).filter(Boolean))];
  const fechaTexto = fechas.length === 1 ? ` - ${fechas[0]}` : "";
  return `Programacion arbitral ${APP_CONFIG.organizacionActiva.torneoLabel} - ${nombreCategoria}${fechaTexto}`;
}

function cargarEmailProgramacionDestino() {
  const input = $("programacion-email-destino");
  if (!input) return;
  input.value = localStorage.getItem(claveProgramacionEmailDestino()) || "";
}

function guardarEmailProgramacionDestino() {
  const input = $("programacion-email-destino");
  if (!input) return;
  localStorage.setItem(claveProgramacionEmailDestino(), input.value.trim());
}

function abrirCorreoProgramacion() {
  const categoria = $("asociacion-categoria")?.value || "";
  const destino = $("programacion-email-destino")?.value.trim() || "";
  const status = $("asociacion-status");
  const texto = generarTextoProgramacion(categoria);

  if (!destino) {
    setStatus(status, "Carga el correo destino para abrir el borrador.", "warn");
    $("programacion-email-destino")?.focus();
    return;
  }

  if (!texto) {
    setStatus(status, "No hay partidos con dia, hora y cancha para enviar.", "warn");
    return;
  }

  guardarEmailProgramacionDestino();
  const salida = $("programacion-mensaje");
  if (salida) salida.value = texto;

  const asunto = generarAsuntoProgramacion(categoria);
  const mailto = `mailto:${encodeURIComponent(destino)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;
  window.location.href = mailto;
  setStatus(status, "Se abrio el borrador del correo. Revisalo y envialo desde tu casilla.", "ok");
}

async function copiarProgramacionAsociacion() {
  const categoria = $("asociacion-categoria")?.value || "";
  const status = $("asociacion-status");
  const texto = generarTextoProgramacion(categoria);

  if (!texto) {
    setStatus(status, "No hay partidos con dia, hora y cancha para copiar.", "warn");
    return;
  }

  try {
    await navigator.clipboard.writeText(texto);
    setStatus(status, "Comunicacion copiada al portapapeles.", "ok");
  } catch (error) {
    const salida = $("programacion-mensaje");
    if (salida) salida.value = texto;
    setStatus(status, "No se pudo copiar automaticamente. El texto quedo en el cuadro para copiar manualmente.", "warn");
  }

  const salida = $("programacion-mensaje");
  if (salida) salida.value = texto;
}

async function marcarProgramacionListaEnviada() {
  const categoriaNombre = $("asociacion-categoria")?.value || "";
  const categoria = obtenerCategoriaPorNombre(categoriaNombre);
  const status = $("asociacion-status");
  const filas = obtenerFilasProgramacion(categoriaNombre).filter((fila) => filaProgramacionLista(fila) && fila.estado !== "enviado" && fila.estado !== "confirmado");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return;
  }

  if (!categoria || !filas.length) {
    setStatus(status, "No hay partidos listos pendientes de marcar como enviados.", "warn");
    return;
  }

  const now = new Date().toISOString();
  const payload = filas.map((fila) => ({
    partido_id: fila.partido_id,
    categoria_id: categoria.id,
    categoria_nombre: categoriaNombre,
    jornada: fila.jornada || null,
    local: fila.local,
    visitante: fila.visitante,
    fecha_partido: fila.fecha_partido,
    hora: fila.hora,
    cancha: fila.cancha,
    estado: "enviado",
    observacion: fila.observacion || null,
    informado_por: estado.usuarioAsociacion?.display_name || "ADMIN",
    informado_en: now,
    updated_at: now
  }));

  const { error } = await supabaseClient
    .from("match_schedules")
    .upsert(payload, { onConflict: "partido_id" });

  if (error) {
    setStatus(status, `No se pudo marcar como enviado: ${error.message}`, "error");
    return;
  }

  await cargarProgramacionCategoria(categoria.id, true);
  renderProgramacionAsociacion(categoriaNombre);
  registrarUso("programacion_lote_enviado", {
    area: "asociacion",
    categoria: categoriaNombre,
    cantidad: filas.length,
    user: estado.usuarioAsociacion?.display_name || "Asociacion",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });
  setStatus(status, "Programacion lista marcada como enviada.", "ok");
}

async function revisarDocumentoAsociacion(event) {
  const button = event.target.closest(".doc-review-btn");
  if (!button) return;

  const documentId = button.dataset.documentId;
  const scope = button.dataset.documentScope || "team";
  const nextStatus = button.dataset.status;
  const categoria = $("asociacion-categoria")?.value || "";
  const categoriaData = estado.categorias.find((cat) => cat.nombre === categoria);
  const documento = scope === "player"
    ? obtenerDocumentoJugadorPorId(documentId)
    : obtenerDocumentoPorId(documentId);
  const status = $("asociacion-status");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilitá Asociación con la clave administrativa.", "warn");
    return;
  }

  if (!documento || !categoriaData) {
    setStatus(status, "No se encontró el documento seleccionado.", "error");
    return;
  }

  const labels = {
    aprobado: "aprobar",
    observado: "observar",
    rechazado: "rechazar"
  };

  let observacion = "";
  if (nextStatus === "observado" || nextStatus === "rechazado") {
    observacion = prompt("Observación para el delegado:", documento.observacion || "") || "";
  }

  const sujeto = scope === "player"
    ? `${documento.requirement_nombre} de ${documento.jugador_nombre} (${documento.equipo_nombre})`
    : `${documento.requirement_nombre} de ${documento.equipo_nombre}`;
  const confirmar = confirm(`¿Confirmás ${labels[nextStatus] || "revisar"} ${sujeto}?`);
  if (!confirmar) {
    setStatus(status, "Revisión cancelada.", "warn");
    return;
  }

  button.disabled = true;
  setStatus(status, "Guardando revisión documental...", "");

  const { error } = await supabaseClient.rpc(scope === "player" ? "review_player_document" : "review_team_document", {
    p_document_id: documentId,
    p_status: nextStatus,
    p_actor: "ADMIN",
    p_observacion: observacion || null
  });

  if (error) {
    button.disabled = false;
    setStatus(status, `No se pudo guardar la revisión: ${error.message}`, "error");
    return;
  }

  const documentosCategoria = scope === "player"
    ? estado.documentosJugadoresPorCategoriaId[categoriaData.id] || []
    : estado.documentosPorCategoriaId[categoriaData.id] || [];
  const documentoLocal = documentosCategoria.find((doc) => doc.id === documentId);
  if (documentoLocal) {
    documentoLocal.status = nextStatus;
    documentoLocal.observacion = observacion || documentoLocal.observacion;
  }

  renderDocumentacionAsociacion(categoria);
  renderDocumentacionDelegado();
  if (scope === "player") {
    await cargarDocumentosJugadoresCategoria(categoriaData.id, true);
  } else {
    await cargarDocumentosCategoria(categoriaData.id, true);
  }
  renderDocumentacionAsociacion(categoria);
  renderDocumentacionDelegado();
  setStatus(status, "Revisión documental guardada.", "ok");
  registrarUso(scope === "player" ? "documento_jugador_revisado" : "documento_equipo_revisado", {
    area: "asociacion",
    categoria,
    equipo: documento.equipo_nombre || "",
    estado: nextStatus,
    user: estado.usuarioAsociacion?.display_name || "Asociacion",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });
}

function obtenerDriveDocumentoPorId(documentId) {
  return Object.values(estado.driveDocumentosPorCategoriaId).flat()
    .find((documento) => documento.id === documentId) || null;
}

async function revisarDocumentoDriveAsociacion(event) {
  const button = event.target.closest(".drive-doc-review-btn");
  if (!button) return;

  const status = $("asociacion-status");
  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return;
  }

  const documento = obtenerDriveDocumentoPorId(button.dataset.driveDocId);
  const categoriaNombre = $("asociacion-categoria")?.value || "";
  const nextStatus = button.dataset.status || "revisar";
  const nextMatchStatus = button.dataset.matchStatus || "dudoso";

  if (!documento) {
    setStatus(status, "No se encontro el documento de Drive seleccionado.", "error");
    return;
  }

  const observacion = prompt("Observacion admin para este documento:", documento.observation || "") || "";
  button.disabled = true;
  setStatus(status, "Guardando revision de Drive...", "");

  const { error } = await supabaseClient.rpc("review_drive_player_document", {
    p_document_id: documento.id,
    p_status: nextStatus,
    p_match_status: nextMatchStatus,
    p_player_id: documento.player_id || null,
    p_player_name: documento.player_name || null,
    p_observation: observacion || null,
    p_actor: estado.usuarioAsociacion?.display_name || "ADMIN"
  });

  if (error) {
    button.disabled = false;
    setStatus(status, `No se pudo revisar Drive: ${error.message}`, "error");
    return;
  }

  const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);
  if (categoria) await cargarDocumentosDriveCategoria(categoria.id, true);
  renderDocumentacionDriveAsociacion(categoriaNombre);
  setStatus(status, "Revision de Drive guardada.", "ok");
}

async function crearJugadorDesdeDriveAsociacion(event) {
  const button = event.target.closest(".drive-doc-create-player-btn");
  if (!button) return;

  const status = $("asociacion-status");
  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return;
  }

  const documento = obtenerDriveDocumentoPorId(button.dataset.driveDocId);
  const categoriaNombre = $("asociacion-categoria")?.value || "";
  const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);

  if (!documento || !categoria) {
    setStatus(status, "No se encontro el documento o la categoria para crear el jugador.", "error");
    return;
  }

  const nombre = prompt("Nombre del jugador a crear:", documento.player_name || "");
  if (!nombre || !nombre.trim()) {
    setStatus(status, "Creacion cancelada: falta el nombre del jugador.", "warn");
    return;
  }

  const equipos = await cargarEquiposCategoria(categoria.id);
  const equipoSugerido = equipos.find((equipo) => nombresEquipoCoinciden(equipo.nombre, documento.equipo_nombre));
  const equipoId = documento.equipo_id || equipoSugerido?.id || null;
  const equipoNombre = documento.equipo_nombre || equipoSugerido?.nombre || prompt("Equipo del jugador:", "") || "";

  if (!equipoNombre.trim()) {
    setStatus(status, "Creacion cancelada: falta el equipo.", "warn");
    return;
  }

  const confirmar = confirm(`Crear jugador "${nombre.trim()}" en ${equipoNombre}? No habilita documentacion automaticamente.`);
  if (!confirmar) {
    setStatus(status, "Creacion de jugador cancelada.", "warn");
    return;
  }

  button.disabled = true;
  setStatus(status, "Creando jugador desde revision admin...", "");

  const { error } = await supabaseClient.rpc("create_player_from_drive_review", {
    p_document_id: documento.id,
    p_organizacion_id: null,
    p_torneo_id: TORNEO_ID,
    p_categoria_id: categoria.id,
    p_equipo_id: equipoId,
    p_equipo_nombre: equipoNombre,
    p_nombre: nombre.trim(),
    p_actor: estado.usuarioAsociacion?.display_name || "ADMIN"
  });

  if (error) {
    button.disabled = false;
    setStatus(status, `No se pudo crear el jugador: ${error.message}`, "error");
    return;
  }

  await cargarJugadoresCategoria(categoria.id, true);
  await cargarDocumentosJugadoresCategoria(categoria.id, true);
  await cargarDocumentosDriveCategoria(categoria.id, true);
  renderDocumentacionAsociacion(categoriaNombre);
  renderDocumentacionDriveAsociacion(categoriaNombre);
  setStatus(status, "Jugador creado desde revision admin. Revisar documentos antes de habilitar.", "ok");
}

async function verDocumentoAsociacion(event) {
  const button = event.target.closest(".doc-view-btn");
  if (!button) return;

  const status = $("asociacion-status");

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilitá Asociación con la clave administrativa.", "warn");
    return;
  }

  const scope = button.dataset.documentScope || "team";
  const documento = scope === "player"
    ? obtenerDocumentoJugadorPorId(button.dataset.documentId)
    : obtenerDocumentoPorId(button.dataset.documentId);
  if (!documento?.storage_path) {
    setStatus(status, "Este documento no tiene archivo disponible.", "warn");
    return;
  }

  if (scope === "team" && permiteMultiplesArchivos(documento.requirement_nombre)) {
    await verArchivosMultiplesDocumento(documento, status);
    return;
  }

  if (esUrlDocumentoExterno(documento.storage_path)) {
    abrirDocumentoExterno(documento, status);
    return;
  }

  setStatus(status, "Abriendo archivo...", "");

  const { data, error } = await supabaseClient.storage
    .from("documentos")
    .createSignedUrl(documento.storage_path, 300);

  if (error || !data?.signedUrl) {
    setStatus(status, `No se pudo abrir el archivo: ${error?.message || "sin URL"}`, "error");
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener");
  setStatus(status, "Archivo abierto en una pestaña nueva.", "ok");
}

async function darDeBajaJugadorAsociacion(event) {
  const button = event.target.closest(".doc-player-remove-btn");
  if (!button) return;

  const status = $("asociacion-status");
  const categoriaNombre = $("asociacion-categoria")?.value || "";
  const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);
  const playerId = button.dataset.playerId;
  const playerName = button.dataset.playerName || "jugador";

  if (!estado.asociacionDesbloqueada) {
    setStatus(status, "Primero habilita Asociacion con la clave administrativa.", "warn");
    return;
  }

  if (!categoria || !playerId) {
    setStatus(status, "No se encontro el jugador seleccionado.", "error");
    return;
  }

  const motivo = prompt(`Motivo de baja para ${playerName}:`, "Cargado por error en categoria/equipo incorrecto");
  if (motivo === null) {
    setStatus(status, "Operacion cancelada.", "warn");
    return;
  }

  const confirmar = confirm(`Dar de baja a ${playerName}? Se ocultara de la carga operativa, conservando auditoria y documentos.`);
  if (!confirmar) {
    setStatus(status, "Operacion cancelada.", "warn");
    return;
  }

  button.disabled = true;
  setStatus(status, "Dando de baja jugador...", "");

  const { error } = await supabaseClient.rpc("deactivate_team_player", {
    p_player_id: playerId,
    p_actor: estado.usuarioAsociacion?.display_name || "Asociacion",
    p_reason: motivo || "Baja administrativa"
  });

  if (error) {
    button.disabled = false;
    setStatus(status, `No se pudo dar de baja: ${error.message}. Si la funcion no existe, corre docs/ejecutar-en-supabase-baja-jugadores.sql.`, "error");
    return;
  }

  await cargarJugadoresCategoria(categoria.id, true);
  await cargarDocumentosJugadoresCategoria(categoria.id, true);
  renderDocumentacionAsociacion(categoriaNombre);
  renderDocumentacionDelegado();
  registrarUso("jugador_baja_administrativa", {
    area: "asociacion",
    categoria: categoriaNombre,
    user: estado.usuarioAsociacion?.display_name || "Asociacion",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });
  setStatus(status, "Jugador dado de baja correctamente.", "ok");
}

async function verDocumentoDelegado(event) {
  const button = event.target.closest(".doc-view-delegate-btn");
  if (!button) return;

  const status = $("delegado-status");

  if (!estado.delegadoDesbloqueado || !estado.delegado) {
    setStatus(status, "Primero habilitá edición con la clave.", "warn");
    return;
  }

  const scope = button.dataset.documentScope || "team";
  const documento = scope === "player"
    ? obtenerDocumentoJugadorPorId(button.dataset.documentId)
    : obtenerDocumentoPorId(button.dataset.documentId);

  if (!documento?.storage_path) {
    setStatus(status, "Este documento no tiene archivo disponible.", "warn");
    return;
  }

  const equiposPermitidos = estado.delegado.equipos || [];
  if (!equiposPermitidos.some((equipoPermitido) => nombresEquipoCoinciden(documento.equipo_nombre, equipoPermitido))) {
    setStatus(status, "Ese documento no pertenece a tu equipo.", "error");
    return;
  }

  if (scope === "team" && permiteMultiplesArchivos(documento.requirement_nombre)) {
    await verArchivosMultiplesDocumento(documento, status);
    return;
  }

  if (esUrlDocumentoExterno(documento.storage_path)) {
    abrirDocumentoExterno(documento, status);
    return;
  }

  setStatus(status, "Abriendo archivo...", "");

  const { data, error } = await supabaseClient.storage
    .from("documentos")
    .createSignedUrl(documento.storage_path, 300);

  if (error || !data?.signedUrl) {
    setStatus(status, `No se pudo abrir el archivo: ${error?.message || "sin URL"}`, "error");
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener");
  setStatus(status, "Archivo abierto en una pestaña nueva.", "ok");
}

async function verArchivosMultiplesDocumento(documento, status) {
  const ventana = window.open("", "_blank");
  if (!ventana) {
    setStatus(status, "El navegador bloqueo la ventana de archivos. Habilita ventanas emergentes.", "warn");
    return;
  }

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head><meta charset="utf-8"><title>Archivos</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#111827;">
        <h1>Abriendo archivos...</h1>
      </body>
    </html>
  `);
  ventana.document.close();
  setStatus(status, "Buscando archivos cargados...", "");

  const { data: archivos, error } = await supabaseClient
    .from("document_files")
    .select("id, file_name, file_type, file_size, storage_path, created_at")
    .eq("team_document_id", documento.id)
    .order("created_at", { ascending: true });

  if (error) {
    ventana.close();
    setStatus(status, `No se pudo leer el listado de archivos: ${error.message}`, "error");
    return;
  }

  const listaArchivos = archivos?.length
    ? archivos
    : [{
        id: documento.id,
        file_name: documento.file_name,
        file_type: documento.file_type,
        file_size: documento.file_size,
        storage_path: documento.storage_path,
        created_at: null
      }];

  const archivosConUrl = [];
  for (const archivo of listaArchivos) {
    const { data, error: signedError } = await supabaseClient.storage
      .from("documentos")
      .createSignedUrl(archivo.storage_path, 300);

    archivosConUrl.push({
      ...archivo,
      signedUrl: data?.signedUrl || "",
      error: signedError?.message || ""
    });
  }

  ventana.document.open();
  ventana.document.write(renderVentanaArchivosDocumento(documento, archivosConUrl));
  ventana.document.close();
  setStatus(status, `${archivosConUrl.length} archivo${archivosConUrl.length === 1 ? "" : "s"} disponible${archivosConUrl.length === 1 ? "" : "s"} para revisar.`, "ok");
}

function renderVentanaArchivosDocumento(documento, archivos) {
  const items = archivos.map((archivo, index) => {
    const esImagen = String(archivo.file_type || "").startsWith("image/");
    const fecha = archivo.created_at ? new Date(archivo.created_at).toLocaleString("es-AR") : "";
    const nombre = archivo.file_name || `Archivo ${index + 1}`;

    return `
      <article class="file-card">
        <div class="file-head">
          <strong>${index + 1}. ${escapeHtml(nombre)}</strong>
          ${fecha ? `<small>${escapeHtml(fecha)}</small>` : ""}
        </div>
        ${archivo.error ? `<p class="error">No se pudo generar enlace: ${escapeHtml(archivo.error)}</p>` : ""}
        ${archivo.signedUrl && esImagen ? `<img src="${archivo.signedUrl}" alt="${escapeHtml(nombre)}">` : ""}
        ${archivo.signedUrl ? `<p><a href="${archivo.signedUrl}" target="_blank" rel="noopener">Abrir archivo</a></p>` : ""}
      </article>
    `;
  }).join("");

  return `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(documento.requirement_nombre || "Archivos")}</title>
      <style>
        body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; background: #0b1730; color: #f8fafc; }
        h1 { margin: 0 0 4px; font-size: 24px; }
        .muted { color: #bfdbfe; margin: 0 0 18px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
        .file-card { border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: rgba(255,255,255,.06); padding: 12px; }
        .file-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
        small { color: #cbd5e1; }
        img { width: 100%; max-height: 520px; object-fit: contain; background: #111827; border-radius: 8px; }
        a { color: #93c5fd; font-weight: 700; }
        .error { color: #fecaca; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(documento.requirement_nombre || "Archivos")}</h1>
      <p class="muted">${escapeHtml(documento.equipo_nombre || "")} - ${archivos.length} archivo${archivos.length === 1 ? "" : "s"}</p>
      <div class="grid">${items}</div>
    </body>
    </html>
  `;
}

async function cargarDatosAsociacionActual() {
  if (!estado.asociacionDesbloqueada) return;

  const categoria = $("asociacion-categoria")?.value;
  if (!categoria) return;

  const status = $("asociacion-status");
  setStatus(status, "Cargando datos de asociacion...", "");

  await refrescarCategoria(categoria, { actualizarPublico: false });
  poblarSelectPartidosAsociacion(categoria);
  renderPlayoffsAsociacion(categoria);
  renderDocumentacionAsociacion(categoria);
  const categoriaData = estado.categorias.find((cat) => cat.nombre === categoria);
  if (categoriaData) await cargarDocumentosDriveCategoria(categoriaData.id);
  renderDocumentacionDriveAsociacion(categoria);
  renderAuditoriaDocumentalAsociacion(categoria);
  renderProgramacionAsociacion(categoria);
  renderCierreAsociacion(categoria);
  renderInicioAsociacion(categoria);
  setStatus(status, "", "");
}

async function desbloquearAsociacion() {
  const clave = $("asociacion-clave")?.value?.trim() || "";
  const status = $("asociacion-acceso-status");
  const permisos = await cargarPermisosPorClave(clave);
  const accesoSupabase = puedeAccederAsociacion(permisos);

  if (!CLAVES_ASOCIACION.includes(clave) && !accesoSupabase) {
    estado.asociacionDesbloqueada = false;
    estado.usuarioAsociacion = null;
    aplicarBloqueoAsociacion();
    setStatus(status, "Clave administrativa incorrecta.", "error");
    return;
  }

  estado.asociacionDesbloqueada = true;
  estado.usuarioAsociacion = permisos[0] || {
    display_name: CLAVES_ASOCIACION.includes(clave) ? "Asociación" : "Admin",
    role: "asociacion"
  };
  aplicarBloqueoAsociacion();
  registrarUso("acceso_asociacion", {
    area: "asociacion",
    user: estado.usuarioAsociacion.display_name,
    role: estado.usuarioAsociacion.role
  });
  if (panelActualAsociacion() === "uso") {
    actualizarEstadisticasUso();
  }
  setStatus(status, accesoSupabase ? `Asociación habilitada para ${permisos[0].display_name}.` : "Asociación habilitada.", "ok");
  try {
    await cargarDatosAsociacionActual();
  } catch (error) {
    setStatus($("asociacion-status"), `No se pudieron cargar los datos de asociacion: ${error.message}`, "error");
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportarDocumentacionCsv() {
  const status = $("asociacion-status");
  const filas = estado.filasDocumentacionAsociacion || [];

  if (!filas.length) {
    setStatus(status, "No hay filas documentales para exportar.", "warn");
    return;
  }

  const categoria = $("asociacion-categoria")?.value || "categoria";
  const encabezado = [
    "Categoria",
    "Equipo",
    "Documento",
    "Estado",
    "Archivo",
    "Vencimiento",
    "Estado vencimiento",
    "Observacion"
  ];
  const rows = filas.map((fila) => [
    categoria,
    fila.equipo,
    fila.requisito,
    estadoDocumentoLabel(fila.documento),
    fila.documento?.file_name || "",
    fila.documento?.vencimiento ? formatearFecha(fila.documento.vencimiento) : "",
    fila.vencimientoStatus,
    fila.documento?.observacion || ""
  ]);
  const csv = [encabezado, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fecha = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `documentacion-${slugify(categoria)}-${fecha}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(status, "CSV documental exportado.", "ok");
}

function descargarCsv(nombreArchivo, encabezado, rows) {
  const csv = [encabezado, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function contextoHabilitadosSeleccionado(categoria) {
  const equipoFiltro = $("habilitados-filtro-equipo")?.value || "";
  const partidoFiltro = $("habilitados-filtro-partido")?.value || "";
  const partido = obtenerPartidoHabilitadosSeleccionado(categoria, partidoFiltro);

  if (partido) {
    return {
      etiqueta: `Fecha ${partido.jornada || "-"} - ${partido.local} vs ${partido.visitante}`,
      archivo: `fecha-${partido.jornada || "s-n"}-${partido.local}-vs-${partido.visitante}`
    };
  }

  if (equipoFiltro) {
    return {
      etiqueta: equipoFiltro,
      archivo: equipoFiltro
    };
  }

  return {
    etiqueta: "Categoria completa",
    archivo: "categoria-completa"
  };
}

function exportarHabilitadosCsv() {
  const status = $("asociacion-status");
  const categoria = $("asociacion-categoria")?.value || "categoria";
  const equipoFiltro = $("habilitados-filtro-equipo")?.value || "";
  const partidoFiltro = $("habilitados-filtro-partido")?.value || "";
  const contexto = contextoHabilitadosSeleccionado(categoria);

  if (!equipoFiltro && !partidoFiltro) {
    setStatus(status, "Elegí un club o un partido antes de exportar la lista de habilitados.", "warn");
    return;
  }

  const filas = calcularHabilitadosCategoria(categoria);

  if (!filas.length) {
    setStatus(status, "No hay jugadores para exportar en la lista de habilitados.", "warn");
    return;
  }

  const encabezado = [
    "Categoria",
    "Equipo",
    "Jugador",
    "DNI",
    "Numero",
    "Buena fe",
    "Seguro",
    "Estudio medico / certificado",
    "Deslinde / declaracion jurada",
    "Pase (no bloqueante)",
    "Habilitado",
    "Faltantes"
  ];
  const rows = filas.map((fila) => [
    fila.categoria,
    fila.equipo,
    fila.apellidoNombre,
    fila.dni,
    fila.dorsal,
    fila.buenaFe,
    fila.seguro,
    fila.certificado,
    fila.deslinde,
    fila.pase,
    fila.habilitado,
    fila.faltantes
  ]);
  const fecha = new Date().toISOString().slice(0, 10);
  descargarCsv(`habilitados-arbitros-${slugify(categoria)}-${slugify(contexto.archivo)}-${fecha}.csv`, encabezado, rows);
  setStatus(status, "Lista de habilitados exportada en CSV.", "ok");
}

function descargarListaHabilitadosHtml() {
  const status = $("asociacion-status");
  const categoria = $("asociacion-categoria")?.value || "categoria";
  const equipoFiltro = $("habilitados-filtro-equipo")?.value || "";
  const partidoFiltro = $("habilitados-filtro-partido")?.value || "";
  const contexto = contextoHabilitadosSeleccionado(categoria);

  if (!equipoFiltro && !partidoFiltro) {
    setStatus(status, "Elegí un club antes de descargar la lista para árbitros.", "warn");
    return;
  }

  const filas = calcularHabilitadosCategoria(categoria);

  if (!filas.length) {
    setStatus(status, "No hay jugadores para descargar en la lista de habilitados.", "warn");
    return;
  }

  const fechaGeneracion = new Date().toLocaleString("es-AR");
  const habilitados = filas.filter((fila) => fila.habilitado === "SI").length;
  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Habilitados arbitros - ${escapeHtml(categoria)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 24px; }
        h1 { margin: 0 0 4px; font-size: 24px; }
        .muted { color: #4b5563; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #9ca3af; padding: 6px; font-size: 11px; text-align: left; }
        th { background: #bbd7ad; }
        .si { background: #11ef18; font-weight: 800; text-align: center; }
        .no { background: #ff2020; color: #111827; font-weight: 800; text-align: center; }
        .print-actions { margin: 16px 0; }
        .print-actions button { padding: 10px 14px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 700; }
        @media print { body { margin: 10mm; } .print-actions { display: none; } }
      </style>
    </head>
    <body>
      <h1>Lista de habilitados para arbitros</h1>
      <p class="muted">${escapeHtml(APP_CONFIG.organizacionActiva.nombre)} - ${escapeHtml(categoria)} - ${escapeHtml(contexto.etiqueta)}</p>
      <p class="muted">Generado ${escapeHtml(fechaGeneracion)} - ${habilitados} habilitado${habilitados === 1 ? "" : "s"} de ${filas.length}</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>
      <table>
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Jugador</th>
            <th>DNI</th>
            <th>Nro</th>
            <th>Buena fe</th>
            <th>Seguro</th>
            <th>Estudio/Cert.</th>
            <th>Deslinde</th>
            <th>Pase</th>
            <th>Habilitado</th>
            <th>Faltantes</th>
          </tr>
        </thead>
        <tbody>
          ${filas.map((fila) => `
            <tr>
              <td>${escapeHtml(fila.equipo)}</td>
              <td>${escapeHtml(fila.apellidoNombre)}</td>
              <td>${escapeHtml(fila.dni)}</td>
              <td>${escapeHtml(fila.dorsal)}</td>
              <td class="${fila.buenaFe === "SI" ? "si" : "no"}">${escapeHtml(fila.buenaFe)}</td>
              <td class="${fila.seguro === "SI" ? "si" : "no"}">${escapeHtml(fila.seguro)}</td>
              <td class="${fila.certificado === "SI" ? "si" : "no"}">${escapeHtml(fila.certificado)}</td>
              <td class="${fila.deslinde === "SI" ? "si" : "no"}">${escapeHtml(fila.deslinde)}</td>
              <td class="${fila.pase === "SI" ? "si" : "no"}">${escapeHtml(fila.pase)}</td>
              <td class="${fila.habilitado === "SI" ? "si" : "no"}">${escapeHtml(fila.habilitado)}</td>
              <td>${escapeHtml(fila.faltantes || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `habilitados-arbitros-${categoria}-${contexto.archivo}`);
  abrirInformeHtml(html);
  setStatus(status, `Lista de habilitados descargada como ${nombre}.`, "ok");
  mostrarCartelInforme(`Se descargo ${nombre} en la carpeta Descargas.`);
}

function seleccionarEquipoHabilitados(event) {
  const button = event.target.closest(".habilitados-team-card");
  if (!button) return;

  const select = $("habilitados-filtro-equipo");
  if (!select) return;

  select.value = button.dataset.habilitadosEquipo || "";
  const categoria = $("asociacion-categoria").value;
  renderListaHabilitadosArbitros(categoria);
}

function descargarPlanPruebaDocumental() {
  const status = $("asociacion-status");
  const categoria = $("asociacion-categoria")?.value || "";
  const equipoFiltro = $("habilitados-filtro-equipo")?.value || "";

  if (!categoria) {
    setStatus(status, "Elegí una categoría antes de generar el plan de prueba.", "warn");
    return;
  }

  if (!equipoFiltro) {
    setStatus(status, "Elegí un club en 'Lista arbitros por club' para generar una prueba controlada.", "warn");
    return;
  }

  const estadoAnterior = $("habilitados-filtro-estado")?.value || "";
  if ($("habilitados-filtro-estado")) $("habilitados-filtro-estado").value = "";
  const filas = calcularHabilitadosCategoria(categoria).filter((fila) =>
    nombresEquipoCoinciden(fila.equipo, equipoFiltro)
  );
  if ($("habilitados-filtro-estado")) $("habilitados-filtro-estado").value = estadoAnterior;

  const habilitados = filas.filter((fila) => fila.habilitado === "SI").length;
  const fechaGeneracion = new Date().toLocaleString("es-AR");
  const faltantes = filas.filter((fila) => fila.habilitado !== "SI");
  const jugadoresHtml = filas.length
    ? filas.map((fila) => `
      <tr>
        <td>${escapeHtml(fila.apellidoNombre)}</td>
        <td>${escapeHtml(fila.dni || "-")}</td>
        <td>${escapeHtml(fila.dorsal || "-")}</td>
        <td>${escapeHtml(fila.habilitado)}</td>
        <td>${escapeHtml(fila.faltantes || "-")}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="5">Todavía no hay jugadores cargados para este club.</td></tr>`;

  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Plan de prueba documental - ${escapeHtml(equipoFiltro)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 24px; line-height: 1.4; }
        h1 { margin: 0 0 4px; font-size: 24px; }
        h2 { margin-top: 20px; font-size: 17px; }
        .muted { color: #4b5563; margin: 0 0 12px; }
        .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 12px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 7px; font-size: 12px; text-align: left; }
        th { background: #e5e7eb; }
        li { margin: 5px 0; }
        .print-actions { margin: 16px 0; }
        .print-actions button { padding: 10px 14px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 700; }
        @media print { body { margin: 10mm; } .print-actions { display: none; } }
      </style>
    </head>
    <body>
      <h1>Plan de prueba documental</h1>
      <p class="muted">${escapeHtml(APP_CONFIG.organizacionActiva.nombre)} - ${escapeHtml(categoria)} - ${escapeHtml(equipoFiltro)}</p>
      <p class="muted">Generado ${escapeHtml(fechaGeneracion)}. Estado inicial: ${habilitados} habilitado${habilitados === 1 ? "" : "s"} de ${filas.length} jugador${filas.length === 1 ? "" : "es"}.</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>

      <div class="box">
        <h2>Objetivo</h2>
        <p>Validar el flujo completo sin editar la base por fuera de la app: carga de documentos por Delegados, revisión por Asociación, auditoría y lista final para árbitros.</p>
      </div>

      <div class="box">
        <h2>1. Delegados</h2>
        <ol>
          <li>Entrar a Delegados con la clave del club.</li>
          <li>Elegir categoría ${escapeHtml(categoria)} y club ${escapeHtml(equipoFiltro)}.</li>
          <li>Cargar documentos de equipo: lista de buena fe y seguro.</li>
          <li>Cargar o revisar jugadores del club.</li>
          <li>Para cada jugador, cargar certificado/estudio y declaración jurada/deslinde. El pase se controla solo cuando corresponde por traspaso.</li>
        </ol>
      </div>

      <div class="box">
        <h2>2. Asociación</h2>
        <ol>
          <li>Entrar con clave administrativa.</li>
          <li>Ir a Documentación, filtrar por ${escapeHtml(equipoFiltro)}.</li>
          <li>Abrir cada archivo, aprobarlo u observarlo.</li>
          <li>Revisar la lista de habilitados y exportar CSV o lista imprimible.</li>
          <li>Ir a Auditoría para confirmar que queden registrados los movimientos.</li>
        </ol>
      </div>

      <div class="box">
        <h2>Resultado esperado</h2>
        <p>Un jugador queda habilitado solamente si tiene aprobados y vigentes: buena fe del equipo, seguro del equipo, certificado/estudio y declaración jurada/deslinde. El pase no bloquea la habilitacion general; queda como archivo de control para traspasos.</p>
      </div>

      <h2>Estado actual del club</h2>
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>DNI</th>
            <th>Nro</th>
            <th>Habilitado</th>
            <th>Faltantes</th>
          </tr>
        </thead>
        <tbody>${jugadoresHtml}</tbody>
      </table>

      <h2>Pendientes detectados</h2>
      <p>${faltantes.length ? `${faltantes.length} jugador${faltantes.length === 1 ? "" : "es"} con documentación pendiente.` : "No hay pendientes detectados con los datos actuales."}</p>
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `plan-prueba-documental-${categoria}-${equipoFiltro}`);
  abrirInformeHtml(html);
  setStatus(status, `Plan de prueba descargado como ${nombre}.`, "ok");
  mostrarCartelInforme(`Se descargo ${nombre} en la carpeta Descargas.`);
}

async function inicializarAsociacion() {
  if (estado.asociacionInicializada) return;
  estado.asociacionInicializada = true;

  poblarSelectCategorias("asociacion-categoria", estado.categorias);

  $("asociacion-categoria").addEventListener("change", async (e) => {
    const categoria = e.target.value;
    await refrescarCategoria(categoria, { actualizarPublico: false });
    poblarSelectPartidosAsociacion(categoria);
    renderPlayoffsAsociacion(categoria);
    renderDocumentacionAsociacion(categoria);
    const categoriaData = estado.categorias.find((cat) => cat.nombre === categoria);
    if (categoriaData) await cargarDocumentosDriveCategoria(categoriaData.id);
    renderDocumentacionDriveAsociacion(categoria);
    renderAuditoriaDocumentalAsociacion(categoria);
    renderProgramacionAsociacion(categoria);
    renderCierreAsociacion(categoria);
    renderInicioAsociacion(categoria);
    if (panelActualAsociacion() === "habilitados") {
      renderListaHabilitadosArbitros(categoria);
    }
    if (panelActualAsociacion() === "auditoria-documental") {
      renderAuditoriaDocumentalAsociacion(categoria);
    }
    setStatus($("asociacion-status"), "", "");
  });

  $("asociacion-partido").addEventListener("change", completarInputsAsociacion);
  $("asociacion-guardar").addEventListener("click", guardarResultadoAsociacion);
  $("asociacion-anular")?.addEventListener("click", anularResultadoAsociacion);
  $("asociacion-resuelve-local")?.addEventListener("click", () => resolverPartidoAdministrativamente("local"));
  $("asociacion-resuelve-visitante")?.addEventListener("click", () => resolverPartidoAdministrativamente("visitante"));
  $("asociacion-playoffs")?.addEventListener("click", guardarResultadoPlayoffAsociacion);
  $("programacion-tabla")?.addEventListener("click", manejarProgramacionClick);
  $("programacion-copiar")?.addEventListener("click", copiarProgramacionAsociacion);
  $("programacion-abrir-correo")?.addEventListener("click", abrirCorreoProgramacion);
  $("programacion-email-destino")?.addEventListener("input", guardarEmailProgramacionDestino);
  $("programacion-marcar-enviado")?.addEventListener("click", marcarProgramacionListaEnviada);
  cargarEmailProgramacionDestino();
  $("cierre-descargar-acta")?.addEventListener("click", generarActaCierreTorneo);
  $("documentacion-tabla").addEventListener("click", revisarDocumentoAsociacion);
  $("documentacion-tabla").addEventListener("click", verDocumentoAsociacion);
  $("documentacion-tabla").addEventListener("click", darDeBajaJugadorAsociacion);
  $("drive-doc-tabla")?.addEventListener("click", revisarDocumentoDriveAsociacion);
  $("drive-doc-tabla")?.addEventListener("click", crearJugadorDesdeDriveAsociacion);
  $("documentacion-filtro-estado").addEventListener("change", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
  $("documentacion-filtro-vencimiento").addEventListener("change", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
  $("documentacion-buscar").addEventListener("input", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
  $("drive-doc-estado")?.addEventListener("change", () => {
    renderDocumentacionDriveAsociacion($("asociacion-categoria").value);
  });
  $("drive-doc-match")?.addEventListener("change", () => {
    renderDocumentacionDriveAsociacion($("asociacion-categoria").value);
  });
  $("drive-doc-buscar")?.addEventListener("input", () => {
    renderDocumentacionDriveAsociacion($("asociacion-categoria").value);
  });
  $("drive-doc-refrescar")?.addEventListener("click", async () => {
    const categoriaNombre = $("asociacion-categoria").value;
    const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);
    if (categoria) await cargarDocumentosDriveCategoria(categoria.id, true);
    renderDocumentacionDriveAsociacion(categoriaNombre);
  });
  $("auditoria-filtro-equipo")?.addEventListener("change", () => {
    renderAuditoriaDocumentalAsociacion($("asociacion-categoria").value);
  });
  $("auditoria-filtro-prioridad")?.addEventListener("change", () => {
    renderAuditoriaDocumentalAsociacion($("asociacion-categoria").value);
  });
  $("auditoria-buscar")?.addEventListener("input", () => {
    renderAuditoriaDocumentalAsociacion($("asociacion-categoria").value);
  });
  $("auditoria-refrescar")?.addEventListener("click", async () => {
    const categoriaNombre = $("asociacion-categoria").value;
    const categoria = estado.categorias.find((cat) => cat.nombre === categoriaNombre);
    if (categoria) await cargarAuditoriaDocumentalCategoria(categoria.id, true);
    renderAuditoriaDocumentalAsociacion(categoriaNombre);
  });
  $("documentacion-exportar").addEventListener("click", exportarDocumentacionCsv);
  $("habilitados-filtro-equipo")?.addEventListener("change", () => {
    if ($("habilitados-filtro-partido")) $("habilitados-filtro-partido").value = "";
    const categoria = $("asociacion-categoria").value;
    renderListaHabilitadosArbitros(categoria);
  });
  $("habilitados-filtro-estado")?.addEventListener("change", () => {
    renderListaHabilitadosArbitros($("asociacion-categoria").value);
  });
  $("habilitados-filtro-partido")?.addEventListener("change", () => {
    if ($("habilitados-filtro-equipo")) $("habilitados-filtro-equipo").value = "";
    renderListaHabilitadosArbitros($("asociacion-categoria").value);
  });
  $("habilitados-tabla")?.addEventListener("click", seleccionarEquipoHabilitados);
  $("habilitados-exportar-csv")?.addEventListener("click", exportarHabilitadosCsv);
  $("habilitados-descargar-html")?.addEventListener("click", descargarListaHabilitadosHtml);
  $("habilitados-plan-prueba")?.addEventListener("click", descargarPlanPruebaDocumental);
  $("asociacion-desbloquear").addEventListener("click", desbloquearAsociacion);
  $("asociacion-clave").addEventListener("keydown", (event) => {
    if (event.key === "Enter") desbloquearAsociacion();
  });
  inicializarNavegacionAsociacion();
  aplicarBloqueoAsociacion();

 function configurarDefaultsPlanner() {
  const categoria = document.getElementById("planner-categoria")?.value || "";
  const playoffs = document.getElementById("planner-playoffs");
  const partidosCuartos = document.getElementById("planner-partidos-cuartos");
  const partidosSemis = document.getElementById("planner-partidos-semis");
  const final = document.getElementById("planner-final");
  const definicionB = document.getElementById("planner-definicion-b");
  const descensoA = document.getElementById("planner-descenso-a");
  const promocion = document.getElementById("planner-promocion");

  if (!playoffs || !partidosCuartos || !partidosSemis || !final || !definicionB || !descensoA || !promocion) return;

  configurarFechasPlayoffPlanner(categoria);
}

function textoOpcionPlanner(id, fallback = "-") {
  const select = document.getElementById(id);
  return select?.selectedOptions?.[0]?.textContent || fallback;
}

function normalizarFechaInputPlanner(fecha) {
  if (!fecha) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const partes = String(fecha).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!partes) return "";
  const [, dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function obtenerFechaSeriePlanner(datos, indice = 0) {
  if (!datos) return "";
  const fechas = datos.fechas || datos.dates || datos.partidos_fechas || [];
  if (Array.isArray(fechas) && fechas[indice]) return normalizarFechaInputPlanner(fechas[indice]);

  const claves = indice === 0
    ? ["fecha", "fecha_inicio", "dia", "juego_1", "fecha_1"]
    : [`juego_${indice + 1}`, `fecha_${indice + 1}`];

  for (const clave of claves) {
    if (datos[clave]) return normalizarFechaInputPlanner(datos[clave]);
  }

  return "";
}

function setFechaPlanner(id, valor) {
  const input = document.getElementById(id);
  if (input) input.value = valor || "";
}

function idsFechasPlayoffPlanner() {
  return [
    "planner-fecha-cuartos",
    "planner-fecha-cuartos-2",
    "planner-fecha-cuartos-3",
    "planner-fecha-semis",
    "planner-fecha-semis-2",
    "planner-fecha-semis-3",
    "planner-fecha-final-1",
    "planner-fecha-final-2",
    "planner-fecha-final-3",
    "planner-fecha-promocion-1",
    "planner-fecha-promocion-2",
    "planner-fecha-promocion-3"
  ];
}

function fechaPlannerLabel(fecha) {
  return fecha ? fechaPartidoLabel(fecha) : "A definir";
}

function configurarFechasPlayoffPlanner(categoria) {
  idsFechasPlayoffPlanner().forEach((id) => setFechaPlanner(id, ""));
  actualizarFechasSeriesPlanner();
}

function cantidadPartidosFinalPlanner(valor) {
  if (valor === "mejor-3") return 3;
  if (valor === "mejor-2") return 2;
  return 1;
}

function actualizarFechasSeriesPlanner() {
  [
    "planner-fecha-cuartos",
    "planner-fecha-cuartos-2",
    "planner-fecha-cuartos-3",
    "planner-fecha-semis",
    "planner-fecha-semis-2",
    "planner-fecha-semis-3",
    "planner-fecha-final-1",
    "planner-fecha-final-2",
    "planner-fecha-final-3",
    "planner-fecha-promocion-1",
    "planner-fecha-promocion-2",
    "planner-fecha-promocion-3"
  ].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.disabled = false;
  });
}

function detalleFormatoPlanner(categoria) {
  const playoffs = document.getElementById("planner-playoffs")?.value || "top8";
  const partidosCuartos = Number(document.getElementById("planner-partidos-cuartos")?.value || 1);
  const partidosSemis = Number(document.getElementById("planner-partidos-semis")?.value || 1);
  const final = document.getElementById("planner-final")?.value || "mejor-3";
  const definicionB = document.getElementById("planner-definicion-b")?.value || "playoffs";
  const descensoA = document.getElementById("planner-descenso-a")?.value || "10-general";
  const promocion = Number(document.getElementById("planner-promocion")?.value || 0);
  const clasificados = playoffs === "sin-playoffs" ? 0 : Number(playoffs.replace("top", ""));

  let reglaPromocion = "Sin regla especial";
  if (categoria === "Maxi +35 A") {
    reglaPromocion =
      descensoA === "10-general"
        ? "9no juega promocion y 10mo desciende directo."
        : "Sin descenso configurado.";
  } else if (categoria === "Maxi +35 B") {
    reglaPromocion =
      definicionB === "playoffs"
        ? "Campeon de playoffs asciende y subcampeon juega promocion."
        : "1ro de tabla asciende y 2do de tabla juega promocion.";
  } else if (categoria === "Maxi +48") {
    reglaPromocion = "Top 6: 3ro vs 6to y 4to vs 5to en repechaje. Semifinales reordenadas por merito de fase regular.";
  }

  return {
    clasificados,
    playoffsTexto: textoOpcionPlanner("planner-playoffs"),
    finalTexto: textoOpcionPlanner("planner-final"),
    definicionBTexto: textoOpcionPlanner("planner-definicion-b"),
    descensoATexto: textoOpcionPlanner("planner-descenso-a"),
    promocionTexto: textoOpcionPlanner("planner-promocion", "Sin partido extra"),
    reglaPromocion,
    partidosCuartos,
    partidosSemis,
    partidosFinal: cantidadPartidosFinalPlanner(final),
    partidosPromocion: promocion,
    fechaCuartos: document.getElementById("planner-fecha-cuartos")?.value || "",
    fechaCuartos2: document.getElementById("planner-fecha-cuartos-2")?.value || "",
    fechaCuartos3: document.getElementById("planner-fecha-cuartos-3")?.value || "",
    fechaSemis: document.getElementById("planner-fecha-semis")?.value || "",
    fechaSemis2: document.getElementById("planner-fecha-semis-2")?.value || "",
    fechaSemis3: document.getElementById("planner-fecha-semis-3")?.value || "",
    fechaFinal1: document.getElementById("planner-fecha-final-1")?.value || "",
    fechaFinal2: document.getElementById("planner-fecha-final-2")?.value || "",
    fechaFinal3: document.getElementById("planner-fecha-final-3")?.value || "",
    fechaPromocion1: document.getElementById("planner-fecha-promocion-1")?.value || "",
    fechaPromocion2: document.getElementById("planner-fecha-promocion-2")?.value || "",
    fechaPromocion3: document.getElementById("planner-fecha-promocion-3")?.value || ""
  };
}

function fechasSeriePlanner(formato, prefijo, cantidad) {
  const claves = {
    cuartos: ["fechaCuartos", "fechaCuartos2", "fechaCuartos3"],
    semis: ["fechaSemis", "fechaSemis2", "fechaSemis3"],
    final: ["fechaFinal1", "fechaFinal2", "fechaFinal3"],
    promocion: ["fechaPromocion1", "fechaPromocion2", "fechaPromocion3"]
  }[prefijo] || [];

  return claves
    .slice(0, cantidad)
    .map((clave) => fechaPlannerLabel(formato[clave]))
    .join(", ");
}

function fechaLocalPlanner(fecha) {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

function fechaKeyPlanner(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return "";
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function sumarDiasPlanner(fecha, dias) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function siguienteDiaJuegoPlanner(fechaInicio, diaJuego) {
  const inicio = fechaLocalPlanner(fechaInicio);
  if (!inicio) return null;
  const objetivo = Number(diaJuego);
  const distancia = (objetivo - inicio.getDay() + 7) % 7;
  return sumarDiasPlanner(inicio, distancia);
}

function parsearFechasBloqueadasPlanner(texto) {
  if (!texto?.trim()) return new Set();

  return new Set(
    texto
      .split(",")
      .map((item) => normalizarFechaInputPlanner(item.trim()))
      .filter(Boolean)
  );
}

function parsearFechasEspecialesPlanner(texto) {
  const especiales = new Map();
  if (!texto?.trim()) return especiales;

  String(texto)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const partes = item.split(/\s*(?:=|>|->)\s*/);
      if (partes.length !== 2) return;
      const desde = normalizarFechaInputPlanner(partes[0]);
      const hacia = normalizarFechaInputPlanner(partes[1]);
      if (desde && hacia) especiales.set(desde, hacia);
    });

  return especiales;
}

function nombresEquiposDesdePartidos(partidos) {
  const vistos = new Set();
  const equipos = [];

  partidos.forEach((partido) => {
    [partido.local, partido.visitante, partido.libre].forEach((nombre) => {
      if (!nombre || vistos.has(nombre)) return;
      vistos.add(nombre);
      equipos.push(nombre);
    });
  });

  return equipos;
}

function parsearEquiposPlanner(texto) {
  const vistos = new Set();
  const equipos = [];

  String(texto || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((nombre) => {
      const key = normalizarTexto(nombre);
      if (vistos.has(key)) return;
      vistos.add(key);
      equipos.push(nombre.toUpperCase());
    });

  return equipos;
}

function actualizarResumenEquiposPlanner(equipos = null) {
  const resumen = $("planner-equipos-resumen");
  const textarea = $("planner-equipos-manual");
  if (!resumen) return;
  const lista = equipos || parsearEquiposPlanner(textarea?.value || "");
  resumen.textContent = lista.length
    ? `${lista.length} equipo${lista.length === 1 ? "" : "s"} en la simulacion.`
    : "Sin lista cargada.";
}

function cargarEquiposActualesPlanner(forzar = false) {
  const textarea = $("planner-equipos-manual");
  if (!textarea) return [];
  if (textarea.value.trim() && !forzar) {
    const existentes = parsearEquiposPlanner(textarea.value);
    actualizarResumenEquiposPlanner(existentes);
    return existentes;
  }

  const categoria = $("planner-categoria")?.value || "";
  const equipos = obtenerEquiposCategoria(categoria);
  textarea.value = equipos.join("\n");
  actualizarResumenEquiposPlanner(equipos);
  return equipos;
}

function generarRondaRobinPlanner(equiposOriginales) {
  const equipos = [...equiposOriginales];
  if (equipos.length % 2 !== 0) equipos.push(null);

  const cantidad = equipos.length;
  const rondas = [];
  let rotacion = [...equipos];

  for (let ronda = 0; ronda < cantidad - 1; ronda += 1) {
    const partidos = [];
    let libre = "";

    for (let i = 0; i < cantidad / 2; i += 1) {
      const a = rotacion[i];
      const b = rotacion[cantidad - 1 - i];

      if (!a || !b) {
        libre = a || b || "";
        continue;
      }

      const invierte = ronda % 2 === 1;
      partidos.push({
        local: invierte ? b : a,
        visitante: invierte ? a : b
      });
    }

    rondas.push({ partidos, libre });
    rotacion = [rotacion[0], rotacion[cantidad - 1], ...rotacion.slice(1, cantidad - 1)];
  }

  return rondas;
}

function generarFixtureSimuladoPlanner(equipos, ruedas, fechaInicio, diaJuego, bloqueadas, fechaFin, frecuencia = 1, especiales = new Map()) {
  const base = generarRondaRobinPlanner(equipos);
  const jornadas = [];
  const alertas = [];
  let fecha = siguienteDiaJuegoPlanner(fechaInicio, diaJuego);
  const limite = fechaLocalPlanner(fechaFin);
  let bloqueosSalteados = 0;

  for (let rueda = 1; rueda <= ruedas; rueda += 1) {
    base.forEach((jornadaBase) => {
      while (fecha && bloqueadas.has(fechaKeyPlanner(fecha)) && !especiales.has(fechaKeyPlanner(fecha))) {
        bloqueosSalteados += 1;
        fecha = sumarDiasPlanner(fecha, 7 * frecuencia);
      }

      const fechaOriginal = fecha ? fechaKeyPlanner(fecha) : "";
      const fechaJornada = fechaOriginal ? especiales.get(fechaOriginal) || fechaOriginal : "";
      const invierteLocalia = rueda % 2 === 0;
      const partidos = jornadaBase.partidos.map((partido) => ({
        local: invierteLocalia ? partido.visitante : partido.local,
        visitante: invierteLocalia ? partido.local : partido.visitante
      }));

      jornadas.push({
        numero: jornadas.length + 1,
        rueda,
        fecha: fechaJornada,
        fechaOriginal: fechaOriginal !== fechaJornada ? fechaOriginal : "",
        libre: jornadaBase.libre,
        partidos
      });

      if (fecha) fecha = sumarDiasPlanner(fecha, 7 * frecuencia);
    });
  }

  const ultimaFecha = jornadas[jornadas.length - 1]?.fecha || "";
  if (bloqueosSalteados) {
    alertas.push(`Se saltearon ${bloqueosSalteados} fecha(s) bloqueada(s).`);
  }
  if (especiales.size) {
    alertas.push(`Se aplicaron ${especiales.size} fecha(s) especial(es) de calendario.`);
  }
  if (limite && ultimaFecha) {
    const ultima = fechaLocalPlanner(ultimaFecha);
    if (ultima > limite) alertas.push("La fase regular queda fuera de la fecha limite indicada.");
  }

  return { jornadas, alertas, ultimaFecha, bloqueosSalteados };
}

function siguienteFechaLibrePlanner(fecha, bloqueadas, frecuencia = 1) {
  let proxima = sumarDiasPlanner(fecha, 7 * frecuencia);
  while (bloqueadas?.has(fechaKeyPlanner(proxima))) {
    proxima = sumarDiasPlanner(proxima, 7 * frecuencia);
  }
  return proxima;
}

function completarFechasPlayoffSimuladasPlanner(formato, simulacion, bloqueadas, frecuencia = 1) {
  if ((!formato.clasificados && !formato.partidosPromocion) || !simulacion.ultimaFecha) return;

  const fechaBase = fechaLocalPlanner(simulacion.ultimaFecha);
  if (!fechaBase) return;

  let cursor = fechaBase;
  const asignar = (id) => {
    const input = document.getElementById(id);
    if (!input) return;
    cursor = siguienteFechaLibrePlanner(cursor, bloqueadas, frecuencia);
    input.value = fechaKeyPlanner(cursor);
  };

  if (formato.clasificados) {
    const hayRondaInicial = formato.clasificados > 4;
    if (hayRondaInicial) {
      ["planner-fecha-cuartos", "planner-fecha-cuartos-2", "planner-fecha-cuartos-3"]
        .slice(0, formato.partidosCuartos)
        .forEach(asignar);
    }

    ["planner-fecha-semis", "planner-fecha-semis-2", "planner-fecha-semis-3"]
      .slice(0, formato.partidosSemis)
      .forEach(asignar);

    ["planner-fecha-final-1", "planner-fecha-final-2", "planner-fecha-final-3"]
      .slice(0, formato.partidosFinal)
      .forEach(asignar);
  }

  ["planner-fecha-promocion-1", "planner-fecha-promocion-2", "planner-fecha-promocion-3"]
    .slice(0, formato.partidosPromocion || 0)
    .forEach(asignar);
}

function fechasDisponiblesPlanner(inicioISO, finISO, diaJuego, frecuencia, bloqueadas) {
  const inicio = siguienteDiaJuegoPlanner(inicioISO, diaJuego);
  const fin = fechaLocalPlanner(finISO);
  if (!inicio || !fin) return [];

  const fechas = [];
  let cursor = inicio;
  while (cursor <= fin) {
    const key = fechaKeyPlanner(cursor);
    if (!bloqueadas?.has(key)) fechas.push(key);
    cursor = sumarDiasPlanner(cursor, 7 * frecuencia);
  }
  return fechas;
}

function ultimaFechaFormatoPlanner(formato) {
  const claves = [
    "fechaPromocion3",
    "fechaPromocion2",
    "fechaPromocion1",
    "fechaFinal3",
    "fechaFinal2",
    "fechaFinal1",
    "fechaSemis3",
    "fechaSemis2",
    "fechaSemis",
    "fechaCuartos3",
    "fechaCuartos2",
    "fechaCuartos"
  ];
  return claves.map((clave) => formato[clave]).find(Boolean) || "";
}

function contarFechasPlayoffPlanner(formato) {
  if (!formato.clasificados) return formato.partidosPromocion || 0;
  const rondaInicial = formato.clasificados > 4 ? formato.partidosCuartos : 0;
  return rondaInicial + formato.partidosSemis + formato.partidosFinal + (formato.partidosPromocion || 0);
}

function calcularFechaFinalNecesariaPlanner(inicioISO, diaJuego, frecuencia, fechasNecesarias, bloqueadas) {
  const inicio = siguienteDiaJuegoPlanner(inicioISO, diaJuego);
  if (!inicio || !fechasNecesarias) return "";

  let cursor = inicio;
  let usadas = 0;
  let ultima = "";
  while (usadas < fechasNecesarias) {
    const key = fechaKeyPlanner(cursor);
    if (!bloqueadas?.has(key)) {
      usadas += 1;
      ultima = key;
    }
    cursor = sumarDiasPlanner(cursor, 7 * frecuencia);
  }
  return ultima;
}

function detectarSugerenciasPlanner({
  fechaInicio,
  fechaFin,
  dia,
  frecuencia,
  bloqueadas,
  jornadasTotales,
  formato,
  entraEnCalendario,
  margenCalendario
}) {
  const sugerencias = [];
  const fechasNecesarias = jornadasTotales + contarFechasPlayoffPlanner(formato);

  if (!fechaInicio || !fechaFin) {
    sugerencias.push({
      titulo: "Cargar inicio y fecha limite",
      detalle: "Con ambas fechas la app puede medir si entra la fase regular, los playoffs y una promocion posterior."
    });
    return sugerencias;
  }

  if (entraEnCalendario === "Si") {
    sugerencias.push({
      titulo: margenCalendario === 0 ? "Entra justo" : "El calendario alcanza",
      detalle: margenCalendario === 0
        ? "No queda margen para suspensiones. Conviene reservar una fecha alternativa."
        : `Queda un margen de ${margenCalendario} fecha(s) disponible(s).`
    });
  }

  const fechaFinNecesaria = calcularFechaFinalNecesariaPlanner(fechaInicio, dia, frecuencia, fechasNecesarias, bloqueadas);
  if (entraEnCalendario !== "Si" && fechaFinNecesaria) {
    sugerencias.push({
      titulo: "Extender calendario",
      detalle: `Manteniendo este formato, la fecha limite deberia llegar al menos hasta ${fechaPlannerLabel(fechaFinNecesaria)}.`
    });
  }

  if (frecuencia > 1) {
    const semanales = fechasDisponiblesPlanner(fechaInicio, fechaFin, dia, 1, bloqueadas);
    if (semanales.length >= fechasNecesarias) {
      sugerencias.push({
        titulo: "Jugar todas las semanas",
        detalle: "Con frecuencia semanal el torneo completo entra dentro del rango cargado."
      });
    }
  }

  const diaAlternativo = Number(dia) === 0 ? 3 : 0;
  const nombresDiasPlanner = { 0: "Domingo", 3: "Miercoles" };
  const alternativas = fechasDisponiblesPlanner(fechaInicio, fechaFin, diaAlternativo, frecuencia, bloqueadas);
  if (alternativas.length >= fechasNecesarias) {
    sugerencias.push({
      titulo: `Cambiar dia a ${nombresDiasPlanner[diaAlternativo]}`,
      detalle: `Usando ${nombresDiasPlanner[diaAlternativo]} como dia principal, el torneo completo entra en calendario.`
    });
  }

  const fechasActuales = fechasDisponiblesPlanner(fechaInicio, fechaFin, dia, frecuencia, bloqueadas);
  const deficit = fechasNecesarias - fechasActuales.length;
  if (deficit > 0 && bloqueadas?.size >= deficit) {
    sugerencias.push({
      titulo: "Revisar fechas bloqueadas",
      detalle: `Faltan ${deficit} fecha(s). Si la asociacion habilita esa cantidad de fechas bloqueadas, el formato podria entrar sin cambiar reglas.`
    });
  }

  const playoffReducido = Math.max(0, formato.clasificados > 4 ? 1 : 0) + 1 + 1 + (formato.partidosPromocion ? 1 : 0);
  const fechasMinimas = jornadasTotales + playoffReducido;
  if (fechasActuales.length >= fechasMinimas && fechasMinimas < fechasNecesarias) {
    sugerencias.push({
      titulo: "Reducir series finales",
      detalle: "Con series a partido unico en playoffs/promocion, el torneo entra sin tocar la fase regular."
    });
  }

  if (!sugerencias.length) {
    sugerencias.push({
      titulo: "No alcanza con un ajuste simple",
      detalle: "Hay que combinar opciones: ampliar fecha limite, usar otro dia, liberar fechas bloqueadas o reducir el formato."
    });
  }

  return sugerencias;
}

function renderSugerenciasPlanner(sugerencias) {
  if (!sugerencias?.length) return "";
  return `
    <div class="planner-suggestions">
      <h4>Diagnostico y alternativas</h4>
      ${sugerencias.map((item) => `
        <div>
          <strong>${escapeHtml(item.titulo)}</strong>
          <span>${escapeHtml(item.detalle)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFixtureSimuladoPlanner(simulacion) {
  if (!simulacion.jornadas.length) return "";

  return `
    <div class="planner-fixture-preview">
      <h4>Vista previa del fixture</h4>
      <p>Simulacion solamente: no crea partidos ni modifica la base online.</p>
      ${simulacion.jornadas.map((jornada) => `
        <div class="planner-round-preview">
          <div class="planner-round-head">
            <strong>Fecha ${jornada.numero}</strong>
            <span>${escapeHtml(jornada.fecha ? fechaPartidoLabel(jornada.fecha) : "Fecha a definir")}</span>
            <span>Rueda ${jornada.rueda}</span>
          </div>
          ${jornada.libre ? `<div class="planner-bye">Libre: ${escapeHtml(jornada.libre)}</div>` : ""}
          <div class="planner-match-list">
            ${jornada.partidos.map((partido) => `
              <div class="planner-match-preview">
                <span>${escapeHtml(partido.local)}</span>
                <strong>vs</strong>
                <span>${escapeHtml(partido.visitante)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderNodoPlayoffPlanner(seed, texto = "Por definir") {
  return `
    <div class="planner-playoff-slot">
      <strong>${escapeHtml(seed)}</strong>
      <span>${escapeHtml(texto)}</span>
    </div>
  `;
}

function renderSeriePlayoffPlanner(titulo, slots) {
  return `
    <div class="planner-playoff-series">
      <h5>${escapeHtml(titulo)}</h5>
      ${slots.join("")}
    </div>
  `;
}

function renderPlayoffsSimuladosPlanner(formato) {
  if (!formato.clasificados) {
    return `
      <div class="planner-playoff-preview">
        <h4>Instancias finales</h4>
        <p>Sin playoffs configurados para esta simulacion.</p>
        ${formato.partidosPromocion ? `
          <div class="planner-playoff-meta">
            <span>Promocion posterior: ${formato.partidosPromocion} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "promocion", formato.partidosPromocion))}</span>
          </div>
          <div class="planner-playoff-grid">
            <div>
              <h5>Promocion</h5>
              ${renderSeriePlayoffPlanner("Promocion", [renderNodoPlayoffPlanner("-", "Equipo A"), renderNodoPlayoffPlanner("-", "Equipo B")])}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  let rondaInicialTitulo = "Cuartos / repechaje";
  let rondaInicial = [];
  let semifinales = [];

  if (formato.clasificados === 8) {
    rondaInicialTitulo = "Cuartos";
    rondaInicial = [
      renderSeriePlayoffPlanner("Llave A", [renderNodoPlayoffPlanner("1°"), renderNodoPlayoffPlanner("8°")]),
      renderSeriePlayoffPlanner("Llave B", [renderNodoPlayoffPlanner("4°"), renderNodoPlayoffPlanner("5°")]),
      renderSeriePlayoffPlanner("Llave C", [renderNodoPlayoffPlanner("2°"), renderNodoPlayoffPlanner("7°")]),
      renderSeriePlayoffPlanner("Llave D", [renderNodoPlayoffPlanner("3°"), renderNodoPlayoffPlanner("6°")])
    ];
    semifinales = [
      renderSeriePlayoffPlanner("Semi 1", [renderNodoPlayoffPlanner("-", "Ganador 1°/8°"), renderNodoPlayoffPlanner("-", "Ganador 4°/5°")]),
      renderSeriePlayoffPlanner("Semi 2", [renderNodoPlayoffPlanner("-", "Ganador 2°/7°"), renderNodoPlayoffPlanner("-", "Ganador 3°/6°")])
    ];
  } else if (formato.clasificados === 6) {
    rondaInicialTitulo = "Repechaje";
    rondaInicial = [
      renderSeriePlayoffPlanner("Repechaje 1", [renderNodoPlayoffPlanner("3°"), renderNodoPlayoffPlanner("6°")]),
      renderSeriePlayoffPlanner("Repechaje 2", [renderNodoPlayoffPlanner("4°"), renderNodoPlayoffPlanner("5°")])
    ];
    semifinales = [
      renderSeriePlayoffPlanner("Semi 1", [renderNodoPlayoffPlanner("1°", "Directo"), renderNodoPlayoffPlanner("-", "Peor ganador de repechaje")]),
      renderSeriePlayoffPlanner("Semi 2", [renderNodoPlayoffPlanner("2°", "Directo"), renderNodoPlayoffPlanner("-", "Mejor ganador de repechaje")])
    ];
  } else {
    rondaInicialTitulo = "Semifinales";
    semifinales = [
      renderSeriePlayoffPlanner("Semi 1", [renderNodoPlayoffPlanner("1°"), renderNodoPlayoffPlanner("4°")]),
      renderSeriePlayoffPlanner("Semi 2", [renderNodoPlayoffPlanner("2°"), renderNodoPlayoffPlanner("3°")])
    ];
  }

  return `
    <div class="planner-playoff-preview">
      <h4>Playoffs simulados</h4>
      <p>Llave base segun formato seleccionado. Las fechas se sugieren desde la ultima jornada simulada y se pueden corregir manualmente.</p>
      <div class="planner-playoff-meta">
        ${rondaInicial.length ? `<span>${escapeHtml(rondaInicialTitulo)}: ${formato.partidosCuartos} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "cuartos", formato.partidosCuartos))}</span>` : ""}
        <span>Semifinales: ${formato.partidosSemis} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "semis", formato.partidosSemis))}</span>
        <span>Final: ${formato.partidosFinal} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "final", formato.partidosFinal))}</span>
        ${formato.partidosPromocion ? `<span>Promocion posterior: ${formato.partidosPromocion} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "promocion", formato.partidosPromocion))}</span>` : ""}
      </div>
      <div class="planner-playoff-grid">
        ${rondaInicial.length ? `
          <div>
            <h5>${escapeHtml(rondaInicialTitulo)}</h5>
            ${rondaInicial.join("")}
          </div>
        ` : ""}
        <div>
          <h5>Semifinales</h5>
          ${semifinales.join("")}
        </div>
        <div>
          <h5>Final</h5>
          ${renderSeriePlayoffPlanner("Final", [renderNodoPlayoffPlanner("-", "Ganador Semi 1"), renderNodoPlayoffPlanner("-", "Ganador Semi 2")])}
        </div>
        ${formato.partidosPromocion ? `
          <div>
            <h5>Promocion</h5>
            ${renderSeriePlayoffPlanner("Promocion", [renderNodoPlayoffPlanner("-", "Equipo A"), renderNodoPlayoffPlanner("-", "Equipo B")])}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderTablaInforme(tabla) {
  if (!tabla.length) return "<p>No hay tabla disponible.</p>";
  return `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Equipo</th>
          <th>PJ</th>
          <th>PG</th>
          <th>PP</th>
          <th>PF</th>
          <th>PC</th>
          <th>DIF</th>
          <th>PTS</th>
        </tr>
      </thead>
      <tbody>
        ${tabla.map((fila, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(fila.equipo)}</td>
            <td>${fila.pj}</td>
            <td>${fila.pg}</td>
            <td>${fila.pp}</td>
            <td>${fila.pf}</td>
            <td>${fila.pc}</td>
            <td>${fila.dif}</td>
            <td>${fila.pts}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderPartidosInforme(partidos, titulo, vacio) {
  if (!partidos.length) return `<h2>${escapeHtml(titulo)}</h2><p>${escapeHtml(vacio)}</p>`;
  return `
    <h2>${escapeHtml(titulo)}</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Dia</th>
          <th>Local</th>
          <th>Visitante</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${partidos.map((p) => {
          const resultado = resultadoPartidoLabel(p);
          return `
            <tr>
              <td>${escapeHtml(String(p.jornada || "-"))}</td>
              <td>${escapeHtml(fechaPartidoLabel(p.fecha) || "-")}</td>
              <td>${escapeHtml(p.local || "-")}</td>
              <td>${escapeHtml(p.visitante || "-")}</td>
              <td>${escapeHtml(resultado)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function calcularPendientesPorEquipo(partidosPendientes) {
  const resumen = {};

  partidosPendientes.forEach((partido) => {
    [partido.local, partido.visitante].forEach((equipo) => {
      if (!equipo) return;
      if (!resumen[equipo]) resumen[equipo] = { equipo, cantidad: 0, jornadas: [] };
      resumen[equipo].cantidad += 1;
      if (partido.jornada && !resumen[equipo].jornadas.includes(partido.jornada)) {
        resumen[equipo].jornadas.push(partido.jornada);
      }
    });
  });

  return Object.values(resumen)
    .sort((a, b) => {
      if (b.cantidad !== a.cantidad) return b.cantidad - a.cantidad;
      return a.equipo.localeCompare(b.equipo);
    });
}

function renderPendientesPorEquipoInforme(partidosPendientes) {
  const resumen = calcularPendientesPorEquipo(partidosPendientes);
  if (!resumen.length) return "<h2>Pendientes por equipo</h2><p>No hay equipos con partidos pendientes.</p>";

  return `
    <h2>Pendientes por equipo</h2>
    <table>
      <thead>
        <tr>
          <th>Equipo</th>
          <th>Pendientes</th>
          <th>Fechas afectadas</th>
        </tr>
      </thead>
      <tbody>
        ${resumen.map((fila) => `
          <tr>
            <td>${escapeHtml(fila.equipo)}</td>
            <td>${fila.cantidad}</td>
            <td>${escapeHtml(fila.jornadas.map((jornada) => `Fecha ${jornada}`).join(", ") || "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderFixtureInforme(partidos) {
  if (!partidos.length) return "<h2>Fixture completo</h2><p>No hay partidos cargados.</p>";
  const porJornada = agruparPartidosPorJornada(partidos);
  const jornadas = Object.keys(porJornada).map(Number).sort((a, b) => a - b);

  return `
    <h2>Fixture completo</h2>
    ${jornadas.map((jornada) => {
      const partidosJornada = porJornada[jornada] || [];
      const fecha = fechaPartidoLabel(partidosJornada[0]?.fecha) || "Fecha a confirmar";
      const libre = partidosJornada[0]?.libre;
      return `
        <h3>Fecha ${jornada} - ${escapeHtml(fecha)}</h3>
        ${libre ? `<p><strong>Libre:</strong> ${escapeHtml(libre)}</p>` : ""}
        <table>
          <thead>
            <tr>
              <th>Local</th>
              <th>Visitante</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${partidosJornada.map((p) => {
              const resultado = resultadoPartidoLabel(p);
              return `
                <tr>
                  <td>${escapeHtml(p.local || "-")}</td>
                  <td>${escapeHtml(p.visitante || "-")}</td>
                  <td>${escapeHtml(resultado)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    }).join("")}
  `;
}

function renderFixtureSimuladoInforme(simulacion) {
  if (!simulacion?.jornadas?.length) {
    return "<h2>Fixture simulado</h2><p>No hay simulacion disponible.</p>";
  }

  return `
    <h2>Fixture simulado</h2>
    ${simulacion.jornadas.map((jornada) => `
      <h3>Fecha ${jornada.numero} - ${escapeHtml(fechaPartidoLabel(jornada.fecha) || "Fecha a confirmar")}</h3>
      ${jornada.libre ? `<p><strong>Libre:</strong> ${escapeHtml(jornada.libre)}</p>` : ""}
      <table>
        <thead>
          <tr>
            <th>Local</th>
            <th>Visitante</th>
          </tr>
        </thead>
        <tbody>
          ${jornada.partidos.map((partido) => `
            <tr>
              <td>${escapeHtml(partido.local || "-")}</td>
              <td>${escapeHtml(partido.visitante || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `).join("")}
  `;
}

function renderPlayoffsSimuladosInforme(formato) {
  if (!formato?.clasificados) {
    if (!formato?.partidosPromocion) return "<h2>Playoffs</h2><p>Sin playoffs configurados.</p>";
    return `
      <h2>Instancias finales</h2>
      <table>
        <thead>
          <tr>
            <th>Instancia</th>
            <th>Partidos por llave</th>
            <th>Fechas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Promocion posterior</td>
            <td>${escapeHtml(String(formato.partidosPromocion))}</td>
            <td>${escapeHtml(fechasSeriePlanner(formato, "promocion", formato.partidosPromocion))}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const bloques = [];
  if (formato.clasificados > 4) {
    bloques.push(`
      <tr>
        <td>${formato.clasificados === 6 ? "Repechaje" : "Cuartos"}</td>
        <td>${escapeHtml(String(formato.partidosCuartos))}</td>
        <td>${escapeHtml(fechasSeriePlanner(formato, "cuartos", formato.partidosCuartos))}</td>
      </tr>
    `);
  }

  bloques.push(`
    <tr>
      <td>Semifinales</td>
      <td>${escapeHtml(String(formato.partidosSemis))}</td>
      <td>${escapeHtml(fechasSeriePlanner(formato, "semis", formato.partidosSemis))}</td>
    </tr>
  `);
  bloques.push(`
    <tr>
      <td>Final</td>
      <td>${escapeHtml(String(formato.partidosFinal))}</td>
      <td>${escapeHtml(fechasSeriePlanner(formato, "final", formato.partidosFinal))}</td>
    </tr>
  `);
  if (formato.partidosPromocion) {
    bloques.push(`
      <tr>
        <td>Promocion posterior</td>
        <td>${escapeHtml(String(formato.partidosPromocion))}</td>
        <td>${escapeHtml(fechasSeriePlanner(formato, "promocion", formato.partidosPromocion))}</td>
      </tr>
    `);
  }

  return `
    <h2>Playoffs simulados</h2>
    <table>
      <thead>
        <tr>
          <th>Instancia</th>
          <th>Partidos por llave</th>
          <th>Fechas</th>
        </tr>
      </thead>
      <tbody>${bloques.join("")}</tbody>
    </table>
  `;
}

function datosSerieFormatoCategoria(categoria, claves) {
  const series = categoria?.series_playoff || {};
  for (const clave of claves) {
    if (series[clave]) return series[clave];
  }
  return {};
}

function siguienteFechaISO(fechaISO, semanas = 1) {
  const fecha = fechaLocalPlanner(fechaISO);
  if (!fecha) return "";
  fecha.setDate(fecha.getDate() + (7 * semanas));
  return fechaKeyPlanner(fecha);
}

function completarFechasFaltantesFormatoInforme(formato, partidos) {
  const copia = { ...formato };
  const fechasFixture = (partidos || [])
    .map((partido) => partido.fecha)
    .filter(Boolean)
    .sort();
  let cursor = fechasFixture[fechasFixture.length - 1] || "";
  if (!cursor || !copia.clasificados) return copia;

  const completar = (claves, cantidad) => {
    const existentes = claves.filter((clave) => copia[clave]);
    if (existentes.length >= cantidad) return;
    for (const clave of claves.slice(0, cantidad)) {
      if (copia[clave]) {
        cursor = copia[clave];
        continue;
      }
      cursor = siguienteFechaISO(cursor);
      copia[clave] = cursor;
      copia.fechasInferidas = true;
    }
  };

  if (copia.clasificados > 4) {
    completar(["fechaCuartos", "fechaCuartos2", "fechaCuartos3"], copia.partidosCuartos || 1);
  }
  completar(["fechaSemis", "fechaSemis2", "fechaSemis3"], copia.partidosSemis || 1);
  completar(["fechaFinal1", "fechaFinal2", "fechaFinal3"], copia.partidosFinal || 1);
  if (copia.partidosPromocion) {
    completar(["fechaPromocion1", "fechaPromocion2", "fechaPromocion3"], copia.partidosPromocion);
  }

  return copia;
}

function formatoInformeCategoria(categoriaNombre, partidos = []) {
  const categoria = obtenerCategoriaPorNombre(categoriaNombre);
  if (!categoria?.playoffs && !Number(categoria?.clasificados || 0)) {
    return detalleFormatoPlanner(categoriaNombre);
  }

  const clasificados = Number(categoria.clasificados || 0);
  const rondaInicial = datosSerieFormatoCategoria(categoria, ["cuartos", "clasificacion", "repechaje"]);
  const semifinales = datosSerieFormatoCategoria(categoria, ["semifinales"]);
  const final = datosSerieFormatoCategoria(categoria, ["final"]);
  const promocion = datosSerieFormatoCategoria(categoria, ["promocion"]);
  const fechasRondaInicial = Array.isArray(rondaInicial.fechas) ? rondaInicial.fechas : [rondaInicial.fecha].filter(Boolean);
  const fechasSemis = Array.isArray(semifinales.fechas) ? semifinales.fechas : [semifinales.fecha].filter(Boolean);
  const fechasFinal = Array.isArray(final.fechas) ? final.fechas : [final.fecha].filter(Boolean);
  const fechasPromocion = Array.isArray(promocion.fechas) ? promocion.fechas : [promocion.fecha].filter(Boolean);
  const partidosFinal = Number(final.partidos || final.cantidad_partidos || final.juegos || final.mejor_de || 1);
  const finalTexto = partidosFinal === 3 ? "Mejor de 3" : partidosFinal === 2 ? "Mejor de 2" : "1 partido";

  return completarFechasFaltantesFormatoInforme({
    clasificados,
    playoffsTexto: categoria.formato || (clasificados ? `Top ${clasificados}` : "Sin playoffs"),
    finalTexto,
    definicionBTexto: categoriaNombre === "Maxi +35 B" ? "Por playoffs" : "-",
    descensoATexto: categoriaNombre === "Maxi +35 A" ? "10mo directo" : "-",
    promocionTexto: promocion.partidos ? `${promocion.partidos} partido(s)` : "Sin partido extra",
    reglaPromocion: categoriaNombre === "Maxi +35 A"
      ? "9no juega promocion y 10mo desciende directo."
      : categoriaNombre === "Maxi +35 B"
        ? "Campeon de playoffs asciende y subcampeon juega promocion."
        : clasificados === 6
          ? "Top 6: 3ro vs 6to y 4to vs 5to en repechaje."
          : "Regla configurada por la organizacion.",
    partidosCuartos: Number(rondaInicial.partidos || rondaInicial.cantidad_partidos || rondaInicial.juegos || 1),
    partidosSemis: Number(semifinales.partidos || semifinales.cantidad_partidos || semifinales.juegos || 1),
    partidosFinal,
    partidosPromocion: Number(promocion.partidos || promocion.cantidad_partidos || promocion.juegos || 0),
    fechaCuartos: fechasRondaInicial[0] || "",
    fechaCuartos2: fechasRondaInicial[1] || "",
    fechaCuartos3: fechasRondaInicial[2] || "",
    fechaSemis: fechasSemis[0] || "",
    fechaSemis2: fechasSemis[1] || "",
    fechaSemis3: fechasSemis[2] || "",
    fechaFinal1: fechasFinal[0] || "",
    fechaFinal2: fechasFinal[1] || "",
    fechaFinal3: fechasFinal[2] || "",
    fechaPromocion1: fechasPromocion[0] || "",
    fechaPromocion2: fechasPromocion[1] || "",
    fechaPromocion3: fechasPromocion[2] || ""
  }, partidos);
}

function descargarInformeHtml(html, nombreBase) {
  const nombre = `${slugify(nombreBase)}.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return nombre;
}

function mostrarCartelInforme(mensaje, tipo = "ok") {
  const existente = document.getElementById("informe-toast");
  if (existente) existente.remove();

  const toast = document.createElement("div");
  toast.id = "informe-toast";
  toast.className = `informe-toast ${tipo}`;
  toast.innerHTML = `
    <strong>${tipo === "ok" ? "Informe generado" : "Atencion"}</strong>
    <span>${escapeHtml(mensaje)}</span>
    <button type="button" aria-label="Cerrar aviso">Cerrar</button>
  `;

  toast.querySelector("button")?.addEventListener("click", () => toast.remove());
  document.body.appendChild(toast);
  window.clearTimeout(mostrarCartelInforme.timeoutId);
  mostrarCartelInforme.timeoutId = window.setTimeout(() => toast.remove(), 12000);
}

function abrirInformeHtml(html) {
  const ventana = window.open("", "_blank");
  if (!ventana) return false;
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  return true;
}

function generarInformeSimulacionTorneo(simulacion) {
  const {
    categoria,
    competencia,
    equipos,
    equiposLista,
    ruedas,
    frecuencia,
    diaTexto,
    fechaInicio,
    fechaFin,
    formato,
    fixture,
    jornadasTotales,
    bloqueadasCantidad,
    fechaFinalEstimada,
    entraEnCalendario,
    margenCalendario,
    sugerencias
  } = simulacion;
  const fechaGeneracion = new Date().toLocaleString("es-AR");

  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Fixture simulado ${escapeHtml(categoria)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 28px; }
        h1 { margin: 0 0 4px; font-size: 26px; }
        h2 { margin: 22px 0 8px; font-size: 18px; color: #1f4d78; }
        h3 { margin: 16px 0 6px; font-size: 14px; }
        .muted { color: #4b5563; margin: 0 0 12px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
        .box strong { display: block; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; }
        th, td { border-bottom: 1px solid #d1d5db; padding: 7px 6px; font-size: 12px; text-align: left; }
        th { background: #eef2ff; font-weight: 800; }
        .rules { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; margin-top: 12px; }
        .suggestions { border: 1px solid #f59e0b; border-radius: 8px; padding: 10px; margin-top: 12px; background: #fffbeb; }
        .suggestions li { margin: 6px 0; }
        .print-actions { margin: 18px 0; }
        .print-actions button { padding: 10px 14px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 700; }
        @media print {
          body { margin: 12mm; }
          .print-actions { display: none; }
          h2, h3 { break-after: avoid; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(APP_CONFIG.producto.nombre)} - Fixture simulado</h1>
      <p class="muted">Organizacion: ${escapeHtml(APP_CONFIG.organizacionActiva.nombre)} - ${escapeHtml(APP_CONFIG.organizacionActiva.torneoLabel)}</p>
      <p class="muted">${escapeHtml(categoria)} - ${escapeHtml(competencia)} - Generado ${escapeHtml(fechaGeneracion)}</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>

      <div class="summary">
        <div class="box"><span>Equipos</span><strong>${equipos}</strong></div>
        <div class="box"><span>Ruedas</span><strong>${ruedas}</strong></div>
        <div class="box"><span>Jornadas</span><strong>${jornadasTotales}</strong></div>
        <div class="box"><span>Final estimada</span><strong>${escapeHtml(fechaFinalEstimada)}</strong></div>
      </div>

      <div class="rules">
        <p><strong>Inicio:</strong> ${escapeHtml(fechaPlannerLabel(fechaInicio))} - <strong>Dia de juego:</strong> ${escapeHtml(diaTexto)}</p>
        <p><strong>Frecuencia:</strong> ${escapeHtml(frecuencia === 2 ? "Semana por medio" : "Todas las semanas")}</p>
        <p><strong>Fecha limite:</strong> ${escapeHtml(fechaPlannerLabel(fechaFin))} - <strong>Entra en calendario:</strong> ${escapeHtml(entraEnCalendario)}</p>
        <p><strong>Fechas bloqueadas:</strong> ${bloqueadasCantidad} - <strong>Margen calendario:</strong> ${escapeHtml(String(margenCalendario))}</p>
        <p><strong>Formato:</strong> ${escapeHtml(formato.playoffsTexto)} - <strong>Clasificados:</strong> ${escapeHtml(String(formato.clasificados || "No aplica"))}</p>
        <p><strong>Promocion posterior:</strong> ${escapeHtml(formato.promocionTexto || "Sin partido extra")}</p>
      </div>

      ${equiposLista?.length ? `
        <h2>Equipos incluidos</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Equipo</th></tr>
          </thead>
          <tbody>
            ${equiposLista.map((equipo, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(equipo)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : ""}

      ${sugerencias?.length ? `
        <div class="suggestions">
          <h2>Diagnostico y alternativas</h2>
          <ul>
            ${sugerencias.map((item) => `<li><strong>${escapeHtml(item.titulo)}:</strong> ${escapeHtml(item.detalle)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      ${renderFixtureSimuladoInforme(fixture)}
      ${renderPlayoffsSimuladosInforme(formato)}
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `fixture-simulado-${categoria}-${competencia}`);
  const abierto = abrirInformeHtml(html);
  const status = $("planner-informe-status");
  setStatus(
    status,
    abierto
      ? `Informe descargado como ${nombre}. Tambien se abrio una pestaña para imprimir o guardar PDF.`
      : `Informe descargado como ${nombre}. El navegador bloqueo la pestaña de vista previa.`,
    "ok"
  );
  mostrarCartelInforme(`Se descargo ${nombre} en la carpeta Descargas. Si queres PDF, usa Imprimir / guardar PDF en la pestaña abierta.`);
}

function renderFormatoDefinicionInstitucional(formato, categoria) {
  const filas = [];
  if (formato?.clasificados) {
    filas.push(`
      <tr>
        <td>Playoffs</td>
        <td>${escapeHtml(formato.playoffsTexto || "-")}</td>
      </tr>
    `);
    if (formato.clasificados > 4) {
      filas.push(`
        <tr>
          <td>${formato.clasificados === 6 ? "Repechaje" : "Cuartos de final"}</td>
          <td>${escapeHtml(String(formato.partidosCuartos || "-"))} partido(s) por llave - ${escapeHtml(fechasSeriePlanner(formato, "cuartos", formato.partidosCuartos))}</td>
        </tr>
      `);
    }
    filas.push(`
      <tr>
        <td>Semifinales</td>
        <td>${escapeHtml(String(formato.partidosSemis || "-"))} partido(s) por llave - ${escapeHtml(fechasSeriePlanner(formato, "semis", formato.partidosSemis))}</td>
      </tr>
    `);
    filas.push(`
      <tr>
        <td>Final</td>
        <td>${escapeHtml(formato.finalTexto || "-")} - ${escapeHtml(fechasSeriePlanner(formato, "final", formato.partidosFinal))}</td>
      </tr>
    `);
  } else {
    filas.push(`
      <tr>
        <td>Playoffs</td>
        <td>Sin playoffs configurados.</td>
      </tr>
    `);
  }

  if (formato?.partidosPromocion) {
    filas.push(`
      <tr>
        <td>Promocion posterior</td>
        <td>${escapeHtml(formato.promocionTexto || "-")} - ${escapeHtml(fechasSeriePlanner(formato, "promocion", formato.partidosPromocion))}</td>
      </tr>
    `);
  }

  if (categoria === "Maxi +35 A" || categoria === "Maxi +35 B") {
    filas.push(`
      <tr>
        <td>Ascenso / descenso</td>
        <td>${escapeHtml(formato?.reglaPromocion || "Regla a confirmar por la organizacion.")}</td>
      </tr>
    `);
  }

  return `
    <h2>Formato de definicion</h2>
    <table>
      <thead>
        <tr>
          <th>Instancia</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>${filas.join("")}</tbody>
    </table>
  `;
}

function renderFixtureInstitucional(simulacion) {
  const jornadas = simulacion?.fixture?.jornadas || [];
  if (!jornadas.length) return "<h2>Fixture</h2><p>No hay fixture disponible.</p>";

  return `
    <h2>Fixture</h2>
    ${jornadas.map((jornada) => `
      <h3>Fecha ${escapeHtml(String(jornada.numero))} - ${escapeHtml(fechaPartidoLabel(jornada.fecha) || "Fecha a confirmar")}</h3>
      ${jornada.libre ? `<p><strong>Libre:</strong> ${escapeHtml(jornada.libre)}</p>` : ""}
      <table>
        <thead>
          <tr>
            <th>Local</th>
            <th>Visitante</th>
          </tr>
        </thead>
        <tbody>
          ${(jornada.partidos || []).map((partido) => `
            <tr>
              <td>${escapeHtml(partido.local || "-")}</td>
              <td>${escapeHtml(partido.visitante || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `).join("")}
  `;
}

function generarDocumentoOficialFixture() {
  const simulacion = obtenerSimulacionPlannerActual();
  const status = $("planner-informe-status") || $("planner-status");
  if (!simulacion) {
    const mensaje = "Primero simula la categoria y competencia que queres documentar. El documento oficial sale de esa simulacion vigente.";
    setStatus(status, mensaje, "warn");
    mostrarCartelInforme(mensaje, "warn");
    return;
  }

  const fechaGeneracion = new Date().toLocaleString("es-AR");
  const formato = simulacion.formato || detalleFormatoPlanner(simulacion.categoria);
  const torneo = [simulacion.competencia, APP_CONFIG.organizacionActiva.torneoLabel].filter(Boolean).join(" - ");
  const fechasEspeciales = (simulacion.fechasEspeciales || [])
    .map(([desde, hacia]) => `${fechaPlannerLabel(desde)} a ${fechaPlannerLabel(hacia)}`)
    .join(", ");
  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Fixture ${escapeHtml(simulacion.categoria)} ${escapeHtml(simulacion.competencia || "")}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 28px 42px; line-height: 1.35; }
        header { margin-bottom: 24px; text-align: center; }
        h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
        .subtitulo { margin: 6px 0 0; font-size: 15px; }
        .fecha { margin: 22px 0 18px; text-align: right; }
        h2 { margin: 22px 0 8px; font-size: 17px; text-transform: uppercase; }
        h3 { margin: 16px 0 6px; font-size: 14px; }
        p { margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin: 7px 0 14px; }
        th, td { border: 1px solid #9ca3af; padding: 6px 8px; font-size: 12px; text-align: left; vertical-align: top; }
        th { background: #eeeeee; font-weight: 700; }
        .resumen td:first-child { width: 32%; font-weight: 700; }
        .print-actions { margin: 18px 0; text-align: left; }
        .print-actions button { padding: 10px 14px; border: 1px solid #111; border-radius: 4px; background: #fff; color: #111; font-weight: 700; cursor: pointer; }
        footer { margin-top: 28px; text-align: center; font-size: 12px; }
        @media print {
          body { margin: 12mm; }
          .print-actions { display: none; }
          h2, h3 { break-after: avoid; }
          tr, table { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <header>
        <h1>${escapeHtml(APP_CONFIG.organizacionActiva.nombre)}</h1>
        <p class="subtitulo">Fixture ${escapeHtml(simulacion.categoria)} - Torneo ${escapeHtml(torneo || "Clausura 2026")}</p>
      </header>
      <p class="fecha">Fecha de emision: ${escapeHtml(fechaGeneracion)}</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>

      <h2>Resumen</h2>
      <table class="resumen">
        <tbody>
          <tr><td>Categoria</td><td>${escapeHtml(simulacion.categoria)}</td></tr>
          <tr><td>Competencia</td><td>${escapeHtml(simulacion.competencia || "-")}</td></tr>
          <tr><td>Equipos</td><td>${escapeHtml(String(simulacion.equipos || simulacion.equiposLista?.length || "-"))}</td></tr>
          <tr><td>Fechas de fase regular</td><td>${escapeHtml(String(simulacion.jornadasTotales || "-"))}</td></tr>
          <tr><td>Partidos de fase regular</td><td>${escapeHtml(String(contarPartidosSimulados(simulacion)))}</td></tr>
          <tr><td>Inicio</td><td>${escapeHtml(fechaPlannerLabel(simulacion.fechaInicio))}</td></tr>
          <tr><td>Dia de juego</td><td>${escapeHtml(simulacion.diaTexto || "-")}</td></tr>
          <tr><td>Fecha final estimada</td><td>${escapeHtml(simulacion.fechaFinalEstimada || "-")}</td></tr>
          <tr><td>Fechas especiales</td><td>${escapeHtml(fechasEspeciales || "No")}</td></tr>
        </tbody>
      </table>

      ${renderFormatoDefinicionInstitucional(formato, simulacion.categoria)}
      ${renderFixtureInstitucional(simulacion)}

      <footer>${escapeHtml(APP_CONFIG.organizacionActiva.nombre)}</footer>
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `fixture-oficial-${simulacion.categoria}-${simulacion.competencia || "torneo"}`);
  const abierto = abrirInformeHtml(html);
  const mensaje = abierto
    ? `Documento oficial descargado como ${nombre}. Tambien se abrio una pestaña para imprimir o guardar PDF.`
    : `Documento oficial descargado como ${nombre}. El navegador bloqueo la vista previa para imprimir.`;
  setStatus(status, mensaje, "ok");
  mostrarCartelInforme(mensaje);
}

function claveItemSimulacionPlanner(simulacion) {
  return `${slugify(simulacion?.categoria || "categoria")}__${slugify(simulacion?.competencia || "competencia")}`;
}

function leerSimulacionesPlannerGuardadas() {
  try {
    const raw = localStorage.getItem(claveSimulacionesPlanner());
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("No se pudieron leer simulaciones guardadas:", error.message);
    return {};
  }
}

function escribirSimulacionesPlannerGuardadas(simulaciones) {
  localStorage.setItem(claveSimulacionesPlanner(), JSON.stringify(simulaciones || {}));
}

function guardarSimulacionPlanner(simulacion) {
  if (!simulacion?.categoria || !simulacion?.competencia) return;
  const simulaciones = leerSimulacionesPlannerGuardadas();
  const key = claveItemSimulacionPlanner(simulacion);
  simulaciones[key] = {
    ...simulacion,
    guardadaEn: new Date().toISOString()
  };
  escribirSimulacionesPlannerGuardadas(simulaciones);
  renderSimulacionesPlannerGuardadas();
}

function renderSimulacionesPlannerGuardadas() {
  const container = $("planner-simulaciones-guardadas");
  if (!container) return;

  const simulaciones = Object.entries(leerSimulacionesPlannerGuardadas())
    .map(([key, simulacion]) => ({ key, simulacion }))
    .sort((a, b) => String(b.simulacion.guardadaEn || "").localeCompare(String(a.simulacion.guardadaEn || "")));

  if (!simulaciones.length) {
    container.innerHTML = `<div class="empty">Todavia no hay simulaciones guardadas en este navegador.</div>`;
    return;
  }

  container.innerHTML = simulaciones.map(({ key, simulacion }) => {
    const fecha = simulacion.guardadaEn ? new Date(simulacion.guardadaEn).toLocaleString("es-AR") : "Sin fecha";
    return `
      <div class="planner-saved-item" data-simulacion-key="${escapeHtml(key)}">
        <div>
          <strong>${escapeHtml(simulacion.categoria)} - ${escapeHtml(simulacion.competencia)}</strong>
          <span>${escapeHtml(fecha)} · ${escapeHtml(String(simulacion.equipos || 0))} equipos · ${escapeHtml(String(simulacion.jornadasTotales || 0))} jornadas · Final estimada ${escapeHtml(simulacion.fechaFinalEstimada || "-")}</span>
        </div>
        <div class="planner-saved-actions">
          <button class="secondary planner-saved-download" type="button">Descargar</button>
          <button class="secondary planner-saved-restore" type="button">Recuperar</button>
          <button class="secondary planner-saved-delete" type="button">Borrar</button>
        </div>
      </div>
    `;
  }).join("");
}

function manejarSimulacionesPlannerGuardadas(event) {
  const item = event.target.closest?.(".planner-saved-item");
  if (!item) return;
  const key = item.dataset.simulacionKey || "";
  const simulaciones = leerSimulacionesPlannerGuardadas();
  const simulacion = simulaciones[key];
  const status = $("planner-informe-status") || $("planner-status");
  if (!simulacion) {
    setStatus(status, "No se encontro esa simulacion guardada.", "warn");
    renderSimulacionesPlannerGuardadas();
    return;
  }

  if (event.target.closest(".planner-saved-delete")) {
    delete simulaciones[key];
    escribirSimulacionesPlannerGuardadas(simulaciones);
    renderSimulacionesPlannerGuardadas();
    setStatus(status, "Simulacion guardada borrada de este navegador.", "ok");
    return;
  }

  if (event.target.closest(".planner-saved-restore")) {
    estado.ultimaSimulacionPlanner = simulacion;
    if ($("planner-categoria")) $("planner-categoria").value = simulacion.categoria;
    if ($("planner-competencia")) $("planner-competencia").value = simulacion.competencia;
    if ($("planner-equipos-manual")) $("planner-equipos-manual").value = (simulacion.equiposLista || []).join("\n");
    if ($("planner-fechas-especiales")) {
      $("planner-fechas-especiales").value = (simulacion.fechasEspeciales || [])
        .map(([desde, hacia]) => `${fechaPlannerLabel(desde)}=${fechaPlannerLabel(hacia)}`)
        .join(", ");
    }
    actualizarResumenEquiposPlanner(simulacion.equiposLista || []);
    setStatus(status, `Simulacion recuperada: ${simulacion.categoria} - ${simulacion.competencia}.`, "ok");
    mostrarCartelInforme("Simulacion recuperada. Ya podes descargarla o usarla como referencia.", "ok");
    return;
  }

  if (event.target.closest(".planner-saved-download")) {
    generarInformeSimulacionTorneo(simulacion);
  }
}

function descargarUltimaSimulacionPlanner() {
  const status = $("planner-informe-status") || $("planner-status");
  const simulacion = estado.ultimaSimulacionPlanner;
  if (!simulacion) {
    const mensaje = "Primero simula el torneo. Despues vas a poder descargar el fixture generado.";
    setStatus(status, mensaje, "warn");
    mostrarCartelInforme(mensaje, "warn");
    return;
  }

  const categoriaActual = document.getElementById("planner-categoria")?.value || "";
  const competenciaActual = document.getElementById("planner-competencia")?.value || "";
  if (simulacion.categoria !== categoriaActual || simulacion.competencia !== competenciaActual) {
    const mensaje = "La simulacion guardada es de otra categoria o competencia. Volve a simular antes de descargar.";
    setStatus(status, mensaje, "warn");
    mostrarCartelInforme(mensaje, "warn");
    return;
  }

  generarInformeSimulacionTorneo(simulacion);
}

function generarInformeTorneo() {
  const categoria = $("asociacion-categoria")?.value || document.getElementById("planner-categoria")?.value || "";
  const competencia = estado.torneoActivo?.nombre || APP_CONFIG.organizacionActiva.torneoLabel || "Torneo actual";
  const partidos = estado.partidosPorCategoria[categoria] || [];
  const tabla = calcularTabla(partidos);
  const formato = formatoInformeCategoria(categoria, partidos);
  const pendientes = partidos
    .filter((p) => !partidoTieneResultado(p))
    .sort((a, b) => Number(a.jornada || 0) - Number(b.jornada || 0));
  const resultadosCargados = partidos.filter(partidoTieneResultado);
  const ultimosResultados = partidos
    .filter(partidoTieneResultado)
    .sort((a, b) => Number(b.jornada || 0) - Number(a.jornada || 0))
    .slice(0, 12)
    .reverse();

  const fechaGeneracion = new Date().toLocaleString("es-AR");
  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Informe ${escapeHtml(categoria)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 28px; }
        h1 { margin: 0 0 4px; font-size: 26px; }
        h2 { margin: 22px 0 8px; font-size: 18px; }
        .muted { color: #4b5563; margin: 0 0 16px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
        .box strong { display: block; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border-bottom: 1px solid #d1d5db; padding: 7px 6px; font-size: 12px; text-align: left; }
        th { background: #eef2ff; font-weight: 800; }
        .rules { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
        .print-actions { margin: 18px 0; }
        .print-actions button { padding: 10px 14px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 700; }
        @media print {
          body { margin: 12mm; }
          .print-actions { display: none; }
          h2 { break-after: avoid; }
          table { break-inside: auto; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(APP_CONFIG.producto.nombre)} - Informe de torneo</h1>
      <p class="muted">Organizacion: ${escapeHtml(APP_CONFIG.organizacionActiva.nombre)} - ${escapeHtml(APP_CONFIG.organizacionActiva.torneoLabel)}</p>
      <p class="muted">${escapeHtml(categoria)} - ${escapeHtml(competencia)} - Generado ${escapeHtml(fechaGeneracion)}</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>

      <div class="summary">
        <div class="box"><span>Equipos</span><strong>${tabla.length}</strong></div>
        <div class="box"><span>Partidos del fixture</span><strong>${partidos.length}</strong></div>
        <div class="box"><span>Resultados cargados</span><strong>${resultadosCargados.length}</strong></div>
        <div class="box"><span>Partidos pendientes</span><strong>${pendientes.length}</strong></div>
      </div>

      <h2>Reglas y fechas</h2>
      <div class="rules">
        <p><strong>Playoffs:</strong> ${escapeHtml(formato.playoffsTexto)} - <strong>Final:</strong> ${escapeHtml(formato.finalTexto)}</p>
        <p><strong>Cuartos / repechaje:</strong> ${escapeHtml(formato.partidosCuartos)} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "cuartos", formato.partidosCuartos))}</p>
        <p><strong>Semifinales:</strong> ${escapeHtml(formato.partidosSemis)} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "semis", formato.partidosSemis))}</p>
        <p><strong>Final:</strong> ${escapeHtml(formato.partidosFinal)} partido(s) - ${escapeHtml(fechasSeriePlanner(formato, "final", formato.partidosFinal))}</p>
        <p><strong>Promocion posterior:</strong> ${escapeHtml(formato.promocionTexto || "Sin partido extra")} ${formato.partidosPromocion ? `- ${escapeHtml(fechasSeriePlanner(formato, "promocion", formato.partidosPromocion))}` : ""}</p>
        <p><strong>Ascenso / repechaje B:</strong> ${escapeHtml(formato.definicionBTexto)} - <strong>Descenso +35 A:</strong> ${escapeHtml(formato.descensoATexto)}</p>
        <p><strong>Regla aplicada:</strong> ${escapeHtml(formato.reglaPromocion)}</p>
        ${formato.fechasInferidas ? `<p><strong>Nota:</strong> Las fechas de playoffs se estiman automaticamente desde la ultima fecha de fase regular porque la categoria no las tiene guardadas como dato oficial.</p>` : ""}
      </div>

      <h2>Tabla actual</h2>
      ${renderTablaInforme(tabla)}
      ${renderPendientesPorEquipoInforme(pendientes)}
      ${renderPartidosInforme(pendientes, "Partidos pendientes", "No quedan partidos pendientes.")}
      ${renderPartidosInforme(ultimosResultados, "Ultimos resultados cargados", "Todavia no hay resultados cargados.")}
      ${renderFixtureInforme(partidos)}
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `informe-torneo-${categoria}-${competencia}`);
  const abierto = abrirInformeHtml(html);
  const status = $("planner-informe-status");
  setStatus(
    status,
    abierto
      ? `Informe descargado como ${nombre}. Tambien se abrio una pestaña para imprimir o guardar PDF.`
      : `Informe descargado como ${nombre}. El navegador bloqueo la pestaña de vista previa.`,
    "ok"
  );
  mostrarCartelInforme(`Se descargo ${nombre} en la carpeta Descargas. Si queres PDF, usa Imprimir / guardar PDF en la pestaña abierta.`);
}

function renderItemPreparacionTorneo(item) {
  const simbolo = item.estado === "ok" ? "✓" : item.estado === "error" ? "!" : "i";
  return `
    <div class="planner-readiness-item">
      <span class="planner-readiness-state ${escapeHtml(item.estado)}">${simbolo}</span>
      <div>
        <strong>${escapeHtml(item.titulo)}</strong>
        <span>${escapeHtml(item.detalle)}</span>
      </div>
    </div>
  `;
}

function contarDelegadosCategoria(nombreCategoria, equiposCategoria) {
  const equiposNormalizados = new Set(equiposCategoria.map(normalizarTexto));
  return Object.values(DELEGADOS).filter((delegado) => {
    if (delegado.nombre === "ADMIN") return false;
    const categorias = delegado.categorias || [];
    const equipos = delegado.equipos || [];
    return categorias.includes(nombreCategoria) && equipos.some((equipo) => equiposNormalizados.has(normalizarTexto(equipo)));
  }).length;
}

function calcularPreparacionTorneo(nombreCategoria) {
  const categoria = obtenerCategoriaPorNombre(nombreCategoria);
  const competencia = document.getElementById("planner-competencia")?.value || "";
  const fechaInicio = document.getElementById("planner-inicio")?.value || "";
  const fechaFin = document.getElementById("planner-fin")?.value || "";
  const formato = detalleFormatoPlanner(nombreCategoria);
  const equipos = obtenerEquiposCategoria(nombreCategoria);
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  const partidosJugados = partidos.filter(partidoTieneResultado).length;
  const partidosPendientes = partidos.length - partidosJugados;
  const documentosEquipo = obtenerDocumentosEquipo();
  const documentosJugador = obtenerDocumentosJugador();
  const delegados = contarDelegadosCategoria(nombreCategoria, equipos);
  const simulacion = estado.ultimaSimulacionPlanner;
  const simulacionActual =
    simulacion &&
    simulacion.categoria === nombreCategoria &&
    simulacion.competencia === competencia;
  const cierre = categoria ? calcularEstadoCierreTorneo(nombreCategoria) : null;

  return [
    {
      estado: APP_CONFIG.organizacionActiva?.id ? "ok" : "error",
      titulo: "Asociacion activa",
      detalle: APP_CONFIG.organizacionActiva?.nombre
        ? `${APP_CONFIG.organizacionActiva.nombre} esta seleccionada como organizacion de trabajo.`
        : "Falta seleccionar una organizacion."
    },
    {
      estado: categoria ? "ok" : "error",
      titulo: "Categoria",
      detalle: categoria ? `${nombreCategoria} esta cargada en Supabase.` : "La categoria elegida no aparece cargada en Supabase."
    },
    {
      estado: equipos.length >= 2 ? "ok" : "error",
      titulo: "Equipos",
      detalle: equipos.length >= 2 ? `${equipos.length} equipos detectados para simular fixture.` : "Faltan equipos reales para poder generar un torneo."
    },
    {
      estado: fechaInicio && fechaFin ? "ok" : "warn",
      titulo: "Calendario base",
      detalle: fechaInicio && fechaFin
        ? `Inicio ${fechaPlannerLabel(fechaInicio)} y limite ${fechaPlannerLabel(fechaFin)}.`
        : "Carga fecha de inicio y fecha limite para medir si el torneo entra en calendario."
    },
    {
      estado: simulacionActual ? "ok" : "warn",
      titulo: "Fixture simulado",
      detalle: simulacionActual
        ? `Hay una simulacion vigente de ${competencia}, con final estimada ${simulacion.fechaFinalEstimada || "sin fecha"}.`
        : "Todavia falta simular este torneo antes de descargar o comunicar el fixture."
    },
    {
      estado: partidos.length && partidosPendientes ? "warn" : "ok",
      titulo: "Datos existentes",
      detalle: partidos.length
        ? `${partidos.length} partidos ya existen en esta categoria: ${partidosJugados} jugados y ${partidosPendientes} pendientes. Revisar antes de publicar algo nuevo.`
        : "No hay fixture publicado en esta categoria. Es buen escenario para preparar un torneo nuevo."
    },
    {
      estado: documentosEquipo.length && documentosJugador.length ? "ok" : "warn",
      titulo: "Documentacion",
      detalle: `${documentosEquipo.length} requisitos por equipo y ${documentosJugador.length} por jugador configurados.`
    },
    {
      estado: delegados >= Math.max(1, Math.min(equipos.length, 2)) ? "ok" : "warn",
      titulo: "Delegados y permisos",
      detalle: delegados ? `${delegados} delegados vinculados a equipos de esta categoria.` : "No se detectaron delegados vinculados a esta categoria en las claves actuales."
    },
    {
      estado: cierre?.estado === "cerrado" ? "ok" : partidos.length ? "warn" : "ok",
      titulo: "Cierre anterior",
      detalle: cierre?.estado === "cerrado"
        ? `El torneo actual figura cerrado. Campeon: ${cierre.campeon || "por confirmar"}.`
        : partidos.length
          ? "Hay actividad en esta categoria. Si corresponde a un torneo anterior, revisar la pestana Cierres."
          : "No hay torneo anterior cargado para cerrar en esta categoria."
    },
    {
      estado: "warn",
      titulo: "Publicacion oficial",
      detalle: `Formato elegido: ${formato.playoffsTexto}, ${formato.partidosCuartos} partido(s) en cuartos/repechaje, ${formato.partidosSemis} en semifinales y ${formato.finalTexto}. La publicacion real sigue pendiente de aprobacion administrativa.`
    }
  ];
}

function renderPreparacionTorneo() {
  const container = $("planner-readiness");
  if (!container) return;

  const categoria = document.getElementById("planner-categoria")?.value || $("asociacion-categoria")?.value || "";
  if (!categoria) {
    container.innerHTML = `<div class="empty">Elegi una categoria para evaluar la preparacion.</div>`;
    return;
  }

  const items = calcularPreparacionTorneo(categoria);
  const errores = items.filter((item) => item.estado === "error").length;
  const avisos = items.filter((item) => item.estado === "warn").length;
  const resumen =
    errores > 0
      ? `${errores} punto(s) bloqueantes y ${avisos} aviso(s).`
      : avisos > 0
        ? `${avisos} aviso(s) para revisar antes de publicar.`
        : "Todo listo para pasar a revision final.";

  container.innerHTML = `
    <div class="planner-alerts">
      <div>${escapeHtml(resumen)} Esta evaluacion no guarda ni publica datos.</div>
    </div>
    ${items.map(renderItemPreparacionTorneo).join("")}
  `;
}

function generarInformePreparacionTorneo() {
  const categoria = document.getElementById("planner-categoria")?.value || $("asociacion-categoria")?.value || "";
  const competencia = document.getElementById("planner-competencia")?.value || "";
  const container = $("planner-readiness");
  if (!categoria) {
    if (container) container.innerHTML = `<div class="planner-alerts"><div>Primero elegi una categoria.</div></div>`;
    return;
  }

  const items = calcularPreparacionTorneo(categoria);
  const errores = items.filter((item) => item.estado === "error").length;
  const avisos = items.filter((item) => item.estado === "warn").length;
  const formato = detalleFormatoPlanner(categoria);
  const fechaGeneracion = new Date().toLocaleString("es-AR");
  const estadoTexto = errores
    ? `${errores} punto(s) bloqueantes`
    : avisos
      ? `${avisos} aviso(s) para revisar`
      : "Listo para revision final";
  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Checklist de preparacion - ${escapeHtml(categoria)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 28px; }
        h1 { margin: 0 0 4px; font-size: 26px; }
        h2 { margin: 22px 0 8px; font-size: 18px; }
        .muted { color: #4b5563; margin: 0 0 14px; }
        .summary { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; margin: 16px 0; }
        .summary p { margin: 6px 0; }
        .item { border-top: 1px solid #d1d5db; padding: 10px 0; }
        .item:first-of-type { border-top: 0; }
        .ok { color: #047857; font-weight: 800; }
        .warn { color: #b45309; font-weight: 800; }
        .error { color: #b91c1c; font-weight: 800; }
        .print-actions { margin: 18px 0; }
        .print-actions button { padding: 10px 14px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 700; }
        @media print { body { margin: 12mm; } .print-actions { display: none; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(APP_CONFIG.producto.nombre)} - Checklist de preparacion</h1>
      <p class="muted">Organizacion: ${escapeHtml(APP_CONFIG.organizacionActiva.nombre)} - Generado ${escapeHtml(fechaGeneracion)}</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>
      <div class="summary">
        <p><strong>Categoria:</strong> ${escapeHtml(categoria)}</p>
        <p><strong>Competencia:</strong> ${escapeHtml(competencia || "Sin definir")}</p>
        <p><strong>Estado:</strong> ${escapeHtml(estadoTexto)}</p>
        <p><strong>Formato:</strong> ${escapeHtml(formato.playoffsTexto)} - Cuartos/repechaje ${escapeHtml(String(formato.partidosCuartos))} partido(s), semifinales ${escapeHtml(String(formato.partidosSemis))} partido(s), final ${escapeHtml(formato.finalTexto)}.</p>
      </div>
      <h2>Revision previa</h2>
      ${items.map((item) => `
        <div class="item">
          <div class="${escapeHtml(item.estado)}">${escapeHtml(item.estado.toUpperCase())} - ${escapeHtml(item.titulo)}</div>
          <p>${escapeHtml(item.detalle)}</p>
        </div>
      `).join("")}
      <p class="muted">Este documento es informativo: no publica fixture ni modifica datos cargados.</p>
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `checklist-preparacion-${categoria}-${competencia || "torneo"}`);
  const abierto = abrirInformeHtml(html);
  const mensaje = abierto
    ? `Checklist descargado como ${nombre}. Tambien se abrio una pestaña para imprimir o guardar PDF.`
    : `Checklist descargado como ${nombre}. El navegador bloqueo la pestaña de vista previa.`;
  renderPreparacionTorneo();
  mostrarCartelInforme(mensaje);
}

function obtenerSimulacionPlannerActual() {
  const categoria = document.getElementById("planner-categoria")?.value || "";
  const competencia = document.getElementById("planner-competencia")?.value || "";
  const simulacion = estado.ultimaSimulacionPlanner;
  if (!simulacion || simulacion.categoria !== categoria || simulacion.competencia !== competencia) {
    return null;
  }
  return simulacion;
}

function contarPartidosSimulados(simulacion) {
  return (simulacion?.fixture?.jornadas || []).reduce((total, jornada) => total + (jornada.partidos || []).length, 0);
}

function fechasSerieValoresPlanner(formato, prefijo, cantidad) {
  const claves = {
    cuartos: ["fechaCuartos", "fechaCuartos2", "fechaCuartos3"],
    semis: ["fechaSemis", "fechaSemis2", "fechaSemis3"],
    final: ["fechaFinal1", "fechaFinal2", "fechaFinal3"],
    promocion: ["fechaPromocion1", "fechaPromocion2", "fechaPromocion3"]
  }[prefijo] || [];

  return claves
    .slice(0, cantidad)
    .map((clave) => formato?.[clave])
    .filter(Boolean);
}

function crearDatosSeriePlayoffPlanner(partidos, fechas) {
  const limpio = (fechas || []).filter(Boolean);
  return {
    partidos,
    fecha: limpio[0] || null,
    fechas: limpio
  };
}

function armarSeriesPlayoffCategoriaPlanner(formato) {
  const series = {};

  if (formato?.clasificados && formato.clasificados > 4) {
    const fechasIniciales = fechasSerieValoresPlanner(formato, "cuartos", formato.partidosCuartos);
    const datosIniciales = crearDatosSeriePlayoffPlanner(formato.partidosCuartos, fechasIniciales);
    if (formato.clasificados === 6) {
      series.clasificacion = datosIniciales;
      series.repechaje = datosIniciales;
    } else {
      series.cuartos = datosIniciales;
    }
  }

  if (formato?.clasificados) {
    series.semifinales = crearDatosSeriePlayoffPlanner(
      formato.partidosSemis,
      fechasSerieValoresPlanner(formato, "semis", formato.partidosSemis)
    );
    series.final = crearDatosSeriePlayoffPlanner(
      formato.partidosFinal,
      fechasSerieValoresPlanner(formato, "final", formato.partidosFinal)
    );
  }

  if (formato?.partidosPromocion) {
    series.promocion = crearDatosSeriePlayoffPlanner(
      formato.partidosPromocion,
      fechasSerieValoresPlanner(formato, "promocion", formato.partidosPromocion)
    );
  }

  return series;
}

async function guardarFormatoCategoriaPublicadaPlanner(categoria, simulacion) {
  const formato = simulacion?.formato || {};
  const payload = {
    estado: "publicada",
    formato: formato.playoffsTexto || null,
    playoffs: Number(formato.clasificados || 0) > 0,
    clasificados: formato.clasificados || null,
    dia_juego: simulacion.dia === "" || simulacion.dia == null ? null : Number(simulacion.dia),
    fecha_inicio: simulacion.fechaInicio || null,
    fecha_fin: simulacion.fechaFin || null,
    frecuencia: simulacion.frecuencia || null,
    fechas_bloqueadas: simulacion.fechasBloqueadas || [],
    series_playoff: armarSeriesPlayoffCategoriaPlanner(formato)
  };

  const { error } = await supabaseClient
    .from("categorias")
    .update(payload)
    .eq("id", categoria.id);

  if (error) {
    throw new Error(`El fixture se publico, pero no se pudo guardar el formato de la categoria: ${error.message}`);
  }
}

function armarPayloadFixtureSimulado(simulacion, categoriaId) {
  return (simulacion.fixture?.jornadas || []).flatMap((jornada) =>
    (jornada.partidos || []).map((partido) => ({
      categoria_id: categoriaId,
      local: partido.local,
      visitante: partido.visitante,
      jornada: jornada.numero,
      fecha: jornada.fecha || null,
      libre: jornada.libre || null,
      puntos_local: null,
      puntos_visitante: null,
      estado_resultado: "pendiente",
      cargado_por: null,
      cargado_en: null
    }))
  );
}

async function obtenerCategoriaPublicacionPlanner(nombreCategoria) {
  const torneoTrabajoId = estado.torneoTrabajo?.id;
  if (torneoTrabajoId) {
    const { data, error } = await supabaseClient
      .from("categorias")
      .select("id, nombre, torneo_id")
      .eq("torneo_id", torneoTrabajoId)
      .eq("nombre", nombreCategoria)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo buscar la categoria de trabajo: ${error.message}`);
    }

    if (data?.id) return data;
  }

  return obtenerCategoriaPorNombre(nombreCategoria);
}

async function contarPartidosCategoriaId(categoriaId) {
  if (!categoriaId) return 0;

  const { count, error } = await supabaseClient
    .from("partidos")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", categoriaId);

  if (error) {
    throw new Error(`No se pudo verificar si la categoria tiene partidos: ${error.message}`);
  }

  return count || 0;
}

function generarConstanciaPublicacionFixture(simulacion, payload) {
  const fechaGeneracion = new Date().toLocaleString("es-AR");
  const formato = simulacion.formato || detalleFormatoPlanner(simulacion.categoria);
  const fechasEspeciales = (simulacion.fechasEspeciales || [])
    .map(([desde, hacia]) => `${fechaPlannerLabel(desde)} a ${fechaPlannerLabel(hacia)}`)
    .join(", ");
  const fixturePublicado = {
    jornadas: (simulacion.fixture?.jornadas || []).map((jornada) => ({
      ...jornada,
      partidos: (jornada.partidos || []).map((partido) => ({
        local: partido.local,
        visitante: partido.visitante
      }))
    }))
  };
  const html = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Constancia de publicacion - ${escapeHtml(simulacion.categoria)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 28px; }
        h1 { margin: 0 0 4px; font-size: 26px; }
        h2 { margin: 22px 0 8px; font-size: 18px; }
        h3 { margin: 16px 0 6px; font-size: 15px; }
        .muted { color: #4b5563; margin: 0 0 14px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
        .box strong { display: block; font-size: 18px; }
        .rules { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; margin: 14px 0; }
        .rules p { margin: 6px 0; }
        .suggestions { border: 1px solid #f59e0b; border-radius: 8px; padding: 10px; margin-top: 12px; background: #fffbeb; }
        .suggestions li { margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border-bottom: 1px solid #d1d5db; padding: 7px 6px; font-size: 12px; text-align: left; }
        th { background: #eef2ff; font-weight: 800; }
        .print-actions { margin: 18px 0; }
        .print-actions button { padding: 10px 14px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 700; }
        @media print { body { margin: 12mm; } .print-actions { display: none; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(APP_CONFIG.producto.nombre)} - Constancia de publicacion</h1>
      <p class="muted">Organizacion: ${escapeHtml(APP_CONFIG.organizacionActiva.nombre)} - Generado ${escapeHtml(fechaGeneracion)}</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>
      <div class="summary">
        <div class="box"><span>Categoria</span><strong>${escapeHtml(simulacion.categoria)}</strong></div>
        <div class="box"><span>Competencia</span><strong>${escapeHtml(simulacion.competencia || "-")}</strong></div>
        <div class="box"><span>Partidos publicados</span><strong>${payload.length}</strong></div>
        <div class="box"><span>Final estimada</span><strong>${escapeHtml(simulacion.fechaFinalEstimada || "-")}</strong></div>
      </div>
      <p><strong>Publicado por:</strong> ${escapeHtml(estado.usuarioAsociacion?.display_name || "Asociacion")}</p>

      <div class="rules">
        <p><strong>Inicio:</strong> ${escapeHtml(fechaPlannerLabel(simulacion.fechaInicio))} - <strong>Dia de juego:</strong> ${escapeHtml(simulacion.diaTexto || "-")}</p>
        <p><strong>Fecha limite:</strong> ${escapeHtml(fechaPlannerLabel(simulacion.fechaFin))} - <strong>Entra en calendario:</strong> ${escapeHtml(simulacion.entraEnCalendario || "-")}</p>
        <p><strong>Ruedas:</strong> ${escapeHtml(String(simulacion.ruedas || "-"))} - <strong>Frecuencia:</strong> ${escapeHtml(simulacion.frecuencia === 2 ? "Semana por medio" : "Todas las semanas")}</p>
        <p><strong>Jornadas fase regular:</strong> ${escapeHtml(String(simulacion.jornadasTotales || "-"))} - <strong>Margen calendario:</strong> ${escapeHtml(String(simulacion.margenCalendario ?? "-"))}</p>
        <p><strong>Fechas bloqueadas:</strong> ${escapeHtml(String(simulacion.bloqueadasCantidad || 0))} - <strong>Fechas especiales:</strong> ${escapeHtml(fechasEspeciales || "No")}</p>
        <p><strong>Formato:</strong> ${escapeHtml(formato.playoffsTexto)} - <strong>Final:</strong> ${escapeHtml(formato.finalTexto)} - <strong>Promocion:</strong> ${escapeHtml(formato.promocionTexto || "Sin partido extra")}</p>
      </div>

      ${simulacion.equiposLista?.length ? `
        <h2>Equipos incluidos</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Equipo</th></tr>
          </thead>
          <tbody>
            ${simulacion.equiposLista.map((equipo, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(equipo)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : ""}

      ${simulacion.sugerencias?.length ? `
        <div class="suggestions">
          <h2>Diagnostico y alternativas</h2>
          <ul>
            ${simulacion.sugerencias.map((item) => `<li><strong>${escapeHtml(item.titulo)}:</strong> ${escapeHtml(item.detalle)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      ${renderFixtureSimuladoInforme(fixturePublicado)}
      ${renderPlayoffsSimuladosInforme(formato)}
      <p class="muted">Esta constancia refleja el fixture creado en Supabase. Los resultados quedan pendientes de carga.</p>
    </body>
    </html>
  `;

  const nombre = descargarInformeHtml(html, `constancia-publicacion-${simulacion.categoria}-${simulacion.competencia || "torneo"}`);
  abrirInformeHtml(html);
  return nombre;
}

async function publicarFixtureSimuladoPlanner() {
  const status = $("planner-publicacion-status");
  const confirmar = String($("planner-confirmar-publicacion")?.value || "").trim().toUpperCase();
  const simulacion = obtenerSimulacionPlannerActual();

  if (estado.publicacionFixtureEnCurso) {
    setStatus(status, "Ya hay una publicacion en curso. Espera a que termine antes de volver a tocar el boton.", "warn");
    return;
  }

  if (!simulacion) {
    setStatus(status, "Primero simula este torneo. Solo se puede publicar la simulacion vigente de esta categoria y competencia.", "warn");
    return;
  }

  if (confirmar !== "PUBLICAR") {
    setStatus(status, "Para habilitar la publicacion escribi PUBLICAR en el campo de confirmacion.", "warn");
    return;
  }

  let categoria = null;
  try {
    categoria = await obtenerCategoriaPublicacionPlanner(simulacion.categoria);
  } catch (error) {
    setStatus(status, error.message, "error");
    return;
  }

  if (!categoria?.id) {
    setStatus(status, "No se encontro la categoria de publicacion en Supabase. No se publico nada.", "error");
    return;
  }

  const cantidadPartidos = contarPartidosSimulados(simulacion);
  if (!cantidadPartidos) {
    setStatus(status, "La simulacion no tiene partidos para publicar.", "warn");
    return;
  }

  const confirmaNavegador = window.confirm(
    `Vas a publicar ${cantidadPartidos} partidos en ${simulacion.categoria}. Esta accion crea el fixture real si la categoria esta vacia. Continuar?`
  );
  if (!confirmaNavegador) {
    setStatus(status, "Publicacion cancelada. No se modifico Supabase.", "warn");
    return;
  }

  const boton = $("planner-publicar-fixture");
  estado.publicacionFixtureEnCurso = true;
  if (boton) boton.disabled = true;
  setStatus(status, "Verificando que la categoria no tenga partidos cargados...", "warn");

  try {
    const existentes = await contarPartidosCategoriaId(categoria.id);
    if (existentes) {
      const torneoDestino = categoria.torneo_id === estado.torneoTrabajo?.id ? "torneo de trabajo" : "torneo visible";
      setStatus(status, `Publicacion bloqueada: ${simulacion.categoria} ya tiene ${existentes} partidos cargados en el ${torneoDestino}. No se publico nada.`, "error");
      return;
    }

    const payload = armarPayloadFixtureSimulado(simulacion, categoria.id);
    const { error } = await supabaseClient
      .from("partidos")
      .insert(payload);

    if (error) {
      setStatus(status, `No se pudo publicar el fixture: ${error.message}`, "error");
      return;
    }

    await guardarFormatoCategoriaPublicadaPlanner(categoria, simulacion);

    await cargarTorneoActivo();
    const categoriasActualizadas = await cargarCategorias();
    poblarSelectCategorias("publico-categoria", categoriasActualizadas);
    poblarSelectCategorias("fecha-categoria", categoriasActualizadas);
    poblarSelectCategorias("delegado-categoria", categoriasActualizadas);
    if (categoriasActualizadas.some((cat) => cat.nombre === simulacion.categoria)) {
      if ($("publico-categoria")) $("publico-categoria").value = simulacion.categoria;
      if ($("fecha-categoria")) $("fecha-categoria").value = simulacion.categoria;
      if ($("delegado-categoria")) $("delegado-categoria").value = simulacion.categoria;
    }

    await cargarPartidosCategoria(simulacion.categoria);
    renderPreparacionTorneo();
    if ($("publico-categoria")?.value === simulacion.categoria) {
      renderPublicoCategoria(simulacion.categoria);
    }
    if ($("fecha-categoria")?.value === simulacion.categoria) {
      renderPublicoCategoria(simulacion.categoria);
    }
    if ($("delegado-categoria")?.value === simulacion.categoria) {
      poblarSelectPartidosDelegado(simulacion.categoria);
    }
    if ($("asociacion-categoria")?.value === simulacion.categoria) {
      poblarSelectPartidosAsociacion(simulacion.categoria);
      completarInputsAsociacion();
      renderProgramacionAsociacion(simulacion.categoria);
    }
    const constancia = generarConstanciaPublicacionFixture(simulacion, payload);
    registrarUso("fixture_publicado", {
      area: "asociacion",
      categoria: simulacion.categoria,
      cantidad: payload.length,
      archivo: constancia,
      user: estado.usuarioAsociacion?.display_name || "Asociacion",
      role: estado.usuarioAsociacion?.role || "asociacion"
    });
    setStatus(status, `Fixture publicado correctamente: ${payload.length} partidos creados en ${simulacion.categoria}. Constancia descargada como ${constancia}.`, "ok");
    mostrarCartelInforme(`Fixture publicado: ${payload.length} partidos creados en ${simulacion.categoria}. Constancia descargada en Descargas.`);
    if ($("planner-confirmar-publicacion")) $("planner-confirmar-publicacion").value = "";
  } catch (error) {
    setStatus(status, `No se pudo publicar el fixture: ${error.message}`, "error");
  } finally {
    estado.publicacionFixtureEnCurso = false;
    if (boton) boton.disabled = false;
  }
}

 const plannerBtn = document.getElementById("planner-generar");
 const plannerInformeBtn = document.getElementById("planner-informe");
 const plannerPreparacionBtn = document.getElementById("planner-evaluar-preparacion");
 const plannerDescargarPreparacionBtn = document.getElementById("planner-descargar-preparacion");
 const plannerPublicarFixtureBtn = document.getElementById("planner-publicar-fixture");
 const plannerCategoria = document.getElementById("planner-categoria");
 const plannerPartidosCuartos = document.getElementById("planner-partidos-cuartos");
 const plannerPartidosSemis = document.getElementById("planner-partidos-semis");
 const plannerFinal = document.getElementById("planner-final");
 const plannerPromocion = document.getElementById("planner-promocion");
 const plannerCargarEquipos = document.getElementById("planner-cargar-equipos");
 const plannerEquiposManual = document.getElementById("planner-equipos-manual");

if (plannerCategoria) {
  configurarDefaultsPlanner();
  cargarEquiposActualesPlanner(true);
  plannerCategoria.addEventListener("change", () => {
    configurarDefaultsPlanner();
    cargarEquiposActualesPlanner(true);
    renderPreparacionTorneo();
  });
}

if (plannerCargarEquipos) {
  plannerCargarEquipos.addEventListener("click", async () => {
    const categoria = $("planner-categoria")?.value || "";
    const status = $("planner-status");
    if (status) status.innerHTML = `<div class="card" style="margin-top:10px;"><p>Cargando equipos actuales...</p></div>`;
    try {
      await refrescarCategoria(categoria, {
        actualizarPublico: false,
        incluirDocumentacion: false,
        incluirPartidos: true,
        incluirPlayoffs: false,
        incluirProgramacion: false
      });
      cargarEquiposActualesPlanner(true);
      if (status) status.innerHTML = `<div class="card" style="margin-top:10px;"><p class="ok">Equipos actuales cargados. Ahora podes ajustar ascensos y descensos antes de simular.</p></div>`;
    } catch (error) {
      if (status) status.innerHTML = `<div class="card" style="margin-top:10px;"><p class="error">No se pudieron cargar equipos: ${escapeHtml(error.message)}</p></div>`;
    }
  });
}

if (plannerEquiposManual) {
  plannerEquiposManual.addEventListener("input", () => actualizarResumenEquiposPlanner());
}

$("planner-simulaciones-guardadas")?.addEventListener("click", manejarSimulacionesPlannerGuardadas);
renderSimulacionesPlannerGuardadas();

if (plannerFinal) {
  plannerFinal.addEventListener("change", actualizarFechasSeriesPlanner);
}

if (plannerPartidosCuartos) {
  plannerPartidosCuartos.addEventListener("change", actualizarFechasSeriesPlanner);
}

if (plannerPartidosSemis) {
  plannerPartidosSemis.addEventListener("change", actualizarFechasSeriesPlanner);
}

if (plannerPromocion) {
  plannerPromocion.addEventListener("change", actualizarFechasSeriesPlanner);
}

if (plannerInformeBtn) {
  plannerInformeBtn.addEventListener("click", generarInformeTorneo);
}

if (plannerPreparacionBtn) {
  plannerPreparacionBtn.addEventListener("click", async () => {
    const categoria = document.getElementById("planner-categoria")?.value || "";
    const status = $("planner-readiness");
    if (!categoria || !status) {
      renderPreparacionTorneo();
      return;
    }

    status.innerHTML = `<div class="empty">Actualizando datos de ${escapeHtml(categoria)}...</div>`;
    try {
      await refrescarCategoria(categoria, {
        actualizarPublico: false,
        incluirDocumentacion: true,
        incluirPartidos: true,
        incluirPlayoffs: true,
        incluirProgramacion: true
      });
    } catch (error) {
      status.innerHTML = `<div class="planner-alerts"><div>No se pudo actualizar la categoria: ${escapeHtml(error.message)}</div></div>`;
      return;
    }
    renderPreparacionTorneo();
  });
}

if (plannerDescargarPreparacionBtn) {
  plannerDescargarPreparacionBtn.addEventListener("click", generarInformePreparacionTorneo);
}

if (plannerPublicarFixtureBtn) {
  plannerPublicarFixtureBtn.addEventListener("click", publicarFixtureSimuladoPlanner);
}

document.addEventListener("click", (event) => {
  const boton = event.target.closest?.(".planner-download-report");
  if (!boton) return;
  descargarUltimaSimulacionPlanner();
});

document.addEventListener("click", (event) => {
  const boton = event.target.closest?.(".planner-download-official");
  if (!boton) return;
  generarDocumentoOficialFixture();
});

if (plannerBtn) {
  plannerBtn.addEventListener("click", async () => {
    const categoria = document.getElementById("planner-categoria").value;
    const competencia = document.getElementById("planner-competencia").value;
    const ruedas = Number(document.getElementById("planner-ruedas").value);
    const dia = document.getElementById("planner-dia").value;
    const frecuencia = Number(document.getElementById("planner-frecuencia")?.value || 1);
    const fechaInicio = document.getElementById("planner-inicio").value;
const fechaFin = document.getElementById("planner-fin").value;
const fechasBloqueadasTexto = document.getElementById("planner-bloqueadas").value;
const fechasEspecialesTexto = document.getElementById("planner-fechas-especiales")?.value || "";
const status = document.getElementById("planner-status");
status.innerHTML = `<div class="card" style="margin-top:10px;"><p>Cargando equipos y partidos para simular...</p></div>`;

try {
  await refrescarCategoria(categoria, {
    actualizarPublico: false,
    incluirDocumentacion: true,
    incluirPartidos: true,
    incluirPlayoffs: false,
    incluirProgramacion: false
  });
} catch (error) {
  status.innerHTML = `<div class="card" style="margin-top:10px;"><p class="error">No se pudo cargar la categoria para simular: ${escapeHtml(error.message)}</p></div>`;
  return;
}

const partidos = estado.partidosPorCategoria[categoria] || [];
let formato = detalleFormatoPlanner(categoria);
let equiposLista = parsearEquiposPlanner($("planner-equipos-manual")?.value || "");
if (!equiposLista.length) equiposLista = cargarEquiposActualesPlanner(true);
const equipos = equiposLista.length;
const partidosJugados = partidos.filter(partidoTieneResultado).length;
const partidosPendientes = partidos.length - partidosJugados;
const jornadasReales = new Set(
  partidos.map((p) => p.jornada).filter(Boolean)
).size;
const jornadasBase =
  equipos % 2 === 0
    ? equipos - 1
    : equipos;
const jornadasTotales = jornadasBase * ruedas;
const tieneLibre = equipos % 2 !== 0;
let bloqueadasCantidad = 0;
let semanasDisponibles = "-";
let margenCalendario = "-";
let fechaFinalEstimada = "No definida";
let entraEnCalendario = "Sin analizar";
let fixtureSimulado = { jornadas: [], alertas: [], ultimaFecha: "" };

const fechasBloqueadas = parsearFechasBloqueadasPlanner(fechasBloqueadasTexto);
const fechasEspeciales = parsearFechasEspecialesPlanner(fechasEspecialesTexto);
bloqueadasCantidad = fechasBloqueadas.size;

if (fechaInicio) {
  const inicio = new Date(fechaInicio);

  const diasPorFecha = 7 * frecuencia;
  const diasTotales = (jornadasTotales + bloqueadasCantidad) * diasPorFecha;

  const estimada = new Date(inicio);
  estimada.setDate(estimada.getDate() + diasTotales);

  fechaFinalEstimada = estimada.toLocaleDateString("es-AR");

  if (fechaFin) {
    const limite = new Date(fechaFin);

    const diferenciaMs = limite - inicio;
    const diferenciaDias = diferenciaMs / (1000 * 60 * 60 * 24);

    semanasDisponibles = Math.floor(diferenciaDias / 7);

    margenCalendario =
      semanasDisponibles - (jornadasTotales + bloqueadasCantidad);

    entraEnCalendario =
      estimada <= limite
        ? "Sí"
        : "No";
  }
} 

if (equipos >= 2) {
  fixtureSimulado = generarFixtureSimuladoPlanner(
    equiposLista,
    ruedas,
    fechaInicio,
    dia,
    fechasBloqueadas,
    fechaFin,
    frecuencia,
    fechasEspeciales
  );
} else {
  fixtureSimulado.alertas.push("No hay equipos suficientes en esta categoria para simular fixture.");
}

completarFechasPlayoffSimuladasPlanner(formato, fixtureSimulado, fechasBloqueadas, frecuencia);
formato = detalleFormatoPlanner(categoria);

const ultimaFechaCompleta = ultimaFechaFormatoPlanner(formato) || fixtureSimulado.ultimaFecha;
if (ultimaFechaCompleta) {
  fechaFinalEstimada = fechaPlannerLabel(ultimaFechaCompleta);
  if (fechaFin) {
    const ultimaSimulada = fechaLocalPlanner(ultimaFechaCompleta);
    const limite = fechaLocalPlanner(fechaFin);
    entraEnCalendario = ultimaSimulada && limite && ultimaSimulada <= limite ? "Si" : "No";
  }
}

const fechasDisponibles = fechasDisponiblesPlanner(fechaInicio, fechaFin, dia, frecuencia, fechasBloqueadas);
const fechasNecesariasCompletas = jornadasTotales + contarFechasPlayoffPlanner(formato);
if (fechaInicio && fechaFin) {
  semanasDisponibles = fechasDisponibles.length;
  margenCalendario = fechasDisponibles.length - fechasNecesariasCompletas;
}

const sugerenciasPlanner = detectarSugerenciasPlanner({
  fechaInicio,
  fechaFin,
  dia,
  frecuencia,
  bloqueadas: fechasBloqueadas,
  jornadasTotales,
  formato,
  entraEnCalendario,
  margenCalendario
});

const alertasPlanner = [
  ...fixtureSimulado.alertas,
  !fechaInicio ? "Sin fecha de inicio: se simulan las jornadas sin calendario." : ""
].filter(Boolean);

estado.ultimaSimulacionPlanner = {
  categoria,
  competencia,
  equipos,
  equiposLista,
  ruedas,
  frecuencia,
  dia,
  diaTexto: dia === "0" ? "Domingo" : "Miercoles",
  fechaInicio,
  fechaFin,
  formato,
  fixture: fixtureSimulado,
  jornadasTotales,
  bloqueadasCantidad,
  fechasBloqueadas: Array.from(fechasBloqueadas),
  fechasEspeciales: Array.from(fechasEspeciales.entries()),
  fechaFinalEstimada,
  entraEnCalendario,
  margenCalendario,
  sugerencias: sugerenciasPlanner
};
guardarSimulacionPlanner(estado.ultimaSimulacionPlanner);


        status.innerHTML = `
      <div class="card" style="margin-top:10px;">
        <h3>Simulacion de torneo</h3>

        <p class="note">Simulacion lista. No modifica datos reales ni publica el fixture. Si esta bien, descarga el informe desde el boton de abajo.</p>

        <div class="planner-simulation-actions">
          <button class="secondary planner-download-report" type="button">Descargar fixture simulado</button>
          <button class="secondary planner-download-official" type="button">Documento oficial del fixture</button>
          <span>Se baja un archivo HTML en Descargas y se abre una vista para imprimir o guardar PDF.</span>
        </div>

        ${alertasPlanner.length ? `
          <div class="planner-alerts">
            ${alertasPlanner.map((alerta) => `<div>${escapeHtml(alerta)}</div>`).join("")}
          </div>
        ` : ""}

        <p><strong>Categoría:</strong> ${categoria}</p>
        <p><strong>Competencia:</strong> ${competencia}</p>
        <p><strong>Equipos:</strong> ${equipos}</p>
        <p><strong>Jornadas simuladas:</strong> ${jornadasTotales}</p>
        <p><strong>Referencia actual:</strong> ${jornadasReales} jornadas cargadas, ${partidosJugados} partidos jugados y ${partidosPendientes} pendientes.</p>
        <p><strong>Ruedas:</strong> ${ruedas}</p>
        <p><strong>Frecuencia:</strong> ${frecuencia === 2 ? "Semana por medio" : "Todas las semanas"}</p>
        <p><strong>Día:</strong> ${dia === "0" ? "Domingo" : "Miércoles"}</p>
        <p><strong>Playoffs:</strong> ${formato.playoffsTexto}</p>
        <p><strong>Clasificados:</strong> ${formato.clasificados || "No aplica"}</p>
        <p><strong>Cuartos / repechaje:</strong> ${formato.partidosCuartos} partido(s) - ${fechasSeriePlanner(formato, "cuartos", formato.partidosCuartos)}</p>
        <p><strong>Semifinales:</strong> ${formato.partidosSemis} partido(s) - ${fechasSeriePlanner(formato, "semis", formato.partidosSemis)}</p>
        <p><strong>Final:</strong> ${formato.finalTexto} - ${fechasSeriePlanner(formato, "final", formato.partidosFinal)}</p>
        <p><strong>Promocion posterior:</strong> ${formato.promocionTexto} ${formato.partidosPromocion ? `- ${fechasSeriePlanner(formato, "promocion", formato.partidosPromocion)}` : ""}</p>
        <p><strong>Ascenso / repechaje B:</strong> ${formato.definicionBTexto}</p>
        <p><strong>Descenso +35 A:</strong> ${formato.descensoATexto}</p>
        <p><strong>Regla aplicada:</strong> ${formato.reglaPromocion}</p>
        <p><strong>Jornadas fase regular:</strong> ${jornadasTotales}</p>
        <p><strong>Fechas totales necesarias:</strong> ${fechasNecesariasCompletas}</p>
        <p><strong>Fecha final estimada:</strong> ${fechaFinalEstimada}</p>
        <p><strong>Fechas bloqueadas:</strong> ${bloqueadasCantidad}</p>
        <p><strong>Entra en calendario:</strong> ${entraEnCalendario}</p>
        <p><strong>Fechas jugables disponibles:</strong> ${semanasDisponibles}</p>
        <p><strong>Margen calendario:</strong> ${margenCalendario}</p>
        <p><strong>Libre por fecha:</strong> ${tieneLibre ? "Sí" : "No"}</p>
        ${fixtureSimulado.ultimaFecha ? `<p><strong>Ultima fecha simulada:</strong> ${fechaPlannerLabel(fixtureSimulado.ultimaFecha)}</p>` : ""}
        ${renderSugerenciasPlanner(sugerenciasPlanner)}
        ${renderFixtureSimuladoPlanner(fixtureSimulado)}
        ${renderPlayoffsSimuladosPlanner(formato)}
      </div>
    `;
    renderPreparacionTorneo();
  });
  
}
}

async function inicializar() {
  try {
    aplicarConfiguracionVisual();
    renderAccesoApp();

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      renderAccesoApp();
    });

    $("tab-publico").addEventListener("click", () => {
      mostrarVista("publico");
      actualizarUrlCategoria($("publico-categoria")?.value || "", "publico");
      registrarUso("vista_publico", { area: "publico", categoria: $("publico-categoria")?.value || null });
    });
    $("tab-fecha").addEventListener("click", () => {
      mostrarVista("fecha");
      const categoria = $("fecha-categoria")?.value || $("publico-categoria")?.value || null;
      if (categoria) {
        $("publico-categoria").value = categoria;
        if ($("fecha-categoria")) $("fecha-categoria").value = categoria;
        actualizarUrlCategoria(categoria, "fecha");
      refrescarPublicoCategoria(categoria);
      }
      registrarUso("vista_fecha", { area: "publico", categoria });
    });
    $("tab-acceso")?.addEventListener("click", () => {
      mostrarVista("acceso");
      registrarUso("vista_acceso", { area: "acceso" });
    });
    $("tab-delegados").addEventListener("click", () => {
      mostrarVista("delegados");
      registrarUso("vista_delegados", { area: "delegados" });
    });
    $("tab-asociacion").addEventListener("click", () => {
      mostrarVista("asociacion");
      registrarUso("vista_asociacion", { area: "asociacion" });
    });
    $("access-copy-link")?.addEventListener("click", copiarLinkAccesoApp);
    $("access-open-link")?.addEventListener("click", abrirLinkAccesoApp);
    $("access-install-app")?.addEventListener("click", instalarAccesoApp);
    $("auth-login")?.addEventListener("click", iniciarSesionAuth);
    $("auth-logout")?.addEventListener("click", cerrarSesionAuth);
    $("auth-password")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") iniciarSesionAuth();
    });

    poblarSelectCategorias("publico-categoria", CATEGORIAS_BASE);
    poblarSelectCategorias("fecha-categoria", CATEGORIAS_BASE);
    poblarSelectCategorias("delegado-categoria", CATEGORIAS_BASE);

    $("publico-categoria").addEventListener("change", (e) => {
      if ($("fecha-categoria")) $("fecha-categoria").value = e.target.value;
      actualizarUrlCategoria(e.target.value, "publico");
      refrescarPublicoCategoria(e.target.value);
    });
    $("fecha-categoria").addEventListener("change", (e) => {
      if ($("publico-categoria")) $("publico-categoria").value = e.target.value;
      actualizarUrlCategoria(e.target.value, "fecha");
      refrescarPublicoCategoria(e.target.value);
    });

    await cargarTorneoActivo();

    const categorias = await cargarCategorias();
    estado.categorias = categorias;
    registrarUso("app_abierta", { area: "inicio" });

    if (!categorias.length) {
      throw new Error("No se encontraron categorías cargadas en Supabase.");
    }

    const parametrosVista = obtenerParametrosVista();
    const categoriaDesdeUrl = resolverCategoriaUrl(categorias, parametrosVista.categoria);
    const categoriaPrevia = categoriaDesdeUrl || $("publico-categoria")?.value || categorias[0].nombre;
    poblarSelectCategorias("publico-categoria", categorias);
    poblarSelectCategorias("fecha-categoria", categorias);
    poblarSelectCategorias("delegado-categoria", categorias);

    const categoriaInicial = categorias.some((cat) => cat.nombre === categoriaPrevia)
      ? categoriaPrevia
      : categorias[0].nombre;
    $("publico-categoria").value = categoriaInicial;
    if ($("fecha-categoria")) $("fecha-categoria").value = categoriaInicial;
    actualizarUrlCategoria(categoriaInicial, parametrosVista.vista);

    if (parametrosVista.vista === "fecha") {
      mostrarVista("fecha");
    }

    const cargaPublicaInicial = refrescarPublicoCategoria(categoriaInicial);
    inicializarDatosInternosEnSegundoPlano(categoriaInicial);
    await cargaPublicaInicial;

    $("delegado-categoria").addEventListener("change", async (e) => {
      const categoria = e.target.value;
      $("publico-categoria").value = categoria;
      if ($("fecha-categoria")) $("fecha-categoria").value = categoria;
      await refrescarCategoria(categoria);
      poblarSelectPartidosDelegado(categoria);
      setStatus($("delegado-status"), "", "");
      aplicarBloqueoDelegado();
      renderDocumentacionDelegado();
    });

    $("delegado-partido").addEventListener("change", completarInputsPartidoSeleccionado);
    $("delegado-guardar").addEventListener("click", guardarResultadoDelegado);
    $("delegado-desbloquear").addEventListener("click", desbloquearDelegado);
    $("delegado-documentacion").addEventListener("change", subirDocumentoDelegado);
    $("delegado-documentacion").addEventListener("change", subirDocumentoJugadorDelegado);
    $("delegado-documentacion").addEventListener("click", (event) => {
      verDocumentoDelegado(event);
      if (event.target.closest("#jugador-agregar")) agregarJugadorDelegado();
      solicitarBajaJugadorDelegado(event);
    });
  } catch (error) {
    console.error(error);
    $("vista-publico").innerHTML = `
      <div class="card">
        <h3>Error de inicio</h3>
        <p class="note">${error.message}</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", inicializar);
