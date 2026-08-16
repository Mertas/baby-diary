import Database from 'better-sqlite3';
const db = new Database('E:/MY/BabyDiary/data/babydiary.db', { readonly: true });
const q = (sql, ...a) => db.prepare(sql).get(...a);
const qa = (sql, ...a) => db.prepare(sql).all(...a);

// 1) Retry calls: request contains the retry user prompt marker
const retry = q(`SELECT COUNT(*) c FROM llm_logs WHERE request LIKE '%Ты ответила обычным текстом%'`);
console.log('retry-calls (request has retry marker):', retry.c, 'of 1842');

// 2) Fill calls
const fill2 = q(`SELECT COUNT(*) c FROM llm_logs WHERE request LIKE '%Дозаполни пустые разделы%'`);
const fillSurvey = q(`SELECT COUNT(*) c FROM llm_logs WHERE request LIKE '%Раздел навыков пуст%'`);
console.log('fill-dozapolnenie calls:', fill2.c, '| fill-survey calls:', fillSurvey.c);

// 3) choices-gen calls
const gen = q(`SELECT COUNT(*) c FROM llm_logs WHERE request LIKE '%генерируешь варианты ответа%'`);
console.log('choices-gen calls:', gen.c);

// 4) Main chat calls (handlePrompt): request has system role with big prompt and ends with user prompt
const main = q(`SELECT COUNT(*) c FROM llm_logs WHERE request LIKE '%# ТЕКУЩАЯ ДАТА%'`);
console.log('main handlePrompt calls (with date block):', main.c);

// 5) Request size growth over time (avg per day)
console.log('\n=== avg/max request chars per day ===');
for (const r of qa(`SELECT date(created_at/1000,'unixepoch','localtime') d, COUNT(*) c, ROUND(AVG(LENGTH(request))) av, MAX(LENGTH(request)) mx FROM llm_logs GROUP BY d ORDER BY d`)) {
  console.log(r.d, 'n=', r.c, 'avg=', r.av, 'max=', r.mx);
}

// 6) responses with markdown fence start
const fence = q(`SELECT COUNT(*) c FROM llm_logs WHERE trim(response) LIKE '%%%json%' OR trim(response) LIKE '%%%'`);
console.log('\nresponses starting with ``` (fence):', fence.c);

// 7) what fraction of responses have any { at all
const hasBrace = q(`SELECT COUNT(*) c FROM llm_logs WHERE response LIKE '%{%'`);
console.log('responses containing { :', hasBrace.c);

// 8) check request size vs messages count for biggest requests
const big = qa(`SELECT LENGTH(request) l, substr(request,1,50) head FROM llm_logs ORDER BY LENGTH(request) DESC LIMIT 5`);
for (const b of big) console.log('BIG req len:', b.l, JSON.stringify(b.head));

// 9) how many messages in biggest request
try {
  const b2 = qa(`SELECT request FROM llm_logs ORDER BY LENGTH(request) DESC LIMIT 1`)[0];
  const arr = JSON.parse(b2.request);
  const sys = arr.filter(m => m.role === 'system').map(m => m.content.length);
  const nUsers = arr.filter(m => m.role === 'user').length;
  console.log('\nbiggest request: msgs=', arr.length, 'user msgs=', nUsers, 'system len=', sys);
} catch (e) { console.log(e); }

// 10) llm_logs rotation check: earliest & latest
const range = q(`SELECT MIN(created_at) mn, MAX(created_at) mx FROM llm_logs`);
console.log('\nlog range ms:', range.mn, range.mx, 'days:', ((range.mx - range.mn) / 86400000).toFixed(1));

db.close();
