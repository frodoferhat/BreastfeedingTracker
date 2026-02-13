import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('breastfeeding_tracker.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS babies (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      birth_date TEXT,
      gender TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feeding_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER,
      audio_note_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_baby_id ON feeding_sessions(baby_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON feeding_sessions(start_time);

    CREATE TABLE IF NOT EXISTS diaper_logs (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_diaper_baby_id ON diaper_logs(baby_id);
    CREATE INDEX IF NOT EXISTS idx_diaper_created_at ON diaper_logs(created_at);
  `);

  // Migration: add gender column if it doesn't exist
  try {
    await database.runAsync('ALTER TABLE babies ADD COLUMN gender TEXT');
  } catch {
    // Column already exists — ignore
  }

  // Migration: add breast tracking columns
  try {
    await database.runAsync('ALTER TABLE feeding_sessions ADD COLUMN first_breast_duration INTEGER');
  } catch { /* already exists */ }
  try {
    await database.runAsync('ALTER TABLE feeding_sessions ADD COLUMN second_breast_duration INTEGER');
  } catch { /* already exists */ }
  try {
    await database.runAsync('ALTER TABLE feeding_sessions ADD COLUMN break_duration INTEGER');
  } catch { /* already exists */ }
  try {
    await database.runAsync('ALTER TABLE feeding_sessions ADD COLUMN phases TEXT');
  } catch { /* already exists */ }
  try {
    await database.runAsync('ALTER TABLE feeding_sessions ADD COLUMN phase_state TEXT');
  } catch { /* already exists */ }
  try {
    await database.runAsync("ALTER TABLE feeding_sessions ADD COLUMN feeding_mode TEXT DEFAULT 'breast'");
  } catch { /* already exists */ }
  try {
    await database.runAsync('ALTER TABLE feeding_sessions ADD COLUMN volume INTEGER');
  } catch { /* already exists */ }
  try {
    await database.runAsync('ALTER TABLE feeding_sessions ADD COLUMN note TEXT');
  } catch { /* already exists */ }
}

// ─── Baby CRUD ───────────────────────────────────────────────

export async function insertBaby(id: string, name: string, birthDate?: string, gender?: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO babies (id, name, birth_date, gender) VALUES (?, ?, ?, ?)',
    [id, name, birthDate ?? null, gender ?? null]
  );
}

export async function getAllBabies(): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync('SELECT * FROM babies ORDER BY created_at ASC');
}

export async function updateBaby(id: string, name: string, birthDate?: string, gender?: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE babies SET name = ?, birth_date = ?, gender = ? WHERE id = ?',
    [name, birthDate ?? null, gender ?? null, id]
  );
}

export async function deleteBaby(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM babies WHERE id = ?', [id]);
}

// ─── Session CRUD ────────────────────────────────────────────

export async function insertSession(
  id: string,
  babyId: string,
  startTime: string,
  feedingMode: string = 'breast'
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO feeding_sessions (id, baby_id, start_time, feeding_mode) VALUES (?, ?, ?, ?)',
    [id, babyId, startTime, feedingMode]
  );
}

export async function endSession(
  id: string,
  endTime: string,
  duration: number,
  firstBreastDuration?: number,
  secondBreastDuration?: number,
  breakDuration?: number,
  phases?: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE feeding_sessions SET end_time = ?, duration = ?,
     first_breast_duration = ?, second_breast_duration = ?,
     break_duration = ?, phases = ? WHERE id = ?`,
    [endTime, duration, firstBreastDuration ?? null, secondBreastDuration ?? null,
     breakDuration ?? null, phases ?? null, id]
  );
}

export async function updateSessionAudioNote(
  id: string,
  audioNotePath: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE feeding_sessions SET audio_note_path = ? WHERE id = ?',
    [audioNotePath, id]
  );
}

export async function updateSessionPhaseState(
  id: string,
  phaseState: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE feeding_sessions SET phase_state = ? WHERE id = ?',
    [phaseState, id]
  );
}

export async function updateSessionVolume(
  id: string,
  volume: number
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE feeding_sessions SET volume = ? WHERE id = ?',
    [volume, id]
  );
}

export async function updateSessionNote(
  id: string,
  note: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE feeding_sessions SET note = ? WHERE id = ?',
    [note, id]
  );
}

export async function deleteSession(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM feeding_sessions WHERE id = ?', [id]);
}

export async function getSessionsByBabyAndDate(
  babyId: string,
  date: string
): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM feeding_sessions
     WHERE baby_id = ? AND date(start_time, 'localtime') = ?
     ORDER BY start_time DESC`,
    [babyId, date]
  );
}

export async function getSessionsByBabyAndDateRange(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM feeding_sessions
     WHERE baby_id = ? AND date(start_time, 'localtime') >= ? AND date(start_time, 'localtime') <= ?
     ORDER BY start_time DESC`,
    [babyId, startDate, endDate]
  );
}

export async function getMarkedDatesForBaby(
  babyId: string,
  yearMonth: string // format: 'YYYY-MM'
): Promise<string[]> {
  const database = await getDatabase();
  const rows: any[] = await database.getAllAsync(
    `SELECT DISTINCT date(start_time, 'localtime') as date FROM feeding_sessions
     WHERE baby_id = ? AND strftime('%Y-%m', start_time, 'localtime') = ?`,
    [babyId, yearMonth]
  );
  return rows.map((r) => r.date);
}

export async function getDayStats(babyId: string, date: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT
       COUNT(*) as total_feedings,
       COALESCE(SUM(duration), 0) as total_duration,
       COALESCE(AVG(duration), 0) as avg_duration,
       COALESCE(MAX(duration), 0) as longest_session,
       COALESCE(MIN(duration), 0) as shortest_session
     FROM feeding_sessions
     WHERE baby_id = ? AND date(start_time, 'localtime') = ? AND end_time IS NOT NULL`,
    [babyId, date]
  );
}

export async function getWeekStats(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT
       COUNT(*) as total_feedings,
       COALESCE(SUM(duration), 0) as total_duration,
       COALESCE(AVG(duration), 0) as avg_duration
     FROM feeding_sessions
     WHERE baby_id = ? AND date(start_time, 'localtime') >= ? AND date(start_time, 'localtime') <= ? AND end_time IS NOT NULL`,
    [babyId, startDate, endDate]
  );
}

export async function getActiveSession(babyId: string): Promise<any | null> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT * FROM feeding_sessions
     WHERE baby_id = ? AND end_time IS NULL
     ORDER BY start_time DESC LIMIT 1`,
    [babyId]
  );
}

export async function getLastCompletedSession(babyId: string): Promise<any | null> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT phases, feeding_mode, end_time, duration, volume FROM feeding_sessions
     WHERE baby_id = ? AND end_time IS NOT NULL
     ORDER BY start_time DESC LIMIT 1`,
    [babyId]
  );
}

// ─── Diaper CRUD ─────────────────────────────────────────────

export async function insertDiaperLog(
  id: string,
  babyId: string,
  type: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO diaper_logs (id, baby_id, type, created_at) VALUES (?, ?, ?, ?)',
    [id, babyId, type, new Date().toISOString()]
  );
}

export async function deleteDiaperLog(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM diaper_logs WHERE id = ?', [id]);
}

export async function getDiaperLogsByBabyAndDate(
  babyId: string,
  date: string
): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM diaper_logs
     WHERE baby_id = ? AND date(created_at, 'localtime') = ?
     ORDER BY created_at DESC`,
    [babyId, date]
  );
}

export async function getDiaperLogsByBabyAndDateRange(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM diaper_logs
     WHERE baby_id = ? AND date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?
     ORDER BY created_at DESC`,
    [babyId, startDate, endDate]
  );
}

export async function getDiaperDayStats(babyId: string, date: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN type = 'pee' OR type = 'both' THEN 1 ELSE 0 END) as total_pee,
       SUM(CASE WHEN type = 'poop' OR type = 'both' THEN 1 ELSE 0 END) as total_poop
     FROM diaper_logs
     WHERE baby_id = ? AND date(created_at, 'localtime') = ?`,
    [babyId, date]
  );
}

export async function getDiaperWeekStats(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN type = 'pee' OR type = 'both' THEN 1 ELSE 0 END) as total_pee,
       SUM(CASE WHEN type = 'poop' OR type = 'both' THEN 1 ELSE 0 END) as total_poop
     FROM diaper_logs
     WHERE baby_id = ? AND date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?`,
    [babyId, startDate, endDate]
  );
}

// ─── Bottle / Feeding Mode Stats ─────────────────────────────

export async function getBottleDayStats(babyId: string, date: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT
       SUM(CASE WHEN feeding_mode = 'bottle' THEN 1 ELSE 0 END) as bottle_count,
       SUM(CASE WHEN feeding_mode = 'breast' OR feeding_mode IS NULL THEN 1 ELSE 0 END) as breast_count,
       COALESCE(SUM(CASE WHEN feeding_mode = 'bottle' THEN volume ELSE 0 END), 0) as total_volume,
       COALESCE(AVG(CASE WHEN feeding_mode = 'bottle' AND volume IS NOT NULL THEN volume END), 0) as avg_volume
     FROM feeding_sessions
     WHERE baby_id = ? AND date(start_time, 'localtime') = ? AND end_time IS NOT NULL`,
    [babyId, date]
  );
}

export async function getBottleWeekStats(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT
       SUM(CASE WHEN feeding_mode = 'bottle' THEN 1 ELSE 0 END) as bottle_count,
       SUM(CASE WHEN feeding_mode = 'breast' OR feeding_mode IS NULL THEN 1 ELSE 0 END) as breast_count,
       COALESCE(SUM(CASE WHEN feeding_mode = 'bottle' THEN volume ELSE 0 END), 0) as total_volume,
       COALESCE(AVG(CASE WHEN feeding_mode = 'bottle' AND volume IS NOT NULL THEN volume END), 0) as avg_volume
     FROM feeding_sessions
     WHERE baby_id = ? AND date(start_time, 'localtime') >= ? AND date(start_time, 'localtime') <= ? AND end_time IS NOT NULL`,
    [babyId, startDate, endDate]
  );
}

// ─── History: first session date ─────────────────────────────

export async function getFirstSessionDate(babyId: string): Promise<string | null> {
  const database = await getDatabase();
  const row: any = await database.getFirstAsync(
    `SELECT date(start_time, 'localtime') as first_date
     FROM feeding_sessions
     WHERE baby_id = ? AND end_time IS NOT NULL
     ORDER BY start_time ASC LIMIT 1`,
    [babyId]
  );
  return row?.first_date ?? null;
}

// ─── History: per-day breakdown for a date range ─────────────

export async function getDailyStatsForRange(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT
       date(start_time, 'localtime') as date,
       COUNT(*) as total_feedings,
       COALESCE(SUM(duration), 0) as total_duration,
       COALESCE(AVG(duration), 0) as avg_duration
     FROM feeding_sessions
     WHERE baby_id = ? AND date(start_time, 'localtime') >= ? AND date(start_time, 'localtime') <= ? AND end_time IS NOT NULL
     GROUP BY date(start_time, 'localtime')
     ORDER BY date(start_time, 'localtime') DESC`,
    [babyId, startDate, endDate]
  );
}
