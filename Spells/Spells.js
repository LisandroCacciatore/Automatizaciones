/**
 * ------------------------------------------------------------------
 * HECHIZO DE INVOCACIÓN DE MENÚ
 * Esto crea un botón en la barra de herramientas de tu Sheet.
 * ------------------------------------------------------------------
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏆 Torneo Manager')
      .addItem('1. Calcular Totales y Colorear Fallos', 'procesarTorneo')
      .addItem('2. Clasificar por Edad/Peso', 'clasificarLevantadores')
      .addSeparator()
      .addItem('3. Generar Guerra de Clanes', 'generarRankingGremios')
      .addSeparator()
      .addItem('4. Guardar Torneo en Historial', 'guardarEnHistorial')
      .addToUi();
}

/**
 * ------------------------------------------------------------------
 * HECHIZO 1: LIMPIEZA Y CÁLCULO
 * Pone rojos los fallos, calcula el mejor intento y suma el Total.
 * ------------------------------------------------------------------
 */
function procesarTorneo() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return; // No hay datos

  // Leemos desde la fila 2 hasta la última, columna A(1) hasta R(18)
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 18); 
  const data = dataRange.getValues();
  
  // Índices de columnas (basado en el Array, empieza en 0)
  // SQ: Col I,J,K (Indices 8,9,10)
  // BP: Col L,M,N (Indices 11,12,13)
  // DL: Col O,P,Q (Indices 14,15,16)
  const cols = { sq: [8, 9, 10], bp: [11, 12, 13], dl: [14, 15, 16] };
  
  let fontColors = dataRange.getFontColors();
  let totals = [];

  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    
    // Procesar cada movimiento usando la función auxiliar
    let resSQ = procesarIntento(row, cols.sq, i, fontColors);
    let resBP = procesarIntento(row, cols.bp, i, fontColors);
    let resDL = procesarIntento(row, cols.dl, i, fontColors);

    // Obtener los mejores levantamientos validos
    let bestSQ = resSQ.max; 
    let bestBP = resBP.max;
    let bestDL = resDL.max;

    // Calcular Total:
    // Opción estricta: Si te blanqueas en uno (bombed=true), el total es 0.
    let total = 0;
    if (!resSQ.bombed && !resBP.bombed && !resDL.bombed) {
      total = bestSQ + bestBP + bestDL;
    }
    totals.push([total]);
  }

  // Aplicar colores y escribir totales
  dataRange.setFontColors(fontColors);
  sheet.getRange(2, 18, totals.length, 1).setValues(totals); // Columna 18 es R
  sheet.getRange(1, 18).setValue("TOTAL (kg)").setFontWeight("bold");
}

/**
 * Función auxiliar para colorear celdas y buscar el máximo válido.
 * Retorna objeto { max: numero, bombed: boolean }
 */
function procesarIntento(row, indices, rowIndex, colorMatrix) {
  let maxLift = 0;
  let validCount = 0;

  indices.forEach(colIndex => {
    let val = row[colIndex];
    if (val < 0) {
      colorMatrix[rowIndex][colIndex] = "#FF0000"; // Rojo fallo
    } else if (val > 0) {
      colorMatrix[rowIndex][colIndex] = "#2E8B57"; // Verde válido
      maxLift = Math.max(maxLift, val);
      validCount++;
    }
    // Si es 0 o vacío se ignora
  });

  // 'bombed' es true si intentó levantar (hay datos en el 1er intento) pero no metió ninguno válido
  let hasData = (row[indices[0]] !== "" && row[indices[0]] !== undefined);
  return { max: maxLift, bombed: (hasData && validCount === 0) }; 
}

/**
 * ------------------------------------------------------------------
 * HECHIZO 2: CLASIFICACIÓN
 * Rellena categorías automáticamente según edad y peso.
 * ------------------------------------------------------------------
 */
function clasificarLevantadores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rangeToRead = sheet.getRange(2, 2, lastRow - 1, 2); // Edad (B) y Peso (C)
  const values = rangeToRead.getValues();
  
  let categories = [];

  for (let i = 0; i < values.length; i++) {
    let edad = values[i][0];
    let peso = values[i][1];
    let catEdad = "";
    let catPeso = "";

    // Lógica de Edad
    if (edad < 18) catEdad = "Sub-Junior (The Apprentices)";
    else if (edad <= 23) catEdad = "Junior (The Squires)";
    else if (edad <= 39) catEdad = "Open (The Champions)";
    else if (edad <= 49) catEdad = "Master I";
    else if (edad <= 59) catEdad = "Master II";
    else if (edad <= 69) catEdad = "Master III";
    else catEdad = "Master IV (The Ancients)";

    // Lógica de Peso
    if (peso <= 52) catPeso = "-52kg";
    else if (peso <= 57) catPeso = "-57kg";
    else if (peso <= 63) catPeso = "-63kg";
    else if (peso <= 69) catPeso = "-69kg";
    else if (peso <= 76) catPeso = "-76kg";
    else if (peso <= 83) catPeso = "-83kg";
    else if (peso <= 93) catPeso = "-93kg";
    else if (peso <= 105) catPeso = "-105kg";
    else if (peso <= 120) catPeso = "-120kg";
    else catPeso = "+120kg (Titans)";

    categories.push([catEdad, catPeso]);
  }

  // Escribir en columnas D (4) y E (5)
  sheet.getRange(2, 4, categories.length, 2).setValues(categories);
}

/**
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

function guardarEnHistorial() {
     const ss = SpreadsheetApp.getActiveSpreadsheet();
     const dataSheet = ss.getSheets()[0];
     const histSheet = ss.getSheetByName('HISTORIAL') || ss.insertSheet('HISTORIAL');
     
     // Pedir nombre del torneo
     const ui = SpreadsheetApp.getUi();
     const response = ui.prompt('Nombre del Torneo', 
       'Ej: Copa Primavera 2026', ui.ButtonSet.OK_CANCEL);
     
     if (response.getSelectedButton() != ui.Button.OK) return;
     
     const nombreTorneo = response.getResponseText();
     const fecha = new Date();
     
     // Leer datos procesados
     const data = dataSheet.getRange(2, 1, dataSheet.getLastRow()-1, 18).getValues();
     
     data.forEach(row => {
       // Solo guardar si tiene Total > 0
       if (row[17] > 0) {
         histSheet.appendRow([
           fecha,
           nombreTorneo,
           row[0], // Nombre
           row[1], // Edad
           row[2], // Peso
           row[3], // Cat_Edad
           row[4], // Cat_Peso
           Math.max(row[8], row[9], row[10]), // Mejor Squat
           Math.max(row[11], row[12], row[13]), // Mejor Bench
           Math.max(row[14], row[15], row[16]), // Mejor Deadlift
           row[17], // Total
           row[7], // Equipo
           // Ranking se puede calcular después
         ]);
       }
     });
     
     ui.alert('✅ Torneo guardado: ' + nombreTorneo);
   }
