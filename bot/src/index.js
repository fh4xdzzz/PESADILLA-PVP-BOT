import { Client, GatewayIntentBits, Events, Partials } from "discord.js";
import { loadEnvironment } from "./env.js";
import { createSettingsSync, sendHeartbeat } from "./sync.js";
import { initializeCommands, registerBotEvents } from "./events.js";

const config = loadEnvironment();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // privileged: enable in Developer Portal
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged: enable in Developer Portal
  ],
  partials: [Partials.Message, Partials.Channel],
});

const sync = createSettingsSync({
  baseUrl: config.baseUrl, token: config.syncToken,
});
registerBotEvents(client, sync);

let busy = false;
async function updateAll() {
  if (busy || !client.isReady()) return;
  busy = true;
  try {
    await sync.refreshAll([...client.guilds.cache.keys()]);
  } finally {
    busy = false;
  }
}
async function heartbeat() {
  if (!client.isReady() || !client.user) return;
  await sendHeartbeat({
    baseUrl: config.baseUrl,
    token: config.syncToken,
    botUserId: client.user.id,
    guildIds: [...client.guilds.cache.keys()],
  });
}

let polling;
let healthPolling;
client.once(Events.ClientReady, async (ready) => {
  console.info("[ready] Discord conectado como " + ready.user.username +
    " en " + ready.guilds.cache.size + " servidores");
  await updateAll();
  await initializeCommands(client);
  await heartbeat();
  polling = setInterval(() => { void updateAll(); }, config.intervalMs);
  healthPolling = setInterval(() => { void heartbeat(); }, 60_000);
});

client.on(Events.Error, (error) => {
  console.error("[discord] " + (error instanceof Error ? error.message : "error"));
});

async function stop() {
  if (polling) clearInterval(polling);
  if (healthPolling) clearInterval(healthPolling);
  client.destroy();
}
process.once("SIGINT", () => { void stop(); });
process.once("SIGTERM", () => { void stop(); });
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] " + (reason instanceof Error ? reason.message : "error"));
});

await client.login(config.discordToken);
