## Project Overview
- **Type:** React Native (Expo SDK 54) mobile app
- **Language:** TypeScript (strict mode)
- **Navigation:** Expo Router (file-based routing under `app/`)
- **Storage:** Expo SQLite (relational, fast local database)
- **Platform:** iOS & Android

## Key Libraries
- `expo-router` — file-based navigation
- `expo-sqlite` — local SQLite database
- `expo-notifications` — feeding reminders
- `expo-av` — audio note recording
- `react-native-calendars` — calendar view
- `expo-file-system` + `expo-sharing` — CSV export
- `@react-native-async-storage/async-storage` — key-value persistence
- `date-fns` — date/time formatting
- `uuid` — unique ID generation

## Architecture
- `app/` — Screens (Expo Router file-based routing)
- `components/` — Reusable UI components
- `contexts/` — React Context providers (Theme, Baby)
- `database/` — SQLite schema, queries, CRUD
- `hooks/` — Custom hooks (feeding session, audio recorder)
- `utils/` — Utilities (time, notifications, export)
- `types/` — TypeScript type definitions
- `constants/` — Theme colors, defaults

## Conventions
- Functional components with hooks
- TypeScript strict mode
- Store times in UTC (ISO strings), display in local time
- Light/dark theme support via ThemeContext
- Debounce tap interactions (500ms) to prevent duplicates
- Sessions survive app crash/restart (restored from SQLite)
