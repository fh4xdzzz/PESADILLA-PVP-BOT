import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestReport, showReports, showReportDetail, updateReport } from '../reports.js';

function fakeDB() {
 const rows=new Map(), audits=[];
 const prepare=(sql)=>({
  bind(...args) {
   return {
    async first() {
     if(sql.startsWith('SELECT report_id'))return rows.get(args[0])||null;
     if(sql.startsWith('SELECT COUNT'))return {n:[...rows.values()].filter(x=>x.reporter_user_id===args[0]).length};
     return null;
    },
    async run() {
     if(sql.startsWith('INSERT INTO reports')) {
      const [report_id,reporter_user_id,target_user_id,reason]=args;
      rows.set(report_id,{report_id,reporter_user_id,target_user_id,reason,evidence_url:null,status:'open',created_at:'2026-11-06 12:00:00'});
     } else if(sql.startsWith('UPDATE reports')) {
      const [status,id]=args;
      rows.get(id).status=status;
     } else if(sql.startsWith('INSERT INTO audit_logs')) audits.push(args);
     return {success:true};
    },
    async all() {
     if(sql.startsWith('SELECT actor_discord_id'))return {results:audits.map(a=>({actor_discord_id:a[0],action:a[1],details_json:a[3],created_at:'2026-11-06 12:00:00'}))};
     return {results:[...rows.values()].filter(x=>!sql.includes('WHERE status=?')||x.status===args[0])};
    }
   };
  },
  async all() {return {results:[...rows.values()]};},
  async first() {return null;}
 });
 return {rows,audits,prepare,async batch(statements){for(const st of statements)await st.run();}};
}
const key='a'.repeat(64);
const session='signed.session.token';
const env=()=>({DB:fakeDB(),ROBLOX_INGEST_SECRET:key,SESSION_SECRET:'z'.repeat(64),APP_BASE_URL:'https://example.workers.dev'});
const report={reportId:'report-test-1',reporterUserId:'1001',targetUserId:'1002',category:'cheating',description:'Trampas en el servidor',filtered:true};
const request=(body,token=key)=>new Request('https://example.workers.dev/api/ingest/report',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('denies an unauthenticated report',async()=> {
 const e=env();
 const result=await ingestReport(request(report,'wrong'),e);
 assert.equal(result.status,401);assert.equal(e.DB.rows.size,0);
});
test('denies unfiltered and spoofed inputs',async()=> {
 const e=env();
 for(const patch of [{filtered:false},{targetUserId:'1001'},{category:'invalid'},{description:'bad'}]) {
  const res=await ingestReport(request({...report,...patch}),e);
  assert.equal(res.status,400);
 }
 assert.equal(e.DB.rows.size,0);
});
test('ingests real reports and handles retries idempotently',async()=> {
 const e=env();
 const first=await ingestReport(request(report),e);
 assert.equal(first.status,201);
 assert.equal(e.DB.rows.size,1);
 assert.equal(e.DB.rows.get('report-test-1').status,'open');
 const second=await ingestReport(request(report),e);
 assert.equal(second.status,200);
 assert.equal((await second.json()).duplicate,true);
 assert.equal(e.DB.rows.size,1);
});
test('rate limits the fourth report from a reporter',async()=> {
 const e=env();
 for(let i=1;i<=4;i++) {
  const res=await ingestReport(request({...report,reportId:'case-'+i}),e);
  assert.equal(res.status,i===4?429:201);
 }
});
test('staff page escapes user supplied strings',async()=> {
 const e=env();
 e.DB.rows.set('case', {...report,report_id:'case',reporter_user_id:'1001',target_user_id:'1002',reason:'other | <script>alert(1)</script>',status:'open',created_at:'2026-11-06 12:00:00'});
 const html=await showReports(e,{id:'1',username:'Admin'},new URLSearchParams());
 assert.equal(html.includes('<script>alert(1)</script>'),false);
});
test('staff actions require Origin and CSRF and write an audit trail',async()=> {
 const e=env();
 await ingestReport(request(report),e);
 const make=(origin,csrf)=>new Request('https://example.workers.dev/reportes/report-test-1/actualizar',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({status:'in_review',note:'Validado por staff',csrf})});
 const badOrigin=await updateReport(make('https://evil.example','bad'),e,{id:'987'},'report-test-1',session);
 assert.equal(badOrigin.status,403);
 const badCsrf=await updateReport(make(e.APP_BASE_URL,'bad'),e,{id:'987'},'report-test-1',session);
 assert.equal(badCsrf.status,403);
 const html=await showReportDetail(e,{id:'987',username:'Admin'},'report-test-1',session);
 const csrf=html.match(/name="csrf" value="([a-f0-9]+)"/)?.[1];
 assert.ok(csrf);
 const ok=await updateReport(make(e.APP_BASE_URL,csrf),e,{id:'987'},'report-test-1',session);
 assert.equal(ok.status,303);
 assert.equal(e.DB.rows.get('report-test-1').status,'in_review');
 assert.equal(e.DB.audits.length,1);
 assert.equal(e.DB.audits[0][0],'987');
});
