const uid = id => typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id);
const name = n => typeof n === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(n);

export async function findPublicRobloxProfile(query, fetcher=fetch) {
  let id = String(query || '').trim();
  if(!uid(id)) {
    if(!name(id)) return {error:'Introduce un ID válido o un nombre de usuario de Roblox (3-20 caracteres).'};
    const lookup = await fetcher('https://users.roblox.com/v1/usernames/users', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({usernames:[id],excludeBannedUsers:false})
    });
    if(!lookup.ok) return {error:'Roblox no respondió al buscar el nombre.'};
    const result=await lookup.json();
    id=String(result?.data?.[0]?.id || '');
    if(!uid(id)) return {error:'No se encontró ese usuario.'};
  }
  const response=await fetcher('https://users.roblox.com/v1/users/'+id);
  if(response.status===404) return {error:'No se encontró ese usuario.'};
  if(!response.ok) return {error:'No se pudo consultar el perfil público de Roblox.'};
  const p=await response.json();
  if(!p || String(p.id)!==id) return {error:'Respuesta inesperada de Roblox.'};
  const thumbnail = await fetcher('https://thumbnails.roblox.com/v1/users/avatar-headshot?'+new URLSearchParams({userIds:id,size:'150x150',format:'Png',isCircular:'false'}));
  let picture=null;
  if(thumbnail.ok) {
    const info=await thumbnail.json();
    const src=info?.data?.[0]?.imageUrl;
    if(typeof src==='string' && /^https:\/\/([\w-]+\.)*rbxcdn\.com\//.test(src))picture=src;
  }
  return {id,username:String(p.name||''),displayName:String(p.displayName||''),description:String(p.description||'').slice(0,700),picture,profileUrl:'https://www.roblox.com/users/'+id+'/profile'};
}

export function parseRobloxUserInfo(value) {
  const id = String(value?.sub || '');
  if(!uid(id)) return null;
  return {id,username:String(value.preferred_username || '').slice(0,80) || id,displayName:String(value.name || '').slice(0,80) || id};
}
