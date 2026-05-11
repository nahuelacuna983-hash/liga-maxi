console.log("APP ONLINE NUEVA CARGADA");
const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estado = {
  categorias: [],
  partidosPorCategoria: {},
  equiposPorCategoriaId: {},
  requisitosDocumentales: [],
  documentosPorCategoriaId: {},
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

const DOCUMENTOS_REQUERIDOS = [
  "Lista de buena fe",
  "Certificado medico",
  "Seguro",
  "Declaracion jurada",
  "Imagenes para redes",
  "Pase"
];

function obtenerDocumentosRequeridos() {
  if (estado.requisitosDocumentales.length) {
    return estado.requisitosDocumentales.map((requisito) => requisito.nombre);
  }

  return DOCUMENTOS_REQUERIDOS;
}

function obtenerRequisitoDocumental(nombre) {
  return estado.requisitosDocumentales.find((requisito) =>
    normalizarTexto(requisito.nombre) === normalizarTexto(nombre)
  ) || null;
}

async function cargarRequisitosDocumentales() {
  const { data, error } = await supabaseClient
    .from("document_requirements")
    .select("id, nombre, categoria_id, obligatorio, requiere_vencimiento, activo")
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

async function cargarDocumentosCategoria(categoriaId) {
  if (!categoriaId) return [];

  if (estado.documentosPorCategoriaId[categoriaId]) {
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

function docStateHtml(text = "Pendiente", status = "") {
  const className = `doc-state ${status ? `doc-state-${status}` : ""}`.trim();
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

function normalizarTexto(value) {
  return String(value || "").trim().toLowerCase();
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

function validarArchivoDocumento(file) {
  const tiposPermitidos = ["application/pdf", "image/jpeg", "image/png"];
  const maxBytes = 10 * 1024 * 1024;

  if (!file) return "Seleccioná un archivo.";
  if (!tiposPermitidos.includes(file.type)) return "Formato no permitido. Usá PDF, JPG o PNG.";
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
  const documentosRequeridos = obtenerDocumentosRequeridos();
  const filtroEstado = $("documentacion-filtro-estado")?.value || "";
  const filtroTexto = normalizarTexto($("documentacion-buscar")?.value || "");
  const totalEsperado = equipos.length * documentosRequeridos.length;
  const documentos = equipos.flatMap((equipo) =>
    documentosRequeridos.map((requisito) => obtenerDocumentoEquipo(nombreCategoria, equipo, requisito))
  );
  const resumenEstados = documentos.reduce((acc, documento) => {
    const status = documento?.status || "pendiente";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  resumen.innerHTML = `
    <div class="doc-pill"><strong>${equipos.length}</strong><span>Equipos</span></div>
    <div class="doc-pill"><strong>${documentosRequeridos.length}</strong><span>Requisitos</span></div>
    <div class="doc-pill"><strong>${resumenEstados.pendiente || 0}</strong><span>Pendientes</span></div>
    <div class="doc-pill"><strong>${resumenEstados.cargado || 0}</strong><span>Para revisar</span></div>
    <div class="doc-pill"><strong>${resumenEstados.aprobado || 0}</strong><span>Aprobados</span></div>
    <div class="doc-pill"><strong>${(resumenEstados.observado || 0) + (resumenEstados.rechazado || 0)}</strong><span>Observados/Rechazados</span></div>
    <div class="doc-pill"><strong>${totalEsperado}</strong><span>Total esperado</span></div>
  `;

  if (!equipos.length) {
    tabla.innerHTML = `<div class="empty">No hay equipos detectados para esta categoría.</div>`;
    return;
  }

  const filas = equipos.flatMap((equipo) =>
    documentosRequeridos.map((requisito) => {
      const documento = obtenerDocumentoEquipo(nombreCategoria, equipo, requisito);
      const status = documento?.status || "pendiente";
      const textoFila = normalizarTexto([
        equipo,
        requisito,
        documento?.file_name,
        documento?.observacion,
        estadoDocumentoLabel(documento)
      ].join(" "));

      return {
        equipo,
        requisito,
        documento,
        status,
        visible:
          (!filtroEstado || status === filtroEstado) &&
          (!filtroTexto || textoFila.includes(filtroTexto))
      };
    })
  ).filter((fila) => fila.visible);

  if (!filas.length) {
    tabla.innerHTML = `<div class="empty">No hay documentos que coincidan con los filtros.</div>`;
    return;
  }

  tabla.innerHTML = `
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
  `;
}

function renderAccionRevisionAsociacion(documento) {
  if (!documento) {
    return `<span class="doc-action-muted">Sin registro</span>`;
  }

  if (!documento.file_name) {
    return `<span class="doc-action-muted">Esperando carga</span>`;
  }

  return `
    <div class="doc-review-actions">
      <button class="doc-review-btn doc-review-ok" type="button" data-document-id="${escapeHtml(documento.id)}" data-status="aprobado">Aprobar</button>
      <button class="doc-review-btn doc-review-warn" type="button" data-document-id="${escapeHtml(documento.id)}" data-status="observado">Observar</button>
      <button class="doc-review-btn doc-review-danger" type="button" data-document-id="${escapeHtml(documento.id)}" data-status="rechazado">Rechazar</button>
    </div>
  `;
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

  const documentosRequeridos = obtenerDocumentosRequeridos();

  container.innerHTML = `
    <div class="doc-delegate-summary">
      ${equiposDelegado.map((equipo) => renderResumenDocumentalDelegado(categoria, equipo, documentosRequeridos)).join("")}
    </div>
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
          documentosRequeridos.map((documento) => {
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

  return `<span class="doc-observation">${escapeHtml(formatearFecha(documento.vencimiento))}</span>`;
}

function renderAccionDocumentoDelegado(documento) {
  if (!documento) {
    return `<span class="doc-action-muted">Sin registro</span>`;
  }

  const nombreArchivo = documento.file_name
    ? `<span class="doc-file-name">${escapeHtml(documento.file_name)}</span>`
    : "";
  const requisito = obtenerRequisitoDocumental(documento.requirement_nombre);
  const vencimientoInput = requisito?.requiere_vencimiento
    ? `
      <label class="doc-expiry-field">
        <span>Vencimiento</span>
        <input
          class="doc-expiry-input"
          type="date"
          data-document-id="${escapeHtml(documento.id)}"
          value="${escapeHtml(documento.vencimiento || "")}"
        >
      </label>
    `
    : "";

  if (documento.status === "aprobado") {
    return `${nombreArchivo}<span class="doc-action-muted">Aprobado</span>`;
  }

  return `
    ${vencimientoInput}
    <label class="doc-upload-button">
      <span>${documento.file_name ? "Reemplazar" : "Subir"}</span>
      <input
        class="doc-upload-input"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        data-document-id="${escapeHtml(documento.id)}"
      >
    </label>
    ${nombreArchivo}
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
  const categoria = estado.categorias.find((cat) => cat.nombre === nombreCategoria);
  if (categoria) {
    await cargarEquiposCategoria(categoria.id);
    await cargarDocumentosCategoria(categoria.id);
  }

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

async function subirDocumentoDelegado(event) {
  const input = event.target;
  if (!input?.classList?.contains("doc-upload-input")) return;

  const status = $("delegado-status");
  const file = input.files?.[0];
  const validationError = validarArchivoDocumento(file);

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

  const documentId = input.dataset.documentId;
  const documento = obtenerDocumentoPorId(documentId);
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

  const storagePath = [
    "apdb",
    "2026",
    slugify(categoriaNombre),
    documento.equipo_id || slugify(documento.equipo_nombre),
    documento.requirement_id,
    `${Date.now()}-${nombreArchivoSeguro(file.name)}`
  ].join("/");

  input.disabled = true;
  setStatus(status, `Subiendo ${file.name}...`, "");

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
    setStatus(status, `No se pudo subir el archivo: ${uploadError.message}`, "error");
    return;
  }

  const { error: rpcError } = await supabaseClient.rpc("mark_team_document_uploaded", {
    p_document_id: documento.id,
    p_uploaded_by: estado.delegado.nombre,
    p_storage_path: storagePath,
    p_file_name: file.name,
    p_file_type: file.type,
    p_file_size: file.size,
    p_vencimiento: vencimiento
  });

  if (rpcError) {
    input.disabled = false;
    input.value = "";
    setStatus(status, `El archivo subió, pero no se pudo registrar: ${rpcError.message}`, "error");
    return;
  }

  delete estado.documentosPorCategoriaId[categoria.id];
  await cargarDocumentosCategoria(categoria.id);
  renderDocumentacionDelegado();

  if ($("asociacion-categoria")?.value === categoriaNombre) {
    renderDocumentacionAsociacion(categoriaNombre);
  }

  setStatus(status, "Documento cargado correctamente. Queda pendiente de revisión.", "ok");
}

function desbloquearDelegado() {
  const clave = $("delegado-clave").value.trim();
  const status = $("delegado-status");

  const delegado = validarDelegado(clave);

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

  poblarSelectCategorias(
    "delegado-categoria",
    estado.categorias.filter((cat) => delegado.categorias.includes(cat.nombre))
  );

  const primeraCategoria = $("delegado-categoria").value;
  if (primeraCategoria) {
    refrescarCategoria(primeraCategoria).then(() => {
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

async function revisarDocumentoAsociacion(event) {
  const button = event.target.closest(".doc-review-btn");
  if (!button) return;

  const documentId = button.dataset.documentId;
  const nextStatus = button.dataset.status;
  const categoria = $("asociacion-categoria")?.value || "";
  const categoriaData = estado.categorias.find((cat) => cat.nombre === categoria);
  const documento = obtenerDocumentoPorId(documentId);
  const status = $("asociacion-status");

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

  const confirmar = confirm(`¿Confirmás ${labels[nextStatus] || "revisar"} ${documento.requirement_nombre} de ${documento.equipo_nombre}?`);
  if (!confirmar) {
    setStatus(status, "Revisión cancelada.", "warn");
    return;
  }

  button.disabled = true;
  setStatus(status, "Guardando revisión documental...", "");

  const { error } = await supabaseClient.rpc("review_team_document", {
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

  delete estado.documentosPorCategoriaId[categoriaData.id];
  await cargarDocumentosCategoria(categoriaData.id);
  renderDocumentacionAsociacion(categoria);
  renderDocumentacionDelegado();
  setStatus(status, "Revisión documental guardada.", "ok");
}

async function inicializarAsociacion() {
  poblarSelectCategorias("asociacion-categoria", estado.categorias);

  const categoriaInicial = $("asociacion-categoria").value;
  if (categoriaInicial) {
    await refrescarCategoria(categoriaInicial);
    poblarSelectPartidosAsociacion(categoriaInicial);
    renderDocumentacionAsociacion(categoriaInicial);
  }

  $("asociacion-categoria").addEventListener("change", async (e) => {
    const categoria = e.target.value;
    await refrescarCategoria(categoria);
    poblarSelectPartidosAsociacion(categoria);
    renderDocumentacionAsociacion(categoria);
    setStatus($("asociacion-status"), "", "");
  });

  $("asociacion-partido").addEventListener("change", completarInputsAsociacion);
  $("asociacion-guardar").addEventListener("click", guardarResultadoAsociacion);
  $("documentacion-tabla").addEventListener("click", revisarDocumentoAsociacion);
  $("documentacion-filtro-estado").addEventListener("change", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
  $("documentacion-buscar").addEventListener("input", () => {
    renderDocumentacionAsociacion($("asociacion-categoria").value);
  });
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
    $("tab-publico").addEventListener("click", () => mostrarVista("publico"));
    $("tab-delegados").addEventListener("click", () => mostrarVista("delegados"));
    $("tab-asociacion").addEventListener("click", () => mostrarVista("asociacion"));

    const categorias = await cargarCategorias();
    await cargarRequisitosDocumentales();

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
    renderDocumentacionDelegado();

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
      renderDocumentacionDelegado();
    });

    $("delegado-partido").addEventListener("change", completarInputsPartidoSeleccionado);
    $("delegado-guardar").addEventListener("click", guardarResultadoDelegado);
    $("delegado-desbloquear").addEventListener("click", desbloquearDelegado);
    $("delegado-documentacion").addEventListener("change", subirDocumentoDelegado);
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
