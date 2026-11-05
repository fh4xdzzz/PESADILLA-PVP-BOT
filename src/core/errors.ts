import { EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction, AnySelectMenuInteraction } from 'discord.js';
import { errorEmbed } from './embeds.js';
import { log } from '../logger.js';

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction;

export async function safeReply(interaction: AnyInteraction, content: string, ephemeral = true): Promise<void> {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
    } else {
      await interaction.reply({ content, ephemeral });
    }
  } catch (err) {
    log.warn({ err }, 'No se pudo responder la interacción (posiblemente expirada)');
  }
}

export async function safeError(interaction: AnyInteraction, err: unknown, context?: string): Promise<void> {
  log.error({ err, context, user: interaction.user.id, command: interaction.commandName ?? interaction.customId }, 'Error en interacción');
  const message = err instanceof Error ? err.message : 'Error desconocido';
  // No exponer detalles internos al usuario final
  const safe = /token|key|secret|authorization/i.test(message)
    ? 'Error interno de configuración. Contacta al administrador.'
    : message.slice(0, 1500);
  await safeReply(interaction, safe, true).catch(() => {});
}

export function embedReply(interaction: AnyInteraction, embed: EmbedBuilder, ephemeral = true): Promise<void> {
  const payload = { embeds: [embed], ephemeral };
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload as never).then(() => {}).catch(() => {});
  }
  return interaction.reply(payload as never).then(() => {}).catch(() => {});
}
