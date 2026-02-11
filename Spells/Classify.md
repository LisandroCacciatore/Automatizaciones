El Hechizo de Clasificación (Categorización Automática)
Este script llena los huecos de "Cat_Edad" y "Cat_Peso" automáticamente. Ideal para cuando añades nuevos reclutas al torneo y no quieres buscar en la tabla de reglas manualmente.

Lógica de Lore: Define quién es un "Maestro" y quién un "Aprendiz".

JavaScript
function 2_clasificarLevantadores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  // Leemos Edad (Col 2/B) y Peso (Col 3/C)
  // Escribimos en Cat_Edad (Col 4/D) y Cat_Peso (Col 5/E)
  const rangeToRead = sheet.getRange(2, 2, lastRow - 1, 2); 
  const values = rangeToRead.getValues();
  
  let categories = [];

  for (let i = 0; i < values.length; i++) {
    let edad = values[i][0];
    let peso = values[i][1];
    let catEdad = "";
    let catPeso = "";

    // --- REGLAS DE EDAD ---
    if (edad < 18) catEdad = "Sub-Junior (The Apprentices)";
    else if (edad <= 23) catEdad = "Junior (The Squires)";
    else if (edad <= 39) catEdad = "Open (The Champions)";
    else if (edad <= 49) catEdad = "Master I";
    else if (edad <= 59) catEdad = "Master II";
    else if (edad <= 69) catEdad = "Master III";
    else catEdad = "Master IV (The Ancients)";

    // --- REGLAS DE PESO (Simplificadas Mixtas) ---
    // En un torneo real separarías Hombres/Mujeres, aquí usamos Buckets generales
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

  // Escribir resultados en columnas D y E
  sheet.getRange(2, 4, categories.length, 2).setValues(categories);
}
