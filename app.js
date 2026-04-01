(() => {
  // =========================================================
  // BLOQUEO ANTI-DOBLE-CARGA
  // =========================================================
  if (window.__LIGA_MAXI_APP_ALREADY_LOADED__) {
    console.warn("[Liga Maxi] app.js ya estaba cargado. Se cancela la segunda ejecución.");
    return;
  }
  window.__LIGA_MAXI_APP_ALREADY_LOADED__ = true;

  // =========================================================
  // CONFIG
  // PEGÁ TUS VALORES REALES ACÁ
  // =========================================================
  const SUPABASE_URL = "https://eshbydpsmypflfxpmhyk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";

  // =========================================================
  // ESTADO GLOBAL CONTROLADO
  // =========================================================
  const state = {
    appVersion: "20260331-1",
    startedAt: new Date().toISOString(),
    supabaseLibPresent: false,
    supabaseClientCreated: false,
    errors: [],
    logs: []
  };

  function log(message, data = null) {
    const entry = {
      time: new Date().toISOString(),
      message,
      data
    };
    state.logs.push(entry);
    if (data !== null) {
      console.log("[Liga Maxi]", message, data);
    } else {
      console.log("[Liga Maxi]", message);
    }
  }

  function addError(message, error = null) {
    const entry = {
      time: new Date().toISOString(),
      message,
      error: error ? String(error?.message || error) : null
    };
    state.errors.push(entry);
    console.error("[Liga Maxi]", message, error || "");
  }

  function getAppRoot() {
    return document.getElementById("app");
  }

  function renderShell(contentHtml) {
    const app = getAppRoot();
    if (!app) {
      console.error("No existe #app en index.html");
      return;
    }
    app.innerHTML = contentHtml;
  }

  function renderErrorScreen(title, detail) {
    renderShell(`
      <div class="card">
        <h1>Liga Maxi</h1>
        <p class="err">${title}</p>
        <p>${detail}</p>
      </div>

      <div class="card">
        <h2>Diagnóstico</h2>
        <div class="debug-line"><strong>Versión:</strong> <span class="mono">${escapeHtml(state.appVersion)}</span></div>
        <div class="debug-line"><strong>Inicio:</strong> <span class="mono">${escapeHtml(state.startedAt)}</span></div>
        <div class="debug-line"><strong>Librería Supabase:</strong> ${state.supabaseLibPresent ? '<span class="ok">OK</span>' : '<span class="err">NO</span>'}</div>
        <div class="debug-line"><strong>Cliente creado:</strong> ${state.supabaseClientCreated ? '<span class="ok">OK</span>' : '<span class="err">NO</span>'}</div>
      </div>

      <div class="card">
        <h2>Errores registrados</h2>
        <pre>${escapeHtml(JSON.stringify(state.errors, null, 2))}</pre>
      </div>
    `);
  }

  function renderHome(sb) {
    renderShell(`
      <div class="card">
        <h1>Liga Maxi</h1>
        <p class="ok">La app cargó sin redeclarar <span class="mono">supabase</span>.</p>
        <p>Eso significa que el bloqueo principal por doble ejecución quedó neutralizado.</p>
      </div>

      <div class="card">
        <h2>Estado técnico</h2>
        <div class="debug-line"><strong>Versión app.js:</strong> <span class="mono">${escapeHtml(state.appVersion)}</span></div>
        <div class="debug-line"><strong>Inicio:</strong> <span class="mono">${escapeHtml(state.startedAt)}</span></div>
        <div class="debug-line"><strong>window.supabase:</strong> ${state.supabaseLibPresent ? '<span class="ok">OK</span>' : '<span class="err">NO</span>'}</div>
        <div class="debug-line"><strong>Cliente Supabase:</strong> ${state.supabaseClientCreated ? '<span class="ok">OK</span>' : '<span class="err">NO</span>'}</div>
        <div class="debug-line"><strong>Protección anti doble carga:</strong> <span class="ok">ACTIVA</span></div>
      </div>

      <div class="card">
        <h2>Siguiente paso</h2>
        <p>Con este archivo, el error <span class="mono">Identifier 'supabase' has already been declared</span> ya no debería aparecer.</p>
        <p>Ahora el trabajo es volver a meter tu lógica real, pero ya dentro de una estructura segura.</p>
        <button id="btnMostrarDebug">Ver debug completo</button>
      </div>

      <div class="card" id="debugCard" style="display:none;">
        <h2>Debug</h2>
        <pre>${escapeHtml(JSON.stringify({
          version: state.appVersion,
          startedAt: state.startedAt,
          supabaseLibPresent: state.supabaseLibPresent,
          supabaseClientCreated: state.supabaseClientCreated,
          logs: state.logs,
          errors: state.errors
        }, null, 2))}</pre>
      </div>
    `);

    const btn = document.getElementById("btnMostrarDebug");
    const debugCard = document.getElementById("debugCard");

    if (btn && debugCard) {
      btn.addEventListener("click", () => {
        debugCard.style.display = debugCard.style.display === "none" ? "block" : "none";
      });
    }

    // Dejamos el cliente expuesto SOLO para debug controlado
    window.__LIGA_MAXI_SB__ = sb;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function validateConfig() {
    if (!SUPABASE_URL || SUPABASE_URL.includes("PEGAR_AQUI")) {
      throw new Error("Falta configurar SUPABASE_URL en app.js");
    }

    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PEGAR_AQUI")) {
      throw new Error("Falta configurar SUPABASE_ANON_KEY en app.js");
    }
  }

  function createSupabaseClient() {
    state.supabaseLibPresent = !!(window.supabase && typeof window.supabase.createClient === "function");

    if (!state.supabaseLibPresent) {
      throw new Error("No se cargó la librería de Supabase");
    }

    // Reutiliza cliente si ya existe
    if (window.__LIGA_MAXI_SUPABASE_CLIENT__) {
      log("Se reutiliza cliente Supabase existente");
      state.supabaseClientCreated = true;
      return window.__LIGA_MAXI_SUPABASE_CLIENT__;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.__LIGA_MAXI_SUPABASE_CLIENT__ = sb;
    state.supabaseClientCreated = true;
    log("Cliente Supabase creado correctamente");

    return sb;
  }

  async function init() {
    try {
      log("Inicio de app.js");
      validateConfig();

      const sb = createSupabaseClient();

      // =========================================================
      // ACÁ IBA TU LÓGICA ORIGINAL
      // POR AHORA NO LA EJECUTAMOS, SOLO ASEGURAMOS QUE NO SE CONGELE
      // =========================================================

      renderHome(sb);
      log("Render inicial completado");
    } catch (error) {
      addError("Fallo al iniciar la aplicación", error);
      renderErrorScreen(
        "Error al iniciar la aplicación",
        error?.message || "Error desconocido"
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();