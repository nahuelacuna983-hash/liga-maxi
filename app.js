function construirHTMLImprimible(cat) {
  const data = fixturesPorCategoria[cat];

  if (!data || !data.fechas) return "";

  const meta = data.meta || {};

  let texto = `LIGA MAXI BASQUET LA PLATA\n`;
  texto += `Fixture oficial - ${cat}\n\n`;

  texto += `Competencia: ${meta.formato || "-"}\n`;
  texto += `Ruedas: ${meta.formato === "anual" ? "2" : "1"}\n`;
  texto += `Día de juego: Domingo\n`;
  texto += `Playoffs: ${meta.playoffs === "si" ? "Sí" : "No"}\n\n`;

  texto += `FASE REGULAR\n\n`;

  data.fechas.forEach(f => {
    texto += `Fecha ${f.numero}\n`;

    if (f.bloqueada) {
      texto += `• BLOQUEADA / DESCANSO\n\n`;
      return;
    }

    f.partidos.forEach(p => {
      texto += `• ${p.local} vs ${p.visitante}\n`;
    });

    if (f.equipoLibre) {
      texto += `• Libre: ${f.equipoLibre}\n`;
    }

    texto += `\n`;
  });

  return `
    <html>
    <body style="font-family: Arial; white-space: pre-wrap; padding: 30px;">
    ${texto}
    </body>
    </html>
  `;
}