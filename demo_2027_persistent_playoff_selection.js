(() => {
  const Provider = window.SyntheticDataProvider;
  if (!Provider || Provider.prototype.__persistentPlayoffSelectionPatched) return;
  const original = Provider.prototype.generatePlayoffs;
  Provider.prototype.generatePlayoffs = function generatePersistentPlayoffs(categoryId, classified, options = {}) {
    const selector = document.querySelector("#pg-playoff-top");
    const selected = selector ? Number(selector.value) : Number(classified);
    const format = [4, 6, 8].includes(selected) ? selected : Number(classified);
    const seriesGames = format === 6 ? 2 : Number(options.seriesGames || 1);
    return original.call(this, categoryId, format, { ...options, seriesGames });
  };
  Provider.prototype.__persistentPlayoffSelectionPatched = true;
})();
