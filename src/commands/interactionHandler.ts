import type { Interaction } from 'discord.js';
import {
  rbanHandler, runbanHandler, rbaninfoHandler, rbanlistHandler, rbanhistoryHandler,
  rwarnHandler, rwarningsHandler, rkickHandler, rplayerHandler, rcaseHandler,
  dbanHandler, dunbanHandler, dwarnHandler, dkickHandler, dtimeoutHandler,
  handleBanConfirm, handleBanCancel,
} from './handlers/moderation.js';
import {
  statsHandler, topHandler, leaderboardHandler, rankHandler, perfilHandler,
  vincularHandler, desvincularHandler, serverHandler,
} from './handlers/public.js';
import {
  announceHandler, gameHandler, statusHandler, updateHandler, sneakpeekHandler,
  codesHandler, codecreateHandler, codedeleteHandler, dailyshopHandler,
  eventHandler, pollHandler, giveawayHandler, tournamentHandler,
  configHandler, ticketPanelHandler, ticketCloseHandler, ticketClaimHandler,
  openTicketChannel, ticketCategorySelectRow,
} from './handlers/staff.js';
import { CUSTOM_IDS } from '../discord/customIds.js';
import { log } from '../logger.js';

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

  try {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;
      const sub = interaction.options.getSubcommand(false);
      const map: Record<string, (i: typeof interaction) => Promise<void>> = {
        // Roblox
        rban: rbanHandler, runban: runbanHandler, rbaninfo: rbaninfoHandler,
        rbanlist: rbanlistHandler, rbanhistory: rbanhistoryHandler,
        rwarn: rwarnHandler, rwarnings: rwarningsHandler, rkick: rkickHandler,
        rplayer: rplayerHandler, rcase: rcaseHandler,
        // Discord
        dban: dbanHandler, dunban: dunbanHandler, dwarn: dwarnHandler,
        dkick: dkickHandler, dtimeout: dtimeoutHandler,
        // Public
        stats: statsHandler, top: topHandler, leaderboard: leaderboardHandler,
        rank: rankHandler, perfil: perfilHandler, vincular: vincularHandler,
        desvincular: desvincularHandler, server: serverHandler,
        // Staff
        announce: announceHandler, game: gameHandler, status: statusHandler,
        update: updateHandler, sneakpeek: sneakpeekHandler,
        codes: codesHandler, codecreate: codecreateHandler, codedelete: codedeleteHandler,
        dailyshop: dailyshopHandler, event: eventHandler, poll: pollHandler,
        giveaway: giveawayHandler, tournament: tournamentHandler,
        config: configHandler,
        ticket: async (i) => {
          if (sub === 'panel') await ticketPanelHandler(i);
          else if (sub === 'close') await ticketCloseHandler(i);
          else if (sub === 'claim') await ticketClaimHandler(i);
        },
      };
      const handler = map[cmd];
      if (handler) await handler(interaction);
      else await interaction.reply({ content: 'Comando no implementado.', ephemeral: true });
    }

    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id.startsWith('ban:confirm:')) {
        const { getPending } = await import('../services/pending.js');
        const action = getPending(id.split(':')[2]);
        if (action) await handleBanConfirm(interaction, action);
      } else if (id.startsWith('ban:cancel:')) {
        const { getPending } = await import('../services/pending.js');
        const action = getPending(id.split(':')[2]);
        if (action) await handleBanCancel(interaction, action);
      } else if (id.startsWith('giveaway:enter:')) {
        const giveawayId = id.split(':')[2];
        const { enterGiveaway } = await import('../services/engagement.js');
        await enterGiveaway(giveawayId, interaction.user.id);
        await interaction.reply({ content: '🎉 Te has inscrito al sorteo.', ephemeral: true });
      } else if (id === CUSTOM_IDS.ticketOpen) {
        await interaction.reply({
          content: 'Selecciona la categoría de tu ticket:',
          ephemeral: true,
          components: [ticketCategorySelectRow()],
        });
      } else if (id.startsWith('ticket:claim:')) {
        const ticketId = id.split(':')[2];
        await interaction.deferReply({ ephemeral: true });
        await ticketClaimHandler(interaction as never); // reusar handler con subcomando simulado
      } else if (id.startsWith('ticket:close:')) {
        const ticketId = id.split(':')[2];
        await interaction.deferReply({ ephemeral: true });
        await ticketCloseHandler(interaction as never);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket:select-category') {
        const category = interaction.values[0];
        await openTicketChannel(interaction, category);
      }
    }
  } catch (err) {
    log.error({ err, interaction: { id: interaction.id, type: interaction.type } }, 'Error en handler de interacción');
    const { safeError } = await import('../core/errors.js');
    await safeError(interaction as never, err, 'interaction');
  }
}
