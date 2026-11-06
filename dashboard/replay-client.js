// Canvas-based 3D projection of Roblox world-space server snapshots.
// Uses real X/Y/Z coordinates, orbit controls and interpolation (no invented footage).
(() => {
 const data=window.REPLAY_DATA;
 const canvas=document.getElementById('replay3d');
 if(!data||!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const frames=data.frames||[], play=document.getElementById('toggle'),timeline=document.getElementById('timeline');
 const clock=document.getElementById('clock'),speed=document.getElementById('speed'),names=document.getElementById('names');
 const duration=Math.max(0.01,Number(data.duration)||frames.at(-1)?.[0]||0.01);
 const palette=['#ff5676','#72c9ff','#ffd879','#99e0ab','#d69cff','#f09c6f','#7bd6c9','#d7d7ed'];
 const players=[...new Set(frames.flatMap(f=>f[1].map(p=>p[0])))];
 const colors=new Map(players.map((id,i)=>[id,palette[i%palette.length]]));
 for(const id of players){
  const div=document.createElement('div');div.textContent='● '+id;div.style.color=colors.get(id);
  div.style.padding='3px';names.appendChild(div);
 }
 const fmt=t=>{const n=Math.floor(Math.max(0,t));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
 let time=0,playing=false,last=0,angle=0.75,pitch=0.62,zoom=1,drag=false,previousX=0,previousY=0,focus=[0,0,0];
 function resize(){
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
  const w=Math.floor(rect.width*ratio),h=Math.floor(rect.height*ratio);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 }
 function positionsAt(t) {
  if(!frames.length)return [];
  let lo=0,hi=frames.length-1;
  while(lo<hi){const mid=(lo+hi+1)>>1;if(frames[mid][0]<=t)lo=mid;else hi=mid-1;}
  const a=frames[lo],b=frames[Math.min(lo+1,frames.length-1)];
  const f=a[0]===b[0]?0:Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
  const next=new Map(b[1].map(p=>[p[0],p]));
  return a[1].map(p=>{const q=next.get(p[0]);return q?[p[0],...p.slice(1).map((v,i)=>v+(q[i+1]-v)*f)]:p;});
 }
 function frame(now){
  if(last&&playing){time=Math.min(duration,time+Math.min((now-last)/1000,0.12)*Number(speed.value));if(time>=duration){playing=false;play.textContent='▶ Reproducir';}}
  last=now;resize();
  const w=canvas.width,h=canvas.height,scale=Math.min(w,h)*0.72*zoom;
  ctx.fillStyle='#080c15';ctx.fillRect(0,0,w,h);
  const people=positionsAt(time);
  if(people.length){const avg=[0,0,0];for(const p of people){avg[0]+=p[1];avg[1]+=p[2];avg[2]+=p[3];}for(let k=0;k<3;k++)focus[k]+=(avg[k]/people.length-focus[k])*0.045;}
  function project(x,y,z) {
   x-=focus[0];y-=focus[1];z-=focus[2];
   const c=Math.cos(angle),s=Math.sin(angle),cp=Math.cos(pitch),sp=Math.sin(pitch);
   const xx=x*c-z*s,depth=x*s+z*c, yy=y*cp-depth*sp,zz=y*sp+depth*cp;
   const p=1/Math.max(0.3,1+zz/110);
   return [w/2+xx*scale/35*p,h*0.55-yy*scale/35*p,p,zz];
  }
  ctx.strokeStyle='#273445';ctx.lineWidth=Math.max(1,w/1100);
  for(let i=-100;i<=100;i+=10) {
   for(const [a,b] of [[[i,0,-100],[i,0,100]],[[-100,0,i],[100,0,i]]]){
    const p=project(...a),q=project(...b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
   }
  }
  ctx.strokeStyle='#af3654';
  for(const [a,b] of [[[-100,0,0],[100,0,0]],[[0,0,-100],[0,0,100]]]) {
   const p=project(...a),q=project(...b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
  }
  people.sort((a,b)=>project(a[1],a[2],a[3])[3]-project(b[1],b[2],b[3])[3]);
  for(const p of people) {
   const color=colors.get(p[0])||'#fff',foot=project(p[1],p[2]-2,p[3]),head=project(p[1],p[2]+5,p[3]),mid=project(p[1],p[2]+1,p[3]);
   const radius=Math.max(3,8*head[2]*Math.min(w,h)/700);
   ctx.strokeStyle=color;ctx.lineWidth=Math.max(3,radius*.9);ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(foot[0],foot[1]);ctx.lineTo(head[0],head[1]+radius);ctx.stroke();
   ctx.fillStyle=color;ctx.beginPath();ctx.arc(head[0],head[1],radius,0,2*Math.PI);ctx.fill();
   const theta=p[4]*Math.PI/180,forward=project(p[1]+Math.sin(theta)*4,p[2]+1,p[3]-Math.cos(theta)*4);
   ctx.beginPath();ctx.lineWidth=2;ctx.moveTo(mid[0],mid[1]);ctx.lineTo(forward[0],forward[1]);ctx.stroke();
   ctx.fillStyle='#f5ecf1';ctx.textAlign='center';ctx.font=Math.max(11,w/90)+'px sans-serif';
   ctx.fillText(p[0],head[0],head[1]-radius-7);
  }
  clock.textContent=fmt(time)+' / '+fmt(duration);
  timeline.value=String(Math.round(time/duration*1000));
  requestAnimationFrame(frame);
 }
 canvas.addEventListener('pointerdown',e=>{drag=true;previousX=e.clientX;previousY=e.clientY;canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;angle+=(e.clientX-previousX)*0.007;pitch=Math.max(0.12,Math.min(1.35,pitch-(e.clientY-previousY)*0.005));previousX=e.clientX;previousY=e.clientY;});
 canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(0.25,Math.min(3.5,zoom*(e.deltaY>0?0.9:1.1)));},{passive:false});
 timeline.addEventListener('input',()=>time=Number(timeline.value)/1000*duration);
 play.addEventListener('click',()=>{if(time>=duration)time=0;playing=!playing;play.textContent=playing?'Ⅱ Pausar':'▶ Reproducir';});
 requestAnimationFrame(frame);
})();
