const { EmbedBuilder } = require('discord.js');

const BRAND = {
  name: 'PESADILLA PVP',
  color: 0x7c3aed,
  accent: 0xff2244,
  dark: 0x0a0a0f,
  footer: 'PESADILLA PVP • BOT OFICIAL',
};

function brandEmbed(title, description) {
  const e = new EmbedBuilder().setColor(BRAND.color).setFooter({ text: BRAND.footer });
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(BRAND.accent)
    .setTitle('❌ Error')
    .setDescription(message)
    .setFooter({ text: BRAND.footer });
}

function successEmbed(message) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('✅ Éxito')
    .setDescription(message)
    .setFooter({ text: BRAND.footer });
}

function warnEmbed(message) {
  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle('⚠️ Aviso')
    .setDescription(message)
    .setFooter({ text: BRAND.footer });
}

function caseEmbed(fields, title = '📋 Caso') {
  return new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle(title)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: BRAND.footer });
}

module.exports = { BRAND, brandEmbed, errorEmbed, successEmbed, warnEmbed, caseEmbed };
