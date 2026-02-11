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
