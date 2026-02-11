# IronSystems - Tournament Manager MVP
## Roadmap ejecutable 4 semanas (Build-First Strategy)

**Objetivo:** Lanzar Tournament Manager FREE como lead magnet viral + demo técnico para LinkedIn/GitHub.

**Stack:** Google Sheets + Apps Script + Web App HTML Service + Looker Studio

**No incluye:** AppSheet, almacenamiento de videos (solo YouTube links), pagos (viene después)

---

## SEMANA 1: Core Backend + Sheet Structure

### Día 1-2: Setup & Database Schema

**Tareas:**
1. Crear Google Sheet: `IronSystems_Tournament_Template`
2. Crear hojas con headers exactos:

```
DB_Tournaments:
- TournamentID (auto UUID)
- Name
- Date
- Location
- OrganizerName
- OrganizerEmail
- Status (DRAFT/ACTIVE/CLOSED)
- CreatedAt
- WeightClassesJSON (M: 59,66,74,83,93,105,120,120+; F: 47,52,57,63,69,76,84,84+)

DB_Entries:
- EntryID (auto UUID)
- TournamentID
- AthleteName
- Sex (M/F)
- DOB
- BodyWeight
- WeightClass (auto-calculado)
- Division (Open/Junior/Master)
- Team
- SQ_Opener
- BP_Opener
- DL_Opener
- RegistrationTime
- Status (PENDING/CONFIRMED/SCRATCHED)

DB_Attempts:
- AttemptID
- TournamentID
- EntryID
- AthleteName (denorm para speed)
- Lift (SQ/BP/DL)
- AttemptNumber (1/2/3)
- Weight
- Result (GOOD/NO_LIFT/PASS)
- Order (calc automático)
- CompletedAt

DB_Results:
- TournamentID
- EntryID
- AthleteName
- Sex
- BodyWeight
- WeightClass
- Division
- Team
- BestSQ
- BestBP
- BestDL
- Total
- DOTS
- Wilks
- PlaceOverall
- PlaceByClass
- PlaceByDivision

CONFIG:
- Key | Value
- TOURNAMENT_ID | <current active tournament>
- CURRENT_LIFT | SQ/BP/DL
- CURRENT_ROUND | 1/2/3
- AUTO_INCREMENT_ORDER | TRUE/FALSE
- PLATE_LOADING_KG | 25,20,15,10,5,2.5,1.25 (string)
```

3. **Apps Script inicial** (`Code.gs`):
```javascript
// Global config
const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  SHEETS: {
    TOURNAMENTS: 'DB_Tournaments',
    ENTRIES: 'DB_Entries',
    ATTEMPTS: 'DB_Attempts',
    RESULTS: 'DB_Results',
    CONFIG: 'CONFIG'
  }
};

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏋️ Tournament Manager')
    .addItem('📋 New Tournament', 'newTournamentDialog')
    .addItem('👥 Register Athlete', 'openRegistrationForm')
    .addSeparator()
    .addItem('▶️ Start Competition', 'startCompetition')
    .addItem('⚖️ Weigh-In Panel', 'openWeighInPanel')
    .addItem('🎯 Attempt Panel', 'openAttemptPanel')
    .addSeparator()
    .addItem('📊 Generate Results', 'calculateResults')
    .addItem('📄 Export CSV', 'exportResults')
    .addToUi();
}

// UUID generator
function generateUUID() {
  return Utilities.getUuid();
}

// Get config value
function getConfig(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

// Set config value
function setConfig(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // If not found, append
  sheet.appendRow([key, value]);
}
```

**Entregable Día 1-2:**
- ✅ Sheet template con estructura completa
- ✅ Apps Script con onOpen menu
- ✅ Funciones helper (UUID, config getter/setter)

---

### Día 3-4: Core Logic - Registration & Weigh-In

**Función: newTournament()**
```javascript
function newTournamentDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial; padding: 20px; }
      input, select { width: 100%; margin: 10px 0; padding: 8px; }
      button { background: #4285f4; color: white; padding: 10px 20px; border: none; cursor: pointer; }
    </style>
    <h2>Create New Tournament</h2>
    <input id="name" placeholder="Tournament Name" />
    <input type="date" id="date" />
    <input id="location" placeholder="Location" />
    <input id="organizerName" placeholder="Organizer Name" />
    <input id="organizerEmail" type="email" placeholder="Email" />
    <button onclick="createTournament()">Create</button>
    
    <script>
      function createTournament() {
        const data = {
          name: document.getElementById('name').value,
          date: document.getElementById('date').value,
          location: document.getElementById('location').value,
          organizerName: document.getElementById('organizerName').value,
          organizerEmail: document.getElementById('organizerEmail').value
        };
        google.script.run.withSuccessHandler(() => {
          alert('Tournament created!');
          google.script.host.close();
        }).createNewTournament(data);
      }
    </script>
  `).setWidth(400).setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'New Tournament');
}

function createNewTournament(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.TOURNAMENTS);
  
  const tournamentId = generateUUID();
  const weightClassesDefault = JSON.stringify({
    M: [59,66,74,83,93,105,120,'120+'],
    F: [47,52,57,63,69,76,84,'84+']
  });
  
  sheet.appendRow([
    tournamentId,
    data.name,
    data.date,
    data.location,
    data.organizerName,
    data.organizerEmail,
    'DRAFT',
    new Date(),
    weightClassesDefault
  ]);
  
  setConfig('TOURNAMENT_ID', tournamentId);
  return tournamentId;
}
```

**Función: registerAthlete()**
```javascript
function openRegistrationForm() {
  const tournamentId = getConfig('TOURNAMENT_ID');
  if (!tournamentId) {
    SpreadsheetApp.getUi().alert('No active tournament. Create one first.');
    return;
  }
  
  const html = HtmlService.createTemplateFromFile('RegistrationForm');
  html.tournamentId = tournamentId;
  
  SpreadsheetApp.getUi().showModalDialog(
    html.evaluate().setWidth(500).setHeight(600),
    'Athlete Registration'
  );
}

function registerAthlete(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ENTRIES);
  
  const entryId = generateUUID();
  const weightClass = calculateWeightClass(data.sex, data.bodyWeight);
  
  sheet.appendRow([
    entryId,
    data.tournamentId,
    data.athleteName,
    data.sex,
    data.dob,
    data.bodyWeight,
    weightClass,
    data.division,
    data.team || '',
    data.sqOpener,
    data.bpOpener,
    data.dlOpener,
    new Date(),
    'CONFIRMED'
  ]);
  
  return entryId;
}

function calculateWeightClass(sex, bodyWeight) {
  const classes = {
    M: [59,66,74,83,93,105,120],
    F: [47,52,57,63,69,76,84]
  };
  
  const limits = classes[sex];
  for (let i = 0; i < limits.length; i++) {
    if (bodyWeight <= limits[i]) return limits[i];
  }
  return sex === 'M' ? '120+' : '84+';
}
```

**HTML File: RegistrationForm.html**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial; padding: 20px; }
    .form-group { margin: 15px 0; }
    label { display: block; font-weight: bold; margin-bottom: 5px; }
    input, select { width: 100%; padding: 8px; box-sizing: border-box; }
    button { background: #4285f4; color: white; padding: 12px 24px; border: none; cursor: pointer; width: 100%; }
    button:hover { background: #357ae8; }
  </style>
</head>
<body>
  <h2>Register Athlete</h2>
  <form id="regForm">
    <div class="form-group">
      <label>Name *</label>
      <input type="text" id="athleteName" required />
    </div>
    
    <div class="form-group">
      <label>Sex *</label>
      <select id="sex" required>
        <option value="">Select...</option>
        <option value="M">Male</option>
        <option value="F">Female</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Date of Birth</label>
      <input type="date" id="dob" />
    </div>
    
    <div class="form-group">
      <label>Body Weight (kg) *</label>
      <input type="number" step="0.1" id="bodyWeight" required />
    </div>
    
    <div class="form-group">
      <label>Division</label>
      <select id="division">
        <option value="Open">Open</option>
        <option value="Junior">Junior</option>
        <option value="Master">Master</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Team</label>
      <input type="text" id="team" />
    </div>
    
    <hr>
    <h3>Opening Attempts (kg)</h3>
    
    <div class="form-group">
      <label>Squat Opener *</label>
      <input type="number" step="2.5" id="sqOpener" required />
    </div>
    
    <div class="form-group">
      <label>Bench Press Opener *</label>
      <input type="number" step="2.5" id="bpOpener" required />
    </div>
    
    <div class="form-group">
      <label>Deadlift Opener *</label>
      <input type="number" step="2.5" id="dlOpener" required />
    </div>
    
    <button type="submit">Register Athlete</button>
  </form>
  
  <script>
    document.getElementById('regForm').onsubmit = function(e) {
      e.preventDefault();
      
      const data = {
        tournamentId: '<?= tournamentId ?>',
        athleteName: document.getElementById('athleteName').value,
        sex: document.getElementById('sex').value,
        dob: document.getElementById('dob').value,
        bodyWeight: parseFloat(document.getElementById('bodyWeight').value),
        division: document.getElementById('division').value,
        team: document.getElementById('team').value,
        sqOpener: parseFloat(document.getElementById('sqOpener').value),
        bpOpener: parseFloat(document.getElementById('bpOpener').value),
        dlOpener: parseFloat(document.getElementById('dlOpener').value)
      };
      
      google.script.run
        .withSuccessHandler(onSuccess)
        .withFailureHandler(onError)
        .registerAthlete(data);
    };
    
    function onSuccess(entryId) {
      alert('Athlete registered successfully!');
      google.script.host.close();
    }
    
    function onError(error) {
      alert('Error: ' + error.message);
    }
  </script>
</body>
</html>
```

**Entregable Día 3-4:**
- ✅ New Tournament wizard funcional
- ✅ Athlete registration form con validación
- ✅ Auto-cálculo de weight class

---

### Día 5-7: Competition Flow - Attempt Management

**Función: startCompetition()**
```javascript
function startCompetition() {
  const tournamentId = getConfig('TOURNAMENT_ID');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tourSheet = ss.getSheetByName(CONFIG.SHEETS.TOURNAMENTS);
  
  // Update status to ACTIVE
  const tourData = tourSheet.getDataRange().getValues();
  for (let i = 1; i < tourData.length; i++) {
    if (tourData[i][0] === tournamentId) {
      tourSheet.getRange(i + 1, 7).setValue('ACTIVE'); // Status column
      break;
    }
  }
  
  // Initialize attempt tracking
  setConfig('CURRENT_LIFT', 'SQ');
  setConfig('CURRENT_ROUND', '1');
  
  // Generate initial attempt order
  generateAttemptOrder('SQ', 1);
  
  SpreadsheetApp.getUi().alert('Competition started! Current: Squat Round 1');
}

function generateAttemptOrder(lift, round) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entriesSheet = ss.getSheetByName(CONFIG.SHEETS.ENTRIES);
  const attemptsSheet = ss.getSheetByName(CONFIG.SHEETS.ATTEMPTS);
  const tournamentId = getConfig('TOURNAMENT_ID');
  
  const entries = entriesSheet.getDataRange().getValues();
  const attempts = [];
  
  for (let i = 1; i < entries.length; i++) {
    if (entries[i][1] !== tournamentId || entries[i][13] !== 'CONFIRMED') continue;
    
    const entryId = entries[i][0];
    const athleteName = entries[i][2];
    let weight;
    
    // Get opener or previous attempt + increment
    if (round === 1) {
      weight = lift === 'SQ' ? entries[i][9] : lift === 'BP' ? entries[i][10] : entries[i][11];
    } else {
      weight = getNextAttemptWeight(entryId, lift, round);
    }
    
    attempts.push({
      entryId: entryId,
      athleteName: athleteName,
      weight: weight
    });
  }
  
  // Sort by weight (ascending)
  attempts.sort((a, b) => a.weight - b.weight);
  
  // Write to DB_Attempts
  for (let i = 0; i < attempts.length; i++) {
    attemptsSheet.appendRow([
      generateUUID(),
      tournamentId,
      attempts[i].entryId,
      attempts[i].athleteName,
      lift,
      round,
      attempts[i].weight,
      '', // Result (empty initially)
      i + 1, // Order
      '' // CompletedAt
    ]);
  }
}

function getNextAttemptWeight(entryId, lift, round) {
  // Logic to get last successful attempt + increment
  // For now, placeholder:
  return 100; // Replace with actual logic
}
```

**Función: Attempt Panel (HTML Service Web App)**
```javascript
function openAttemptPanel() {
  const html = HtmlService.createTemplateFromFile('AttemptPanel')
    .evaluate()
    .setWidth(800)
    .setHeight(600);
  
  SpreadsheetApp.getUi().showModelessDialog(html, 'Attempt Panel');
}

function getCurrentAttempts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ATTEMPTS);
  const tournamentId = getConfig('TOURNAMENT_ID');
  const currentLift = getConfig('CURRENT_LIFT');
  const currentRound = parseInt(getConfig('CURRENT_ROUND'));
  
  const data = sheet.getDataRange().getValues();
  const attempts = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === tournamentId && 
        data[i][4] === currentLift && 
        data[i][5] === currentRound &&
        data[i][7] === '') { // Result empty = pending
      
      attempts.push({
        attemptId: data[i][0],
        athleteName: data[i][3],
        weight: data[i][6],
        order: data[i][8]
      });
    }
  }
  
  return {
    lift: currentLift,
    round: currentRound,
    attempts: attempts.sort((a, b) => a.order - b.order)
  };
}

function recordAttempt(attemptId, result) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ATTEMPTS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === attemptId) {
      sheet.getRange(i + 1, 8).setValue(result); // Result column
      sheet.getRange(i + 1, 10).setValue(new Date()); // CompletedAt
      break;
    }
  }
  
  // Check if round is complete
  checkRoundComplete();
}

function checkRoundComplete() {
  const current = getCurrentAttempts();
  if (current.attempts.length === 0) {
    // Round complete, advance
    advanceRound();
  }
}

function advanceRound() {
  const currentLift = getConfig('CURRENT_LIFT');
  const currentRound = parseInt(getConfig('CURRENT_ROUND'));
  
  if (currentRound < 3) {
    setConfig('CURRENT_ROUND', (currentRound + 1).toString());
    generateAttemptOrder(currentLift, currentRound + 1);
  } else {
    // Move to next lift
    const nextLift = currentLift === 'SQ' ? 'BP' : currentLift === 'BP' ? 'DL' : 'DONE';
    if (nextLift === 'DONE') {
      SpreadsheetApp.getUi().alert('Competition complete! Generate results.');
      return;
    }
    setConfig('CURRENT_LIFT', nextLift);
    setConfig('CURRENT_ROUND', '1');
    generateAttemptOrder(nextLift, 1);
  }
}
```

**AttemptPanel.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial; padding: 20px; background: #f5f5f5; }
    .header { background: #4285f4; color: white; padding: 20px; margin: -20px -20px 20px; }
    .attempt-card { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4285f4; }
    .buttons { margin-top: 10px; }
    button { padding: 8px 16px; margin-right: 10px; cursor: pointer; }
    .good { background: #34a853; color: white; border: none; }
    .fail { background: #ea4335; color: white; border: none; }
    .pass { background: #fbbc04; border: none; }
  </style>
</head>
<body>
  <div class="header">
    <h2 id="liftTitle">Loading...</h2>
  </div>
  
  <div id="attempts"></div>
  
  <script>
    loadAttempts();
    
    function loadAttempts() {
      google.script.run
        .withSuccessHandler(renderAttempts)
        .getCurrentAttempts();
    }
    
    function renderAttempts(data) {
      document.getElementById('liftTitle').textContent = 
        `${data.lift} - Round ${data.round}`;
      
      const container = document.getElementById('attempts');
      container.innerHTML = '';
      
      data.attempts.forEach(attempt => {
        const card = document.createElement('div');
        card.className = 'attempt-card';
        card.innerHTML = `
          <h3>${attempt.athleteName}</h3>
          <p><strong>${attempt.weight} kg</strong></p>
          <div class="buttons">
            <button class="good" onclick="record('${attempt.attemptId}', 'GOOD')">✓ Good Lift</button>
            <button class="fail" onclick="record('${attempt.attemptId}', 'NO_LIFT')">✗ No Lift</button>
            <button class="pass" onclick="record('${attempt.attemptId}', 'PASS')">→ Pass</button>
          </div>
        `;
        container.appendChild(card);
      });
    }
    
    function record(attemptId, result) {
      google.script.run
        .withSuccessHandler(loadAttempts)
        .recordAttempt(attemptId, result);
    }
    
    // Auto-refresh every 5 seconds
    setInterval(loadAttempts, 5000);
  </script>
</body>
</html>
```

**Entregable Día 5-7:**
- ✅ Competition start logic
- ✅ Attempt ordering system
- ✅ Live attempt panel (modeless dialog)
- ✅ Auto-advance rounds

---

## SEMANA 2: Results & Exports

### Día 8-10: Results Calculation

**Función: calculateResults()**
```javascript
function calculateResults() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entriesSheet = ss.getSheetByName(CONFIG.SHEETS.ENTRIES);
  const attemptsSheet = ss.getSheetByName(CONFIG.SHEETS.ATTEMPTS);
  const resultsSheet = ss.getSheetByName(CONFIG.SHEETS.RESULTS);
  const tournamentId = getConfig('TOURNAMENT_ID');
  
  // Clear existing results
  resultsSheet.clear();
  resultsSheet.appendRow([
    'TournamentID', 'EntryID', 'AthleteName', 'Sex', 'BodyWeight', 'WeightClass',
    'Division', 'Team', 'BestSQ', 'BestBP', 'BestDL', 'Total', 'DOTS', 'Wilks',
    'PlaceOverall', 'PlaceByClass', 'PlaceByDivision'
  ]);
  
  const entries = entriesSheet.getDataRange().getValues();
  const attempts = attemptsSheet.getDataRange().getValues();
  const results = [];
  
  for (let i = 1; i < entries.length; i++) {
    if (entries[i][1] !== tournamentId) continue;
    
    const entryId = entries[i][0];
    const athleteName = entries[i][2];
    const sex = entries[i][3];
    const bodyWeight = entries[i][5];
    const weightClass = entries[i][6];
    const division = entries[i][7];
    const team = entries[i][8];
    
    // Get best lifts
    const bestSQ = getBestLift(attempts, entryId, 'SQ');
    const bestBP = getBestLift(attempts, entryId, 'BP');
    const bestDL = getBestLift(attempts, entryId, 'DL');
    const total = bestSQ + bestBP + bestDL;
    
    if (total === 0) continue; // Bombed out
    
    const dots = calculateDOTS(sex, bodyWeight, total);
    const wilks = calculateWilks(sex, bodyWeight, total);
    
    results.push({
      tournamentId, entryId, athleteName, sex, bodyWeight, weightClass,
      division, team, bestSQ, bestBP, bestDL, total, dots, wilks
    });
  }
  
  // Sort by total (descending)
  results.sort((a, b) => b.total - a.total);
  
  // Assign places
  for (let i = 0; i < results.length; i++) {
    results[i].placeOverall = i + 1;
  }
  
  // Place by class and division (simplified - implement full logic)
  results.forEach((r, i) => {
    r.placeByClass = i + 1; // Placeholder
    r.placeByDivision = i + 1; // Placeholder
  });
  
  // Write to sheet
  results.forEach(r => {
    resultsSheet.appendRow([
      r.tournamentId, r.entryId, r.athleteName, r.sex, r.bodyWeight, r.weightClass,
      r.division, r.team, r.bestSQ, r.bestBP, r.bestDL, r.total, r.dots, r.wilks,
      r.placeOverall, r.placeByClass, r.placeByDivision
    ]);
  });
  
  SpreadsheetApp.getUi().alert('Results calculated!');
}

function getBestLift(attempts, entryId, lift) {
  let best = 0;
  for (let i = 1; i < attempts.length; i++) {
    if (attempts[i][2] === entryId && 
        attempts[i][4] === lift && 
        attempts[i][7] === 'GOOD') {
      best = Math.max(best, attempts[i][6]);
    }
  }
  return best;
}

function calculateDOTS(sex, bodyWeight, total) {
  // DOTS formula
  const coeff = sex === 'M' ?
    {a: -0.0000010930, b: 0.0007391293, c: -0.1918759221, d: 24.0900756, e: -307.75076} :
    {a: -0.0000010706, b: 0.0005158568, c: -0.1126655495, d: 13.6175032, e: -57.96288};
  
  const denom = coeff.a * Math.pow(bodyWeight, 4) +
                coeff.b * Math.pow(bodyWeight, 3) +
                coeff.c * Math.pow(bodyWeight, 2) +
                coeff.d * bodyWeight + coeff.e;
  
  return parseFloat((500 / denom * total).toFixed(2));
}

function calculateWilks(sex, bodyWeight, total) {
  // Wilks formula (legacy, but still used)
  const coeff = sex === 'M' ?
    [47.46178854, 8.472061379, 0.07369410346, -0.001395833811, 7.07665973070743e-6, -1.20804336482315e-8] :
    [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 0.00004731582, -0.00000009054];
  
  const denom = coeff[0] + 
                coeff[1] * bodyWeight +
                coeff[2] * Math.pow(bodyWeight, 2) +
                coeff[3] * Math.pow(bodyWeight, 3) +
                coeff[4] * Math.pow(bodyWeight, 4) +
                coeff[5] * Math.pow(bodyWeight, 5);
  
  return parseFloat((total * 500 / denom).toFixed(2));
}
```

### Día 11-12: CSV Export & Looker Dashboard

**Función: exportResults()**
```javascript
function exportResults() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultsSheet = ss.getSheetByName(CONFIG.SHEETS.RESULTS);
  const tournamentId = getConfig('TOURNAMENT_ID');
  
  const data = resultsSheet.getDataRange().getValues();
  let csv = data.map(row => row.join(',')).join('\n');
  
  // Create file in Drive
  const folder = DriveApp.getFolderById('YOUR_FOLDER_ID'); // Configure this
  const file = folder.createFile(`tournament_${tournamentId}_results.csv`, csv, MimeType.CSV);
  
  SpreadsheetApp.getUi().alert('Exported to Drive: ' + file.getUrl());
}
```

**Looker Studio Dashboard Setup:**
1. Connect to Google Sheets as data source
2. Create visualizations:
   - Leaderboard table (sorted by Total)
   - DOTS vs Body Weight scatter
   - Attempts success rate by lift
   - Team performance comparison

**Entregable Día 11-12:**
- ✅ Results calculation with DOTS/Wilks
- ✅ CSV export to Drive
- ✅ Basic Looker Studio dashboard template

---

### Día 13-14: Public Results Web App

**Función: doGet() - Web App Entry Point**
```javascript
function doGet(e) {
  const tournamentId = e.parameter.id || getConfig('TOURNAMENT_ID');
  const template = HtmlService.createTemplateFromFile('PublicResults');
  template.tournamentId = tournamentId;
  
  return template.evaluate()
    .setTitle('Tournament Results - IronSystems')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getTournamentData(tournamentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tourSheet = ss.getSheetByName(CONFIG.SHEETS.TOURNAMENTS);
  const resultsSheet = ss.getSheetByName(CONFIG.SHEETS.RESULTS);
  
  // Get tournament info
  const tourData = tourSheet.getDataRange().getValues();
  let tournament = null;
  for (let i = 1; i < tourData.length; i++) {
    if (tourData[i][0] === tournamentId) {
      tournament = {
        name: tourData[i][1],
        date: tourData[i][2],
        location: tourData[i][3]
      };
      break;
    }
  }
  
  // Get results
  const resultsData = resultsSheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < resultsData.length; i++) {
    if (resultsData[i][0] === tournamentId) {
      results.push({
        place: resultsData[i][14],
        name: resultsData[i][2],
        sex: resultsData[i][3],
        bodyWeight: resultsData[i][4],
        weightClass: resultsData[i][5],
        division: resultsData[i][6],
        team: resultsData[i][7],
        squat: resultsData[i][8],
        bench: resultsData[i][9],
        deadlift: resultsData[i][10],
        total: resultsData[i][11],
        dots: resultsData[i][12]
      });
    }
  }
  
  return { tournament, results };
}
```

**PublicResults.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    th, td { padding: 15px; text-align: left; }
    th { background: #667eea; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f9f9f9; }
    .gold { background: #ffd700 !important; font-weight: bold; }
    .silver { background: #c0c0c0 !important; }
    .bronze { background: #cd7f32 !important; }
    .footer { text-align: center; padding: 40px; color: #666; }
    .footer a { color: #667eea; text-decoration: none; }
    @media (max-width: 768px) {
      table { font-size: 0.9em; }
      th, td { padding: 10px 5px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 id="tournamentName">Loading...</h1>
    <p id="tournamentInfo"></p>
  </div>
  
  <div class="container">
    <table id="resultsTable">
      <thead>
        <tr>
          <th>Place</th>
          <th>Name</th>
          <th>Class</th>
          <th>BW</th>
          <th>SQ</th>
          <th>BP</th>
          <th>DL</th>
          <th>Total</th>
          <th>DOTS</th>
        </tr>
      </thead>
      <tbody id="resultsBody"></tbody>
    </table>
  </div>
  
  <div class="footer">
    <p>Powered by <a href="#" target="_blank"><strong>IronSystems</strong></a> 🏋️</p>
    <p>Want to run your own tournament? <a href="#">Get the free template</a></p>
  </div>
  
  <script>
    const tournamentId = '<?= tournamentId ?>';
    
    google.script.run
      .withSuccessHandler(renderResults)
      .getTournamentData(tournamentId);
    
    function renderResults(data) {
      document.getElementById('tournamentName').textContent = data.tournament.name;
      document.getElementById('tournamentInfo').textContent = 
        `${data.tournament.location} • ${data.tournament.date}`;
      
      const tbody = document.getElementById('resultsBody');
      data.results.forEach(r => {
        const row = tbody.insertRow();
        
        // Apply medal styling
        if (r.place === 1) row.className = 'gold';
        else if (r.place === 2) row.className = 'silver';
        else if (r.place === 3) row.className = 'bronze';
        
        row.innerHTML = `
          <td>${r.place}</td>
          <td><strong>${r.name}</strong>${r.team ? ` (${r.team})` : ''}</td>
          <td>${r.weightClass}${r.sex}</td>
          <td>${r.bodyWeight}</td>
          <td>${r.squat}</td>
          <td>${r.bench}</td>
          <td>${r.deadlift}</td>
          <td><strong>${r.total}</strong></td>
          <td>${r.dots}</td>
        `;
      });
    }
  </script>
</body>
</html>
```

**Deployment:**
1. Apps Script > Deploy > New Deployment
2. Type: Web App
3. Execute as: Me
4. Who has access: Anyone
5. Copy URL (format: `https://script.google.com/macros/s/XXXXX/exec`)

**Entregable Día 13-14:**
- ✅ Public results web app (responsive)
- ✅ Sharable URL with tournament ID parameter
- ✅ "Powered by IronSystems" branding

---

## SEMANA 3: Polish & Documentation

### Día 15-17: UI/UX Improvements

**Tasks:**
1. Add loading spinners to all dialogs
2. Implement error handling (try-catch all functions)
3. Add confirmation dialogs for critical actions
4. Create plate calculator helper (shows which plates to load)
5. Add attempt history view for each athlete
6. Implement "undo last attempt" function

**Plate Calculator Example:**
```javascript
function calculatePlateLoading(targetWeight) {
  const barWeight = 20; // Standard bar
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const perSide = (targetWeight - barWeight) / 2;
  
  let remaining = perSide;
  const loading = [];
  
  for (const plate of plates) {
    while (remaining >= plate) {
      loading.push(plate);
      remaining -= plate;
    }
  }
  
  return {
    perSide: loading,
    display: loading.map(p => `${p}kg`).join(' + ') || 'Empty bar'
  };
}
```

### Día 18-19: Documentation & Marketing Assets

**Create:**
1. `README.md` with:
   - What is IronSystems Tournament Manager
   - Features list
   - Installation guide (copy template link)
   - Quick start (5 steps)
   - Screenshots
   - FAQ

2. `SETUP_GUIDE.md`:
   - Step-by-step setup (15 minutes)
   - Configure Apps Script
   - Deploy web app
   - Test with sample data

3. Demo Video Script (3-5 min):
   - "Running a powerlifting meet is chaos..."
   - "Meet IronSystems"
   - Quick walkthrough: create tournament → register athletes → run attempts → publish results
   - "Get started free: [link]"

4. Sample Data Generator:
```javascript
function generateSampleTournament() {
  const sampleAthletes = [
    {name: 'John Smith', sex: 'M', bw: 82.5, sq: 200, bp: 140, dl: 240},
    {name: 'Jane Doe', sex: 'F', bw: 63.2, sq: 120, bp: 70, dl: 150},
    // Add 8 more...
  ];
  
  const tournamentId = createNewTournament({
    name: 'Sample Meet 2026',
    date: '2026-03-15',
    location: 'Demo Gym',
    organizerName: 'Demo User',
    organizerEmail: 'demo@example.com'
  });
  
  sampleAthletes.forEach(athlete => {
    registerAthlete({
      tournamentId: tournamentId,
      athleteName: athlete.name,
      sex: athlete.sex,
      bodyWeight: athlete.bw,
      sqOpener: athlete.sq,
      bpOpener: athlete.bp,
      dlOpener: athlete.dl,
      division: 'Open'
    });
  });
  
  SpreadsheetApp.getUi().alert('Sample tournament created!');
}
```

**Entregable Día 18-19:**
- ✅ Complete documentation
- ✅ Demo video (record with Loom/OBS)
- ✅ Sample tournament generator
- ✅ Marketing copy for LinkedIn post

---

### Día 20-21: Testing & Bug Fixes

**QA Checklist:**
- [ ] Create tournament → registers correctly
- [ ] Register 10 athletes → no duplicates
- [ ] Start competition → attempts generated in order
- [ ] Record good/bad lifts → updates correctly
- [ ] Round advances automatically
- [ ] Results calculate DOTS/Wilks correctly
- [ ] CSV export works
- [ ] Public web app loads and displays results
- [ ] Mobile responsive (test on phone)
- [ ] Error handling (try to break it)

**Load Testing:**
- Test with 50 athletes
- Test with 100 attempts in queue
- Measure performance (should load <3s)

---

## SEMANA 4: Launch & Distribution

### Día 22-23: Repository Setup

**GitHub Repo Structure:**
```
ironsystems-tournament-manager/
├── README.md
├── SETUP_GUIDE.md
├── LICENSE (MIT)
├── apps-script/
│   ├── Code.gs
│   ├── RegistrationForm.html
│   ├── AttemptPanel.html
│   └── PublicResults.html
├── template/
│   └── IronSystems_Tournament_Template.xlsx
├── docs/
│   ├── screenshots/
│   └── demo-video.md (link to YouTube)
└── .github/
    └── README.md (GitHub profile showcase)
```

**README Highlights:**
```markdown
# 🏋️ IronSystems Tournament Manager

Free, open-source tournament management system for powerlifting meets.

## Features
✅ Athlete registration & weigh-in
✅ Automated attempt ordering
✅ Live scoring panel
✅ DOTS & Wilks calculation
✅ Public results page
✅ CSV export for records

## Quick Start
1. Copy template: [Link]
2. Enable Apps Script
3. Deploy web app
4. Run your meet!

[Demo] [Video] [Docs]
```

### Día 24-25: LinkedIn Launch Campaign

**Post 1 (Launch Day):**
```
🚀 I built a free powerlifting tournament manager in Google Sheets

After seeing meet organizers struggle with Excel, I spent 4 weeks building IronSystems - a complete tournament management system.

Features:
• Automated attempt ordering
• Live scoring panel
• Public results page (shareable URL)
• DOTS/Wilks auto-calculation
• 100% free & open source

Built with: Apps Script, HTML, JavaScript
Time investment: 80 hours
Lines of code: ~1,500

The best part? It runs on Google Sheets - no server costs, no installation.

Try it: [GitHub link]
Demo: [Video link]

What problem should I solve next? 👇

#PowerliftingTech #SideProject #OpenSource
```

**Post 2 (Technical Deep Dive - 3 days later):**
```
How I built a tournament management system without a backend 🧵

Tech choices that made this possible:
1. Google Sheets as database (free, collaborative, no setup)
2. Apps Script for business logic (JavaScript, integrated)
3. HTML Service for UI (responsive, no hosting)
4. Looker Studio for analytics (free dashboards)

Key challenges solved:
• Attempt ordering algorithm
• Real-time updates in modeless dialogs
• Mobile-responsive forms
• DOTS calculation accuracy

Full code walkthrough: [GitHub]

[Screenshots/Demo GIF]
```

**Post 3 (Case Study - 1 week later):**
```
Update: IronSystems was used at its first real meet this weekend!

Results:
• 32 athletes registered
• 288 attempts recorded
• 0 manual calculations
• Results published live during event

Organizer feedback: "This saved us 4+ hours"

Next feature request: Team scoring 👀

[Photo from meet with IronSystems visible]
```

### Día 26-28: Community Outreach

**Distribution Channels:**
1. **Reddit:**
   - r/powerlifting (share as "I made this")
   - r/weightroom
   - r/googlesheets (technical angle)

2. **Facebook Groups:**
   - Local powerlifting federations
   - Coaching groups
   - "Powerlifting Coaches & Athletes"

3. **Direct Outreach:**
   - Email 10 meet directors with template
   - Offer to help set it up for their next meet (case study)

4. **YouTube:**
   - Upload demo video
   - Create setup tutorial
   - "How I built X" technical walkthrough

**Email Template (for meet directors):**
```
Subject: Free tournament management tool for your next meet

Hi [Name],

I noticed you run [Federation] meets in [Location]. I recently built a free tournament software that might save you time.

IronSystems handles:
✓ Registration & weigh-ins
✓ Attempt ordering
✓ Live scoring
✓ Public results page

It runs in Google Sheets (no installation, no cost).

Would you be interested in testing it for your next meet? I can help set it up.

Demo: [link]
Template: [link]

[Your Name]
```

---

## Success Metrics (End of Week 4)

**Code Quality:**
- [ ] 0 critical bugs in core flow
- [ ] Code commented and documented
- [ ] GitHub repo with professional README

**Adoption:**
- [ ] 50+ template downloads
- [ ] 3+ real meets using the system
- [ ] 10+ GitHub stars

**Visibility:**
- [ ] 3 LinkedIn posts (1,000+ impressions each)
- [ ] 2 community posts (Reddit/FB)
- [ ] 1 demo video (100+ views)

**Portfolio:**
- [ ] Case study written
- [ ] Technical writeup published
- [ ] Added to resume/portfolio site

---

## Next Steps (Post-Launch)

1. **Collect Feedback** (Week 5-6):
   - Survey users
   - Track feature requests
   - Monitor bug reports

2. **V2 Planning** (Week 7-8):
   - Team scoring
   - Historical database
   - Mobile app (PWA)

3. **Monetization Test** (Week 9+):
   - Premium features (advanced analytics, branding)
   - Target: $40/month tier validation
   - Need: 10 paying users to validate model

---

## Resources Needed

**Tools (All Free):**
- Google Workspace account
- GitHub account
- Loom/OBS for screen recording
- Canva for graphics

**Time Investment:**
- Week 1: 20-25 hours (core backend)
- Week 2: 15-20 hours (results & exports)
- Week 3: 15-20 hours (polish & docs)
- Week 4: 10-15 hours (launch & marketing)
- **Total: ~70-80 hours**

**Skills Required:**
- Apps Script (JavaScript)
- HTML/CSS (basic)
- Google Sheets formulas
- Git/GitHub basics

---

## Critical Success Factors

1. **Ship Fast:** Get V1 to users in 4 weeks, not perfect
2. **Real Users:** Use at 1 real meet to validate
3. **Content:** LinkedIn posts drive 80% of visibility
4. **Open Source:** GitHub stars = credibility
5. **Documentation:** Good docs = lower support burden

---

## Red Flags to Watch

⚠️ **No users after 2 weeks** → Distribution problem, not product
⚠️ **Scope creep** → Feature requests derail timeline
⚠️ **Perfectionism** → Shipping beats polishing
⚠️ **No validation** → Build features users actually want

---

**Next Immediate Action:** Copy this roadmap, create GitHub repo, start Day 1 tasks 🚀
