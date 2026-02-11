/**
 * IronSystems - Detector de Estancamiento & Fatiga
 * - detecta estancamiento por tendencia de e1RM en las últimas N semanas (microciclos)
 * - detecta aumento de fatiga por RPE (comparando ventanas recientes)
 * - escribe ALERTS en hoja "ALERTS"
 * - opcional: envía email al coach (si DB_Athletes tiene CoachEmail)
 *
 * Instrucciones:
 * 1) Pegá este archivo en Apps Script del Spreadsheet.
 * 2) Ejecutá setupAlertsSheet() una vez para crear la hoja ALERTS.
 * 3) Ejecutá detectStagnationAndFatigue() manual o programá un trigger time-driven.
 *
 * Notas:
 * - Usa fórmula Epley para e1RM: e1RM = load * (1 + reps/30)
 * - Agrupa por semana ISO (YYYY-WW) para crear microciclos.
 * - Thresholds configurables abajo.
 */

/* --------------- CONFIGURACIÓN --------------- */
const IS_CONFIG = {
  WEEKS_FOR_TREND: 4,            // cuántas semanas mirar para la tendencia de e1RM
  STAGNATION_PCT_THRESHOLD: 0.5, // % cambio (positivo) mínimo esperado en WEEKS_FOR_TREND. Si < esto => estancamiento (0.5%)
  RPE_WINDOW_DAYS_RECENT: 14,    // ventana reciente (días) para RPE
  RPE_WINDOW_DAYS_PRIOR: 14,     // ventana previa para comparar
  RPE_INCREASE_THRESHOLD: 1.0,   //  +1.0 RPE medio => alerta de fatiga
  NOTIFY_BY_EMAIL: false,        // si true, envía emails (requiere CoachEmail en DB_Athletes)
  COACH_EMAIL_FALLBACK: ''       // si algunos atletas no tienen email, se envía a este email (opcional)
};

/* --------------- UTILIDADES --------------- */
function parseNumberSafe(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function epley1RM(load, reps) {
  if (!isFinite(load) || !isFinite(reps) || reps <= 0) return null;
  return load * (1 + reps / 30);
}

function isoYearWeek(date) {
  // devuelve "YYYY-WW"
  const d = new Date(date.getTime());
  d.setHours(0,0,0,0);
  // Thursday in current week decides year.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
  return d.getFullYear() + '-' + (weekNo < 10 ? '0' + weekNo : weekNo);
}

function formatDateISO(d) {
  if (!d) return '';
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* --------------- SETUP --------------- */
function setupAlertsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName('ALERTS');
  if (s) {
    SpreadsheetApp.getUi().alert('La hoja ALERTS ya existe. No se recreó.');
    return;
  }
  s = ss.insertSheet('ALERTS');
  const headers = ['Date','AthleteUUID','Nombre','AlertType','Metric','Value','Threshold','RecommendedAction','CoachEmail','Note'];
  s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  s.setFrozenRows(1);
  SpreadsheetApp.getUi().alert('Hoja ALERTS creada.');
}

/* --------------- FUNCION PRINCIPAL --------------- */
function detectStagnationAndFatigue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Hojas esperadas
  const athletesSheet = ss.getSheetByName('DB_Athletes');
  const logsSheet = ss.getSheetByName('DB_Logs');
  if (!athletesSheet || !logsSheet) {
    SpreadsheetApp.getUi().alert('Faltan hojas: DB_Athletes o DB_Logs. Asegurate de que existan.');
    return;
  }

  const athletesHdr = athletesSheet.getRange(1,1,1,athletesSheet.getLastColumn()).getValues()[0].map(h=> (h||'').toString().trim());
  const logsHdr = logsSheet.getRange(1,1,1,logsSheet.getLastColumn()).getValues()[0].map(h=> (h||'').toString().trim());

  // Identificamos índices
  function findIdx(arr, nameVariants) {
    const low = arr.map(x=>x.toLowerCase());
    for (const nv of nameVariants) {
      const i = low.indexOf(nv.toLowerCase());
      if (i !== -1) return i;
    }
    return -1;
  }

  const aIdx = {
    uuid: findIdx(athletesHdr, ['uuid','athleteid','athlete_uuid','athleteid']),
    nombre: findIdx(athletesHdr, ['nombre','name']),
    coachEmail: findIdx(athletesHdr, ['coachemail','coachemail','coach_email','email'])
  };

  const lIdx = {
    timestamp: findIdx(logsHdr, ['timestamp','date','fecha','datetime']),
    athleteUUID: findIdx(logsHdr, ['athlete_uuid','athleteuuid','athlete_id','athleteid','athlete']),
    lift: findIdx(logsHdr, ['exercise','lift','lift_name','lift']),
    set: findIdx(logsHdr, ['set','setnum']),
    reps: findIdx(logsHdr, ['reps','repetition','rep']),
    load: findIdx(logsHdr, ['load','weight','peso']),
    rpe: findIdx(logsHdr, ['rpe'])
  };

  if (aIdx.uuid === -1 || lIdx.athleteUUID === -1 || lIdx.timestamp === -1 || lIdx.load === -1 || lIdx.reps === -1) {
    SpreadsheetApp.getUi().alert('No encontré columnas mínimas. Chequeá headers en DB_Athletes y DB_Logs.\nDB_Athletes debe tener: UUID, Nombre\nDB_Logs debe tener: Timestamp, Athlete_UUID, Load, Reps, (opcional) RPE');
    return;
  }

  // Leer datos
  const athletesData = athletesSheet.getRange(2,1,athletesSheet.getLastRow()-1, athletesSheet.getLastColumn()).getValues();
  const logsData = logsSheet.getRange(2,1,logsSheet.getLastRow()-1, logsSheet.getLastColumn()).getValues();

  // Agrupar logs por atleta
  const logsByAthlete = {};
  for (let i=0;i<logsData.length;i++) {
    const row = logsData[i];
    const uuid = row[lIdx.athleteUUID];
    const tsRaw = row[lIdx.timestamp];
    const load = parseNumberSafe(row[lIdx.load]);
    const reps = parseNumberSafe(row[lIdx.reps]);
    const rpe = (lIdx.rpe !== -1) ? parseNumberSafe(row[lIdx.rpe]) : null;
    if (!uuid || !tsRaw) continue;
    const ts = (tsRaw instanceof Date) ? tsRaw : new Date(tsRaw);
    if (!logsByAthlete[uuid]) logsByAthlete[uuid] = [];
    logsByAthlete[uuid].push({ts, load, reps, rpe});
  }

  // Preparar ALERTS sheet
  const alertsSheet = ss.getSheetByName('ALERTS') || ss.insertSheet('ALERTS');
  if (alertsSheet.getLastRow() === 0) {
    alertsSheet.appendRow(['Date','AthleteUUID','Nombre','AlertType','Metric','Value','Threshold','RecommendedAction','CoachEmail','Note']);
    alertsSheet.getRange(1,1,1,10).setFontWeight('bold');
  }

  const alertsToWrite = [];

  // Para cada atleta con logs: calcular métricas
  for (let a=0; a<athletesData.length; a++) {
    const aRow = athletesData[a];
    const uuid = aRow[aIdx.uuid];
    const nombre = (aIdx.nombre !== -1) ? aRow[aIdx.nombre] : '';
    const coachEmail = (aIdx.coachEmail !== -1) ? aRow[aIdx.coachEmail] : IS_CONFIG.COACH_EMAIL_FALLBACK;

    if (!uuid) continue;

    const athleteLogs = logsByAthlete[uuid] || [];
    if (athleteLogs.length === 0) continue;

    // 1) TENDENCIA e1RM por semana (últimas WEEKS_FOR_TREND semanas)
    // crear mapa semana -> lista e1RMs (por sesión)
    const weekMap = {};
    athleteLogs.forEach(l => {
      if (!isFinite(l.load) || !isFinite(l.reps) || l.reps <= 0) return;
      const key = isoYearWeek(l.ts);
      const e1 = epley1RM(l.load, l.reps);
      if (!isFinite(e1)) return;
      if (!weekMap[key]) weekMap[key] = [];
      weekMap[key].push(e1);
    });

    // ordenar semanas y tomar últimas N semanas
    const weeks = Object.keys(weekMap).sort();
    if (weeks.length >= 2) {
      // compute avg e1 per week
      const weekAvgs = weeks.map(w => {
        const arr = weekMap[w];
        return { week: w, avg: arr.reduce((s,x)=>s+x,0)/arr.length };
      });

      const recent = weekAvgs.slice(-IS_CONFIG.WEEKS_FOR_TREND);
      if (recent.length >= 2) {
        const first = recent[0].avg;
        const last = recent[recent.length-1].avg;
        const pctChange = ((last - first) / first) * 100; // porcentaje
        // Stagnation check
        if (pctChange < IS_CONFIG.STAGNATION_PCT_THRESHOLD) {
          alertsToWrite.push([
            new Date(),
            uuid,
            nombre,
            'Stagnation',
            'e1RM_trend_pct',
            roundNumber(pctChange,2) + '%',
            IS_CONFIG.STAGNATION_PCT_THRESHOLD + '% (expected)',
            'Review programming: consider deload or change stimulus',
            coachEmail || '',
            `From ${recent[0].week} avg ${roundNumber(first,1)} to ${recent[recent.length-1].week} avg ${roundNumber(last,1)}`
          ]);
        }
      }
    }

    // 2) FATIGA via RPE: comparar ventanas recientes
    const now = new Date();
    const recentWindowStart = new Date(now.getTime() - IS_CONFIG.RPE_WINDOW_DAYS_RECENT * 24*60*60*1000);
    const priorWindowStart = new Date(now.getTime() - (IS_CONFIG.RPE_WINDOW_DAYS_RECENT + IS_CONFIG.RPE_WINDOW_DAYS_PRIOR) * 24*60*60*1000);

    const recentRPEs = athleteLogs.filter(l => l.rpe !== null && l.ts >= recentWindowStart).map(l => l.rpe);
    const priorRPEs = athleteLogs.filter(l => l.rpe !== null && l.ts >= priorWindowStart && l.ts < recentWindowStart).map(l => l.rpe);

    if (recentRPEs.length >= 3 && priorRPEs.length >= 3) {
      const avgRecent = recentRPEs.reduce((a,b)=>a+b,0)/recentRPEs.length;
      const avgPrior = priorRPEs.reduce((a,b)=>a+b,0)/priorRPEs.length;
      const diff = avgRecent - avgPrior;
      if (diff >= IS_CONFIG.RPE_INCREASE_THRESHOLD) {
        alertsToWrite.push([
          new Date(),
          uuid,
          nombre,
          'Fatigue',
          'RPE_delta',
          roundNumber(diff,2),
          '>' + IS_CONFIG.RPE_INCREASE_THRESHOLD,
          'Consider deload week or reduce intensity',
          coachEmail || '',
          `AvgPrior ${roundNumber(avgPrior,2)} | AvgRecent ${roundNumber(avgRecent,2)}`
        ]);
      }
    }
  } // end athletes loop

  // Escribir alertas en bloque
  if (alertsToWrite.length > 0) {
    alertsSheet.getRange(alertsSheet.getLastRow()+1, 1, alertsToWrite.length, alertsToWrite[0].length).setValues(alertsToWrite);
  }

  // Opcional: enviar emails si configurado
  if (IS_CONFIG.NOTIFY_BY_EMAIL && alertsToWrite.length > 0) {
    alertsToWrite.forEach(a => {
      const coachEmail = a[8];
      if (coachEmail && coachEmail.toString().indexOf('@') !== -1) {
        const subject = `ALERTA: ${a[3]} - ${a[2]}`;
        const body = `Hola,\n\nSe generó una alerta automática:\n\nAtleta: ${a[2]}\nTipo: ${a[3]}\nMétrica: ${a[4]} = ${a[5]}\nRecomendación: ${a[7]}\nDetalles: ${a[9]}\n\nRevisá en la hoja ALERTS de tu Spreadsheet.\n\nSaludos,\nIronSystems`;
        try {
          MailApp.sendEmail(coachEmail, subject, body);
        } catch (e) {
          // silencioso: no queremos que falle todo por un email
          Logger.log('Error enviando email a ' + coachEmail + ': ' + e.message);
        }
      }
    });
  }

  SpreadsheetApp.getUi().alert('Detección finalizada. Alertas nuevas: ' + alertsToWrite.length);
}

/* --------------- Helpers adicionales --------------- */
function roundNumber(x, decimals) {
  if (x === null || x === undefined || !isFinite(x)) return x;
  const f = Math.pow(10, decimals || 0);
  return Math.round(x * f) / f;
}
