(() => {
  const Provider = window.SyntheticDataProvider;
  if (!Provider || Provider.prototype.__persistentPlayoffSelectionPatched) return;
  const readSelectedFormat = () => {
    const selector = document.querySelector("#pg-playoff-top");
    const value = selector ? Number(selector.value) : 4;
    return [4, 6, 8].includes(value) ? value : 4;
  };
  const syncSelectedFormat = () => { window.__persistentPlayoffFormat = readSelectedFormat(); };
  document.addEventListener("change", (event) => { if (event.target?.id === "pg-playoff-top") syncSelectedFormat(); }, true);
  new MutationObserver(syncSelectedFormat).observe(document.body, { childList: true, subtree: true });
  const original = Provider.prototype.generatePlayoffs;
  Provider.prototype.generatePlayoffs = function generatePersistentPlayoffs(categoryId, classified, options = {}) {
    const format = window.__persistentPlayoffFormat || readSelectedFormat();
    const seriesGames = format === 6 ? 2 : Number(options.seriesGames || 1);
    const bracket = original.call(this, categoryId, format, { ...options, seriesGames });
    if (bracket.formato !== `top${format}`) throw new Error(`El formato generado (${bracket.formato}) no coincide con el seleccionado (top${format}).`);
    if (format === 6 && bracket.matches.filter((match) => match.ronda === "repechaje").length !== 4) throw new Error("Top 6 requiere cuatro partidos de repechaje.");
    if (format === 8 && bracket.seed_order.length !== 8) throw new Error("Top 8 requiere ocho clasificados.");
    return bracket;
  };
  Provider.prototype.__persistentPlayoffSelectionPatched = true;
  window.__persistentPlayoffSelectionReady = true;
})();
