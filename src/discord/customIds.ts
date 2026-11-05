import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const CUSTOM_IDS = {
  banConfirm: (id: string) => `ban:confirm:${id}`,
  banCancel: (id: string) => `ban:cancel:${id}`,
  unbanConfirm: (id: string) => `unban:confirm:${id}`,
  kickConfirm: (id: string) => `kick:confirm:${id}`,
  ticketOpen: 'ticket:open',
  ticketClaim: (id: string) => `ticket:claim:${id}`,
  ticketClose: (id: string) => `ticket:close:${id}`,
  ticketReopen: (id: string) => `ticket:reopen:${id}`,
  giveawayEnter: (id: string) => `giveaway:enter:${id}`,
  pollVote: (pollId: string, optionIdx: number) => `poll:vote:${pollId}:${optionIdx}`,
  autorole: (roleId: string) => `autorole:${roleId}`,
  panelStaff: 'panel:staff',
} as const;

export function confirmButtons(actionId: string, kind: 'ban' | 'unban' | 'kick'): ActionRowBuilder<ButtonBuilder> {
  const confirm = new ButtonBuilder()
    .setCustomId(kind === 'ban' ? CUSTOM_IDS.banConfirm(actionId) : kind === 'unban' ? CUSTOM_IDS.unbanConfirm(actionId) : CUSTOM_IDS.kickConfirm(actionId))
    .setLabel(kind === 'ban' ? '🔨 Confirmar baneo' : kind === 'unban' ? '✅ Confirmar desbaneo' : '👢 Confirmar expulsión')
    .setStyle(kind === 'unban' ? ButtonStyle.Success : ButtonStyle.Danger);
  const cancel = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.banCancel(actionId))
    .setLabel('Cancelar')
    .setStyle(ButtonStyle.Secondary);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(confirm, cancel);
}
