import { icon } from './lucide-icons.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

const loginCss = [
  ':root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#080910;color:#f9f6fc}',
  '*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse 70% 70% at 15% 15%,#48132a66,transparent 65%),radial-gradient(ellipse 55% 65% at 90% 90%,#23204c77,transparent 70%),#080910}',
  'a{color:inherit;text-decoration:none}.page{max-width:1320px;margin:auto;min-height:100vh;display:flex;flex-direction:column;padding:28px clamp(22px,5vw,70px)}',
  '.top{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{display:flex;align-items:center;gap:13px;font-size:13px;font-weight:900;letter-spacing:.08em}.mark{display:grid;place-items:center;width:45px;height:45px;border-radius:12px;background:linear-gradient(135deg,#ef315c,#79142f);box-shadow:0 12px 30px #e72a4b30}.mark svg{width:27px;height:27px}.brand small{display:block;margin-top:3px;color:#ab91a3;font-size:9px;letter-spacing:.17em}.top-note{font-size:12px;color:#b4a5b8;border:1px solid #493341;border-radius:99px;padding:9px 14px}',
  '.content{flex:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,440px);align-items:center;gap:clamp(40px,7vw,120px);padding:65px 0}.eyebrow{font-size:12px;letter-spacing:.22em;color:#ff718f;font-weight:850}.headline{font-size:clamp(52px,6vw,90px);line-height:1.01;letter-spacing:-.065em;margin:22px 0 24px;max-width:730px}.headline span{color:#ff476d}.description{color:#bcb1c4;font-size:16px;line-height:1.85;max-width:520px}.points{margin-top:36px;display:flex;flex-wrap:wrap;gap:16px}.point{border:1px solid #503443;background:#1b1320c4;border-radius:13px;padding:13px 17px;font-size:12px;color:#dfcedb}.point b{color:#f87997;margin-right:8px}',
  '.login-card{position:relative;background:linear-gradient(160deg,#201824,#11121c 75%);border:1px solid #604052;border-radius:23px;padding:clamp(26px,4vw,40px);box-shadow:0 30px 90px #0009}.login-card:before{content:"";position:absolute;inset:0 0 auto;height:5px;background:linear-gradient(90deg,#f13f6a,#8258e4);border-radius:23px 23px 0 0}.auth-icon{width:66px;height:66px;display:grid;place-items:center;border-radius:19px;background:#5865f224;color:#a5afff;margin-bottom:24px}.auth-icon svg{width:34px;height:34px}.login-card h2{font-size:29px;letter-spacing:-.04em;margin:0 0 10px}.login-card p{color:#baacbd;line-height:1.7;font-size:13px;margin:0 0 26px}.login-link{display:flex;align-items:center;justify-content:center;gap:12px;min-height:54px;border-radius:11px;background:#5865f2;color:white;font-size:14px;font-weight:850;transition:background .15s,transform .15s}.login-link:hover{background:#6d79ff;transform:translateY(-1px)}.login-link:focus-visible{outline:3px solid white;outline-offset:3px}.login-link svg{width:20px;height:20px}.secure{border-top:1px solid #382d3d;margin-top:26px;padding-top:21px;display:flex;align-items:flex-start;gap:11px;color:#9da9a5;font-size:12px;line-height:1.6}.secure svg{color:#65cda4;flex-shrink:0}',
  '.foot{color:#827483;font-size:11px;border-top:1px solid #302431;padding:20px 0;display:flex;justify-content:space-between;gap:15px}',
  '@media(max-width:830px){.content{grid-template-columns:1fr;padding:74px 0 50px;gap:34px}.headline{font-size:clamp(48px,10vw,72px)}.login-card{max-width:530px}.top-note{display:none}}',
  '@media(max-width:480px){.page{padding:18px}.content{padding:48px 0}.headline{font-size:47px}.description{font-size:14px}.points{gap:8px}.point{width:100%}.foot{flex-direction:column}}'
].join('');

export function renderLoginPage() {
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="Acceso al dashboard oficial de PESADILLA PVP."><title>Iniciar sesión · PESADILLA PVP</title><style>'+loginCss+'</style></head><body>'+
    '<div class="page"><header class="top"><div class="brand"><span class="mark">'+icon('skull')+'</span><span>PESADILLA PVP<small>BOT DASHBOARD</small></span></div><span class="top-note">Panel privado de administración</span></header>'+
    '<main class="content"><section aria-labelledby="headline"><div class="eyebrow">DISCORD BOT / CONTROL CENTER</div><h1 id="headline" class="headline">Tu comunidad.<br><span>Tu control.</span></h1><p class="description">Administra PESADILLA PVP desde un solo lugar. Accede con tu cuenta de Discord para consultar los servidores conectados y configurar el bot de forma segura.</p><div class="points"><span class="point"><b>01</b> Discord OAuth2</span><span class="point"><b>02</b> Acceso autorizado</span><span class="point"><b>03</b> Configuración por servidor</span></div></section>'+
    '<section class="login-card" aria-labelledby="login-title"><div class="auth-icon">'+icon('messages-square')+'</div><h2 id="login-title">Bienvenido al panel</h2><p>Inicia sesión con Discord. Solamente las cuentas autorizadas pueden entrar al dashboard y administrar los servidores.</p><a class="login-link" href="/login">'+icon('messages-square')+' Continuar con Discord</a><div class="secure">'+icon('shield-ban')+'<span>Autenticación mediante Discord. No solicitamos ni almacenamos tu contraseña.</span></div></section></main>'+
    '<footer class="foot"><span>© PESADILLA PVP · Dashboard oficial</span><span>Acceso seguro · Sin datos de demostración</span></footer></div></body></html>';
}

// Presentational CSS only. Do not change the existing admin routes or their permissions.
export const dashboardExtensionStyles = [
  '.portal-hero{position:relative;overflow:hidden;border:1px solid #69384b;border-radius:20px;padding:30px clamp(22px,4vw,45px);background:radial-gradient(ellipse at 90% 0%,#85244655,transparent 60%),linear-gradient(110deg,#291621,#13131b 74%);margin-bottom:20px}',
  '.portal-hero .eyebrow{display:inline-flex;gap:10px;align-items:center}.portal-hero h1{font-size:clamp(29px,4vw,45px);letter-spacing:-.05em;margin:10px 0}.portal-hero p{color:#cbb2c0;max-width:660px;line-height:1.7;margin:0}.portal-hero-actions{margin-top:24px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}',
  '.portal-action{display:inline-flex;align-items:center;gap:9px;padding:12px 17px;border-radius:10px;background:#dd3e6c;color:white;font-size:12px;font-weight:800}.portal-action:hover{background:#f15782;color:#fff}.portal-action svg{height:17px;width:17px}',
  '.portal-sync{display:inline-flex;align-items:center;gap:8px;font-size:11px;color:#ddbac9}.portal-dot{display:inline-block;width:9px;height:9px;border-radius:100%;background:#f1af66;box-shadow:0 0 0 4px #f1af661c}.portal-dot.ready{background:#65d6a5;box-shadow:0 0 0 4px #65d6a51c}',
  '.cards>.card{transition:border-color .2s,transform .2s}.cards>a.card:hover{border-color:#de4d7b;transform:translateY(-2px)}.cards>.card>h2{font-size:32px;margin:12px 0 4px;letter-spacing:-.045em}.cards>.card>p{font-size:12px;color:#ad9aa8}',
  '@media(max-width:760px){.portal-hero{padding:22px 19px}}'
].join('');

export function dashboardIntro(user, recentSyncCount) {
  const name = esc(user?.username || 'Administrador');
  const synced = Number(recentSyncCount) > 0;
  return '<section class="portal-hero"><span class="eyebrow">PESADILLA PVP / COMMAND CENTER</span><h1>Bienvenido, '+name+'</h1>'+
    '<p>Tu centro de administración del bot de Discord. Aquí aparecen únicamente datos recibidos de tus servidores y las funciones que ya están conectadas.</p>'+
    '<div class="portal-hero-actions"><a class="portal-action" href="/discord">'+icon('messages-square')+' Ver comunidades</a>'+
    '<span class="portal-sync"><span class="portal-dot'+(synced?' ready':'')+'"></span>'+(synced?'Sincronización reciente con el bot':'Sin sincronización reciente')+'</span></div></section>';
}
