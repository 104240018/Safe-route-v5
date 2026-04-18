import Database from "better-sqlite3";

export const db = new Database("saferoute.db");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      lat REAL,
      lng REAL
    );

    CREATE TABLE IF NOT EXISTS edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id TEXT,
      to_id TEXT,
      distance REAL,
      FOREIGN KEY(from_id) REFERENCES nodes(id),
      FOREIGN KEY(to_id) REFERENCES nodes(id)
    );

    CREATE TABLE IF NOT EXISTS risk_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT DEFAULT 'circle',
      category TEXT DEFAULT 'crime',
      name TEXT,
      description TEXT,
      lat REAL,
      lng REAL,
      radius REAL,
      points TEXT, -- JSON string of points
      base_risk REAL,
      modifiers TEXT -- JSON string of modifiers
    );
  `);

  try {
    db.prepare("ALTER TABLE risk_zones ADD COLUMN category TEXT DEFAULT 'crime'").run();
  } catch (e) {
    // Column already exists
  }
  try {
    db.prepare("ALTER TABLE risk_zones ADD COLUMN name TEXT").run();
  } catch (e) {
    // Column already exists
  }
  try {
    db.prepare("ALTER TABLE risk_zones ADD COLUMN description TEXT").run();
  } catch (e) {
    // Column already exists
  }
}
