// OAuth sessions are signed, HttpOnly cookies. No user tokens are persisted.
const enc = new TextEncoder();
const dec = new TextDecoder();
const toBase64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)), char => char.charCodeAt(0));
const keyFor = async secret => crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign','verify']);

export function randomToken(n=32) { return toBase64url(crypto.getRandomValues(new Uint8Array(n))); }
export async function hashChallenge(text) { return toBase64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))); }
export async function sign(value, secret) {
  const body = toBase64url(enc.encode(JSON.stringify(value)));
  const signature = await crypto.subtle.sign('HMAC', await keyFor(secret), enc.encode(body));
  return body + '.' + toBase64url(new Uint8Array(signature));
}
export async function readSigned(value, secret) {
  if(!secret || secret.length<32 || typeof value !== 'string') return null;
  const parts = value.split('.');
  if(parts.length!==2 || !/^[A-Za-z0-9_-]{1,1500}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await keyFor(secret), fromBase64url(parts[1]), enc.encode(parts[0]));
    if(!ok) return null;
    const payload = JSON.parse(dec.decode(fromBase64url(parts[0])));
    return payload && Number.isFinite(payload.exp) && payload.exp>Date.now() ? payload : null;
  } catch {return null;}
}
export function cookies(request) {
  const jar = new Map();
  for(const pair of (request.headers.get('Cookie')||'').split(';')) {
    const pos = pair.indexOf('=');
    if(pos>0) jar.set(pair.slice(0,pos).trim(), pair.slice(pos+1).trim());
  }
  return jar;
}
export function cookie(name,value,maxAge=0) {return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;}
export function redirect(path, cookiesToSet=[]) {
  const headers=new Headers({Location:path,'Cache-Control':'no-store'});
  for(const c of cookiesToSet) headers.append('Set-Cookie',c);
  return new Response(null,{status:303,headers});
}
export function origin(env,request) {
  // En prod, siempre fijar APP_BASE_URL a la URL publicada. No confiar en Host/Forwarded.
  const base = String(env.APP_BASE_URL || '');
  let parsed;
  try { parsed = new URL(base); } catch {return null;}
  if(parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname!=='/') return null;
  const actual = new URL(request.url);
  if(parsed.origin!==actual.origin || !(parsed.protocol==='https:' || (parsed.hostname==='localhost' && parsed.protocol==='http:'))) return null;
  return parsed.origin;
}
export function validDiscordId(id) {return typeof id==='string' && /^[1-9]\d{0,19}$/.test(id);}
