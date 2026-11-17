export function loadEnvironment(env = process.env) {
  const values = ["DISCORD_BOT_TOKEN", "PANEL_BASE_URL", "BOT_SYNC_TOKEN"];
  for (const key of values) if (!env[key]) throw new Error("Missing " + key);
  if (env.BOT_SYNC_TOKEN.length < 32) throw new Error("BOT_SYNC_TOKEN must have at least 32 characters");
  const baseUrl = new URL(env.PANEL_BASE_URL);
  if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") {
    throw new Error("PANEL_BASE_URL requires HTTPS");
  }
  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) throw new Error("Invalid panel URL");
  const node = process.versions.node.split(".").map(Number);
  if (node[0] < 24 || (node[0] === 24 && node[1] < 17)) {
    throw new Error("Node.js 24.17+ is required by discord.js");
  }
  return {
    discordToken: env.DISCORD_BOT_TOKEN,
    baseUrl: baseUrl.origin,
    syncToken: env.BOT_SYNC_TOKEN,
    intervalMs: Math.max(20_000, Math.min(Number(env.SYNC_INTERVAL_MS) || 30_000, 120_000)),
  };
}
