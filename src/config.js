import 'dotenv/config';

function list(name) {
  return (process.env[name] || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  discordClientId: process.env.DISCORD_CLIENT_ID || '',
  discordGuildId: process.env.DISCORD_GUILD_ID || '',
  adminUserIds: new Set(list('ADMIN_USER_IDS')),

  sparkedhostApiKey: process.env.SPARKEDHOST_API_KEY || '',
  sparkedhostServerId: process.env.SPARKEDHOST_SERVER_ID || '',

  robloxApiKey: process.env.ROBLOX_API_KEY || '',
  robloxUniverseId: process.env.ROBLOX_UNIVERSE_ID || '',
};

export function validateConfig() {
  const missing = [];
  if (!config.discordToken) missing.push('DISCORD_TOKEN');
  if (!config.discordClientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.sparkedhostApiKey) missing.push('SPARKEDHOST_API_KEY');
  if (!config.sparkedhostServerId) missing.push('SPARKEDHOST_SERVER_ID');
  if (missing.length) {
    throw new Error(`Faltan variables en .env: ${missing.join(', ')}. Copia .env.example a .env y complétalas.`);
  }
}
