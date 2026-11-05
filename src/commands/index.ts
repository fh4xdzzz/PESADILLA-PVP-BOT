import { moderationBuilders } from './builders/moderation.js';
import { publicBuilders } from './builders/public.js';
import { staffBuilders } from './builders/staff.js';

export const commandBuilders = [...moderationBuilders, ...publicBuilders, ...staffBuilders];
