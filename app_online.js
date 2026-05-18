console.log("APP ONLINE NUEVA CARGADA");
const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";
const TORNEO_ID = "7d0971e3-66ee-4791-bcbf-bace1d2fefb9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estado = {
  categorias: [],
  partidosPorCategoria: {},
  equiposPorCategoriaId: {},
  requisitosDocumentales: [],
  documentosPorCategoriaId: {},
  jugadoresPorCategoriaId: {},
  documentosJugadoresPorCategoriaId: {},
  filasDocumentacionAsociacion: [],
  eventosUso: [],
  publicoCargaActual: 0,
  delegadoDesbloqueado: false,
  delegado: null,
  asociacionDesbloqueada: false,
  usuarioAsociacion: null
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(element, text, kind = "") {
  if (!element) return;
  element.textContent = text || "";
  element.className = `status${kind ? " " + kind : ""}`;
}

function obtenerSesionUso() {
  const key = "apdb_usage_session_id";
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

  const tabs = {
    publico: $("tab-publico"),
    delegados: $("tab-delegados"),
    asociacion: $("tab-asociacion")
  };

  const views = {
    publico: $("vista-publico"),
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

function mostrarPanelAsociacion(panel = "documentacion") {
  document.querySelectorAll(".assoc-nav-btn").forEach((button) => {
    button.classList.toggle("activo", button.dataset.asociacionPanel === panel);
  });

  document.querySelectorAll(".assoc-panel").forEach((section) => {
    section.classList.toggle("activa", section.dataset.asociacionPanelView === panel);
  });

  if (panel === "uso" && estado.asociacionDesbloqueada) {
    actualizarEstadisticasUso();
  }
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

  mostrarPanelAsociacion("documentacion");
}

async function cargarCategorias() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  }

  estado.categorias = data || [];
  return estado.categorias;
}

function poblarSelectCategorias(selectId, categorias) {
  const select = $(selectId);
  if (!select) return;

  select.innerHTML = "";

  (categorias || []).forEach((cat) => {
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
    .select("player_id, jugador_nombre, jugador_dni, jugador_dorsal, categoria_id, equipo_id, equipo_nombre")
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
    .select("id, player_id, jugador_nombre, jugador_dni, jugador_dorsal, requirement_id, requirement_nombre, categoria_id, equipo_id, equipo_nombre, status, vencimiento, observacion, storage_path, file_name, file_type, file_size")
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
      activo: true
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
  const equipoNormalizado = normalizarTexto(equipo);
  const requisitoNormalizado = normalizarTexto(requisito);

  return documentos.find((documento) =>
    normalizarTexto(documento.equipo_nombre) === equipoNormalizado &&
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
  const equipoNormalizado = normalizarTexto(equipo);
  const jugadoresPorDocumentos = normalizarJugadoresDesdeDocumentos(
    documentosJugador.filter((documento) =>
      normalizarTexto(documento.equipo_nombre) === equipoNormalizado
    )
  );
  const jugadores = jugadoresPorDocumentos.length ? jugadoresPorDocumentos : jugadoresCache;

  return jugadores.filter((jugador) =>
    normalizarTexto(jugador.equipo_nombre) === equipoNormalizado
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

  const equipos = obtenerEquiposCategoria(nombreCategoria);
  const documentosRequeridos = obtenerDocumentosEquipo();
  const documentosJugador = obtenerDocumentosJugador();
  const filtroEstado = $("documentacion-filtro-estado")?.value || "";
  const filtroVencimiento = $("documentacion-filtro-vencimiento")?.value || "";
  const filtroTexto = normalizarTexto($("documentacion-buscar")?.value || "");
  const documentosJugadores = estado.documentosJugadoresPorCategoriaId[estado.categorias.find((cat) => cat.nombre === nombreCategoria)?.id] || [];
  const totalEsperado = equipos.length * documentosRequeridos.length;
  const documentos = equipos.flatMap((equipo) =>
    documentosRequeridos.map((requisito) => obtenerDocumentoEquipo(nombreCategoria, equipo, requisito))
  );
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
    <div class="doc-pill"><strong>${equipos.length}</strong><span>Equipos</span></div>
    <div class="doc-pill"><strong>${documentosRequeridos.length}</strong><span>Requisitos</span></div>
    <div class="doc-pill"><strong>${documentosJugadores.length}</strong><span>Docs jugador</span></div>
    <div class="doc-pill"><strong>${resumenEstados.pendiente || 0}</strong><span>Pendientes</span></div>
    <div class="doc-pill"><strong>${resumenEstados.cargado || 0}</strong><span>Para revisar</span></div>
    <div class="doc-pill"><strong>${resumenEstados.aprobado || 0}</strong><span>Aprobados</span></div>
    <div class="doc-pill"><strong>${(resumenEstados.observado || 0) + (resumenEstados.rechazado || 0)}</strong><span>Observados/Rechazados</span></div>
    <div class="doc-pill doc-pill-alert"><strong>${(resumenVencimientos.vencido || 0) + (resumenVencimientos.por_vencer || 0)}</strong><span>Vencidos/por vencer</span></div>
    <div class="doc-pill"><strong>${totalEsperado}</strong><span>Total esperado</span></div>
  `;

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
      ${renderDocumentacionJugadoresAsociacion(nombreCategoria, documentosJugador)}
      <div class="empty">No hay documentos de equipo que coincidan con los filtros.</div>
    `;
    return;
  }

  tabla.innerHTML = `
    ${renderAvisoDocumentosJugador(documentosJugador)}
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

  if (documento.status === "aprobado") {
    return `
      <div class="doc-review-actions">
        <button class="doc-view-btn" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}">Ver</button>
        <span class="doc-review-current doc-review-current-ok">Aprobado</span>
      </div>
    `;
  }

  return `
    <div class="doc-review-actions">
      <button class="doc-view-btn" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}">Ver</button>
      <button class="doc-review-btn doc-review-ok" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}" data-status="aprobado">Aprobar</button>
      ${documento.status !== "observado" ? `<button class="doc-review-btn doc-review-warn" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}" data-status="observado">Observar</button>` : `<span class="doc-review-current doc-review-current-warn">Observado</span>`}
      ${documento.status !== "rechazado" ? `<button class="doc-review-btn doc-review-danger" type="button" data-document-id="${documentId}" data-document-scope="${scopeAttr}" data-status="rechazado">Rechazar</button>` : `<span class="doc-review-current doc-review-current-danger">Rechazado</span>`}
    </div>
  `;
}

function renderDocumentacionJugadoresAsociacion(nombreCategoria, documentosJugador) {
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  const documentos = categoria ? estado.documentosJugadoresPorCategoriaId[categoria.id] || [] : [];
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

    return (!filtroEstado || status === filtroEstado) &&
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
  const equiposDelegado = equiposCategoria.filter((equipo) =>
    estado.delegado.equipos.includes(equipo)
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

function renderDocumentacionJugadoresDelegado(categoria, equiposDelegado, documentosJugador) {
  if (!documentosJugador.length) return "";

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
            <th>Documento</th>
            <th>Estado</th>
            <th>Observación</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${jugadores.map((jugador) =>
            documentosJugador.map((requisito) => {
              const documento = obtenerDocumentoJugador(categoria, jugador.id, requisito);

              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(jugador.nombre)}</strong>
                    <span class="doc-player-meta">${jugador.dni ? `DNI ${escapeHtml(jugador.dni)}` : ""}${jugador.dorsal ? ` #${escapeHtml(jugador.dorsal)}` : ""}</span>
                  </td>
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

  const nombreArchivo = documento.file_name
    ? `<span class="doc-file-name">${escapeHtml(documento.file_name)}</span>`
    : "";

  if (documento.status === "aprobado") {
    return `${nombreArchivo}<span class="doc-action-muted">Aprobado</span>`;
  }

  const marcaCargado = documento.file_name
    ? `<span class="doc-uploaded-mark">Cargado, pendiente de revisión</span>`
    : "";

  return `
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
    return `${nombreArchivo}<span class="doc-action-muted">Aprobado</span>`;
  }

  const marcaCargado = documento.file_name
    ? `<span class="doc-uploaded-mark">Cargado, pendiente de revisión</span>`
    : "";

  return `
    ${vencimientoInput}
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
      cargado_por,
      cargado_en,
      categoria_id,
      categorias!inner(nombre)
    `)
    .eq("categorias.nombre", nombreCategoria)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los partidos de ${nombreCategoria}: ${error.message}`);
  }

  estado.partidosPorCategoria[nombreCategoria] = data || [];
  return estado.partidosPorCategoria[nombreCategoria];
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

    if (p.puntos_local == null || p.puntos_visitante == null) return;

    tabla[p.local].pj += 1;
    tabla[p.visitante].pj += 1;

    tabla[p.local].pf += p.puntos_local;
    tabla[p.local].pc += p.puntos_visitante;
    tabla[p.visitante].pf += p.puntos_visitante;
    tabla[p.visitante].pc += p.puntos_local;

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

  salida.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dif !== a.dif) return b.dif - a.dif;
    if (b.pf !== a.pf) return b.pf - a.pf;
    return a.equipo.localeCompare(b.equipo);
  });

  return salida;
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

function renderFixturePublico(nombreCategoria) {
  const container = document.getElementById("publico-fixture");
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];

  if (!partidos.length) {
    container.innerHTML = `<div class="empty">No hay partidos cargados.</div>`;
    return;
  }

  const porJornada = {};

  partidos.forEach((p) => {
    const j = p.jornada || 0;
    if (!porJornada[j]) porJornada[j] = [];
    porJornada[j].push(p);
  });

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

    html += `<div class="card"><h3>${titulo}</h3>`;

    const libre = partidosJornada[0]?.libre;
    if (libre) {
      html += `<div class="empty">Libre: ${libre}</div>`;
    }

    partidosJornada.forEach((p) => {
      const estadoTxt =
        p.puntos_local != null && p.puntos_visitante != null
          ? `${p.puntos_local} - ${p.puntos_visitante}`
          : "Pendiente";

      let detalleCarga = "";

      if (p.cargado_por) {
        detalleCarga = `
          <details style="margin-top:6px;">
            <summary style="font-size:11px; cursor:pointer;">Ver detalle</summary>
            <div style="font-size:12px; color:#aaa; margin-top:4px;">
              Cargado por: ${p.cargado_por}<br>
              ${p.cargado_en || ""}
            </div>
          </details>
        `;
      }

      html += `
        <div class="match">
          <div style="width:100%;">
            <div class="teams">
              ${nombreEquipoHtml(p.local, "md")}
              <span class="vs">vs</span>
              ${nombreEquipoHtml(p.visitante, "md")}
            </div>
            ${detalleCarga || ""}
          </div>
          <div class="score">${estadoTxt}</div>
        </div>
      `;
    });

    html += `</div>`;
  });

  container.innerHTML = html;
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

  if (nombreCategoria.includes("+35") && cantidadEquipos >= 8) {
    html += `
      <div class="match"><div class="teams"><span>1°</span><span class="vs">vs</span><span>8°</span></div></div>
      <div class="match"><div class="teams"><span>4°</span><span class="vs">vs</span><span>5°</span></div></div>
      <div class="match"><div class="teams"><span>2°</span><span class="vs">vs</span><span>7°</span></div></div>
      <div class="match"><div class="teams"><span>3°</span><span class="vs">vs</span><span>6°</span></div></div>
    `;
  }

  if (nombreCategoria.includes("+48") && cantidadEquipos >= 6) {
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

function renderPublicoCategoria(nombreCategoria) {
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];
  renderTablaSimple(nombreCategoria, partidos);
  renderFixturePublico(nombreCategoria);
  renderPlayoffsSimple(nombreCategoria, partidos);
}

function mostrarCargaPublico(nombreCategoria) {
  const tabla = $("publico-tabla-wrap");
  const fixture = $("publico-fixture");
  const playoffs = $("publico-playoffs");
  const mensaje = `<div class="empty">Cargando ${escapeHtml(nombreCategoria || "categoría")}...</div>`;

  if (tabla) tabla.innerHTML = mensaje;
  if (fixture) fixture.innerHTML = mensaje;
  if (playoffs) playoffs.innerHTML = "";
}

async function refrescarPublicoCategoria(nombreCategoria) {
  if (!nombreCategoria) return;

  const cargaId = ++estado.publicoCargaActual;
  mostrarCargaPublico(nombreCategoria);

  try {
    await cargarPartidosCategoria(nombreCategoria);

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
  const { incluirDocumentacion = true, actualizarPublico = true } = opciones;
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  if (categoria && incluirDocumentacion) {
    await cargarEquiposCategoria(categoria.id);
    await cargarDocumentosCategoria(categoria.id);
    await cargarJugadoresCategoria(categoria.id);
    await cargarDocumentosJugadoresCategoria(categoria.id);
  }

  await cargarPartidosCategoria(nombreCategoria);
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
      "apdb",
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
    "apdb",
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
  completarInputsAsociacion();
  registrarUso("resultado_corregido", {
    area: "asociacion",
    categoria,
    user: estado.usuarioAsociacion?.display_name || "Asociación",
    role: estado.usuarioAsociacion?.role || "asociacion"
  });

  setStatus(status, "Corrección guardada correctamente.", "ok");
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
  if (document.querySelector('.assoc-nav-btn.activo')?.dataset.asociacionPanel === "uso") {
    actualizarEstadisticasUso();
  }
  setStatus(status, accesoSupabase ? `Asociación habilitada para ${permisos[0].display_name}.` : "Asociación habilitada.", "ok");
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

async function inicializarAsociacion() {
  poblarSelectCategorias("asociacion-categoria", estado.categorias);

  const categoriaInicial = $("asociacion-categoria").value;
  if (categoriaInicial) {
    await refrescarCategoria(categoriaInicial, { actualizarPublico: false });
    poblarSelectPartidosAsociacion(categoriaInicial);
    renderDocumentacionAsociacion(categoriaInicial);
  }

  $("asociacion-categoria").addEventListener("change", async (e) => {
    const categoria = e.target.value;
    await refrescarCategoria(categoria, { actualizarPublico: false });
    poblarSelectPartidosAsociacion(categoria);
    renderDocumentacionAsociacion(categoria);
    setStatus($("asociacion-status"), "", "");
  });

  $("asociacion-partido").addEventListener("change", completarInputsAsociacion);
  $("asociacion-guardar").addEventListener("click", guardarResultadoAsociacion);
  $("documentacion-tabla").addEventListener("click", revisarDocumentoAsociacion);
  $("documentacion-tabla").addEventListener("click", verDocumentoAsociacion);
  $("documentacion-filtro-estado").addEventListener("change", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
  $("documentacion-filtro-vencimiento").addEventListener("change", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
  $("documentacion-buscar").addEventListener("input", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
  $("documentacion-exportar").addEventListener("click", exportarDocumentacionCsv);
  $("asociacion-desbloquear").addEventListener("click", desbloquearAsociacion);
  $("asociacion-clave").addEventListener("keydown", (event) => {
    if (event.key === "Enter") desbloquearAsociacion();
  });
  inicializarNavegacionAsociacion();
  aplicarBloqueoAsociacion();
 const plannerBtn = document.getElementById("planner-generar");

if (plannerBtn) {
  plannerBtn.addEventListener("click", () => {
    const categoria = document.getElementById("planner-categoria").value;
    const competencia = document.getElementById("planner-competencia").value;
    const ruedas = Number(document.getElementById("planner-ruedas").value);
    const dia = document.getElementById("planner-dia").value;
    const fechaInicio = document.getElementById("planner-inicio").value;
const fechaFin = document.getElementById("planner-fin").value;
const fechasBloqueadasTexto = document.getElementById("planner-bloqueadas").value;
const status = document.getElementById("planner-status");
const partidos = estado.partidosPorCategoria[categoria] || [];
const equiposSet = new Set();

partidos.forEach((p) => {
  if (p.local) equiposSet.add(p.local);
  if (p.visitante) equiposSet.add(p.visitante);
  if (p.libre) equiposSet.add(p.libre);
});

const equipos = equiposSet.size;
const partidosJugados = partidos.filter(
  (p) => p.puntos_local != null && p.puntos_visitante != null
).length;
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

if (fechasBloqueadasTexto.trim()) {
  const fechasBloqueadas = fechasBloqueadasTexto
    .split(",")
    .map(f => f.trim())
    .filter(Boolean);

  bloqueadasCantidad = fechasBloqueadas.length;
}

if (fechaInicio) {
  const inicio = new Date(fechaInicio);

  const diasPorFecha = 7;
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


        status.innerHTML = `
      <div class="card" style="margin-top:10px;">
        <h3>Diagnóstico de torneo</h3>

        <p><strong>Categoría:</strong> ${categoria}</p>
        <p><strong>Competencia:</strong> ${competencia}</p>
        <p><strong>Equipos:</strong> ${equipos}</p>
        <p><strong>Jornadas cargadas:</strong> ${jornadasReales}</p>
        <p><strong>Partidos cargados:</strong> ${partidos.length}</p>
        <p><strong>Partidos jugados:</strong> ${partidosJugados}</p>
        <p><strong>Partidos pendientes:</strong> ${partidosPendientes}</p>
        <p><strong>Ruedas:</strong> ${ruedas}</p>
        <p><strong>Día:</strong> ${dia === "0" ? "Domingo" : "Miércoles"}</p>
        <p><strong>Jornadas necesarias:</strong> ${jornadasTotales}</p>
        <p><strong>Fecha final estimada:</strong> ${fechaFinalEstimada}</p>
        <p><strong>Fechas bloqueadas:</strong> ${bloqueadasCantidad}</p>
        <p><strong>Entra en calendario:</strong> ${entraEnCalendario}</p>
        <p><strong>Semanas disponibles:</strong> ${semanasDisponibles}</p>
        <p><strong>Margen calendario:</strong> ${margenCalendario}</p>
        <p><strong>Libre por fecha:</strong> ${tieneLibre ? "Sí" : "No"}</p>
      </div>
    `;
  });
  
}
}

async function inicializar() {
  try {
    $("tab-publico").addEventListener("click", () => {
      mostrarVista("publico");
      registrarUso("vista_publico", { area: "publico", categoria: $("publico-categoria")?.value || null });
    });
    $("tab-delegados").addEventListener("click", () => {
      mostrarVista("delegados");
      registrarUso("vista_delegados", { area: "delegados" });
    });
    $("tab-asociacion").addEventListener("click", () => {
      mostrarVista("asociacion");
      registrarUso("vista_asociacion", { area: "asociacion" });
    });

    const categorias = await cargarCategorias();
    await cargarRequisitosDocumentales();
    registrarUso("app_abierta", { area: "inicio" });

    if (!categorias.length) {
      throw new Error("No se encontraron categorías cargadas en Supabase.");
    }

    poblarSelectCategorias("publico-categoria", categorias);
    poblarSelectCategorias("delegado-categoria", categorias);

    $("publico-categoria").addEventListener("change", (e) => {
      refrescarPublicoCategoria(e.target.value);
    });

    const categoriaInicial = $("publico-categoria")?.value || categorias[0].nombre;

    await refrescarPublicoCategoria(categoriaInicial);
    await refrescarCategoria(categoriaInicial, { actualizarPublico: false });
    $("delegado-categoria").value = categoriaInicial;
    poblarSelectPartidosDelegado(categoriaInicial);
    aplicarBloqueoDelegado();
    renderDocumentacionDelegado();

    await inicializarAsociacion();

    $("delegado-categoria").addEventListener("change", async (e) => {
      const categoria = e.target.value;
      $("publico-categoria").value = categoria;
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
      if (event.target.closest("#jugador-agregar")) agregarJugadorDelegado();
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
