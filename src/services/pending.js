const TTL_MS = 5 * 60 * 1000;
const store = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.expiresAt < now) store.delete(k);
}, 60000).unref();

function setPending(action) {
  const full = { ...action, expiresAt: Date.now() + TTL_MS };
  store.set(action.id, full);
  return full;
}

function getPending(id) {
  const p = store.get(id);
  if (p && p.expiresAt < Date.now()) {
    store.delete(id);
    return undefined;
 };
  return p;
}

function consumePending(id) {
  const p = getPending(id);
  if (p) store.delete(id);
  return p;
}

module.exports = { setPending, getPending, consumePending };
