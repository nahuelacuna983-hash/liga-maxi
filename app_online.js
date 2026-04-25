console.log("APP ONLINE NUEVA CARGADA");
const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estado = {
  categorias: [],
  partidosPorCategoria: {},
  delegadoDesbloqueado: false,
  delegado: null
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(element, text, kind = "") {
  if (!element) return;
  element.textContent = text || "";
  element.className = `status${kind ? " " + kind : ""}`;
}

function mostrarVista(nombre) {
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

function validarDelegado(clave) {
  const claveLimpia = String(clave || "").trim();
  return DELEGADOS[claveLimpia] || null;
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
            <td>${e.equipo}</td>
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
              <span>${p.local}</span>
              <span class="vs">vs</span>
              <span>${p.visitante}</span>
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

async function refrescarCategoria(nombreCategoria) {
  await cargarPartidosCategoria(nombreCategoria);
  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];

  renderTablaSimple(nombreCategoria, partidos);
  renderFixturePublico(nombreCategoria);
  renderPlayoffsSimple(nombreCategoria, partidos);
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

  await refrescarCategoria(categoria);
  poblarSelectPartidosDelegado(categoria);
  $("publico-categoria").value = categoria;

  setStatus(status, "Resultado guardado correctamente.", "ok");
}

function desbloquearDelegado() {
  const clave = $("delegado-clave").value.trim();
  const status = $("delegado-status");

  const delegado = validarDelegado(clave);

  if (!delegado) {
    estado.delegado = null;
    estado.delegadoDesbloqueado = false;
    aplicarBloqueoDelegado();
    setStatus(status, "Clave incorrecta.", "error");
    return;
  }

  estado.delegado = delegado;
  estado.delegadoDesbloqueado = true;
  aplicarBloqueoDelegado();

  poblarSelectCategorias(
    "delegado-categoria",
    estado.categorias.filter((cat) => delegado.categorias.includes(cat.nombre))
  );

  const primeraCategoria = $("delegado-categoria").value;
  if (primeraCategoria) {
    refrescarCategoria(primeraCategoria).then(() => {
      poblarSelectPartidosDelegado(primeraCategoria);
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

  await refrescarCategoria(categoria);
  poblarSelectPartidosAsociacion(categoria);
  completarInputsAsociacion();

  setStatus(status, "Corrección guardada correctamente.", "ok");
}

async function inicializarAsociacion() {
  poblarSelectCategorias("asociacion-categoria", estado.categorias);

  const categoriaInicial = $("asociacion-categoria").value;
  if (categoriaInicial) {
    await refrescarCategoria(categoriaInicial);
    poblarSelectPartidosAsociacion(categoriaInicial);
  }

  $("asociacion-categoria").addEventListener("change", async (e) => {
    const categoria = e.target.value;
    await refrescarCategoria(categoria);
    poblarSelectPartidosAsociacion(categoria);
    setStatus($("asociacion-status"), "", "");
  });

  $("asociacion-partido").addEventListener("change", completarInputsAsociacion);
  $("asociacion-guardar").addEventListener("click", guardarResultadoAsociacion);
 const plannerBtn = document.getElementById("planner-generar");

if (plannerBtn) {
  plannerBtn.addEventListener("click", () => {
    const categoria = document.getElementById("planner-categoria").value;
    const competencia = document.getElementById("planner-competencia").value;
    const ruedas = Number(document.getElementById("planner-ruedas").value);
    const dia = document.getElementById("planner-dia").value;
    const fechaInicio = document.getElementById("planner-inicio").value;
const fechaFin = document.getElementById("planner-fin").value;

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
    let fechaFinalEstimada = "No definida";
let entraEnCalendario = "Sin analizar";

if (fechaInicio) {
  const inicio = new Date(fechaInicio);

  const diasPorFecha = dia === "0" ? 7 : 7;

  const diasTotales = jornadasTotales * diasPorFecha;

  const estimada = new Date(inicio);
  estimada.setDate(estimada.getDate() + diasTotales);

  fechaFinalEstimada = estimada.toLocaleDateString("es-AR");

  if (fechaFin) {
    const limite = new Date(fechaFin);

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
<p><strong>Entra en calendario:</strong> ${entraEnCalendario}</p>
        <p><strong>Libre por fecha:</strong> ${tieneLibre ? "Sí" : "No"}</p>
      </div>
    `;
  });

}
}

async function inicializar() {
  try {
    $("tab-publico").addEventListener("click", () => mostrarVista("publico"));
    $("tab-delegados").addEventListener("click", () => mostrarVista("delegados"));
    $("tab-asociacion").addEventListener("click", () => mostrarVista("asociacion"));

    const categorias = await cargarCategorias();

    if (!categorias.length) {
      throw new Error("No se encontraron categorías cargadas en Supabase.");
    }

    poblarSelectCategorias("publico-categoria", categorias);
    poblarSelectCategorias("delegado-categoria", categorias);

    const categoriaInicial = categorias[0].nombre;

    await refrescarCategoria(categoriaInicial);
    $("delegado-categoria").value = categoriaInicial;
    poblarSelectPartidosDelegado(categoriaInicial);
    aplicarBloqueoDelegado();

    await inicializarAsociacion();

    $("publico-categoria").addEventListener("change", async (e) => {
      await refrescarCategoria(e.target.value);
    });

    $("delegado-categoria").addEventListener("change", async (e) => {
      const categoria = e.target.value;
      await refrescarCategoria(categoria);
      $("publico-categoria").value = categoria;
      poblarSelectPartidosDelegado(categoria);
      setStatus($("delegado-status"), "", "");
      aplicarBloqueoDelegado();
    });

    $("delegado-partido").addEventListener("change", completarInputsPartidoSeleccionado);
    $("delegado-guardar").addEventListener("click", guardarResultadoDelegado);
    $("delegado-desbloquear").addEventListener("click", desbloquearDelegado);
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