* ------------------------------------------------------------------
 * HECHIZO 3: GUERRA DE CLANES
 * Genera la hoja de estadísticas en una nueva pestaña.
 * ------------------------------------------------------------------
 */
function generarRankingGremios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Usamos la primera hoja siempre como origen de datos
  const dataSheet = ss.getSheets()[0]; 
  const data = dataSheet.getDataRange().getValues();
  
  let guildStats = {};
  
  // Empezamos en i=1 para saltar encabezados
  for (let i = 1; i < data.length; i++) {
    let team = data[i][7]; // Columna H (índice 7) es Equipo
    let total = data[i][17]; // Columna R (índice 17) es Total
    
    if (!team) continue; // Saltar filas sin equipo

    let attempts = 0;
    let fails = 0;
    // Columnas de intentos (8 a 16)
    for (let j = 8; j <= 16; j++) {
      let val = data[i][j];
      // Contamos como intento si no está vacío y no es null
      if (val !== "" && val !== null) { 
        attempts++;
        if (val < 0) fails++;
      }
    }

    if (!guildStats[team]) {
      guildStats[team] = { 
        lifters: 0, 
        sumTotal: 0, 
        totalAttempts: 0, 
        totalFails: 0 
      };
    }
    
    guildStats[team].lifters++;
    // Sumamos el total solo si es número (para evitar errores con celdas vacías)
    guildStats[team].sumTotal += (typeof total === 'number' ? total : 0);
    guildStats[team].totalAttempts += attempts;
    guildStats[team].totalFails += fails;
  }

  // Preparar tabla de salida
  let output = [];
  output.push(["Ranking", "Equipo / Gremio", "Total Promedio (kg)", "Tasa de Fallos (%)", "Descripción Táctica"]);

  // Convertir objeto a array y ordenar por promedio descendente
  let sortedGuilds = Object.keys(guildStats).map(key => {
    return { name: key, ...guildStats[key] };
  }).sort((a, b) => {
    let avgA = a.lifters > 0 ? a.sumTotal / a.lifters : 0;
    let avgB = b.lifters > 0 ? b.sumTotal / b.lifters : 0;
    return avgB - avgA;
  });

  let rank = 1;
  sortedGuilds.forEach(guild => {
    let avgTotal = (guild.lifters > 0) ? (guild.sumTotal / guild.lifters).toFixed(1) : 0;
    let failRate = 0;
    if (guild.totalAttempts > 0) {
       failRate = ((guild.totalFails / guild.totalAttempts) * 100).toFixed(1);
    }
    
    // Lore dinámico
    let desc = "";
    if (failRate > 30) desc = "⚠️ Arriesgados (High Risk)"; // Iron Conjurers o Zealots suelen caer aquí
    else if (failRate < 10) desc = "🛡️ Conservadores (Safe)"; // Linear Legion
    else desc = "⚖️ Equilibrados";

    output.push([rank++, guild.name, avgTotal, failRate + "%", desc]);
  });

  // Crear o actualizar hoja "Guerra de Clanes"
  let rankingSheet = ss.getSheetByName("Guerra de Clanes");
  if (!rankingSheet) {
    rankingSheet = ss.insertSheet("Guerra de Clanes");
  } else {
    rankingSheet.clear();
  }
  
  // Escribir datos
  rankingSheet.getRange(1, 1, output.length, 5).setValues(output);
  
  // Estilo visual
  let headerRange = rankingSheet.getRange(1, 1, 1, 5);
  headerRange.setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  rankingSheet.autoResizeColumns(1, 5);
}
