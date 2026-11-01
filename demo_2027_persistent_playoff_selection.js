(() => {
  const Provider = window.SyntheticDataProvider;
  if (!Provider || Provider.prototype.__persistentPlayoffSelectionPatched) return;
  const original = Provider.prototype.generatePlayoffs;
  Provider.prototype.generatePlayoffs = function generatePersistentPlayoffs(categoryId, classified, options = {}) {
    const selector = document.querySelector("#pg-playoff-top");
    const selected = selector ? Number(selector.value) : Number(classified);
    const format = [4, 6, 8].includes(selected) ? selected : Number(classified);
    const seriesGames = format === 6 ? 2 : Number(options.seriesGames || 1);
    const bracket = original.call(this, categoryId, format, { ...options, seriesGames });
    if (bracket.formato !== `top${format}`) throw new Error(`El formato generado (${bracket.formato}) no coincide con el seleccionado (top${format}).`);
    if (format === 6 && bracket.matches.filter((match) => match.ronda === "repechaje").length !== 4) throw new Error("Top 6 requiere cuatro partidos de repechaje.");
    if (format === 8 && bracket.seed_order.length !== 8) throw new Error("Top 8 requiere ocho clasificados.");
    return bracket;
  };
  Provider.prototype.__persistentPlayoffSelectionPatched = true;
})();
