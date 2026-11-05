import 'dotenv/config';
import { z } from 'zod';

const idList = z.string().default('').transform((s) =>
  s.split(',').map((v) => v.trim()).filter(Boolean),
);

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  SUPPORT_GUILD_ID: z.string().default(''),
  MAIN_GUILD_ID: z.string().default(''),
  OWNER_IDS: idList,
  ADMIN_IDS: idList,
  HEAD_MOD_IDS: idList,
  MOD_IDS: idList,
  SUPPORT_STAFF_IDS: idList,
  EVENT_MANAGER_IDS: idList,
  ROBLOX_API_KEY: z.string().default(''),
  ROBLOX_UNIVERSE_ID: z.string().default(''),
  ROBLOX_PLACE_ID: z.string().default(''),
  DATABASE_URL: z.string().default('file:./pesadilla.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  BOT_PUBLIC_URL: z.string().default(''),
  LINK_SECRET: z.string().min(16, 'LINK_SECRET debe tener al menos 16 caracteres').default('change-me-link-secret-32chars!!'),
});

export type StaffLevel = 'OWNER' | 'ADMIN' | 'HEAD_MOD' | 'MOD' | 'SUPPORT_STAFF' | 'EVENT_MANAGER';

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas o faltantes:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

export const config = {
  discord: {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    supportGuildId: env.SUPPORT_GUILD_ID,
    mainGuildId: env.MAIN_GUILD_ID,
  },
  staff: {
    OWNER: env.OWNER_IDS,
    ADMIN: env.ADMIN_IDS,
    HEAD_MOD: env.HEAD_MOD_IDS,
    MOD: env.MOD_IDS,
    SUPPORT_STAFF: env.SUPPORT_STAFF_IDS,
    EVENT_MANAGER: env.EVENT_MANAGER_IDS,
  } satisfies Record<StaffLevel, string[]>,
  roblox: {
    apiKey: env.ROBLOX_API_KEY,
    universeId: env.ROBLOX_UNIVERSE_ID,
    placeId: env.ROBLOX_PLACE_ID,
    configured: Boolean(env.ROBLOX_API_KEY && env.ROBLOX_UNIVERSE_ID),
  },
  databaseUrl: env.DATABASE_URL,
  isProd: env.NODE_ENV === 'production',
  logLevel: env.LOG_LEVEL,
  linkSecret: env.LINK_SECRET,
} as const;

/** IDs de todos los usuarios con algún nivel de staff configurado. */
export function allStaffIds(): Set<string> {
  const set = new Set<string>();
  for (const level of Object.values(config.staff)) {
    for (const id of level) set.add(id);
  }
  return set;
}
