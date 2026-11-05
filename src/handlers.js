import { SparkedHost, SparkedHostError } from './sparkedhost.js';
import { RobloxCloud, RobloxError } from './roblox.js';
import { config } from './config.js';

const sh = new SparkedHost(config.sparkedhostApiKey, config.sparkedhostServerId);
const rbxl = new RobloxCloud(config.robloxApiKey, config.robloxUniverseId);

const MISSING_PERMS = 'No tienes permiso para usar este comando.';

export function isAdmin(interaction) {
  return config.adminUserIds.has(interaction.user.id);
}

function guard(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: MISSING_PERMS, ephemeral: true });
  }
  return null;
}

async function handleError(interaction, err) {
  const msg = err instanceof SparkedHostError || err instanceof RobloxError
    ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ''}`
    : `Error inesperado: ${err.message}`;
  const payload = { content: msg.slice(0, 1900), ephemeral: true };
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}

function formatBytes(n) {
  if (n == null) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds) {
  if (seconds == null) return 'N/A';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m`;
}

async function handlePower(interaction) {
  const denied = guard(interaction);
  if (denied) return denied;

  const action = interaction.options.getString('action', true);
  await interaction.deferReply({ ephemeral: true });
  try {
    await sh.power(action);
    await interaction.editReply(`Acción \`${action}\` enviada al servidor.`);
  } catch (err) {
    await handleError(interaction, err);
  }
}

async function handleStats(interaction) {
  const denied = guard(interaction);
  if (denied) return denied;

  await interaction.deferReply({ ephemeral: true });
  try {
    const { attributes } = await sh.resources();
    const { attributes: srv } = await sh.server();
    const embed = {
      title: `📊 ${srv.name}`,
      color: 0x7c3aed,
      fields: [
        { name: 'Estado', value: `\`${srv.is_suspended ? 'suspendido' : 'activo'}\``, inline: true },
        { name: 'Uptime', value: formatUptime(attributes.uptime), inline: true },
        { name: 'CPU', value: `${(attributes.cpu_absolute / 100).toFixed(1)}%`, inline: true },
        { name: 'RAM', value: `${formatBytes(attributes.memory_bytes)} / ${formatBytes(attributes.memory_limit_bytes)}`, inline: true },
        { name: 'Disco', value: formatBytes(attributes.disk_bytes), inline: true },
        { name: 'Red ↓ / ↑', value: `${formatBytes(attributes.network?.rx_bytes)} / ${formatBytes(attributes.network?.tx_bytes)}`, inline: true },
      ],
      footer: { text: `Servidor: ${config.sparkedhostServerId}` },
      timestamp: new Date().toISOString(),
    };
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await handleError(interaction, err);
  }
}

async function handleConsole(interaction) {
  const denied = guard(interaction);
  if (denied) return denied;

  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });
  try {
    if (sub === 'send') {
      const command = interaction.options.getString('command', true);
      const session = await sh.connectConsole();
      try {
        session.sendCommand(command);
        await new Promise((r) => setTimeout(r, 1200));
        const recent = session.lines.slice(-10);
        await interaction.editReply({
          content: `Comando enviado: \`${command}\``,
          embeds: recent.length ? [{
            title: 'Salida reciente',
            description: '```\n' + recent.join('\n').slice(-1800) + '\n```',
            color: 0x7c3aed,
          }] : [],
        });
      } finally {
        session.close();
      }
    } else {
      const lines = interaction.options.getInteger('lines') ?? 30;
      const logs = await sh.readLogs(lines);
      const content = logs.length
        ? '```\n' + logs.join('\n').slice(-1800) + '\n```'
        : 'No se recibieron líneas de consola.';
      await interaction.editReply({ content });
    }
  } catch (err) {
    await handleError(interaction, err);
  }
}

function cleanPath(p) {
  return p.replace(/^\/+/, '');
}

async function handleFile(interaction) {
  const denied = guard(interaction);
  if (denied) return denied;

  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });
  try {
    if (sub === 'read') {
      const file = cleanPath(interaction.options.getString('path', true));
      const { attributes } = await sh.readFile(file);
      const content = typeof attributes.content === 'string'
        ? attributes.content
        : JSON.stringify(attributes.content);
      const truncated = content.length > 1800;
      await interaction.editReply({
        content: `**${file}**${truncated ? ' (truncado)' : ''}\n\`\`\`\n${content.slice(0, 1800)}\n\`\`\``,
      });
    } else if (sub === 'write') {
      const file = cleanPath(interaction.options.getString('path', true));
      const content = interaction.options.getString('content', true);
      await sh.writeFile(file, content);
      await interaction.editReply(`Archivo \`${file}\` escrito correctamente.`);
    } else {
      const dir = cleanPath(interaction.options.getString('directory') || '/');
      const { data } = await sh.listFiles(dir);
      const items = (data || []).map((f) =>
        `${f.attributes.is_file ? '📄' : '📁'} ${f.attributes.name}${f.attributes.is_file ? ` (${formatBytes(f.attributes.size)})` : ''}`);
      await interaction.editReply({
        content: `**${dir || '/'}**\n` + (items.length ? items.join('\n').slice(0, 1800) : '(vacío)'),
      });
    }
  } catch (err) {
    await handleError(interaction, err);
  }
}

async function handleDatastore(interaction) {
  const denied = guard(interaction);
  if (denied) return denied;

  if (!rbxl.configured) {
    return interaction.reply({
      content: 'Roblox Open Cloud no está configurado. Define `ROBLOX_API_KEY` y `ROBLOX_UNIVERSE_ID` en el `.env`.',
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });
  try {
    if (sub === 'get') {
      const ds = interaction.options.getString('datastore', true);
      const key = interaction.options.getString('key', true);
      const entry = await rbxl.getDataStoreEntry(ds, key);
      await interaction.editReply({
        content: `**${ds} / ${key}**\n\`\`\`json\n${JSON.stringify(entry.data ?? entry, null, 2).slice(0, 1800)}\n\`\`\``,
      });
    } else if (sub === 'set') {
      const ds = interaction.options.getString('datastore', true);
      const key = interaction.options.getString('key', true);
      const value = interaction.options.getString('value', true);
      await rbxl.setDataStoreEntry(ds, key, value);
      await interaction.editReply(`Entrada \`${key}\` guardada en DataStore \`${ds}\`.`);
    } else {
      const res = await rbxl.listDataStores();
      const stores = res?.dataStores || res?.data || [];
      const names = stores.map((s) => s.name || s.displayName || JSON.stringify(s));
      await interaction.editReply({
        content: names.length
          ? '**DataStores:**\n' + names.join('\n').slice(0, 1800)
          : 'No se encontraron DataStores.',
      });
    }
  } catch (err) {
    await handleError(interaction, err);
  }
}

export async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;
  try {
    switch (interaction.commandName) {
      case 'power': return await handlePower(interaction);
      case 'stats': return await handleStats(interaction);
      case 'console': return await handleConsole(interaction);
      case 'file': return await handleFile(interaction);
      case 'datastore': return await handleDatastore(interaction);
      default:
        return await interaction.reply({ content: 'Comando desconocido.', ephemeral: true });
    }
  } catch (err) {
    console.error(`[interaction] ${interaction.commandName}:`, err);
    await handleError(interaction, err).catch(() => {});
  }
}
