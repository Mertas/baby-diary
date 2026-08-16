import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('E:/MY/BabyDiary/data/babydiary.db', { readonly: true });

const q = (sql, ...a) => db.prepare(sql).get(...a);
const qa = (sql, ...a) => db.prepare(sql).all(...a);

console.log('=== COUNTS ===');
console.log('chats:', q('SELECT COUNT(*) c FROM chats').c);
console.log('llm_messages:', q('SELECT COUNT(*) c FROM llm_messages').c);
console.log('llm_logs:', q('SELECT COUNT(*) c FROM llm_logs').c);
console.log('baby_state:', q('SELECT COUNT(*) c FROM baby_state').c);

console.log('\n=== llm_messages by role ===');
for (const r of qa('SELECT role, COUNT(*) c, MIN(LENGTH(content)) mn, MAX(LENGTH(content)) mx, AVG(LENGTH(content)) av FROM llm_messages GROUP BY role')) {
  console.log(r.role, 'count=', r.c, 'len min/max/avg=', r.mn, r.mx, Math.round(r.av));
}

console.log('\n=== llm_logs sizes (chars) ===');
const lr = q('SELECT COUNT(*) c, AVG(LENGTH(request)) avr, MAX(LENGTH(request)) mxr, AVG(LENGTH(response)) avs, MAX(LENGTH(response)) mxs, MIN(LENGTH(response)) mns FROM llm_logs');
console.log('logs:', lr.c, 'req avg/max:', Math.round(lr.avr), lr.mxr, 'resp avg/min/max:', Math.round(lr.avs), lr.mns, lr.mxs);

console.log('\n=== llm_logs per day (last 14) ===');
for (const r of qa("SELECT date(created_at/1000, 'unixepoch', 'localtime') d, COUNT(*) c FROM llm_logs GROUP BY d ORDER BY d DESC LIMIT 14")) {
  console.log(r.d, r.c);
}

console.log('\n=== baby_state sizes ===');
const br = q('SELECT COUNT(*) c, AVG(LENGTH(state)) av, MAX(LENGTH(state)) mx FROM baby_state');
console.log('states:', br.c, 'avg/max chars:', Math.round(br.av), br.mx);

console.log('\n=== per-chat stats ===');
for (const r of qa(`
  SELECT chat_id, COUNT(*) msgs,
    SUM(CASE WHEN role='user' THEN 1 ELSE 0 END) u,
    SUM(CASE WHEN role='agent' THEN 1 ELSE 0 END) a
  FROM llm_messages GROUP BY chat_id ORDER BY msgs DESC LIMIT 8`)) {
  console.log(r.chat_id, 'msgs=', r.msgs, 'user=', r.u, 'agent=', r.a);
}

console.log('\n=== latest llm_logs request sizes + response tails ===');
const rows = qa('SELECT id, chat_id, LENGTH(request) reqlen, LENGTH(response) resplen, substr(response,1,120) tail, created_at FROM llm_logs ORDER BY id DESC LIMIT 10');
for (const r of rows) {
  console.log(`#${r.id} chat=${String(r.chat_id).slice(0,8)} req=${r.reqlen} resp=${r.resplen} | ${JSON.stringify(r.tail)}`);
}

// count retry-like patterns: response that is not JSON at all
console.log('\n=== responses that do NOT start with { or [ (possible retries/prose) ===');
const nonJson = qa(`SELECT COUNT(*) c FROM llm_logs WHERE trim(response) NOT LIKE '{%' AND trim(response) NOT LIKE '[%'`);
console.log('non-JSON first char count:', nonJson[0].c);

console.log('\n=== request samples: how big is the system prompt portion ===');
const samp = qa('SELECT request FROM llm_logs ORDER BY id DESC LIMIT 3');
for (const s of samp) {
  try {
    const arr = JSON.parse(s.request);
    const sys = arr.find(m => m.role === 'system');
    console.log('msgs:', arr.length, 'system len:', sys ? sys.content.length : 0, 'first user len:', (arr.find(m => m.role==='user')||{}).content?.length || 0);
  } catch (e) { console.log('unparsable request JSON:', String(e).slice(0, 80)); }
}

db.close();
