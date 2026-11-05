import { EmbedBuilder } from 'discord.js';

export const BRAND = {
  name: 'PESADILLA PVP',
  color: 0x7c3aed, // morado neón
  accent: 0xff2244, // rojo intenso
  dark: 0x0a0a0f,
  footer: 'PESADILLA PVP • BOT OFICIAL',
};

export function brandEmbed(title?: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(BRAND.color).setFooter({ text: BRAND.footer });
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BRAND.accent)
    .setTitle('❌ Error')
    .setDescription(message)
    .setFooter({ text: BRAND.footer });
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('✅ Éxito')
    .setDescription(message)
    .setFooter({ text: BRAND.footer });
}

export function warnEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle('⚠️ Aviso')
    .setDescription(message)
    .setFooter({ text: BRAND.footer });
}

export function caseEmbed(fields: { name: string; value: string; inline?: boolean }[], title = '📋 Caso'): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle(title)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: BRAND.footer });
}
