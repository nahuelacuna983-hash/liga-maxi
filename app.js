// ===== CONFIG =====
const ADMIN_PASSWORD = "admin123";
const STORAGE_KEY = "ligaMaxiTorneos";
const STORAGE_VERSION = 1;

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

let fixturesPorCategoria = {};

function crearTorneoBase(cat) {
  const equipos = categorias[cat];
  const rondas = generarRondasPorFormato(equipos, "apertura");
  const fechas = asignarFechasARondas(rondas, []);

  return {
    meta: {
      categoria: cat,
      equipos: equipos.length,
      formato: "apertura",
      playoffs: "no",
      clasificados: cat === "Maxi +48" ? 6 : 4,
      diaJuego: 0,
      estado: "borrador",
      inicio: "",
      fin: "",
      frecuencia: 1,
      bloqueadas: [],
      jornadasBase: rondas.length,
      detallePlayoff: { cuartos: 0, reclasificacion: 0, semifinales: 0, final: 0, total: 0 },
      jornadasTotales: rondas.length,
      seriesPlayoff: { cuartos: 1, reclasificacion: 1, semifinales: 1, final: 3 },
      calendarioPlayoff: { cuartos: [], reclasificacion: [], semifinales: [], final: [] }
    },
    fechas
    
  };
}

function crearEstadoInicial() {
  const base = {};

  Object.keys(categorias).forEach((cat) => {
    base[cat] = crearTorneoBase(cat);
  });

  return base;
}

function mergeProfundo(base, extra) {
  if (Array.isArray(base) || Array.isArray(extra)) {
    return extra ?? base;
  }

  if (
    base &&
    typeof base === "object" &&
    extra &&
    typeof extra === "object"
  ) {
    const out = { ...base };
    Object.keys(extra).forEach((key) => {
      if (key in base) {
        out[key] = mergeProfundo(base[key], extra[key]);
      } else {
        out[key] = extra[key];
      }
    });
    return out;
  }

  return extra ?? base;
}

function normalizarTorneo(cat, torneo) {
  const base = crearTorneoBase(cat);

  if (!torneo || typeof torneo !== "object") {
    return base;
  }

  const normalizado = mergeProfundo(base, torneo);

  if (!Array.isArray(normalizado.fechas)) {
    normalizado.fechas = base.fechas;
  }

  normalizado.fechas = normalizado.fechas.map((fecha, index) => ({
    numero: Number.isFinite(Number(fecha?.numero)) ? Number(fecha.numero) : index + 1,
    fechaISO: fecha?.fechaISO ?? null,
    label: fecha?.label ?? `Fecha ${index + 1}`,
    equipoLibre: fecha?.equipoLibre ?? null,
    bloqueada: Boolean(fecha?.bloqueada),
    partidos: Array.isArray(fecha?.partidos)
      ? fecha.partidos.map((p) => ({
          local: p?.local ?? "A definir",
          visitante: p?.visitante ?? "A definir",
          pl: p?.pl ?? null,
          pv: p?.pv ?? null,
          fechaNumero: Number.isFinite(Number(p?.fechaNumero)) ? Number(p.fechaNumero) : index + 1,
          fechaISO: p?.fechaISO ?? fecha?.fechaISO ?? null
        }))
      : []
  }));

  return normalizado;
}

function guardarEnStorage() {
  try {
    const payload = {
      version: STORAGE_VERSION,
      actualizadoEn: new Date().toISOString(),
      torneos: fixturesPorCategoria
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("No se pudo guardar en localStorage:", error);
  }
}

function cargarDesdeStorage() {
  const base = crearEstadoInicial();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      fixturesPorCategoria = base;
      guardarEnStorage();
      return;
    }

    const parsed = JSON.parse(raw);
    const guardado = parsed?.torneos;

    if (!guardado || typeof guardado !== "object") {
      fixturesPorCategoria = base;
      guardarEnStorage();
      return;
    }

    const combinado = {};

    Object.keys(categorias).forEach((cat) => {
      combinado[cat] = normalizarTorneo(cat, guardado[cat]);
    });

    fixturesPorCategoria = combinado;
  } catch (error) {
    console.error("No se pudo leer localStorage, se recrea el estado base:", error);
    fixturesPorCategoria = base;
    guardarEnStorage();
  }
}

function resetearStorageTorneos() {
  fixturesPorCategoria = crearEstadoInicial();
  guardarEnStorage();
}

document.addEventListener("DOMContentLoaded", () => {
  // ===== DOM =====
 const tabPublico = document.getElementById("tab-publico");
const tabDelegados = document.getElementById("tab-delegados");
const tabAsociacion = document.getElementById("tab-asociacion");

const vistaPublico = document.getElementById("vista-liga");
const vistaDelegados = document.getElementById("vista-delegados");
const vistaAsociacion = document.getElementById("vista-gestion");

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
  const bloquearCategoriaBtn = document.getElementById("bloquear-categoria-btn");
const desbloquearCategoriaBtn = document.getElementById("desbloquear-categoria-btn");
const estadoCategoriaBadge = document.getElementById("estado-categoria-badge");

    const delegadoCategoria = document.getElementById("delegado-categoria-select");
const delegadoPartidoSelect = document.getElementById("delegado-partido-select");
const delegadoPuntosLocal = document.getElementById("delegado-puntos-local");
const delegadoPuntosVisitante = document.getElementById("delegado-puntos-visitante");
const delegadoGuardarBtn = document.getElementById("delegado-guardar-resultado");
const delegadoSinFixtureMsg = document.getElementById("delegado-sin-fixture-msg");

function sincronizarCategoriaEnVistas(cat) {
  if (categoriaSelect) categoriaSelect.value = cat;
  if (delegadoCategoria) delegadoCategoria.value = cat;
  if (plannerCategoria) plannerCategoria.value = cat;
}

function cargarPartidosDelegado() {
  const cat = delegadoCategoria.value;
  const partidos = obtenerPartidosPlanos(cat);

  delegadoPartidoSelect.innerHTML = "";

  if (!partidos || partidos.length === 0) {
    delegadoPartidoSelect.style.display = "none";
    delegadoGuardarBtn.disabled = true;
    delegadoPuntosLocal.disabled = true;
    delegadoPuntosVisitante.disabled = true;
    if (delegadoSinFixtureMsg) delegadoSinFixtureMsg.style.display = "block";
    return;
  }

  delegadoPartidoSelect.style.display = "";
  delegadoGuardarBtn.disabled = false;
  delegadoPuntosLocal.disabled = false;
  delegadoPuntosVisitante.disabled = false;
  if (delegadoSinFixtureMsg) delegadoSinFixtureMsg.style.display = "none";

  partidos.forEach((p, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Fecha ${p.fechaNumero} - ${p.local} vs ${p.visitante}`;
    delegadoPartidoSelect.appendChild(option);
  });
}

delegadoCategoria.onchange = () => {
  sincronizarCategoriaEnVistas(delegadoCategoria.value);
  cargarPartidosDelegado();
  render();
};

delegadoGuardarBtn.onclick = () => {
  const cat = delegadoCategoria.value;
  const index = Number(delegadoPartidoSelect.value);
  const partidos = obtenerPartidosPlanos(cat);
  const partido = partidos[index];

  if (!partido) return;

  partido.pl = delegadoPuntosLocal.value === "" ? null : Number(delegadoPuntosLocal.value);
  partido.pv = delegadoPuntosVisitante.value === "" ? null : Number(delegadoPuntosVisitante.value);

  guardarEnStorage();

  delegadoPuntosLocal.value = "";
  delegadoPuntosVisitante.value = "";

  sincronizarCategoriaEnVistas(cat);
  cargarPartidosDelegado();
  render();
};
  // ===== BOTON IMPRIMIR =====
  let imprimirFixtureBtn = document.getElementById("imprimir-fixture-btn");
  if (!imprimirFixtureBtn && fixtureBody) {
    imprimirFixtureBtn = document.createElement("button");
    imprimirFixtureBtn.id = "imprimir-fixture-btn";
    imprimirFixtureBtn.type = "button";
    imprimirFixtureBtn.textContent = "Imprimir fixture";
    imprimirFixtureBtn.style.margin = "10px 0 14px 0";
    imprimirFixtureBtn.style.padding = "10px 16px";
    imprimirFixtureBtn.style.border = "none";
    imprimirFixtureBtn.style.borderRadius = "10px";
    imprimirFixtureBtn.style.background = "#2453d4";
    imprimirFixtureBtn.style.color = "#fff";
    imprimirFixtureBtn.style.fontWeight = "700";
    imprimirFixtureBtn.style.cursor = "pointer";
    fixtureBody.parentNode.insertBefore(imprimirFixtureBtn, fixtureBody);
  }

  // ===== ESTILOS INYECTADOS =====
  function inyectarEstilosInternos() {
    if (document.getElementById("liga-maxi-inline-styles")) return;

    const style = document.createElement("style");
    style.id = "liga-maxi-inline-styles";
    style.textContent = `
      .playoff-config-box {
        margin-top: 14px;
        padding: 14px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 10px;
        background: rgba(255,255,255,0.04);
      }

      .playoff-config-box h4 {
        margin: 0 0 12px 0;
      }

      .playoff-config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .playoff-config-grid label {
        display: block;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .playoff-config-grid select {
        width: 100%;
      }

      .fixture-tabla-wrap {
        width: 100%;
        overflow-x: auto;
        margin-top: 12px;
      }

      .fixture-tabla-pro {
        width: 100%;
        border-collapse: separate;
        border-spacing: 8px 10px;
        min-width: 900px;
      }

      .fixture-fecha-col {
        min-width: 150px;
        background: linear-gradient(180deg, #1b4f8a, #0e2a57);
        color: white;
        border-radius: 10px;
        padding: 14px 12px;
        text-align: center;
        vertical-align: middle;
      }

      .fixture-fecha-titulo {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.5px;
      }

      .fixture-fecha-subtitulo {
        font-size: 18px;
        font-weight: 700;
        margin-top: 6px;
      }

      .fixture-partido-col,
      .fixture-libre-col {
        min-width: 185px;
        vertical-align: top;
      }

      .fixture-partido-card {
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px;
        padding: 10px 8px;
        min-height: 118px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .fixture-equipo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 13px;
        line-height: 1.2;
      }

      .escudo-equipo {
        width: 28px;
        height: 28px;
        object-fit: contain;
        flex: 0 0 28px;
      }

      .fixture-vs {
        text-align: center;
        font-size: 12px;
        font-weight: 800;
        opacity: 0.8;
        margin: 6px 0;
      }

      .fixture-resultado-mini {
        text-align: center;
        font-weight: 800;
        font-size: 14px;
        margin-top: 8px;
      }

      .fixture-libre-card {
        background: linear-gradient(180deg, #6f8397, #4f6274);
        color: white;
        border-radius: 10px;
        min-height: 118px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 10px;
        text-align: center;
      }

      .fixture-libre-titulo {
        font-size: 20px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      .fixture-libre-equipo {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
      }

      .fixture-libre-equipo .escudo-equipo {
        width: 30px;
        height: 30px;
        object-fit: contain;
      }

      .fixture-partido-col.vacio {
        background: transparent;
      }

      .playoff-bracket-dibujo {
        margin-top: 16px;
        overflow-x: auto;
      }

      .playoff-bracket-dibujo h4 {
        margin: 0 0 14px 0;
        font-size: 20px;
        font-weight: 800;
      }

      .playoff-bracket-scroll {
        min-width: 880px;
        padding: 8px 0 16px 0;
      }

      .playoff-grid {
        display: grid;
        grid-template-columns: 240px 90px 240px 90px 240px;
        align-items: center;
      }

      .playoff-stage-title {
        background: linear-gradient(180deg, #1b4f8a, #0e2a57);
        color: white;
        border-radius: 10px;
        padding: 10px 12px;
        font-weight: 800;
        text-align: center;
        margin-bottom: 12px;
      }

      .playoff-stage {
        display: flex;
        flex-direction: column;
      }

      .playoff-stage.top6-recla .playoff-stage-list,
      .playoff-stage.top8-cuartos .playoff-stage-list,
      .playoff-stage.top4-semis .playoff-stage-list {
        display: grid;
        gap: 24px;
      }

      .playoff-stage.top6-semis .playoff-stage-list,
      .playoff-stage.top8-semis .playoff-stage-list {
        display: grid;
        gap: 84px;
        padding-top: 48px;
      }

      .playoff-stage.final-stage .playoff-stage-list {
        display: grid;
        gap: 0;
        padding-top: 118px;
      }

      .playoff-match-card {
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 10px;
        overflow: hidden;
      }

      .playoff-match-label {
        font-size: 12px;
        font-weight: 900;
        opacity: 0.75;
        padding: 8px 10px 0 10px;
      }

      .playoff-match-fechas {
        font-size: 11px;
        opacity: 0.75;
        padding: 2px 10px 8px 10px;
      }

      .playoff-team-box {
        padding: 10px 12px;
        font-weight: 700;
        min-height: 40px;
        display: flex;
        align-items: center;
      }

      .playoff-team-box + .playoff-team-box {
        border-top: 1px solid rgba(255,255,255,0.1);
      }

      .playoff-connector {
        position: relative;
        height: 100%;
      }

      .playoff-connector.tall::before,
      .playoff-connector.tall::after {
        content: "";
        position: absolute;
        background: rgba(255,255,255,0.65);
      }

      .playoff-connector.tall::before {
        left: 0;
        top: 50%;
        width: 46px;
        height: 2px;
        transform: translateY(-1px);
      }

      .playoff-connector.tall::after {
        right: 0;
        top: 50%;
        width: 44px;
        height: 2px;
        transform: translateY(-1px);
      }

      .playoff-connector.tall .line-vertical {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        width: 2px;
        background: rgba(255,255,255,0.65);
        top: 12%;
        height: 76%;
      }

      .playoff-connector.empty::before,
      .playoff-connector.empty::after,
      .playoff-connector.empty .line-vertical {
        display: none;
      }

      .playoff-note {
        margin-top: 10px;
        font-size: 13px;
        opacity: 0.85;
      }

      .playoff-simple-box {
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 10px;
        padding: 12px;
      }
    `;
    document.head.appendChild(style);
  }
  inyectarEstilosInternos();

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

  function parseFechaArgentinaATecnica(texto) {
    const limpio = String(texto || "").trim();
    if (!limpio) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) {
      return limpio;
    }

    const m = limpio.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;

    const dia = Number(m[1]);
    const mes = Number(m[2]);
    const anio = Number(m[3]);

    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || anio < 2000) return null;

    return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  function formatFechaCortaArgentina(iso) {
    if (!iso) return "Sin fecha";
    const d = parseISODate(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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

  function normalizarBloqueadas(textoBloqueadas) {
    return String(textoBloqueadas || "")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean)
      .map(parseFechaArgentinaATecnica)
      .filter(Boolean);
  }

  function obtenerFechasCalendarioConBloqueadas(inicioISO, finISO, diaSemana, frecuencia, bloqueadas) {
    if (!inicioISO || !finISO) return [];

    const inicio = moverAlDiaSemana(parseISODate(inicioISO), diaSemana);
    const fin = parseISODate(finISO);
    const bloqueadasSet = new Set(bloqueadas);

    const calendario = [];
    const cursor = new Date(inicio.getTime());

    while (cursor <= fin) {
      const iso = formatISO(cursor);
      calendario.push({
        fechaISO: iso,
        bloqueada: bloqueadasSet.has(iso)
      });
      cursor.setDate(cursor.getDate() + (7 * frecuencia));
    }

    return calendario;
  }

  function obtenerFechasDisponibles(inicioISO, finISO, diaSemana, frecuencia, bloqueadas) {
    return obtenerFechasCalendarioConBloqueadas(inicioISO, finISO, diaSemana, frecuencia, bloqueadas)
      .filter((f) => !f.bloqueada)
      .map((f) => f.fechaISO);
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

  // ===== HELPERS UI =====
 function mostrarPublico() {
  vistaPublico.style.display = "block";
  vistaDelegados.style.display = "none";
  vistaAsociacion.style.display = "none";

  tabPublico.classList.add("activo");
  tabDelegados.classList.remove("activo");
  tabAsociacion.classList.remove("activo");
}

function mostrarDelegados() {
  vistaPublico.style.display = "none";
  vistaDelegados.style.display = "block";
  vistaAsociacion.style.display = "none";

  tabPublico.classList.remove("activo");
  tabDelegados.classList.add("activo");
  tabAsociacion.classList.remove("activo");

  sincronizarCategoriaEnVistas(categoriaSelect.value);
  cargarPartidosDelegado();
}

function mostrarAsociacion() {
  vistaPublico.style.display = "none";
  vistaDelegados.style.display = "none";
  vistaAsociacion.style.display = "block";

  tabPublico.classList.remove("activo");
  tabDelegados.classList.remove("activo");
  tabAsociacion.classList.add("activo");
}
  

  // ===== CONFIG PLAYOFFS DINAMICA =====
  function asegurarUIPlayoffConfig() {
    if (document.getElementById("playoff-config-box")) return;

    const box = document.createElement("div");
    box.id = "playoff-config-box";
    box.className = "playoff-config-box";
    box.innerHTML = `
      <h4>Series de playoffs</h4>
      <div class="playoff-config-grid">
        <div id="bloque-reclasificacion">
          <label for="series-reclasificacion">Reclasificación</label>
          <select id="series-reclasificacion">
            <option value="1">1 partido</option>
            <option value="2">2 partidos</option>
            <option value="3">3 partidos</option>
          </select>
        </div>

        <div id="bloque-cuartos">
          <label for="series-cuartos">Cuartos</label>
          <select id="series-cuartos">
            <option value="1">1 partido</option>
            <option value="2">2 partidos</option>
            <option value="3">3 partidos</option>
          </select>
        </div>

        <div id="bloque-semis">
          <label for="series-semis">Semifinales</label>
          <select id="series-semis">
            <option value="1">1 partido</option>
            <option value="2">2 partidos</option>
            <option value="3">3 partidos</option>
          </select>
        </div>

        <div id="bloque-final">
          <label for="series-final">Final</label>
          <select id="series-final">
            <option value="1">1 partido</option>
            <option value="2">2 partidos</option>
            <option value="3" selected>3 partidos</option>
          </select>
        </div>
      </div>
    `;

    const playoffConfigAnchor = document.getElementById("playoff-config-anchor");
playoffConfigAnchor.parentNode.insertBefore(box, playoffConfigAnchor.nextSibling);
  }
  asegurarUIPlayoffConfig();

  const seriesReclasificacion = document.getElementById("series-reclasificacion");
  const seriesCuartos = document.getElementById("series-cuartos");
  const seriesSemis = document.getElementById("series-semis");
  const seriesFinal = document.getElementById("series-final");
  const bloqueReclasificacion = document.getElementById("bloque-reclasificacion");
  const bloqueCuartos = document.getElementById("bloque-cuartos");
  const bloqueSemis = document.getElementById("bloque-semis");
  const bloqueFinal = document.getElementById("bloque-final");

  function actualizarVisibilidadSeries() {
    const playoffsActivos = plannerPlayoffs.value === "si";
    const clasificados = Number(plannerClasificados.value);

    document.getElementById("playoff-config-box").style.display = playoffsActivos ? "block" : "none";

    bloqueReclasificacion.style.display = playoffsActivos && clasificados === 6 ? "block" : "none";
    bloqueCuartos.style.display = playoffsActivos && clasificados === 8 ? "block" : "none";
    bloqueSemis.style.display = playoffsActivos && (clasificados === 4 || clasificados === 6 || clasificados === 8) ? "block" : "none";
    bloqueFinal.style.display = playoffsActivos ? "block" : "none";
  }
  actualizarVisibilidadSeries();

  function leerSeriesPlayoff() {
    return {
      reclasificacion: Number(seriesReclasificacion.value),
      cuartos: Number(seriesCuartos.value),
      semifinales: Number(seriesSemis.value),
      final: Number(seriesFinal.value)
    };
  }

  function textoSeries(n) {
    return `${n} ${n === 1 ? "partido" : "partidos"}`;
  }

  // ===== EQUIPOS =====
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

  // ===== FIXTURE REGULAR =====
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
      let equipoLibre = null;

      for (let i = 0; i < n / 2; i++) {
        const a = rotacion[i];
        const b = rotacion[n - 1 - i];

        if (a === "LIBRE" && b !== "LIBRE") {
          equipoLibre = b;
          continue;
        }

        if (b === "LIBRE" && a !== "LIBRE") {
          equipoLibre = a;
          continue;
        }

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

      rondas.push({
        partidos,
        equipoLibre
      });

      const fijo = rotacion[0];
      const resto = rotacion.slice(1);
      resto.unshift(resto.pop());
      rotacion = [fijo, ...resto];
    }

    return rondas;
  }

  function invertirRonda(ronda) {
    return {
      partidos: ronda.partidos.map((p) => ({
        local: p.visitante,
        visitante: p.local,
        pl: null,
        pv: null
      })),
      equipoLibre: ronda.equipoLibre || null
    };
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
        {
          partidos: [
            {
              local: "A definir",
              visitante: "A definir",
              pl: null,
              pv: null
            }
          ],
          equipoLibre: null
        }
      ];
    }

    return ida;
  }

  function asignarFechasARondas(rondas, calendarioCompleto) {
    const fechasConEstado = [];
    let indiceRonda = 0;

    calendarioCompleto.forEach((slot) => {
      if (slot.bloqueada) {
        fechasConEstado.push({
          numero: fechasConEstado.length + 1,
          fechaISO: slot.fechaISO,
          label: `${formatFechaLarga(slot.fechaISO)} - BLOQUEADA / DESCANSO`,
          equipoLibre: null,
          bloqueada: true,
          partidos: []
        });
      } else {
        const ronda = rondas[indiceRonda];
        if (!ronda) return;

        fechasConEstado.push({
          numero: fechasConEstado.length + 1,
          fechaISO: slot.fechaISO,
          label: formatFechaLarga(slot.fechaISO),
          equipoLibre: ronda.equipoLibre || null,
          bloqueada: false,
          partidos: ronda.partidos.map((p) => ({
            ...p,
            fechaNumero: fechasConEstado.length + 1,
            fechaISO: slot.fechaISO
          }))
        });

        indiceRonda += 1;
      }
    });

    while (indiceRonda < rondas.length) {
      const ronda = rondas[indiceRonda];
      fechasConEstado.push({
        numero: fechasConEstado.length + 1,
        fechaISO: null,
        label: `Fecha ${fechasConEstado.length + 1} sin programar`,
        equipoLibre: ronda.equipoLibre || null,
        bloqueada: false,
        partidos: ronda.partidos.map((p) => ({
          ...p,
          fechaNumero: fechasConEstado.length + 1,
          fechaISO: null
        }))
      });
      indiceRonda += 1;
    }

    return fechasConEstado;
  }

  // ===== PLAYOFFS =====
  function contarJornadasBase(cantidadEquipos, formato) {
    if (formato === "eliminacion") {
      return Math.max(1, Math.ceil(Math.log2(cantidadEquipos)));
    }

    const porRueda = cantidadEquipos % 2 === 0 ? cantidadEquipos - 1 : cantidadEquipos;
    return formato === "anual" ? porRueda * 2 : porRueda;
  }

  function contarJornadasPlayoffDetalladas(clasificados, series) {
    if (clasificados === 4) {
      return {
        cuartos: 0,
        reclasificacion: 0,
        semifinales: series.semifinales,
        final: series.final,
        total: series.semifinales + series.final
      };
    }

    if (clasificados === 6) {
      return {
        cuartos: 0,
        reclasificacion: series.reclasificacion,
        semifinales: series.semifinales,
        final: series.final,
        total: series.reclasificacion + series.semifinales + series.final
      };
    }

    if (clasificados === 8) {
      return {
        cuartos: series.cuartos,
        reclasificacion: 0,
        semifinales: series.semifinales,
        final: series.final,
        total: series.cuartos + series.semifinales + series.final
      };
    }

    return {
      cuartos: 0,
      reclasificacion: 0,
      semifinales: series.semifinales,
      final: series.final,
      total: series.semifinales + series.final
    };
  }

  function cortarFechasPlayoff(fechasDisponibles, jornadasBase, detalle) {
    let cursor = jornadasBase;

    const tomar = (cantidad) => {
      const bloque = fechasDisponibles.slice(cursor, cursor + cantidad);
      cursor += cantidad;
      return bloque;
    };

    return {
      cuartos: tomar(detalle.cuartos),
      reclasificacion: tomar(detalle.reclasificacion),
      semifinales: tomar(detalle.semifinales),
      final: tomar(detalle.final)
    };
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

    const fechasSemanales = obtenerFechasDisponibles(inicio, fin, diaJuego, 1, bloqueadas);

    if (frecuencia === 2 && fechasSemanales.length >= jornadasNecesarias) {
      sugerencias.push("Sugerencia: jugando todas las semanas, el torneo sí entra en el rango.");
    }

    const diaAlternativo = diaJuego === 0 ? 3 : 0;
    const fechasAlternativas = obtenerFechasDisponibles(inicio, fin, diaAlternativo, frecuencia, bloqueadas);

    if (fechasAlternativas.length >= jornadasNecesarias) {
      sugerencias.push(`Sugerencia: cambiando el día de juego a ${nombresDias[diaAlternativo]}, el torneo sí entra.`);
    }

    const fechaFinSugerida = calcularFechaFinSugerida(inicio, diaJuego, frecuencia, jornadasNecesarias, bloqueadas);

    if (fechaFinSugerida) {
      sugerencias.push(`Sugerencia: manteniendo este formato, necesitás llegar al menos hasta ${formatFechaBonita(fechaFinSugerida)}.`);
    }

    if (!sugerencias.length && fechasDisponiblesActuales < jornadasNecesarias) {
      sugerencias.push("No entra con la configuración actual. Hay que ampliar el rango, cambiar frecuencia o reducir etapas.");
    }

    return sugerencias;
  }

  function leerPlanner() {
    return {
      categoria: plannerCategoria.value,
      equipos: Number(plannerEquipos.value),
      formato: plannerFormato.value,
      playoffs: plannerPlayoffs.value,
      clasificados: Number(plannerClasificados.value),
      diaJuego: Number(plannerDiaJuego.value),
      inicio: plannerInicio.value,
      fin: plannerFin.value,
      frecuencia: Number(plannerFrecuencia.value),
      bloqueadas: normalizarBloqueadas(plannerBloqueadas.value),
      series: leerSeriesPlayoff()
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
    const detallePlayoff = data.playoffs === "si"
      ? contarJornadasPlayoffDetalladas(data.clasificados, data.series)
      : { cuartos: 0, reclasificacion: 0, semifinales: 0, final: 0, total: 0 };

    const jornadasTotales = jornadasBase + detallePlayoff.total;

    const calendarioCompleto = obtenerFechasCalendarioConBloqueadas(
      data.inicio,
      data.fin,
      data.diaJuego,
      data.frecuencia,
      data.bloqueadas
    );

    const fechasDisponibles = calendarioCompleto
      .filter((f) => !f.bloqueada)
      .map((f) => f.fechaISO);

    const entra = fechasDisponibles.length >= jornadasTotales;

    const calendarioPlayoff = cortarFechasPlayoff(fechasDisponibles, jornadasBase, detallePlayoff);

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
      <p><strong>Fechas playoffs:</strong> ${detallePlayoff.total}</p>
      <p><strong>Total de jornadas necesarias:</strong> ${jornadasTotales}</p>
      <p><strong>Fechas del calendario:</strong> ${calendarioCompleto.length}</p>
      <p><strong>Fechas bloqueadas:</strong> ${calendarioCompleto.filter(f => f.bloqueada).length}</p>
      <p><strong>Fechas disponibles para jugar:</strong> ${fechasDisponibles.length}</p>
      <p><strong>Estado:</strong> ${entra ? "Entra en el rango elegido." : "No entra en el rango elegido."}</p>
    `;

    if (entra) {
      const lineas = [];

      lineas.push(`<p><strong>Fase regular:</strong> ${jornadasBase} fechas</p>`);

      if (data.playoffs === "si") {
        if (detallePlayoff.cuartos) {
          lineas.push(`<p><strong>Cuartos:</strong> ${textoSeries(detallePlayoff.cuartos)} — ${calendarioPlayoff.cuartos.map(formatFechaBonita).join(" / ")}</p>`);
        }
        if (detallePlayoff.reclasificacion) {
          lineas.push(`<p><strong>Reclasificación:</strong> ${textoSeries(detallePlayoff.reclasificacion)} — ${calendarioPlayoff.reclasificacion.map(formatFechaBonita).join(" / ")}</p>`);
        }
        if (detallePlayoff.semifinales) {
          lineas.push(`<p><strong>Semifinales:</strong> ${textoSeries(detallePlayoff.semifinales)} — ${calendarioPlayoff.semifinales.map(formatFechaBonita).join(" / ")}</p>`);
        }
        if (detallePlayoff.final) {
          lineas.push(`<p><strong>Final:</strong> ${textoSeries(detallePlayoff.final)} — ${calendarioPlayoff.final.map(formatFechaBonita).join(" / ")}</p>`);
        }
      }

      plannerComparacion.innerHTML = `
        <h4>Calendario generado</h4>
        ${lineas.join("")}
      `;
    } else {
      plannerComparacion.innerHTML = `
        <h4>Sugerencias de ajuste</h4>
        ${sugerencias.map((s) => `<p>${s}</p>`).join("")}
      `;
    }

    return {
      ...data,
      jornadasBase,
      detallePlayoff,
      jornadasTotales,
      calendarioCompleto,
      fechasDisponibles,
      calendarioPlayoff,
      entra
    };
  }

  function generarDesdePlanner() {
    if (categoriaEstaOficial(plannerCategoria.value)) {
  alert("La categoría está oficializada y no se puede regenerar el fixture.");
  return;
}
    const plan = calcularPlanificacion();
    if (!plan) return;

    const equipos = obtenerEquiposCategoria(plan.categoria, plan.equipos);
    const rondas = generarRondasPorFormato(equipos, plan.formato);

    const fixtureConFechas = asignarFechasARondas(rondas, plan.calendarioCompleto);

        fixturesPorCategoria[plan.categoria] = {
      meta: {
        categoria: plan.categoria,
        equipos: plan.equipos,
        formato: plan.formato,
        playoffs: plan.playoffs,
        clasificados: plan.clasificados,
        estado: fixturesPorCategoria[plan.categoria]?.meta?.estado || "borrador",
        diaJuego: plan.diaJuego,
        inicio: plan.inicio,
        fin: plan.fin,
        frecuencia: plan.frecuencia,
        bloqueadas: plan.bloqueadas,
        jornadasBase: plan.jornadasBase,
        detallePlayoff: plan.detallePlayoff,
        jornadasTotales: plan.jornadasTotales,
        seriesPlayoff: plan.series,
        calendarioPlayoff: plan.calendarioPlayoff
      },
      fechas: fixtureConFechas
    };

    guardarEnStorage();

    categoriaSelect.value = plan.categoria;
    plannerCategoria.value = plan.categoria;
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

  function renderTabla(cat) {
    const tabla = calcularTabla(cat);

    tablaBody.innerHTML = tabla.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.equipo}</td>
        <td>${e.pj}</td>
        <td>${e.pg}</td>
        <td>${e.pp}</td>
        <td>${e.pf}</td>
        <td>${e.pc}</td>
        <td>${e.dif}</td>
        <td>${e.pts}</td>
      </tr>
    `).join("");
  }

  // ===== ESCUDOS =====
  function slugEquipo(nombre) {
    return nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\./g, "")
      .replace(/\+/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  const escudosMap = {
    "HOGAR SOCIAL": "hogar-social",
    "SUD AMERICA": "sud-america",
    "UNION VECINAL": "union-vecinal",
    "VILLA SAN CARLOS": "villa-san-carlos",
    "U.N.L.P.": "unlp",
    "BANCO PROVINCIA": "banco-provincia",
    "TOLOSANO": "tolosano",
    "MAYO": "mayo",
    "UNIVERSAL": "universal",
    "MERIDIANO V": "meridiano-v",
    "UNIDOS": "unidos",
    "ESTRELLA": "estrella",
    "MAX NORDAU": "max-nordau",
    "RECONQUISTA": "reconquista",
    "GONNET": "gonnet",
    "VILLA ELISA": "villa-elisa",
    "JUVENTUD": "juventud",
    "MACABI": "macabi",
    "LOS HORNOS": "los-hornos",
    "ESTUDIANTES": "estudiantes",
    "PLATENSE": "platense",
    "MERIDIANO": "meridiano",
    "EDELP": "edelp",
    "C. F. GONNET": "cf-gonnet",
    "ASTILLERO": "astillero",
    "DEP. SAN VICENTE": "dep-san-vicente"
  };

  function nombreArchivoEscudo(nombre) {
    return escudosMap[nombre] || slugEquipo(nombre);
  }

  function imgEscudoHTML(nombre) {
    const archivo = nombreArchivoEscudo(nombre);
    return `
      <img
        src="escudos/${archivo}.png"
        alt="${nombre}"
        class="escudo-equipo"
        onerror="this.style.display='none'"
      >
    `;
  }

  // ===== FIXTURE RENDER =====
  function renderFixture(cat) {
    const data = fixturesPorCategoria[cat];

    if (!data || !data.fechas || !data.fechas.length) {
      fixtureBody.innerHTML = "<p>No hay fixture generado.</p>";
            return;
    }

    const maxPartidos = Math.max(...data.fechas.map((f) => f.partidos.length));
    const hayLibre = data.fechas.some((f) => !!f.equipoLibre);

    let html = `
      <div class="fixture-tabla-wrap">
        <table class="fixture-tabla-pro">
          <tbody>
    `;

    data.fechas.forEach((fechaObj) => {
      if (fechaObj.bloqueada) {
        html += `
          <tr>
            <td class="fixture-fecha-col">
              <div class="fixture-fecha-titulo">FECHA ${fechaObj.numero}</div>
              <div class="fixture-fecha-subtitulo">${fechaObj.fechaISO ? formatFechaCortaArgentina(fechaObj.fechaISO) : "Sin fecha"}</div>
            </td>

            <td class="fixture-partido-col" colspan="${Math.max(1, maxPartidos + (hayLibre ? 1 : 0))}">
              <div class="fixture-partido-card" style="min-height:118px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">
                BLOQUEADA / DESCANSO
              </div>
            </td>
          </tr>
        `;
        return;
      }

      html += `
        <tr>
          <td class="fixture-fecha-col">
            <div class="fixture-fecha-titulo">FECHA ${fechaObj.numero}</div>
            <div class="fixture-fecha-subtitulo">${fechaObj.fechaISO ? formatFechaCortaArgentina(fechaObj.fechaISO) : "Sin fecha"}</div>
          </td>
      `;

      fechaObj.partidos.forEach((p) => {
        html += `
          <td class="fixture-partido-col">
            <div class="fixture-partido-card">
              <div class="fixture-equipo">
                ${imgEscudoHTML(p.local)}
                <span>${p.local}</span>
              </div>

              <div class="fixture-vs">vs</div>

              <div class="fixture-equipo">
                ${imgEscudoHTML(p.visitante)}
                <span>${p.visitante}</span>
              </div>

              <div class="fixture-resultado-mini">
                ${p.pl ?? "-"} - ${p.pv ?? "-"}
              </div>
            </div>
          </td>
        `;
      });

      const celdasVacias = maxPartidos - fechaObj.partidos.length;
      for (let i = 0; i < celdasVacias; i++) {
        html += `<td class="fixture-partido-col vacio"></td>`;
      }

      if (hayLibre) {
        html += `
          <td class="fixture-libre-col">
            <div class="fixture-libre-card">
              <div class="fixture-libre-titulo">LIBRE</div>
              <div class="fixture-libre-equipo">
                ${fechaObj.equipoLibre ? imgEscudoHTML(fechaObj.equipoLibre) : ""}
                <span>${fechaObj.equipoLibre || "-"}</span>
              </div>
            </div>
          </td>
        `;
      }

      html += `</tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    fixtureBody.innerHTML = html;

      }

  // ===== PLAYOFF DATA / RENDER =====
  function construirPlayoffData(cat) {
    const data = fixturesPorCategoria[cat];
    const meta = data?.meta;
    if (!meta || meta.playoffs !== "si") return null;

    const tabla = calcularTabla(cat);
    const clasificados = tabla.slice(0, meta.clasificados).map((e, i) => ({
      seed: i + 1,
      equipo: e.equipo
    }));
    const fechas = meta.calendarioPlayoff || { cuartos: [], reclasificacion: [], semifinales: [], final: [] };

    if (meta.clasificados === 4) {
      return {
        tipo: "4",
        titulo: "Playoffs - Top 4",
        semifinales: [
          { etiqueta: "SF1", a: clasificados[0]?.equipo || "1°", b: clasificados[3]?.equipo || "4°", fechas: fechas.semifinales },
          { etiqueta: "SF2", a: clasificados[1]?.equipo || "2°", b: clasificados[2]?.equipo || "3°", fechas: fechas.semifinales }
        ],
        final: [
          { etiqueta: "FINAL", a: "Ganador SF1", b: "Ganador SF2", fechas: fechas.final }
        ]
      };
    }

    if (meta.clasificados === 6 && cat === "Maxi +48") {
      return {
        tipo: "6",
        titulo: "Playoffs Maxi +48 - Top 6",
        reclasificacion: [
          { etiqueta: "R1", a: clasificados[2]?.equipo || "3°", b: clasificados[5]?.equipo || "6°", fechas: fechas.reclasificacion },
          { etiqueta: "R2", a: clasificados[3]?.equipo || "4°", b: clasificados[4]?.equipo || "5°", fechas: fechas.reclasificacion }
        ],
        semifinales: [
          { etiqueta: "SF1", a: clasificados[0]?.equipo || "1°", b: "Ganador R2", fechas: fechas.semifinales },
          { etiqueta: "SF2", a: clasificados[1]?.equipo || "2°", b: "Ganador R1", fechas: fechas.semifinales }
        ],
        final: [
          { etiqueta: "FINAL", a: "Ganador SF1", b: "Ganador SF2", fechas: fechas.final }
        ]
      };
    }

    if (meta.clasificados === 6) {
      return {
        tipo: "6",
        titulo: "Playoffs - Top 6",
        reclasificacion: [
          { etiqueta: "R1", a: clasificados[2]?.equipo || "3°", b: clasificados[5]?.equipo || "6°", fechas: fechas.reclasificacion },
          { etiqueta: "R2", a: clasificados[3]?.equipo || "4°", b: clasificados[4]?.equipo || "5°", fechas: fechas.reclasificacion }
        ],
        semifinales: [
          { etiqueta: "SF1", a: clasificados[0]?.equipo || "1°", b: "Ganador R2", fechas: fechas.semifinales },
          { etiqueta: "SF2", a: clasificados[1]?.equipo || "2°", b: "Ganador R1", fechas: fechas.semifinales }
        ],
        final: [
          { etiqueta: "FINAL", a: "Ganador SF1", b: "Ganador SF2", fechas: fechas.final }
        ]
      };
    }

    if (meta.clasificados === 8) {
      return {
        tipo: "8",
        titulo: "Playoffs - Top 8",
        cuartos: [
          { etiqueta: "C1", a: clasificados[0]?.equipo || "1°", b: clasificados[7]?.equipo || "8°", fechas: fechas.cuartos },
          { etiqueta: "C2", a: clasificados[3]?.equipo || "4°", b: clasificados[4]?.equipo || "5°", fechas: fechas.cuartos },
          { etiqueta: "C3", a: clasificados[1]?.equipo || "2°", b: clasificados[6]?.equipo || "7°", fechas: fechas.cuartos },
          { etiqueta: "C4", a: clasificados[2]?.equipo || "3°", b: clasificados[5]?.equipo || "6°", fechas: fechas.cuartos }
        ],
        semifinales: [
          { etiqueta: "SF1", a: "Ganador C1", b: "Ganador C2", fechas: fechas.semifinales },
          { etiqueta: "SF2", a: "Ganador C3", b: "Ganador C4", fechas: fechas.semifinales }
        ],
        final: [
          { etiqueta: "FINAL", a: "Ganador SF1", b: "Ganador SF2", fechas: fechas.final }
        ]
      };
    }

    return {
      tipo: "simple",
      titulo: `Playoffs - Top ${meta.clasificados}`,
      partidos: [
        { etiqueta: "P1", a: "Por definir", b: "Por definir", fechas: [] }
      ]
    };
  }

  function fechasSerieTexto(fechas) {
    if (!fechas || !fechas.length) return "Sin fecha";
    return fechas.map((f, i) => `J${i + 1}: ${formatFechaCortaArgentina(f)}`).join(" · ");
  }

  function cardPlayoff(partido) {
    return `
      <div class="playoff-match-card">
        <div class="playoff-match-label">${partido.etiqueta}</div>
        <div class="playoff-match-fechas">${fechasSerieTexto(partido.fechas)}</div>
        <div class="playoff-team-box">${partido.a}</div>
        <div class="playoff-team-box">${partido.b}</div>
      </div>
    `;
  }

  function connectorHtml() {
    return `
      <div class="playoff-connector tall">
        <div class="line-vertical"></div>
      </div>
    `;
  }

  function renderPlayoffs(cat) {
    const data = fixturesPorCategoria[cat];
    const meta = data?.meta;

    if (!meta || meta.playoffs !== "si") {
      playoffBody.innerHTML = "<p>Sin playoffs configurados.</p>";
      return;
    }

    const playoffData = construirPlayoffData(cat);
    if (!playoffData) {
      playoffBody.innerHTML = "<p>Sin playoffs configurados.</p>";
      return;
    }

    if (playoffData.tipo === "4") {
      playoffBody.innerHTML = `
        <div class="playoff-bracket-dibujo">
          <h4>${playoffData.titulo}</h4>
          <div class="playoff-bracket-scroll">
            <div class="playoff-grid">
              <div class="playoff-stage top4-semis">
                <div class="playoff-stage-title">Semifinales</div>
                <div class="playoff-stage-list">
                  ${playoffData.semifinales.map(cardPlayoff).join("")}
                </div>
              </div>
              ${connectorHtml()}
              <div class="playoff-stage final-stage">
                <div class="playoff-stage-title">Final</div>
                <div class="playoff-stage-list">
                  ${playoffData.final.map(cardPlayoff).join("")}
                </div>
              </div>
              <div class="playoff-connector empty"><div class="line-vertical"></div></div>
              <div></div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (playoffData.tipo === "6") {
      playoffBody.innerHTML = `
        <div class="playoff-bracket-dibujo">
          <h4>${playoffData.titulo}</h4>
          <div class="playoff-bracket-scroll">
            <div class="playoff-grid">
              <div class="playoff-stage top6-recla">
                <div class="playoff-stage-title">Reclasificación</div>
                <div class="playoff-stage-list">
                  ${playoffData.reclasificacion.map(cardPlayoff).join("")}
                </div>
              </div>
              ${connectorHtml()}
              <div class="playoff-stage top6-semis">
                <div class="playoff-stage-title">Semifinales</div>
                <div class="playoff-stage-list">
                  ${playoffData.semifinales.map(cardPlayoff).join("")}
                </div>
              </div>
              ${connectorHtml()}
              <div class="playoff-stage final-stage">
                <div class="playoff-stage-title">Final</div>
                <div class="playoff-stage-list">
                  ${playoffData.final.map(cardPlayoff).join("")}
                </div>
              </div>
            </div>
          </div>
          <div class="playoff-note">1° y 2° avanzan directo a semifinales.</div>
        </div>
      `;
      return;
    }

    if (playoffData.tipo === "8") {
      playoffBody.innerHTML = `
        <div class="playoff-bracket-dibujo">
          <h4>${playoffData.titulo}</h4>
          <div class="playoff-bracket-scroll">
            <div class="playoff-grid">
              <div class="playoff-stage top8-cuartos">
                <div class="playoff-stage-title">Cuartos</div>
                <div class="playoff-stage-list">
                  ${playoffData.cuartos.map(cardPlayoff).join("")}
                </div>
              </div>
              ${connectorHtml()}
              <div class="playoff-stage top8-semis">
                <div class="playoff-stage-title">Semifinales</div>
                <div class="playoff-stage-list">
                  ${playoffData.semifinales.map(cardPlayoff).join("")}
                </div>
              </div>
              ${connectorHtml()}
              <div class="playoff-stage final-stage">
                <div class="playoff-stage-title">Final</div>
                <div class="playoff-stage-list">
                  ${playoffData.final.map(cardPlayoff).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    playoffBody.innerHTML = `
      <div class="playoff-bracket-dibujo">
        <h4>${playoffData.titulo}</h4>
        <div class="playoff-simple-box">
          ${playoffData.partidos.map(cardPlayoff).join("")}
        </div>
      </div>
    `;
  }

  // ===== PDF / IMPRESION =====
  function escapeHtml(texto) {
    return String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function construirTextoPlayoffsOficial(cat) {
    const data = fixturesPorCategoria[cat];
    const meta = data?.meta;
    if (!meta || meta.playoffs !== "si") {
      return "Sin playoffs";
    }

    const series = meta.seriesPlayoff || { cuartos: 1, reclasificacion: 1, semifinales: 1, final: 3 };
    const fechas = meta.calendarioPlayoff || { cuartos: [], reclasificacion: [], semifinales: [], final: [] };

    const linesFechas = [];
    if (fechas.cuartos?.length) fechas.cuartos.forEach((f, i) => linesFechas.push(`• Cuartos - Juego ${i + 1}: ${formatFechaBonita(f)}`));
    if (fechas.reclasificacion?.length) fechas.reclasificacion.forEach((f, i) => linesFechas.push(`• Reclasificación - Juego ${i + 1}: ${formatFechaBonita(f)}`));
    if (fechas.semifinales?.length) fechas.semifinales.forEach((f, i) => linesFechas.push(`• Semifinales - Juego ${i + 1}: ${formatFechaBonita(f)}`));
    if (fechas.final?.length) fechas.final.forEach((f, i) => linesFechas.push(`• Final - Juego ${i + 1}: ${formatFechaBonita(f)}`));
    if (meta.clasificados === 8) {
      return `Fechas de playoffs
${linesFechas.join("\n")}

Formato (Top 8)
• Los cruces se definirán según las posiciones finales de la fase regular

Cuartos de final
• 1° vs 8° (${textoSeries(series.cuartos)})
• 4° vs 5° (${textoSeries(series.cuartos)})
• 2° vs 7° (${textoSeries(series.cuartos)})
• 3° vs 6° (${textoSeries(series.cuartos)})

Semifinales
• Ganador 1°/8° vs Ganador 4°/5° (${textoSeries(series.semifinales)})
• Ganador 2°/7° vs Ganador 3°/6° (${textoSeries(series.semifinales)})

Final
• Ganador SF1 vs Ganador SF2 (${textoSeries(series.final)})`;
    }

    if (meta.clasificados === 6) {
      return `Fechas de playoffs
${linesFechas.join("\n")}

Formato (Top 6)
• 1° y 2° clasifican directamente a semifinales

Reclasificación
• Partido 1: 3° vs 6° (${textoSeries(series.reclasificacion)})
• Partido 2: 4° vs 5° (${textoSeries(series.reclasificacion)})

Semifinales
• SF1: 1° vs Ganador Partido 2 (${textoSeries(series.semifinales)})
• SF2: 2° vs Ganador Partido 1 (${textoSeries(series.semifinales)})

Final
• Ganador SF1 vs Ganador SF2 (${textoSeries(series.final)})`;
    }

        if (meta.clasificados === 4) {
      return `Fechas de playoffs
${linesFechas.join("\n")}

Formato (Top 4)
• Los cruces se definirán según las posiciones finales de la fase regular

Semifinales
• 1° vs 4° (${textoSeries(series.semifinales)})
• 2° vs 3° (${textoSeries(series.semifinales)})

Final
• Ganador SF1 vs Ganador SF2 (${textoSeries(series.final)})`;
    }

    return "Formato a definir";
  }

  function construirHTMLImprimible(cat) {
    const data = fixturesPorCategoria[cat];
    if (!data || !data.fechas || !data.fechas.length) {
      return `
        <html>
          <body>
            <h1>Sin fixture generado</h1>
          </body>
        </html>
      `;
    }

    const meta = data.meta || {};
    const bloqueadasTexto = (meta.bloqueadas || [])
      .map((f) => `• ${formatFechaBonita(f)}`)
      .join("<br>");

    const faseRegularHTML = data.fechas.map((fechaObj) => {
      if (fechaObj.bloqueada) {
        return `
          <div class="fecha-bloque">
            <div class="fecha-titulo">Fecha ${fechaObj.numero} - ${fechaObj.fechaISO ? formatFechaBonita(fechaObj.fechaISO) : "Sin fecha"}</div>
            <div class="fecha-bloqueada">• BLOQUEADA / DESCANSO</div>
          </div>
        `;
      }

      return `
        <div class="fecha-bloque">
          <div class="fecha-titulo">Fecha ${fechaObj.numero} - ${fechaObj.fechaISO ? formatFechaBonita(fechaObj.fechaISO) : "Sin fecha"}</div>
          <div class="fecha-lista">
            ${fechaObj.partidos.map((p) => `
              <div class="item">• ${escapeHtml(p.local)} vs ${escapeHtml(p.visitante)}</div>
            `).join("")}
            ${fechaObj.equipoLibre ? `<div class="item">• Libre: ${escapeHtml(fechaObj.equipoLibre)}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    const playoffsTexto = meta.playoffs === "si" ? construirTextoPlayoffsOficial(cat) : "Sin playoffs";

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Fixture ${escapeHtml(cat)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 28px;
            color: #111827;
            line-height: 1.45;
          }
          .titulo-principal {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 6px;
          }
          .subtitulo {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 18px;
          }
          .meta p {
            margin: 4px 0;
            font-size: 14px;
          }
          .seccion-titulo {
            margin-top: 24px;
            margin-bottom: 12px;
            font-size: 18px;
            font-weight: 800;
          }
          .fecha-bloque {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .fecha-titulo {
            font-weight: 700;
            margin-bottom: 6px;
            font-size: 14px;
          }
          .fecha-lista .item,
          .fecha-bloqueada,
          .playoffs-texto-linea {
            font-size: 14px;
            margin: 2px 0;
          }
          .playoffs-box {
            margin-top: 8px;
            page-break-inside: avoid;
          }
          @media print {
            body { margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="titulo-principal">LIGA MAXI BASQUET LA PLATA</div>
        <div class="subtitulo">Fixture oficial - ${escapeHtml(cat)}</div>

        <div class="meta">
          <p><strong>Competencia:</strong> ${escapeHtml(meta.formato ? String(meta.formato).charAt(0).toUpperCase() + String(meta.formato).slice(1) : "-")}</p>
          <p><strong>Ruedas:</strong> ${meta.formato === "anual" ? "2" : "1"}</p>
          <p><strong>Día de juego:</strong> ${nombresDias[meta.diaJuego ?? 0]}</p>
          <p><strong>Playoffs:</strong> ${meta.playoffs === "si" ? `Sí (Top ${escapeHtml(meta.clasificados)})` : "No"}</p>
          <p><strong>Fechas no jugables:</strong><br>${bloqueadasTexto || "Ninguna"}</p>
        </div>

        <div class="seccion-titulo">FASE REGULAR</div>
        ${faseRegularHTML}

        <div class="seccion-titulo">PLAYOFFS</div>
        <div class="playoffs-box">
          ${playoffsTexto.split("\n").map((linea) => `<div class="playoffs-texto-linea">${escapeHtml(linea)}</div>`).join("")}
        </div>
      </body>
      </html>
    `;
  }

  function imprimirFixtureActual() {
    const cat = categoriaSelect.value;
    const html = construirHTMLImprimible(cat);
    const ventana = window.open("", "_blank", "width=1100,height=800");

    if (!ventana) {
      alert("El navegador bloqueó la ventana emergente. Permití pop-ups para imprimir.");
      return;
    }

    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();

    ventana.focus();

    setTimeout(() => {
      ventana.print();
    }, 400);
  }

  // ===== RESULTADOS =====
   
  // ===== RENDER GENERAL =====
  function categoriaEstaOficial(cat) {
  return fixturesPorCategoria?.[cat]?.meta?.estado === "oficial";
}

function actualizarEstadoCategoriaUI() {
  const cat = plannerCategoria.value;
  const esOficial = categoriaEstaOficial(cat);

  estadoCategoriaBadge.textContent = esOficial ? "Estado: OFICIAL" : "Estado: BORRADOR";
  estadoCategoriaBadge.style.color = esOficial ? "#c62828" : "#2e7d32";

  bloquearCategoriaBtn.style.display = esOficial ? "none" : "inline-block";
  desbloquearCategoriaBtn.style.display = esOficial ? "inline-block" : "none";

  plannerEquipos.disabled = esOficial;
  plannerFormato.disabled = esOficial;
  plannerPlayoffs.disabled = esOficial;
  plannerClasificados.disabled = esOficial;
  plannerDiaJuego.disabled = esOficial;
  plannerInicio.disabled = esOficial;
  plannerFin.disabled = esOficial;
  plannerFrecuencia.disabled = esOficial;
  plannerBloqueadas.disabled = esOficial;
  plannerCalcular.disabled = esOficial;
  generarBtn.disabled = esOficial;

  if (seriesReclasificacion) seriesReclasificacion.disabled = esOficial;
  if (seriesCuartos) seriesCuartos.disabled = esOficial;
  if (seriesSemis) seriesSemis.disabled = esOficial;
  if (seriesFinal) seriesFinal.disabled = esOficial;
}

function bloquearCategoriaActual() {
  const cat = plannerCategoria.value;
  if (!fixturesPorCategoria[cat]) return;

  fixturesPorCategoria[cat].meta.estado = "oficial";
  guardarEnStorage();
  actualizarEstadoCategoriaUI();
  render();
}

function desbloquearCategoriaActual() {
  const cat = plannerCategoria.value;
  if (!fixturesPorCategoria[cat]) return;

  fixturesPorCategoria[cat].meta.estado = "borrador";
  guardarEnStorage();
  actualizarEstadoCategoriaUI();
  render();
}
  function render() {
  const cat = categoriaSelect.value;
  renderTabla(cat);
  renderFixture(cat);
  renderPlayoffs(cat);
  cargarPartidosDelegado();
}


  // ===== EVENTOS =====
  plannerPlayoffs.addEventListener("change", actualizarVisibilidadSeries);
  plannerClasificados.addEventListener("change", actualizarVisibilidadSeries);

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

  tabPublico.onclick = mostrarPublico;
tabDelegados.onclick = mostrarDelegados;
tabAsociacion.onclick = mostrarAsociacion;
bloquearCategoriaBtn.onclick = bloquearCategoriaActual;
desbloquearCategoriaBtn.onclick = desbloquearCategoriaActual;

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
  

  if (imprimirFixtureBtn) {
    imprimirFixtureBtn.onclick = imprimirFixtureActual;
  }

   // ===== INICIO =====
  cargarDesdeStorage();

plannerCategoria.value = categoriaSelect.value;
plannerEquipos.value = fixturesPorCategoria[categoriaSelect.value]?.meta?.equipos || categorias[categoriaSelect.value]?.length || 10;
actualizarVisibilidadSeries();
actualizarEstadoCategoriaUI();

// 🔥 ESTA LÍNEA FALTABA
sincronizarCategoriaEnVistas(categoriaSelect.value);
cargarPartidosDelegado();
categoriaSelect.onchange = () => {
  sincronizarCategoriaEnVistas(categoriaSelect.value);
  cargarPartidosDelegado();
  actualizarEstadoCategoriaUI();
  render();
};
render();
mostrarPublico();
});