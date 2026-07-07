const Database = require('better-sqlite3');
const path = require('path');

// Initialize database in the same directory
const dbPath = path.join(__dirname, 'qji_database.sqlite');
const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

// Create Tables if they don't exist
const initDb = () => {
  // Table for Caching Mission Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS mission_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_json TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table for Caching Participant Data
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      data_json TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table for Queueing Photo Uploads (Background Worker)
  db.exec(`
    CREATE TABLE IF NOT EXISTS photo_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      team_name TEXT,
      nama_warga TEXT,
      local_file_path TEXT,
      mime_type TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table for Caching PeKA Responses
  db.exec(`
    CREATE TABLE IF NOT EXISTS peka_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name TEXT,
      response_id TEXT UNIQUE,
      data_json TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

initDb();

module.exports = db;
