import 'dotenv/config';

function list(name) {
  return (process.env[name] || '').split(',').map((s) => s.trim()).filter(Boolean);
}

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    supportGuildId: process.env.SUPPORT_GUILD_ID || '',
    mainGuildId: process.env.MAIN_GUILD_ID || '',
  },
  staff: {
    OWNER: list('OWNER_IDS'),
    ADMIN: list('ADMIN_IDS'),
    HEAD_MOD: list('HEAD_MOD_IDS'),
    MOD: list('MOD_IDS'),
    SUPPORT_STAFF: list('SUPPORT_STAFF_IDS'),
    EVENT_MANAGER: list('EVENT_MANAGER_IDS'),
  },
  roblox: {
    apiKey: process.env.ROBLOX_API_KEY || '',
    universeId: process.env.ROBLOX_UNIVERSE_ID || '',
    placeId: process.env.ROBLOX_PLACE_ID || '',
    configured: Boolean(process.env.ROBLOX_API_KEY && process.env.ROBLOX_UNIVERSE_ID),
  },
  databaseUrl: process.env.DATABASE_URL || 'file:./pesadilla.db',
  isProd: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  linkSecret: process.env.LINK_SECRET || 'change-me-link-secret-32chars!!',
};

function validateConfig() {
  const missing = [];
  if (!config.discord.token) missing.push('DISCORD_TOKEN');
  if (!config.discord.clientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.roblox.apiKey) missing.push('SPARKEDHOST_API_KEY');
  if (!config.roblox.universeId) missing.push('SPARKEDHOST_SERVER_ID');
  if (missing.length) {
    console.error('❌ Faltan variables en .env:', missing.join(', '));
    console.error('Copia .env.example a .env y complétalas.');
    process.exit(1);
  }
}

function allStaffIds() {
  const set = new Set();
  for (const level of Object.values(config.staff)) {
    for (const id of level) set.add(id);
  }
  return set;
}

export { config, validateConfig, allStaffIds };
