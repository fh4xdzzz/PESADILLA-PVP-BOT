/** Pure helpers to make the moderation thresholds easy to test. */
export const hasLink = (text) =>
  /(?:https?:\/\/|www\.|discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(text);

export function createSpamGuard({ now = Date.now, limit = 5, windowMs = 6000 } = {}) {
  const messages = new Map();
  function exceeds(guildId, userId) {
    const key = guildId + ":" + userId;
    const t = now();
    const current = (messages.get(key) ?? []).filter((x) => t - x < windowMs);
    current.push(t);
    messages.set(key, current);
    return current.length > limit;
  }
  function cleanup() {
    const t = now();
    for (const [key, hits] of messages) {
      if (!hits.length || t - hits[hits.length - 1] >= windowMs) messages.delete(key);
    }
  }
  return { exceeds, cleanup };
}
