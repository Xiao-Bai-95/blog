/**
 * 安全 + 搜索测试
 * 验证：密码强度规则、标签搜索、种子账号升级后仍能登录。
 */
const BASE = 'http://localhost:3001/api';

async function register(username, password) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email: `${username}@test.com`, password }),
  });
  return { status: res.status, data: await res.json() };
}

async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return { status: res.status, data: await res.json() };
}

async function search(keyword) {
  const res = await fetch(`${BASE}/posts?keyword=${encodeURIComponent(keyword)}`);
  return (await res.json()).list;
}

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name} ${extra}`); fail++; }
}

async function main() {
  console.log('场景 1：密码强度规则（至少8位+字母+数字+特殊符号）');
  const weak = await register('weakuser', '123456');
  check('弱密码 123456 被拒绝', weak.status === 400, JSON.stringify(weak.data));
  const noSpecial = await register('nospecial', 'Password123');
  check('缺特殊符号被拒绝', noSpecial.status === 400, JSON.stringify(noSpecial.data));
  const short = await register('shortpw', 'Aa1!');
  check('不足 8 位被拒绝', short.status === 400, JSON.stringify(short.data));
  const strong = await register('stronguser', 'Strong@2026');
  check('强密码注册成功', strong.status === 201, JSON.stringify(strong.data));

  console.log('\n场景 2：种子账号密码升级后仍可登录');
  const old = await login('alice', '123456');
  check('旧密码 123456 登录失败', old.status === 401);
  const fresh = await login('alice', 'Blog@2026');
  check('新密码 Blog@2026 登录成功', fresh.status === 200 && !!fresh.data.token, JSON.stringify(fresh.data).slice(0, 120));

  console.log('\n场景 3：搜索框支持搜标签');
  const byTag = await search('大数据');
  check('搜"大数据"能命中带该标签的文章', byTag.some((p) => p.tags?.includes('大数据')), JSON.stringify(byTag.map((p) => p.title)));
  const partial = await search('大数');
  check('模糊搜"大数"也能命中', partial.some((p) => p.tags?.some((t) => t.includes('大数'))), JSON.stringify(partial.map((p) => p.title)));
  const byTitle = await search('Vibe');
  check('搜标题仍然有效（没改坏）', byTitle.some((p) => p.title.includes('Vibe')));

  console.log(`\n结果：${pass} 通过，${fail} 失败`);
  if (fail) process.exitCode = 1;
}

main().catch((e) => { console.error('测试异常:', e); process.exitCode = 1; });
