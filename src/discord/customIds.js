const ActionRowBuilder = require('discord.js').ActionRowBuilder;
const ButtonBuilder = require('discord.js').ButtonBuilder;
const ButtonStyle = require('discord.js').ButtonStyle;

const CUSTOM_IDS = {
  banConfirm: (id) => `ban:confirm:${id}`,
  banCancel: (id) => `ban:cancel:${id}`,
  unbanConfirm: (id) => `unban:confirm:${id}`,
  kickConfirm: (id) => `kick:confirm:${id}`,
  ticketOpen: 'ticket:open',
  ticketClaim: (id) => `ticket:claim:${id}`,
  ticketClose: (id) => `ticket:close:${id}`,
  ticketReopen: (id) => `ticket:reopen:${id}`,
  giveawayEnter: (id) => `giveaway:enter:${id}`,
  pollVote: (pollId, optionIdx) => `poll:vote:${pollId}:${optionIdx}`,
  autorole: (roleId) => `autorole:${roleId}`,
  panelStaff: 'panel:staff',
};

function confirmButtons(actionId, kind) {
  const confirm = new ButtonBuilder()
    .setCustomId(kind === 'ban' ? CUSTOM_IDS.banConfirm(actionId) : kind === 'unban' ? CUSTOM_IDS.unbanConfirm(actionId) : CUSTOM_IDS.kickConfirm(actionId))
    .setLabel(kind === 'ban' ? '🔨 Confirmar baneo' : kind === 'unban' ? '✅ Confirmar desbaneo' : '👢 Confirmar expulsión')
    .setStyle(kind === 'unban' ? ButtonStyle.Success : ButtonStyle.Danger);
  const cancel = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.banCancel(actionId))
    .setLabel('Cancelar')
    .setStyle(ButtonStyle.Secondary);
  return new ActionRowBuilder().addComponents(confirm, cancel);
}

module.exports = { CUSTOM_IDS, confirmButtons };
