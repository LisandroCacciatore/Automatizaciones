# START HERE - Guía de Acción Inmediata
## IronSystems Tournament Manager - Primeros Pasos

**Tiempo estimado:** 2-3 horas para tener algo funcional
**Objetivo:** Al final de este documento, tendrás un prototipo mínimo funcionando

---

## 🎯 TU PRÓXIMO PASO (elige uno)

### Opción A: Máxima Velocidad (Recomendado para Build-First)
**"Quiero algo funcional en 3 horas para mostrarlo hoy"**

→ Salta a la sección: [SPRINT DE 3 HORAS](#sprint-de-3-horas)

### Opción B: Fundamento Sólido
**"Quiero empezar bien, con repo y docs"**

→ Sigue el orden de este documento completo

---

## FASE 0: Preparación (15 minutos)

### 1. Crear Repo de GitHub
```bash
# En tu terminal
mkdir ironsystems-tournament
cd ironsystems-tournament
git init
```

**En GitHub.com:**
1. New Repository
2. Nombre: `ironsystems-tournament-manager`
3. Description: "Free powerlifting meet management system built on Google Sheets"
4. ✅ Public
5. ✅ Add README
6. License: MIT
7. Create

```bash
# Conectar local con GitHub
git remote add origin https://github.com/TU_USERNAME/ironsystems-tournament-manager.git
git pull origin main
```

### 2. Crear README Inicial
```bash
touch README.md
```

**Contenido mínimo:**
```markdown
# 🏋️ IronSystems Tournament Manager

> Free powerlifting meet management system - Work in Progress

**Status:** 🚧 Under development (Week 1/4)

## What I'm Building
A complete tournament management system for powerlifting meets that runs on Google Sheets.

### Planned Features
- [ ] Athlete registration
- [ ] Automated attempt ordering  
- [ ] Live scoring panel
- [ ] Results calculation (DOTS/Wilks)
- [ ] Public results page

## Tech Stack
- Apps Script (serverless backend)
- Google Sheets (database)
- HTML/CSS/JS (frontend)

## Progress
Follow along: [LinkedIn](#) | [YouTube](#)

---
**Building in public** | Started: [fecha de hoy]
```

```bash
git add README.md
git commit -m "Initial commit - project kickoff"
git push origin main
```

### 3. Setup de Sheets
1. Ir a [sheets.google.com](https://sheets.google.com)
2. Crear nuevo Sheet
3. Renombrar: `IronSystems_Tournament_Dev`
4. Compartir: Link con acceso de editor (para testing)

---

## FASE 1: Database Schema (30 minutos)

### Crear Hojas (Sheets)

**1. DB_Tournaments**
Headers (fila 1):
```
TournamentID | Name | Date | Location | OrganizerName | OrganizerEmail | Status | CreatedAt | WeightClassesJSON
```

**2. DB_Entries**
Headers:
```
EntryID | TournamentID | AthleteName | Sex | DOB | BodyWeight | WeightClass | Division | Team | SQ_Opener | BP_Opener | DL_Opener | RegistrationTime | Status
```

**3. DB_Attempts**
Headers:
```
AttemptID | TournamentID | EntryID | AthleteName | Lift | AttemptNumber | Weight | Result | Order | CompletedAt
```

**4. DB_Results**
Headers:
```
TournamentID | EntryID | AthleteName | Sex | BodyWeight | WeightClass | Division | Team | BestSQ | BestBP | BestDL | Total | DOTS | Wilks | PlaceOverall | PlaceByClass | PlaceByDivision
```

**5. CONFIG**
Headers:
```
Key | Value
```

Datos iniciales:
```
TOURNAMENT_ID | 
CURRENT_LIFT | SQ
CURRENT_ROUND | 1
BAR_WEIGHT_KG | 20
PLATE_LOADING_KG | 25,20,15,10,5,2.5,1.25
```

### Proteger Hojas (Opcional)
1. Click derecho en tab de hoja → "Protect sheet"
2. Permissions: Solo tú puedes editar
3. Aplicar a: DB_Results, CONFIG

---

## FASE 2: Apps Script Básico (45 minutos)

### Abrir Editor
1. En tu Sheet: Extensions → Apps Script
2. Renombrar proyecto: "IronSystems Tournament Manager"
3. Borrar contenido de `Code.gs`

### Código Inicial (copiar todo)

```javascript
/**
 * IronSystems Tournament Manager
 * Version: 0.1.0
 * Author: [Tu nombre]
 */

// === CONFIGURACIÓN ===
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

// === MENU PRINCIPAL ===
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏋️ Tournament Manager')
    .addItem('📋 New Tournament', 'newTournamentDialog')
    .addItem('👥 Register Athlete', 'openRegistrationForm')
    .addSeparator()
    .addItem('🎯 Test Installation', 'testInstallation')
    .addToUi();
}

// === HELPERS ===
function generateUUID() {
  return Utilities.getUuid();
}

function getConfig(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

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
  sheet.appendRow([key, value]);
}

// === TEST DE INSTALACIÓN ===
function testInstallation() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Test 1: Sheets exist
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requiredSheets = Object.values(CONFIG.SHEETS);
    
    requiredSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);
    });
    
    // Test 2: UUID generation
    const testUUID = generateUUID();
    if (!testUUID || testUUID.length < 10) {
      throw new Error('UUID generation failed');
    }
    
    // Test 3: Config read/write
    setConfig('TEST_KEY', 'TEST_VALUE');
    const value = getConfig('TEST_KEY');
    if (value !== 'TEST_VALUE') {
      throw new Error('Config read/write failed');
    }
    
    ui.alert('✅ Installation Test Passed', 
             'All systems working correctly!', 
             ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('❌ Installation Test Failed', 
             error.message, 
             ui.ButtonSet.OK);
  }
}

// === CREAR TORNEO ===
function newTournamentDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial; padding: 20px; }
      input { width: 100%; margin: 10px 0; padding: 8px; box-sizing: border-box; }
      button { background: #4285f4; color: white; padding: 10px 20px; border: none; cursor: pointer; width: 100%; }
      button:hover { background: #357ae8; }
    </style>
    <h2>Create New Tournament</h2>
    <input id="name" placeholder="Tournament Name *" required />
    <input type="date" id="date" required />
    <input id="location" placeholder="Location *" required />
    <input id="organizerName" placeholder="Your Name *" required />
    <input id="organizerEmail" type="email" placeholder="Email *" required />
    <br><br>
    <button onclick="create()">Create Tournament</button>
    
    <script>
      function create() {
        const data = {
          name: document.getElementById('name').value,
          date: document.getElementById('date').value,
          location: document.getElementById('location').value,
          organizerName: document.getElementById('organizerName').value,
          organizerEmail: document.getElementById('organizerEmail').value
        };
        
        if (!data.name || !data.date || !data.location || !data.organizerName || !data.organizerEmail) {
          alert('Please fill all fields');
          return;
        }
        
        google.script.run
          .withSuccessHandler(() => {
            alert('Tournament created!');
            google.script.host.close();
          })
          .withFailureHandler((error) => alert('Error: ' + error.message))
          .createNewTournament(data);
      }
    </script>
  `).setWidth(400).setHeight(400);
  
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
  
  Logger.log(`Created tournament: ${tournamentId}`);
  return tournamentId;
}

// === REGISTRAR ATLETA (PLACEHOLDER) ===
function openRegistrationForm() {
  SpreadsheetApp.getUi().alert(
    'Coming Soon',
    'Athlete registration will be available in the next update.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
```

### Guardar y Probar
1. Guardar: `Ctrl+S` (o `Cmd+S` en Mac)
2. Volver al Sheet
3. Recargar página (F5)
4. Debería aparecer menu "🏋️ Tournament Manager"
5. Click: Test Installation → debería mostrar "✅ Installation Test Passed"
6. Click: New Tournament → llenar form → Create

**Si todo funciona:** ¡Felicitaciones! Tienes el núcleo del sistema.

---

## FASE 3: Commit a GitHub (10 minutos)

### Exportar Código
1. En Apps Script: File → Download → Download as .zip
2. Extraer archivos
3. Copiar `Code.gs` a tu repo local

**Estructura recomendada:**
```
ironsystems-tournament-manager/
├── README.md
├── apps-script/
│   └── Code.gs
└── .gitignore
```

### .gitignore
```
# macOS
.DS_Store

# IDEs
.idea/
.vscode/

# Temp files
*.tmp
```

### Commit
```bash
git add .
git commit -m "feat: basic tournament creation system"
git push origin main
```

---

## FASE 4: Primera Demo (LinkedIn Post)

### Grabar Demo (Loom/QuickTime)
1. Abrir Sheet
2. Click menu "New Tournament"
3. Llenar form con datos de ejemplo
4. Mostrar que se creó en DB_Tournaments
5. Explicar: "Este es el primer paso del sistema que estoy construyendo"

### Publicar en LinkedIn
```
🚀 Day 1: Started building a tournament management system

Just shipped the first feature: tournament creation.

What it does:
• Creates a new tournament record
• Generates UUID for tracking
• Stores in Google Sheets database

Tech: Apps Script (JavaScript on Google Cloud)

Why Sheets? 
✅ $0 hosting
✅ Real-time collaboration
✅ Familiar UI for users

Next up: Athlete registration system

Code on GitHub: [link]

#BuildInPublic #SideProject #PowerliftingTech

[Attach: screenshot or demo GIF]
```

---

## SPRINT DE 3 HORAS

**Para cuando quieres algo funcional YA:**

### Hora 1: Setup Rápido
- [ ] Crear Sheet con las 5 hojas (headers solamente)
- [ ] Copiar código básico a Apps Script
- [ ] Test que el menu funciona

### Hora 2: Datos de Prueba
Manualmente en DB_Tournaments, agregar:
```
tournament123 | Test Meet | 2026-12-31 | Demo Gym | Your Name | email@test.com | DRAFT | [hoy] | {"M":[83,93,105],"F":[63,72,84]}
```

Manualmente en DB_Entries, agregar 3 atletas:
```
entry1 | tournament123 | John Smith | M | 1990-01-01 | 82.5 | 83 | Open |  | 200 | 140 | 240 | [hoy] | CONFIRMED
entry2 | tournament123 | Jane Doe | F | 1995-05-15 | 63.2 | 63 | Open |  | 120 | 70 | 150 | [hoy] | CONFIRMED
entry3 | tournament123 | Mike Brown | M | 1988-03-20 | 92.8 | 93 | Open |  | 250 | 180 | 280 | [hoy] | CONFIRMED
```

### Hora 3: Demo Screenshots
1. Tomar screenshots de:
   - Menu de Tournament Manager
   - DB_Tournaments con datos
   - DB_Entries con atletas
2. Crear GIF de "New Tournament" flow
3. Publicar en LinkedIn con el post template de arriba

**Resultado:** Tienes algo tangible para mostrar en 3 horas.

---

## CHECKLIST DE VALIDACIÓN

Antes de pasar a la Semana 2, verifica:

**Técnico:**
- [ ] GitHub repo creado y público
- [ ] README con descripción del proyecto
- [ ] Sheet funcional con 5 hojas
- [ ] Apps Script con menu funcionando
- [ ] Test de instalación pasa correctamente
- [ ] Puedes crear un torneo desde el UI

**Contenido:**
- [ ] Primer post en LinkedIn publicado
- [ ] Screenshot/GIF del sistema disponible
- [ ] GitHub link en LinkedIn bio
- [ ] Decidiste tu calendario de posts (2-3/semana)

**Opcional pero Recomendado:**
- [ ] Calendario de Notion/Trello con tareas de las 4 semanas
- [ ] Setup de Loom para grabar demos
- [ ] Draft de próximos 2 posts de LinkedIn

---

## TROUBLESHOOTING COMÚN

**Problema: Menu no aparece después de recargar**
```
Solución:
1. Extensions → Apps Script
2. Run → onOpen (manualmente)
3. Autorizar permisos
4. Recargar Sheet
```

**Problema: "Script timeout" al crear torneo**
```
Solución:
1. Verificar que las hojas existen con nombres exactos
2. Revisar logs: View → Logs en Apps Script
3. Simplificar createNewTournament() temporalmente
```

**Problema: UUID genera valores raros**
```
Esto es normal. Los UUIDs se ven así:
a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6

Son únicos, eso es lo importante.
```

---

## RECURSOS DE REFERENCIA RÁPIDA

### Apps Script Docs
- [Quickstart](https://developers.google.com/apps-script/quickstart/macros)
- [SpreadsheetApp](https://developers.google.com/apps-script/reference/spreadsheet)
- [HtmlService](https://developers.google.com/apps-script/guides/html)

### Video Tutoriales (para aprender en paralelo)
- [Apps Script Basics (15 min)](https://www.youtube.com/results?search_query=google+apps+script+tutorial)
- [HTML Service Tutorial](https://www.youtube.com/results?search_query=apps+script+html+service)

### Comunidades
- r/googleappsscript (Reddit)
- Stack Overflow (tag: google-apps-script)

---

## ¿QUÉ SIGUE?

Una vez que completaste esta guía:

**Día 2-3:**
- Implementar registration form (RegistrationForm.html)
- Agregar función calculateWeightClass()
- Probar con 5 atletas reales

**Día 4-5:**
- Crear función generateAttemptOrder()
- Testear con datos sintéticos

**Día 6-7:**
- Implementar attempt panel (AttemptPanel.html)
- Grabar demo para YouTube

Sigue el roadmap detallado en `ROADMAP_TOURNAMENT_MANAGER.md` para el plan completo de 4 semanas.

---

## TU PRÓXIMA ACCIÓN CONCRETA

Literalmente, ahora mismo:

1. **Si no tienes nada todavía:**
   - [ ] Crear Google Sheet
   - [ ] Copiar el código básico de arriba
   - [ ] Crear un torneo de prueba
   - [ ] Tomar screenshot
   - [ ] Tweet/post "Started building X today"

2. **Si ya tienes el Sheet:**
   - [ ] Crear GitHub repo
   - [ ] Commit initial code
   - [ ] Escribir LinkedIn post
   - [ ] Planificar próximos 3 posts

**Tiempo total hasta aquí: 2-3 horas máximo.**

---

**🚀 Ready? Open a new tab, create that Sheet, and start building!**

No pienses más. Solo ejecuta. Build in public empieza hoy.
