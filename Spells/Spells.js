/*******************************************************
 * Torneo Manager v1.0 - Pipeline Final
 * - procesarTorneo() : calcula totales y métricas (in-place)
 * - exportProcessedCSVs() : exporta CSVs preprocesados a Drive
 * - createDashboardForSheet(sheetName) : crea hoja de dashboard + charts
 * 
 * Nota:
 * - Si no existe columna "Sexo" asumimos 'M' (puedes añadir 'M'/'F')
 * - Los CSV exportados van a carpeta Drive 'Processed_Tournaments'
 *******************************************************/

/* -------------------- COEFICIENTES (DOTS / Wilks) -------------------- */
const COEFS = {
  DOTS: {
    male: { a: -0.000001093, b: 0.0007391293, c: -0.1918759221, d: 24.0900756, e: -307.75076, constant: 500 },
    female: { a: -0.0000010706, b: 0.0005158568, c: -0.1126655495, d: 13.6175032, e: -57.96288, constant: 500 }
  },
  WILKS: {
    male: { A: 47.46178854, B: 8.472061379, C: 0.07369410346, D: -0.001395833811, E: 0.00000707665973070743, F: -0.0000000120804336482315, constant: 600 },
    female: { A: -125.4255398, B: 13.71219419, C: -0.03307250631, D: -0.001050400051, E: 0.00000938773881462799, F: -0.000000023334613884954, constant: 600 }
  }
};

/* -------------------- MENU -------------------- */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏆 Torneo Manager v1.0')
    .addItem('1. Calcular Totales (Hoja Actual)', 'procesarTorneo')
    .addItem('2. Clasificar (Hoja Activa)', 'clasificarLevantadores')
    .addSeparator()
    .addItem('3. Generar Guerra de Clanes', 'generarRankingGremios')
    .addSeparator()
    .addItem('4. Guardar ESTE Torneo en Historial', 'guardarEnHistorial')
    .addSeparator()
    .addItem('5. Exportar CSVs procesados (todas hojas)', 'exportProcessedCSVs')
    .addItem('6. Crear Dashboard (hoja activa)', 'createDashboardForActiveSheet')
    .addToUi();
}

/* -------------------- 1) Procesar torneo (in-place) -------------------- */
function procesarTorneo() {
  // Estructura idéntica a la versión que ya tienes pero con un pequeño refinamiento:
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  if (['HISTORIAL', 'Guerra de Clanes', 'INSTRUCCIONES'].includes(sheet.getName())) {
    SpreadsheetApp.getUi().alert('⚠️ No puedes ejecutar esto en la hoja de reporte o historial.');
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { SpreadsheetApp.getUi().alert('No hay datos.'); return; }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1,1,1,lastCol).getValues()[0].map(h => (h||'').toString());

  // Ensure output headers exist: TOTAL (kg), Progreso, Ratio, Category, DOTS, Wilks
  const outHeaders = ["TOTAL (kg)", "Progreso", "Ratio", "Category", "DOTS", "Wilks"];
  const missing = outHeaders.filter(h => headers.indexOf(h) === -1);
  if (missing.length > 0) {
    sheet.getRange(1, lastCol+1, 1, missing.length).setValues([missing]);
  }

  // Re-read headers with outputs
  const fullColCount = sheet.getLastColumn();
  const H = sheet.getRange(1,1,1,fullColCount).getValues()[0].map(h => (h||'').toString());
  function findIndex(name){ return H.indexOf(name); }

  const nameIdx = findIndex("Nombre");
  const pesoIdx = findIndex("Peso");
  const sexoIdx = findIndex("Sexo"); // optional
  const sqIdx = [findIndex("SQ_1"), findIndex("SQ_2"), findIndex("SQ_3")];
  const bpIdx = [findIndex("BP_1"), findIndex("BP_2"), findIndex("BP_3")];
  const dlIdx = [findIndex("DL_1"), findIndex("DL_2"), findIndex("DL_3")];

  const totalIdx = findIndex("TOTAL (kg)");
  const progresoIdx = findIndex("Progreso");
  const ratioIdx = findIndex("Ratio");
  const categoryIdx = findIndex("Category");
  const dotsIdx = findIndex("DOTS");
  const wilksIdx = findIndex("Wilks");

  const dataRange = sheet.getRange(2,1,lastRow-1,fullColCount);
  const data = dataRange.getValues();
  let fontColors = dataRange.getFontColors();

  const out_totals = [];
  const out_progresos = [];
  const out_ratios = [];
  const out_categories = [];
  const out_dots = [];
  const out_wilks = [];

  // Preload historial headers if exists (for progreso)
  const histSheet = ss.getSheetByName('HISTORIAL');
  let histHeaders = null;
  let histData = [];
  if (histSheet) {
    const hc = histSheet.getLastColumn();
    if (hc > 0 && histSheet.getLastRow() > 1) {
      histHeaders = histSheet.getRange(1,1,1,hc).getValues()[0].map(h => (h||'').toString());
      histData = histSheet.getRange(2,1, histSheet.getLastRow()-1, hc).getValues();
    }
  }

  for (let r=0; r<data.length; r++) {
    const row = data[r];
    const nombre = row[nameIdx] || "";
    const peso = parseNumberSafe(row[pesoIdx]);
    const sexoVal = (sexoIdx !== -1 && row[sexoIdx]) ? (''+row[sexoIdx]).toString().trim().toUpperCase() : null;

    // bestOf helper
    function bestOf(indices) {
      let best = 0;
      let validCount = 0;
      let hasData = false;
      indices.forEach(ci => {
        if (ci === -1) return;
        const v = row[ci];
        if (v !== "" && v !== null && v !== undefined) hasData = true;
        if (typeof v === 'number' && v > 0) { best = Math.max(best, v); validCount++; }
        // color styling
        if (ci !== -1) {
          if (typeof v === 'number' && v < 0) fontColors[r][ci] = "#FF0000";
          else if (typeof v === 'number' && v > 0) fontColors[r][ci] = "#2E8B57";
        }
      });
      const bombed = (hasData && validCount === 0);
      return { best, validCount, bombed };
    }

    const sq = bestOf(sqIdx);
    const bp = bestOf(bpIdx);
    const dl = bestOf(dlIdx);

    let total = 0;
    if (!sq.bombed && !bp.bombed && !dl.bombed) total = sq.best + bp.best + dl.best;
    out_totals.push([total]);

    // progreso vs historial
    let progresoText = "Debut";
    if (histData.length > 0 && total > 0 && nombre !== "" && histHeaders) {
      const nameCol = histHeaders.indexOf("Nombre Atleta");
      const totalCol = histHeaders.indexOf("TOTAL");
      if (nameCol !== -1 && totalCol !== -1) {
        const prevs = histData.filter(h => h[nameCol] === nombre && isFiniteNumber(h[totalCol])).map(h => h[totalCol]);
        if (prevs.length > 0) {
          const avg = prevs.reduce((a,b)=>a+b,0)/prevs.length;
          const diff = total - avg;
          const pct = ((diff/avg)*100).toFixed(1);
          progresoText = diff>0 ? `🔥 +${pct}%` : diff<0 ? `🔻 ${Math.abs(pct)}%` : "=";
        }
      }
    }
    out_progresos.push([progresoText]);

    // ratio and category
    let ratio = null;
    if (total > 0 && isFiniteNumber(peso) && peso > 0) {
      ratio = total / peso;
      out_ratios.push([roundNumber(ratio,3)]);
      // Category thresholds can be changed here
      const cat = (ratio < 3) ? "Noob" : (ratio <=5 ? "Average" : "Comrade");
      out_categories.push([cat]);
    } else {
      out_ratios.push([""]);
      out_categories.push([""]);
    }

    // DOTS & Wilks
    let sKey = (sexoVal && sexoVal.startsWith('F')) ? 'female' : 'male';
    let dotsVal = "", wilksVal = "";
    if (total > 0 && isFiniteNumber(peso) && peso > 0) {
      const d = calculateDOTS(total, peso, sKey);
      const w = calculateWilks(total, peso, sKey);
      dotsVal = d === null ? "" : roundNumber(d,3);
      wilksVal = w === null ? "" : roundNumber(w,3);
    }
    out_dots.push([dotsVal]);
    out_wilks.push([wilksVal]);
  }

  // write back colors and values in bulk
  dataRange.setFontColors(fontColors);

  // find actual last col in case headers repositioned
  const newLastCol = sheet.getLastColumn();

  sheet.getRange(2, totalIdx+1, out_totals.length, 1).setValues(out_totals);
  sheet.getRange(2, progresoIdx+1, out_progresos.length, 1).setValues(out_progresos);
  sheet.getRange(2, ratioIdx+1, out_ratios.length, 1).setValues(out_ratios);
  sheet.getRange(2, categoryIdx+1, out_categories.length, 1).setValues(out_categories);
  sheet.getRange(2, dotsIdx+1, out_dots.length, 1).setValues(out_dots);
  sheet.getRange(2, wilksIdx+1, out_wilks.length, 1).setValues(out_wilks);

  SpreadsheetApp.getUi().alert('✅ Totales y métricas calculadas para la hoja activa.');
}

/* -------------------- 2) Clasificar Edad/Peso -------------------- */
function clasificarLevantadores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (['HISTORIAL','Guerra de Clanes'].includes(sheet.getName())) { SpreadsheetApp.getUi().alert('No en esta hoja.'); return; }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2,2,lastRow-1,2).getValues(); // Edad (B), Peso (C)
  const out = [];
  for (let i=0;i<values.length;i++){
    const edad = values[i][0], peso = values[i][1];
    let catEdad="", catPeso="";
    if (edad < 18) catEdad="Sub-Junior";
    else if (edad <=23) catEdad="Junior";
    else if (edad <=39) catEdad="Open";
    else if (edad <=49) catEdad="Master I";
    else if (edad <=59) catEdad="Master II";
    else if (edad <=69) catEdad="Master III";
    else catEdad="Master IV";
    if (peso <= 52) catPeso="-52kg";
    else if (peso <=57) catPeso="-57kg";
    else if (peso <=63) catPeso="-63kg";
    else if (peso <=69) catPeso="-69kg";
    else if (peso <=76) catPeso="-76kg";
    else if (peso <=83) catPeso="-83kg";
    else if (peso <=93) catPeso="-93kg";
    else if (peso <=105) catPeso="-105kg";
    else if (peso <=120) catPeso="-120kg";
    else catPeso="+120kg";
    out.push([catEdad,catPeso]);
  }
  sheet.getRange(2,4,out.length,2).setValues(out);
  SpreadsheetApp.getUi().alert('✅ Clasificación por Edad/Peso actualizada.');
}

/* -------------------- 3) Generar Guerra de Clanes -------------------- */
function generarRankingGremios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (['HISTORIAL','Guerra de Clanes'].includes(sheet.getName())) { SpreadsheetApp.getUi().alert('Selecciona una hoja de torneo.'); return; }
  const data = sheet.getDataRange().getValues();
  const guild = {};
  for (let i=1;i<data.length;i++){
    const team = data[i][7];
    const total = data[i][data[i].length-1];
    if (!team) continue;
    let attempts=0, fails=0;
    for (let j=8;j<=16;j++){
      const v = data[i][j];
      if (v!=="" && v!==null && v!==undefined) { attempts++; if (typeof v==='number' && v<0) fails++; }
    }
    if (!guild[team]) guild[team]={lifters:0,sumTotal:0,totalAttempts:0,totalFails:0};
    guild[team].lifters++;
    guild[team].sumTotal += (typeof total==='number' ? total : 0);
    guild[team].totalAttempts += attempts;
    guild[team].totalFails += fails;
  }
  const rows=[["Ranking","Equipo / Gremio","Total Promedio","Tasa Fallos","Estrategia"]];
  const arr = Object.keys(guild).map(k=>({name:k,...guild[k]})).sort((a,b)=> (b.sumTotal/a.lifters) - (a.sumTotal/a.lifters));
  let rank=1;
  arr.forEach(g=>{
    const avg = g.lifters? (g.sumTotal/g.lifters).toFixed(1):0;
    const failRate = g.totalAttempts? ((g.totalFails/g.totalAttempts)*100).toFixed(1):0;
    const desc = failRate>30? "⚠️ Kamikazes (High Risk)" : failRate<10? "🛡️ Francotiradores (Safe)" : "⚖️ Equilibrados";
    rows.push([rank++, g.name, avg, failRate+"%", desc]);
  });
  let outS = ss.getSheetByName("Guerra de Clanes");
  if (!outS) outS = ss.insertSheet("Guerra de Clanes");
  else outS.clear();
  outS.getRange(1,1,rows.length,rows[0].length).setValues(rows);
  outS.getRange(1,1,1,5).setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  outS.autoResizeColumns(1,5);
  SpreadsheetApp.getUi().alert('⚔️ Guerra de Clanes actualizada.');
}

/* -------------------- 4) Guardar en HISTORIAL -------------------- */
function guardarEnHistorial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getActiveSheet();
  const histSheet = ss.getSheetByName('HISTORIAL');
  if (!histSheet) { SpreadsheetApp.getUi().alert('❌ No existe HISTORIAL. Ejecutá "Generar Historial (estructura)" primero.'); return; }
  if (['HISTORIAL','Guerra de Clanes'].includes(dataSheet.getName())) { SpreadsheetApp.getUi().alert('No puedes guardar esta hoja.'); return; }
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Guardar Torneo','Nombre del evento:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() != ui.Button.OK) return;
  const nombreTorneo = resp.getResponseText() || dataSheet.getName();
  const fechaHoy = new Date();
  const headers = dataSheet.getRange(1,1,1,dataSheet.getLastColumn()).getValues()[0].map(h => (h||'').toString());
  const nameIdx = headers.indexOf("Nombre");
  const totalIdx = headers.indexOf("TOTAL (kg)");
  const dotsIdx = headers.indexOf("DOTS");
  const wilksIdx = headers.indexOf("Wilks");
  const bestSqCols = [headers.indexOf("SQ_1"), headers.indexOf("SQ_2"), headers.indexOf("SQ_3")];
  const data = dataSheet.getRange(2,1,dataSheet.getLastRow()-1,headers.length).getValues();
  const toAppend=[];
  for (let i=0;i<data.length;i++){
    const row = data[i];
    const nombre = row[nameIdx];
    const total = totalIdx!==-1 ? parseNumberSafe(row[totalIdx]) : null;
    if (!nombre || !isFiniteNumber(total) || total<=0) continue;
    const bestsq = Math.max(0, row[bestSqCols[0]]||0, row[bestSqCols[1]]||0, row[bestSqCols[2]]||0);
    const bestbp = Math.max(0, row[headers.indexOf("BP_1")]||0, row[headers.indexOf("BP_2")]||0, row[headers.indexOf("BP_3")]||0);
    const bestdl = Math.max(0, row[headers.indexOf("DL_1")]||0, row[headers.indexOf("DL_2")]||0, row[headers.indexOf("DL_3")]||0);
    const dots = dotsIdx!==-1 ? row[dotsIdx] : "";
    const wilks = wilksIdx!==-1 ? row[wilksIdx] : "";
    const edad = row[headers.indexOf("Edad")] || "";
    const peso = row[headers.indexOf("Peso")] || "";
    const catEdad = row[headers.indexOf("Cat_Edad")] || "";
    const catPeso = row[headers.indexOf("Cat_Peso")] || "";
    const equipo = row[headers.indexOf("Equipo")] || "";
    toAppend.push([fechaHoy, nombreTorneo, nombre, edad, peso, catEdad, catPeso, equipo, bestsq, bestbp, bestdl, total, dots, wilks]);
  }
  if (toAppend.length===0) { ui.alert('⚠️ No hay filas válidas para guardar en historial (totales no calculados).'); return; }
  const histHeaders = ["Fecha","Torneo","Nombre Atleta","Edad","Peso Corp.","Cat. Edad","Cat. Peso","Equipo","Best SQ","Best BP","Best DL","TOTAL","DOTS","Wilks"];
  histSheet.getRange(1,1,1,histHeaders.length).setValues([histHeaders]).setFontWeight("bold").setBackground("#4c1130").setFontColor("white");
  histSheet.getRange(histSheet.getLastRow()+1,1,toAppend.length,toAppend[0].length).setValues(toAppend);
  ui.alert(`✅ Guardado en HISTORIAL: ${toAppend.length} atletas.`);
}

/* -------------------- 5) Setup Historial (estructura) -------------------- */
function setupHistorial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ss.getSheetByName('HISTORIAL');
  if (existing) ss.deleteSheet(existing);
  const s = ss.insertSheet('HISTORIAL');
  const headers = ["Fecha","Torneo","Nombre Atleta","Edad","Peso Corp.","Cat. Edad","Cat. Peso","Equipo","Best SQ","Best BP","Best DL","TOTAL","DOTS","Wilks"];
  s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold").setBackground("#4c1130").setFontColor("white");
  s.setFrozenRows(1);
  SpreadsheetApp.getUi().alert('✅ Historial creado (estructura).');
}

/* -------------------- Export processed CSVs (all tournament sheets) -------------------- */
function exportProcessedCSVs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const skip = ['HISTORIAL','Guerra de Clanes','INSTRUCCIONES'];
  // create folder
  const folderName = 'Processed_Tournaments';
  let folder;
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) folder = folders.next();
  else folder = DriveApp.createFolder(folderName);

  sheets.forEach(sh => {
    const name = sh.getName();
    if (skip.indexOf(name) !== -1) return;
    // ensure processing done (call procesarTorneo on sheet)
    ss.setActiveSheet(sh);
    procesarTorneo();
    // build CSV
    const csv = buildProcessedCSVString(sh);
    // write file (UTF-8)
    const fileName = `${name}_processed.csv`;
    // delete existing with same name in folder
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) existingFiles.next().setTrashed(true);
    folder.createFile(fileName, csv, MimeType.CSV);
  });

  SpreadsheetApp.getUi().alert('✅ CSVs procesados exportados a la carpeta Drive: ' + folder.getName());
}

/* -------------------- Build CSV content from a sheet -------------------- */
function buildProcessedCSVString(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const raw = sheet.getRange(1,1,lastRow,lastCol).getValues();
  // We'll output header + all columns + additionally BestSQ, BestBP, BestDL if absent
  const headers = raw[0].map(h => (h||'').toString());
  // ensure Best columns
  const needBest = ['Best_SQ','Best_BP','Best_DL'];
  needBest.forEach(nb => { if (headers.indexOf(nb) === -1) headers.push(nb); });

  // Build rows
  const rows = [];
  rows.push(headers.join(',')); // header line
  for (let i=1;i<raw.length;i++){
    const row = raw[i].slice();
    // compute bests
    function safeNum(v){ return (typeof v === 'number')? v : (isFinite(Number(v)) ? Number(v) : 0); }
    const hMap = {};
    for (let c=0;c<raw[0].length;c++) hMap[raw[0][c]] = c;
    const bestSQ = Math.max(0, safeNum(row[hMap['SQ_1']]), safeNum(row[hMap['SQ_2']]), safeNum(row[hMap['SQ_3']]));
    const bestBP = Math.max(0, safeNum(row[hMap['BP_1']]), safeNum(row[hMap['BP_2']]), safeNum(row[hMap['BP_3']]));
    const bestDL = Math.max(0, safeNum(row[hMap['DL_1']]), safeNum(row[hMap['DL_2']]), safeNum(row[hMap['DL_3']]));
    // append to row if headers didn't have bests originally
    const rowOut = row.map(cell => formatCsvCell(cell));
    // append bests
    rowOut.push(formatCsvCell(bestSQ));
    rowOut.push(formatCsvCell(bestBP));
    rowOut.push(formatCsvCell(bestDL));
    rows.push(rowOut.join(','));
  }
  return rows.join('\n');
}

function formatCsvCell(v){
  if (v === null || v === undefined) return '';
  const s = ''+v;
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* -------------------- Dashboards / Charts -------------------- */
function createDashboardForActiveSheet(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  createDashboardForSheet(sheet.getName());
}

function createDashboardForSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) { SpreadsheetApp.getUi().alert('No encontré la hoja: ' + sheetName); return; }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { SpreadsheetApp.getUi().alert('Hoja vacía.'); return; }

  // Read relevant columns: Nombre, TOTAL (kg), Category, Equipo
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h => (h||'').toString());
  const hIndex = name=>headers.indexOf(name);
  const nameIdx = hIndex("Nombre"), totalIdx = hIndex("TOTAL (kg)"), catIdx = hIndex("Category"), teamIdx = hIndex("Equipo");
  const raw = sheet.getRange(2,1,lastRow-1,sheet.getLastColumn()).getValues();

  // Prepare data for charts
  const nameTotalPairs = raw.map(r => ({name: r[nameIdx], total: (typeof r[totalIdx]==='number'? r[totalIdx]: (isFinite(Number(r[totalIdx]))?Number(r[totalIdx]):0)), team: r[teamIdx], cat: r[catIdx]}));
  // Top10 totals
  const top = nameTotalPairs.slice().sort((a,b)=>b.total-a.total).slice(0,10);
  // Category counts
  const catCounts = {};
  nameTotalPairs.forEach(x => { const c = x.cat || 'Unclassified'; catCounts[c] = (catCounts[c]||0)+1; });
  // Average total by team (top 8)
  const teamMap = {};
  nameTotalPairs.forEach(x => {
    const t = x.team || 'No Team';
    if (!teamMap[t]) teamMap[t] = {sum:0,count:0};
    teamMap[t].sum += x.total; teamMap[t].count++;
  });
  const teamArr = Object.keys(teamMap).map(k=>({team:k, avg: teamMap[k].count? teamMap[k].sum / teamMap[k].count:0})).sort((a,b)=>b.avg-a.avg).slice(0,8);

  // Create/replace dashboard sheet
  const dashName = `DASHBOARD - ${sheetName}`;
  let dash = ss.getSheetByName(dashName);
  if (dash) dash.clear(); else dash = ss.insertSheet(dashName);
  dash.setTabColor('#0b5394');

  // Write data blocks
  // Top10 block
  dash.getRange(1,1,1,2).setValues([["Top 10 - Nombre","Total (kg)"]]).setFontWeight("bold");
  for (let i=0;i<top.length;i++) dash.getRange(2+i,1,1,2).setValues([[top[i].name, top[i].total]]);
  // Category block
  dash.getRange(1,4,1,2).setValues([["Category","Count"]]).setFontWeight("bold");
  let row=2;
  for (const k in catCounts){ dash.getRange(row,4,1,2).setValues([[k, catCounts[k]]]); row++; }
  // Team avg block
  dash.getRange(1,7,1,2).setValues([["Team","Avg Total"]]).setFontWeight("bold");
  for (let i=0;i<teamArr.length;i++) dash.getRange(2+i,7,1,2).setValues([[teamArr[i].team, roundNumber(teamArr[i].avg,1)]]);

  // Create charts using EmbeddedChartBuilder
  // 1) Bar chart - Top 10 totals
  const chart1 = dash.newChart()
    .asColumnChart()
    .addRange(dash.getRange(1,1,top.length+1,2))
    .setPosition(12,1,0,0)
    .setOption('title','Top 10 Totals')
    .setOption('legend','none')
    .build();
  dash.insertChart(chart1);

  // 2) Pie chart - Category distribution
  const chart2 = dash.newChart()
    .asPieChart()
    .addRange(dash.getRange(1,4,row-1,2))
    .setPosition(12,8,0,0)
    .setOption('title','Distribución por Category')
    .build();
  dash.insertChart(chart2);

  // 3) Column chart - Avg by Team
  const chart3 = dash.newChart()
    .asColumnChart()
    .addRange(dash.getRange(1,7,teamArr.length+1,2))
    .setPosition(28,1,0,0)
    .setOption('title','Promedio Total por Equipo (Top 8)')
    .build();
  dash.insertChart(chart3);

  SpreadsheetApp.getUi().alert('📊 Dashboard generado: ' + dashName);
}

/* -------------------- Helpers: DOTS, Wilks, parsing -------------------- */
function calculateDOTS(total, bw, sexKey) {
  const s = (sexKey === 'female') ? 'female' : 'male';
  const c = COEFS.DOTS[s];
  const denom = c.a * Math.pow(bw,4) + c.b*Math.pow(bw,3) + c.c*Math.pow(bw,2) + c.d*bw + c.e;
  if (!isFiniteNumber(denom) || denom === 0) return null;
  const coef = c.constant / denom;
  return total * coef;
}
function calculateWilks(total, bw, sexKey) {
  const s = (sexKey === 'female') ? 'female' : 'male';
  const c = COEFS.WILKS[s];
  const denom = c.A + c.B*bw + c.C*Math.pow(bw,2) + c.D*Math.pow(bw,3) + c.E*Math.pow(bw,4) + c.F*Math.pow(bw,5);
  if (!isFiniteNumber(denom) || denom === 0) return null;
  const coef = c.constant / denom;
  return total * coef;
}
function parseNumberSafe(v){ if (v===null||v===undefined||v==="") return null; const n=Number(v); return isNaN(n)?null:n; }
function isFiniteNumber(x){ return typeof x==='number' && isFinite(x); }
function roundNumber(x,dec){ if (x===null||x===undefined) return x; const f=Math.pow(10,dec||0); return Math.round(x*f)/f; }
