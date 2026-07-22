const crypto = require('crypto');

const COOKIE = 'mavion_planner_session';
const DATA_KEY = 'mavion:planner:alexander:v1';
const SESSION_AGE = 60 * 60 * 24 * 7;

function env() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  };
}
async function redis(command) {
  const e = env();
  if (!e.url || !e.token) throw new Error('storage_not_configured');
  const response = await fetch(e.url, { method: 'POST', headers: { Authorization: 'Bearer ' + e.token, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  if (!response.ok) throw new Error('storage_unavailable');
  const payload = await response.json();
  if (payload.error) throw new Error('storage_unavailable');
  return payload.result;
}
function secret() { return process.env.PLANNER_SESSION_SECRET || crypto.createHash('sha256').update(process.env.PLANNER_PASSCODE || 'Mavion').digest('hex'); }
function signature(value) { return crypto.createHmac('sha256', secret()).update(value).digest('base64url'); }
function makeSession() {
  const payload = Buffer.from(JSON.stringify({ user: 'Alexander', exp: Math.floor(Date.now() / 1000) + SESSION_AGE })).toString('base64url');
  return payload + '.' + signature(payload);
}
function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((out, entry) => { const i = entry.indexOf('='); if (i > 0) out[entry.slice(0, i).trim()] = decodeURIComponent(entry.slice(i + 1).trim()); return out; }, {});
}
function authenticated(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return false;
  const i = token.lastIndexOf('.'); if (i < 1) return false;
  const payload = token.slice(0, i), sig = token.slice(i + 1), expected = signature(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return data.user === 'Alexander' && data.exp > Date.now() / 1000; } catch (_) { return false; }
}
function sameOrigin(req) {
  const origin = req.headers.origin; if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (_) { return false; }
}
function seed() {
  return { revision: 1, updatedAt: new Date().toISOString(), profile: { name: 'Alexander', timezone: 'America/Los_Angeles' }, settings: { weekStartsMonday: true }, classes: [
    { id:'class-poli', name:'Political Science', code:'9293-2', color:'#5267ff', days:['Mon','Wed','Fri'], start:'09:00', end:'10:00', room:'', instructor:'' },
    { id:'class-eng', name:'English', code:'GEN-ENG-2', color:'#8b5cf6', days:['Tue','Thu'], start:'10:30', end:'11:30', room:'', instructor:'' },
    { id:'class-dual', name:'Dual Enrollment', code:'MJC-3922', color:'#0ea5e9', days:['Mon','Wed'], start:'12:00', end:'13:00', room:'', instructor:'' },
    { id:'class-cs', name:'Computer Science', code:'6295-F', color:'#10b981', days:['Tue','Thu'], start:'13:30', end:'14:30', room:'', instructor:'' }
  ], tasks: [], notes: [] };
}
function text(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }
function clean(data) {
  const out = { revision: Math.max(1, Number(data.revision) || 1), updatedAt: new Date().toISOString(), profile: { name:'Alexander', timezone:'America/Los_Angeles' }, settings: { weekStartsMonday: true }, classes: [], tasks: [], notes: [] };
  out.classes = (Array.isArray(data.classes) ? data.classes : []).slice(0, 30).map((x, i) => ({ id:text(x.id,64)||('class-'+i), name:text(x.name,80)||'Untitled class', code:text(x.code,30), color:/^#[0-9a-f]{6}$/i.test(x.color||'')?x.color:'#5267ff', days:(Array.isArray(x.days)?x.days:[]).filter(d=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(d)), start:text(x.start,5), end:text(x.end,5), room:text(x.room,60), instructor:text(x.instructor,80) }));
  out.tasks = (Array.isArray(data.tasks) ? data.tasks : []).slice(0, 500).map((x,i)=>({ id:text(x.id,64)||('task-'+i), title:text(x.title,160)||'Untitled task', classId:text(x.classId,64), due:text(x.due,32), priority:['low','medium','high'].includes(x.priority)?x.priority:'medium', completed:!!x.completed, details:text(x.details,1500), createdAt:text(x.createdAt,32)||new Date().toISOString() }));
  out.notes = (Array.isArray(data.notes) ? data.notes : []).slice(0, 200).map((x,i)=>({ id:text(x.id,64)||('note-'+i), title:text(x.title,120)||'Untitled note', body:text(x.body,6000), classId:text(x.classId,64), updatedAt:text(x.updatedAt,32)||new Date().toISOString() }));
  return out;
}
async function load() { const raw = await redis(['GET', DATA_KEY]); if (!raw) { const d=seed(); await redis(['SET',DATA_KEY,JSON.stringify(d)]); return d; } return clean(JSON.parse(raw)); }
function respond(res, status, body) { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); return res.end(JSON.stringify(body)); }

module.exports = async function handler(req, res) {
  if (!sameOrigin(req)) return respond(res,403,{error:'invalid_origin'});
  let body={}; if (req.method==='POST') { body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(_){return respond(res,400,{error:'invalid_json'})}} }
  const action = req.method==='GET' ? 'load' : text(body.action,20);
  try {
    if (action==='login') { if(text(body.passcode,120)!==(process.env.PLANNER_PASSCODE||'Mavion')) return respond(res,401,{error:'invalid_passcode'}); res.setHeader('Set-Cookie',COOKIE+'='+makeSession()+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+SESSION_AGE); return respond(res,200,{ok:true,user:'Alexander'}); }
    if (action==='logout') { res.setHeader('Set-Cookie',COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'); return respond(res,200,{ok:true}); }
    if (!authenticated(req)) return respond(res,401,{error:'unauthorized'});
    if (action==='load') return respond(res,200,{ok:true,data:await load()});
    if (action==='save') { const current=await load(), incoming=clean(body.data||{}); if(Number(body.revision)!==Number(current.revision)) return respond(res,409,{error:'edit_conflict',data:current}); incoming.revision=current.revision+1; await redis(['SET',DATA_KEY,JSON.stringify(incoming)]); return respond(res,200,{ok:true,data:incoming}); }
    return respond(res,400,{error:'unknown_action'});
  } catch (e) { return respond(res,e.message==='storage_not_configured'?503:500,{error:e.message==='storage_not_configured'?'storage_not_configured':'server_error'}); }
};

module.exports._internals = { authenticated, load, clean };
