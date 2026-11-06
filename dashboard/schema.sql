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

-- Replay V2: event streams (shots, impacts, eliminations, round transitions)
CREATE TABLE IF NOT EXISTS replay_event_meta (
  match_id TEXT PRIMARY KEY,
  total_chunks INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS replay_event_chunks (
  match_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  events_json TEXT NOT NULL,
  PRIMARY KEY(match_id, chunk_index)
);

-- Replay Theater: single-use launch requests for an authorized Roblox account.
CREATE TABLE IF NOT EXISTS replay_launch_requests (
 roblox_user_id TEXT PRIMARY KEY,
 match_id TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,
 claimed_at_ms INTEGER
);

-- Roblox staff roles (server-enforced) and audit log.
CREATE TABLE IF NOT EXISTS staff_roles (
 roblox_user_id TEXT PRIMARY KEY,
 discord_user_id TEXT,
 role TEXT NOT NULL CHECK(role IN ('owner','administrador','moderador','soporte')),
 granted_by TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS staff_role_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 roblox_user_id TEXT NOT NULL,
 old_role TEXT,
 new_role TEXT NOT NULL,
 granted_by TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Discord control center options synced to the bot's existing BotSetting storage.
CREATE TABLE IF NOT EXISTS discord_settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Pending Roblox server moderation; only ack marks an action applied.
CREATE TABLE IF NOT EXISTS dashboard_moderation (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 roblox_user_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('ban','unban','kick')),
 reason TEXT NOT NULL,
 actor_discord_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 requested_at_ms INTEGER NOT NULL,
 lease_until_ms INTEGER,
 attempts INTEGER NOT NULL DEFAULT 0,
 executed_server TEXT,
 result_message TEXT,
 updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_moderation_queue ON dashboard_moderation(status,requested_at_ms);
