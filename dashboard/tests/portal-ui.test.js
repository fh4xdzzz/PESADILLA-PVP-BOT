import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLoginPage,dashboardIntro} from '../portal-ui.js';
import worker from '../worker.js';

test('login screen links to Discord OAuth route',()=>{
 const html=renderLoginPage();
 assert.match(html,/href="\/login"/);
 assert.match(html,/Continuar con Discord/);
 assert.match(html,/PESADILLA PVP/);
});

test('welcome banner renders current synchronization state',()=>{
 const stale=dashboardIntro({username:'Owner'},0);
 assert.match(stale,/Sin sincronización reciente/);
 const fresh=dashboardIntro({username:'Owner'},1);
 assert.match(fresh,/Sincronización reciente con el bot/);
});

test('admin name is treated as text',()=>{
 const html=dashboardIntro({username:'A & B'},0);
 assert.match(html,/A &amp; B/);
});

test('dashboard serves the login page when no session is present',async()=>{
 const env={APP_BASE_URL:'https://example.com',DISCORD_CLIENT_ID:'1234',DISCORD_CLIENT_SECRET:'placeholder',DASHBOARD_ADMIN_IDS:'9876',SESSION_SECRET:'a'.repeat(40)};
 const res=await worker.fetch(new Request('https://example.com/'),env);
 assert.equal(res.status,200);
 assert.match(await res.text(),/Continuar con Discord/);
});
