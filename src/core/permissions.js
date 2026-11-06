const LEVEL_RANK = {
  OWNER: 60,
  ADMIN: 50,
  HEAD_MOD: 40,
  MOD: 30,
  SUPPORT_STAFF: 20,
  EVENT_MANAGER: 10,
};

const config = require('../config.js').config;

function getStaffLevel(userId) {
  if (config.staff.OWNER.includes(userId)) return 'OWNER';
  if (config.staff.ADMIN.includes(userId)) return 'ADMIN';
  if (config.staff.HEAD_MOD.includes(userId)) return 'HEAD_MOD';
  if (config.staff.MOD.includes(userId)) return 'MOD';
  if (config.staff.SUPPORT_STAFF.includes(userId)) return 'SUPPORT_STAFF';
  if (config.staff.EVENT_MANAGER.includes(userId)) return 'EVENT_MANAGER';
  return null;
}

function staffLevelAtLeast(userId, min) {
  const level = getStaffLevel(userId);
  if (!level) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

function canModerate(actorId, targetStaffId) {
  if (!targetStaffId) return true;
  const actor = getStaffLevel(actorId);
  const target = getStaffLevel(targetStaffId);
  if (!actor) return false;
  if (!target) return true;
  return LEVEL_RANK[actor] > LEVEL_RANK[target];
}

const PERMISSIONS = {
  MODERATION_DISCORD: ['OWNER', 'ADMIN', 'HEAD_MOD', 'MOD'],
  MODERATION_ROBLOX: ['OWNER', 'ADMIN', 'HEAD_MOD', 'MOD'],
  PERMA_BAN_ROBLOX: ['OWNER', 'ADMIN'],
  PROPAGATE_ALTS: ['OWNER', 'ADMIN'],
  EDIT_STATS: ['OWNER', 'ADMIN', 'HEAD_MOD'],
  EVENTS: ['OWNER', 'ADMIN', 'HEAD_MOD', 'EVENT_MANAGER'],
  ANNOUNCEMENTS: ['OWNER', 'ADMIN', 'HEAD_MOD'],
  CODES: ['OWNER', 'ADMIN', 'HEAD_MOD'],
  TICKETS: ['OWNER', 'ADMIN', 'HEAD_MOD', 'MOD', 'SUPPORT_STAFF'],
  CONFIG: ['OWNER', 'ADMIN'],
  GIVEAWAYS: ['OWNER', 'ADMIN', 'HEAD_MOD', 'EVENT_MANAGER'],
};

function hasPermission(userId, perm) {
  return PERMISSIONS[perm].some((level) => staffLevelAtLeast(userId, level));
}

module.exports = { getStaffLevel, staffLevelAtLeast, canModerate, hasPermission, PERMISSIONS };
