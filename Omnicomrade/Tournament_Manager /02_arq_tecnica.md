# TECHNICAL_ARCHITECTURE.md

# Trainer Assistant — Technical Architecture

## Overview

Trainer Assistant is a lightweight club routine and session manager built on Google Workspace infrastructure. It enables coaches to design programs, schedule sessions, manage athletes, and log performance without requiring complex backend infrastructure.

## Core Stack

* Backend: Google Apps Script (V8 Runtime)
* Database: Google Sheets (structured multi-sheet template)
* Frontend: HTML Service + Vanilla JavaScript
* Analytics: Looker Studio (optional dashboards)
* Hosting: Apps Script Web App or bound script to Google Sheets

## System Philosophy

* Zero infrastructure cost
* Fast iteration
* Accessible to non-technical coaches
* Modular and scalable within Google ecosystem limits

---

## Data Model

### DB_Programs

ProgramID (UUID)
Name
CoachID
StartDate
EndDate
TargetPopulation
Status (DRAFT | ACTIVE | ARCHIVED)
CreatedAt
Description

### DB_Routines

RoutineID
ProgramID
Name
Type (Macrocycle | Mesocycle | Microcycle | SessionTemplate)
DurationDays
JSON_Exercises
Notes

### DB_Sessions

SessionID
RoutineID
ProgramID
CoachID
Date
StartTime
Location
GroupID
Status (SCHEDULED | COMPLETED | CANCELLED)
AttendanceJSON
SessionNotes

### DB_Exercises

ExerciseID
Name
Type (Strength | Conditioning | Mobility | Skill)
DefaultLoad
Cue
MediaURL

### DB_Athletes

AthleteID
Name
DOB
Sex
BodyWeight
Contact
Team
Tags

### DB_Coaches

CoachID
Name
Email
Role

### CONFIG

Key | Value
CURRENT_WEEK_START
DEFAULT_SESSION_DURATION
PLATE_LOADING_KG

---

## Core Functions (Apps Script)

* createProgram(data)
* createRoutine(programId, routineData)
* scheduleSession(routineId, date, coachId, groupId)
* assignRoutineToAthlete(routineId, athleteId)
* getTodaySessions(coachId)
* recordAttendance(sessionId, athleteId, status)
* logPerformance(sessionId, athleteId, exerciseId, setsData)
* generateWeeklyPlan(programId, weekStart)
* exportToCSV()

---

## UX Principle

Primary interface is a "Day Panel" where coaches:

* View today’s sessions
* Open session details
* Record attendance
* Log sets and qualitative notes

This mirrors competition control panels but adapted for coaching workflow.

---

## Known Constraints

* Apps Script execution time limits
* Google Sheets row limitations
* API quotas

Future scalability may include migration to Firebase or Supabase if needed.
