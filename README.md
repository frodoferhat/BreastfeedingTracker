# 🍼 Breastfeeding Tracker

A simple, intuitive breastfeeding tracker app for mothers. Log feeding sessions with a single tap, view history in a calendar, track statistics, and export data for doctor visits.

## Features

- **One-tap session logging** — Tap to start, tap to stop
- **Live chronometer** — Shows elapsed time during feeding
- **Smart reminders** — Set custom notifications for next feeding
- **Multiple babies** — Track multiple babies with separate logs
- **Calendar view** — Browse feeding history by date
- **Daily/weekly statistics** — Total feedings, average duration, trends
- **Audio notes** — Record short audio notes per session
- **CSV export** — Shareable logs for medical records
- **Dark mode** — Comfortable for night feedings
- **Session recovery** — Active sessions survive app restarts

## Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based)
- **Database:** Expo SQLite
- **Notifications:** expo-notifications
- **Audio:** expo-av
- **Calendar:** react-native-calendars

## Project Structure

```
app/                    # Screens (Expo Router)
  _layout.tsx           # Root layout with providers
  index.tsx             # Home screen (feeding button)
  calendar.tsx          # Calendar & session logs
  statistics.tsx        # Daily/weekly stats
  export.tsx            # CSV export

components/             # Reusable UI components
  FeedingButton.tsx     # Main start/stop button
  Chronometer.tsx       # Timer display
  ReminderPopup.tsx     # Post-feeding reminder modal
  SessionCard.tsx       # Session list item
  BabySelector.tsx      # Baby chips/selector
  AddBabyModal.tsx      # Add baby form
  AudioNoteRecorder.tsx # Audio recording UI
  StatsSummary.tsx      # Stats grid display

contexts/               # React contexts
  ThemeContext.tsx       # Light/dark theme
  BabyContext.tsx        # Baby CRUD & selection

database/               # SQLite database layer
  db.ts                 # Schema, queries, CRUD
  index.ts              # Barrel exports

hooks/                  # Custom hooks
  useFeedingSession.ts  # Session start/stop/timer logic
  useAudioRecorder.ts   # Audio recording logic

utils/                  # Utility functions
  time.ts               # Date/time formatting
  notifications.ts      # Push notification helpers
  export.ts             # CSV generation & sharing

types/                  # TypeScript type definitions
constants/              # Theme colors, defaults
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or Expo Go app on device)

### Install & Run

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

### Run on Physical Device

1. Install the **Expo Go** app on your phone
2. Run `npx expo start`
3. Scan the QR code with Expo Go (Android) or Camera (iOS)

## Usage

1. **Add a baby** — Tap "+ Add Baby" on the home screen
2. **Start feeding** — Tap the big button; timer starts
3. **Stop feeding** — Tap again; optionally record an audio note, then set a reminder
4. **View logs** — Tap 📅 to see the calendar with all sessions
5. **Check stats** — Tap 📊 for daily/weekly summaries
6. **Export data** — Tap 📤 to generate a CSV for your doctor

## License

MIT
