-- Cloudflare D1: estructura inicial para telemetría PvP.
-- Aplicar solamente tras crear D1: npx wrangler d1 execute pesadilla-pvp-dashboard --remote --file=./schema.sql
CREATE TABLE IF NOT EXISTS players (
  roblox_user_id TEXT PRIMARY KEY,
  username TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  server_job_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'started'
);
CREATE TABLE IF NOT EXISTS match_participants (
  match_id TEXT NOT NULL REFERENCES matches(match_id),
  roblox_user_id TEXT NOT NULL REFERENCES players(roblox_user_id),
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, roblox_user_id)
);
CREATE TABLE IF NOT EXISTS reports (
  report_id TEXT PRIMARY KEY,
  reporter_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sanctions (
  sanction_id TEXT PRIMARY KEY,
  target_user_id TEXT NOT NULL,
  moderator_discord_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_discord_id TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_matches_started ON matches(started_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_sanctions_target ON sanctions(target_user_id);

-- 3D PvP replays: compact server-authoritative snapshots grouped by match/chunk.
-- Historical matches without a recorder do not contain replay frames.
CREATE TABLE IF NOT EXISTS replay_meta (
  match_id TEXT PRIMARY KEY,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  finished INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS replay_chunks (
  match_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  frames_json TEXT NOT NULL,
  PRIMARY KEY(match_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_replay_created ON replay_meta(created_at);
