Master Database: Estructura recomendada (Sheets)

A continuación la Master Database que deberías crear en tu Spreadsheet (nombres exactos sugeridos; el script busca por variantes pero es preferible usar estos):

Nota: mantén los headers EXACTOS si vas a usar scripts que dependen de ellos.

1) DB_Athletes — información única por atleta

Columns (orden sugerido):

UUID (string) — id único (ej: ath_3f6a9b)

Nombre (string) — "Juan Pérez"

Sexo (M/F) — "M"

DOB (date) — "1998-03-12"

PesoCorp (kg, number) — 82.5

Altura (cm, number) — 178

CoachEmail (string) — coach@example.com

Team (string) — "Volume Vanguards"

TM_SQ (Training Max squat) number

TM_BP

TM_DL

FechaRegistro (date)

Notes (string)

Ejemplo:

UUID,Nombre,Sexo,DOB,PesoCorp,Altura,CoachEmail,Team,TM_SQ,TM_BP,TM_DL,FechaRegistro,Notes
ath_001,Juan Perez,M,1995-06-10,82.5,178,coach@iron.com,Iron Conjurers,150,100,180,2026-02-01,"Client intro"

2) DB_Program — plantillas de programas (reutilizables)

Columns:

ProgramID (string)

ProgramName (string) — "531 4-week"

Cycle (number)

Week (number)

Day (number)

ExerciseID (string)

ExerciseName (string)

Intensity (decimal, e.g., 0.85)

Reps (string, e.g., "5", "5+")

SetType (warmup/work/amrap)

Notes

3) DB_SessionsScheduled — sesiones generadas por programa

Columns:

SessionID, AthleteUUID, ProgramID, Date, ExerciseID, WeightPlanned, RepsPlanned, SetType, Status (Planned/Done)

4) DB_Logs — registros reales cargados (mobile / form)

Columns (mínimos):

Timestamp (Date)

Athlete_UUID

Exercise (Squat/Bench/Deadlift/Press)

Set (1,2,3...)

Load (kg) (number)

Reps (number)

RPE (number, optional)

Notes (text)

Source (Form/AppSheet/Web)

Ejemplo:

2026-02-10 18:30,ath_001,Squat,1,127.5,5,8,"Good depth",Form

5) DB_Tournaments — meta info de eventos

TournamentID, Name, StartDate, EndDate, Location, OrganizerEmail, Status (Open/Closed/Published)

6) DB_Entries — atletas inscritos por torneo

TournamentID, AthleteUUID, Category, WeightClass, EntryStatus, Openers (optional JSON/string)

7) DB_Results — resultados finales por torneo

TournamentID, AthleteUUID, BestSQ, BestBP, BestDL, TOTAL, DOTS, Wilks, PositionOverall, PositionCategory

8) ALERTS — hoja creada por el script

Date, AthleteUUID, Nombre, AlertType, Metric, Value, Threshold, RecommendedAction, CoachEmail, Note

Criterios de aceptación (QA rápido)

detectStagnationAndFatigue() corre sin error y escribe en ALERTS cuando hay datos que cumplan condiciones.

ALERTS debe contener fecha, athlete uuid y recomendación legible.

Los logs en DB_Logs deben tener Timestamp, Athlete_UUID, Load, Reps; el script ignora filas incompletas.

setupAlertsSheet() crea la hoja ALERTS si no existe.

Si activás IS_CONFIG.NOTIFY_BY_EMAIL = true, tenés que habilitar permisos de MailApp y tener emails válidos.

Recomendaciones prácticas tras instalar

Corre setupAlertsSheet() una vez.

Pega algunos registros de prueba en DB_Logs (varios días, con RPE) y corre detectStagnationAndFatigue() manualmente.

Revisa ALERTS y ajusta los umbrales en IS_CONFIG si te da demasiadas/ pocas alertas.

Programa un trigger time-driven (ej. diario a las 22:00) cuando estés cómodo: detectStagnationAndFatigue como función objetivo.

Cuando quieras, activo NOTIFY_BY_EMAIL y prueba con una cuenta real de coach para validación.
