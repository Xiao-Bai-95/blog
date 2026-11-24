/**
 * 浏览量防刷测试
 * 验证：同一访客当天只算 1 次、不同访客各算 1 次、
 *       登录用户与游客分开算、跨天后重新计数。
 */
import db from '../src/db/index.js';

const BASE = 'http://localhost:3001/api';

// 发一次详情请求，返回 { views, viewCounted }
async function visit(visitorId, token) {
  const headers = {};
  if (visitorId) headers['X-Visitor-Id'] = visitorId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/posts/1`, { headers });
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  const data = await res.json();
  return { views: data.views, counted: data.viewCounted };
}

async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('登录失败: ' + JSON.stringify(data));
  return data.token;
}

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name} ${extra}`); fail++; }
}

async function main() {
  // 拿一个干净的起始浏览量
  const start = await visit('setup-reader');
  const base = start.views;
  console.log(`起始浏览量: ${base}\n`);

  console.log('场景 1：同一游客（浏览器 A）当天多次看');
  const a1 = await visit('visitor-A');
  const a2 = await visit('visitor-A');
  const a3 = await visit('visitor-A');
  check('第一次浏览 +1', a1.counted === true, JSON.stringify(a1));
  check('第二次不计入', a2.counted === false, JSON.stringify(a2));
  check('第三次不计入', a3.counted === false, JSON.stringify(a3));
  check('浏览量只涨了 1', a3.views === a1.views, `a1=${a1.views} a3=${a3.views}`);

  console.log('\n场景 2：不同游客（浏览器 B）');
  const b1 = await visit('visitor-B');
  check('新游客第一次 +1', b1.counted === true, JSON.stringify(b1));
  check('B 的浏览数比 A 多 1', b1.views === a3.views + 1, `a3=${a3.views} b1=${b1.views}`);
  const b2 = await visit('visitor-B');
  check('B 第二次不计入', b2.counted === false);

  console.log('\n场景 3：登录用户与游客身份分开');
  const token = await login('alice', 'Blog@2026');
  const u1 = await visit('visitor-A', token); // 同一个浏览器，但登录了
  check('登录后算作新身份 +1', u1.counted === true, JSON.stringify(u1));
  check('登录浏览数比游客 B 多 1', u1.views === b2.views + 1, `b2=${b2.views} u1=${u1.views}`);
  const u2 = await visit('visitor-A', token);
  check('同一登录用户第二次不计入', u2.counted === false);

  console.log('\n场景 4：换一天后重新计数（把记录日期改成昨天，模拟第二天）');
  await new Promise((resolve, reject) => {
    db.run("UPDATE view_logs SET view_date = '2000-01-01' WHERE viewer_key = 'g:visitor-A'", (err) => err ? reject(err) : resolve());
  });
  const nextDay = await visit('visitor-A');
  check('新的一天又能 +1', nextDay.counted === true, JSON.stringify(nextDay));
  check('浏览数确实涨了', nextDay.views === u2.views + 1, `u2=${u2.views} next=${nextDay.views}`);

  console.log(`\n结果：${pass} 通过，${fail} 失败`);
  if (fail) process.exitCode = 1;
  db.close();
}

main().catch((e) => { console.error('测试异常:', e); process.exitCode = 1; db.close(); });
