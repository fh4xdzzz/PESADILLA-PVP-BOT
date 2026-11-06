const { config } = require('../../config.js');
const { prisma } = require('../../db.js');
const { audit } = require('../../core/audit.js');
const { hasPermission, PERMISSIONS } = require('../../core/permissions.js');
const { safeReply, safeError } = require('../../core/errors.js');
const { BRAND, successEmbed, errorEmbed } = require('../../core/embeds.js');
const { getSetting, setSetting, postToChannel, CHANNEL_KEYS } = require('../../services/settings.js');
const { CUSTOM_IDS } = require('../../discord/customIds.js');

// TEMP STUB - full file being restored
module.exports = {};
