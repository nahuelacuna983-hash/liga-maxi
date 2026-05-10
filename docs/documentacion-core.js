const ESTADOS_DOCUMENTO = {
  pendiente: "Pendiente",
  cargado: "Cargado",
  observado: "Observado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  vencido: "Vencido"
};

const REQUISITOS_POR_CATEGORIA = {
  "Maxi +35 A": [
    "Lista de buena fe",
    "Certificado medico",
    "Seguro",
    "Declaracion jurada",
    "Imagenes para redes",
    "Pase"
  ],
  "Maxi +35 B": [
    "Lista de buena fe",
    "Certificado medico",
    "Seguro",
    "Declaracion jurada",
    "Imagenes para redes",
    "Pase"
  ],
  "Maxi +48": [
    "Lista de buena fe",
    "Certificado medico",
    "Seguro",
    "Declaracion jurada",
    "Imagenes para redes",
    "Pase"
  ],
  Femenino: [
    "Lista de buena fe",
    "Certificado medico",
    "Seguro",
    "Declaracion jurada",
    "Imagenes para redes",
    "Pase"
  ]
};

function contarPorEstado(documentos, estado) {
  return documentos.filter((documento) => documento.estado === estado).length;
}

function calcularMetricasDocumentales(documentos, fechaBase = new Date()) {
  const vencenEn30Dias = documentos.filter((documento) => {
    if (!documento.vencimiento || documento.vencimiento === "No aplica") return false;

    const [dia, mes, anio] = documento.vencimiento.split("/").map(Number);
    const vencimiento = new Date(anio, mes - 1, dia);
    const diferenciaDias = Math.ceil((vencimiento - fechaBase) / (1000 * 60 * 60 * 24));

    return diferenciaDias >= 0 && diferenciaDias <= 30;
  }).length;

  return {
    pendientes: contarPorEstado(documentos, "pendiente"),
    cargados: contarPorEstado(documentos, "cargado"),
    observados: contarPorEstado(documentos, "observado"),
    aprobados: contarPorEstado(documentos, "aprobado"),
    rechazados: contarPorEstado(documentos, "rechazado"),
    vencidos: contarPorEstado(documentos, "vencido"),
    vencenEn30Dias
  };
}

function obtenerPendientesCriticos(documentos) {
  return documentos.filter((documento) =>
    documento.estado === "pendiente" ||
    documento.estado === "observado" ||
    documento.estado === "vencido"
  );
}

function obtenerRequisitosCategoria(categoria) {
  return REQUISITOS_POR_CATEGORIA[categoria] || [];
}

function escaparCsv(valor) {
  return `"${String(valor ?? "").replaceAll('"', '""')}"`;
}

function exportarDocumentosCsv(documentos) {
  const encabezado = ["equipo", "documento", "vencimiento", "estado", "observacion"];
  const filas = documentos.map((documento) => [
    documento.equipo,
    documento.documento,
    documento.vencimiento,
    ESTADOS_DOCUMENTO[documento.estado] || documento.estado,
    documento.observacion
  ]);

  return [encabezado, ...filas]
    .map((fila) => fila.map(escaparCsv).join(","))
    .join("\n");
}

function cambiarEstadoDocumento(documentos, id, estado, observacion) {
  return documentos.map((documento) => {
    if (documento.id !== id) return documento;

    return {
      ...documento,
      estado,
      observacion: observacion ?? documento.observacion
    };
  });
}

if (typeof window !== "undefined") {
  window.DocumentacionCore = {
    ESTADOS_DOCUMENTO,
    REQUISITOS_POR_CATEGORIA,
    calcularMetricasDocumentales,
    obtenerPendientesCriticos,
    obtenerRequisitosCategoria,
    exportarDocumentosCsv,
    cambiarEstadoDocumento
  };
}
