const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";
const DELEGADO_PASSWORD = "resultados123";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIAS_OBJETIVO = ["Maxi +35 A", "Maxi +35 B", "Maxi +48"];

const estado = {
  categorias: [],
  partidosPorCategoria: {},
  delegadoDesbloqueado: false
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(element, text, kind = "") {
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
    btn.classList.toggle("activo", key === nombre);
  });

  Object.entries(views).forEach(([key, view]) => {
    view.classList.toggle("activa", key === nombre);
  });
}

function aplicarBloqueoDelegado() {
  $("delegado-categoria").disabled = !estado.delegadoDesbloqueado;
  $("delegado-partido").disabled = !estado.delegadoDesbloqueado;
  $("delegado-puntos-local").disabled = !estado.delegadoDesbloqueado;
  $("delegado-puntos-visitante").disabled = !estado.delegadoDesbloqueado;
  $("delegado-guardar").disabled = !estado.delegadoDesbloqueado;
}

async function cargarCategorias() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("id, nombre")
    .in("nombre", CATEGORIAS_OBJETIVO)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  }

  estado.categorias = data || [];
  return estado.categorias;
}

function poblarSelectCategorias(selectId, categorias) {
  const select = $(selectId);
  select.innerHTML = "";

  categorias.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.nombre;
    option.textContent = cat.nombre;
    select.appendChild(option);
  });
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
function renderPlayoffs(nombreCategoria, tabla) {
  const container = document.getElementById("publico-playoffs");

  if (!tabla.length) {
    container.innerHTML = "";
    return;
  }

  let html = `<div class="card"><h3>Playoffs</h3>`;

  if (nombreCategoria.includes("+35")) {
    if (tabla.length < 8) return;

    html += `
      <div class="match">1° ${tabla[0].equipo} vs 8° ${tabla[7].equipo}</div>
      <div class="match">4° ${tabla[3].equipo} vs 5° ${tabla[4].equipo}</div>
      <div class="match">2° ${tabla[1].equipo} vs 7° ${tabla[6].equipo}</div>
      <div class="match">3° ${tabla[2].equipo} vs 6° ${tabla[5].equipo}</div>
    `;
  }

  if (nombreCategoria.includes("+48")) {
    if (tabla.length < 6) return;

    html += `
      <div class="match">1° ${tabla[0].equipo} (directo a semifinal)</div>
      <div class="match">2° ${tabla[1].equipo} (directo a semifinal)</div>
      <div class="match">3° ${tabla[2].equipo} vs 6° ${tabla[5].equipo}</div>
      <div class="match">4° ${tabla[3].equipo} vs 5° ${tabla[4].equipo}</div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
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

    html += `<div class="card"><h3>${titulo}</h3>`;

    partidosJornada.forEach((p) => {
      const estadoTxt =
        p.puntos_local != null && p.puntos_visitante != null
          ? `${p.puntos_local} - ${p.puntos_visitante}`
          : "Pendiente";

      html += `
        <div class="match">
          <div class="teams">
            <span>${p.local}</span>
            <span class="vs">vs</span>
            <span>${p.visitante}</span>
          </div>
          <div class="score">${estadoTxt}</div>
        </div>
      `;
    });

    html += `</div>`;
  });

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

  setStatus(status, "Guardando resultado...", "");

  const { error } = await supabaseClient
    .from("partidos")
    .update({
      puntos_local: pl,
      puntos_visitante: pv
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

  if (clave !== DELEGADO_PASSWORD) {
    estado.delegadoDesbloqueado = false;
    aplicarBloqueoDelegado();
    setStatus(status, "Clave incorrecta.", "error");
    return;
  }

  estado.delegadoDesbloqueado = true;
  aplicarBloqueoDelegado();
  setStatus(status, "Edición habilitada.", "ok");
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
function renderPlayoffsSimple(nombreCategoria, partidos) {
  const container = document.getElementById("publico-playoffs");

  if (!container) return;

  const equipos = {};

  partidos.forEach((p) => {
    if (!equipos[p.local]) equipos[p.local] = true;
    if (!equipos[p.visitante]) equipos[p.visitante] = true;
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
function renderTablaSimple(nombreCategoria, partidos) {
  const wrap = document.getElementById("publico-tabla-wrap");
  if (!wrap) return;

  const tabla = {};

  partidos.forEach((p) => {
    if (!tabla[p.local]) {
      tabla[p.local] = {
        equipo: p.local,
        pj: 0,
        pg: 0,
        pp: 0,
        pf: 0,
        pc: 0,
        dif: 0,
        pts: 0
      };
    }

    if (!tabla[p.visitante]) {
      tabla[p.visitante] = {
        equipo: p.visitante,
        pj: 0,
        pg: 0,
        pp: 0,
        pf: 0,
        pc: 0,
        dif: 0,
        pts: 0
      };
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

  const filas = Object.values(tabla)
    .map((e) => {
      e.dif = e.pf - e.pc;
      return e;
    })
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dif !== a.dif) return b.dif - a.dif;
      if (b.pf !== a.pf) return b.pf - a.pf;
      return a.equipo.localeCompare(b.equipo);
    });

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
function poblarSelectPartidosDelegado(nombreCategoria) {
  const select = document.getElementById("delegado-partido");
  if (!select) return;

  const partidos = estado.partidosPorCategoria[nombreCategoria] || [];

  select.innerHTML = "";

  if (!partidos.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No hay partidos cargados";
    select.appendChild(option);

    const localInput = document.getElementById("delegado-puntos-local");
    const visitaInput = document.getElementById("delegado-puntos-visitante");
    const guardarBtn = document.getElementById("delegado-guardar");

    if (localInput) localInput.value = "";
    if (visitaInput) visitaInput.value = "";
    if (guardarBtn) guardarBtn.disabled = !estado.delegadoDesbloqueado;

    return;
  }

  partidos.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `Fecha ${p.jornada || "-"} · ${p.local} vs ${p.visitante}`;
    select.appendChild(option);
  });

  completarInputsPartidoSeleccionado();
}