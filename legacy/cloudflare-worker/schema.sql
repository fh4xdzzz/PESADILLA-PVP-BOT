-- Base de datos NUEVA e independiente: no usar la D1 del dashboard anterior.
CREATE TABLE IF NOT EXISTS user_links (
  discord_user_id TEXT PRIMARY KEY NOT NULL,
  roblox_user_id TEXT NOT NULL UNIQUE,
  roblox_username TEXT NOT NULL,
  roblox_display_name TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_links_roblox ON user_links(roblox_user_id);
