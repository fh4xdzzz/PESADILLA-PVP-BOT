const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { resolveRobloxUser, getAvatarUrl } = require('../../roblox/users.js');
const { setUserRestriction, removeUserRestriction, getUserRestriction, parseDurationToSeconds } = require('../../roblox/restrictions.js');
const { getPlayerStats } = require('../../roblox/datastores.js');
const { createCase, getCaseByNumber, listCasesForSubject, addWarn, listWarns, countWarns, updateCaseStatus } = require('../../services/cases.js');
const { setPending, consumePending } = require('../../services/pending.js');
const { getLinkByRoblox, getLinkByDiscord } = require('../../services/linking.js');
const { postToChannel, CHANNEL_KEYS } = require('../../services/settings.js');
const { audit } = require('../../core/audit.js');
const { hasPermission, canModerate, PERMISSIONS } = require('../../core/permissions.js');
const { safeReply, safeError, embedReply } = require('../../core/errors.js');
const { BRAND, successEmbed, errorEmbed, caseEmbed } = require('../../core/embeds.js');
const { CUSTOM_IDS, confirmButtons } = require('../../discord/customIds.js');
const { config } = require('../../config.js');
const { log } = require('../../logger.js');

// TEMP STUB - full file being restored
module.exports = {};
