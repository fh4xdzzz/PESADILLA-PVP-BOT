const { EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('./embeds.js');
const { log } = require('../logger.js');

async function safeReply(interaction, content, ephemeral = true) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
    } else {
      await interaction.reply({ content, ephemeral });
   };
  } catch (err) {
    log.warn({ err }, 'No se pudo responder la interacción');
 };
}

async function safeError(interaction, err, context) {
  log.error({ err, context, user: interaction.user?.id, command: interaction.commandName ?? interaction.customId }, 'Error en interacción');
  const message = err instanceof Error ? err.message : 'Error desconocido';
  const safe = /token|key|secret|authorization/i.test(message)
    ? 'Error interno de configuración. Contacta al administrador.'
    : message.slice(0, 1500);
  await safeReply(interaction, safe, true).catch(() => {});
}

async function embedReply(interaction, embed, ephemeral = true) {
  const payload = { embeds: [embed], ephemeral };
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload).then(() => {}).catch(() => {});
 };
  return interaction.reply(payload).then(() => {}).catch(() => {});
}

module.exports = { safeReply, safeError, embedReply };
