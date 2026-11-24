/**
 * 标签筛选测试
 * 验证：按标签筛出文章、带引号匹配不误伤、可与分类/关键词组合、不存在的标签返回空。
 */
const BASE = 'http://localhost:3001/api';

async function list(params = {}) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${BASE}/posts?${qs}`);
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  const data = await res.json();
  return data;
}

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name} ${extra}`); fail++; }
}

async function main() {
  console.log('场景 1：按标签筛选');
  const ai = await list({ tag: 'AI' });
  check('tag=AI 只返回含 AI 标签的文章', ai.list.length === 1 && ai.list[0].title.includes('Vibe Coding'), JSON.stringify(ai.list.map((p) => p.title)));
  const blog = await list({ tag: '博客' });
  check('tag=博客 返回另一篇', blog.list.length === 1 && blog.list[0].title.includes('欢迎'), JSON.stringify(blog.list.map((p) => p.title)));

  console.log('\n场景 2：带引号匹配，不误伤相似标签');
  // 种子数据里没有 AIGC，用接口造一篇带 AIGC 标签的文章来验证
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'Blog@2026' }),
  });
  const { token } = await login.json();
  await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'AIGC 探秘', content: '关于 AIGC 的文章', tags: ['AIGC'], category_id: 3 }),
  });
  const aiExact = await list({ tag: 'AI' });
  check('tag=AI 不会捞到 AIGC 文章', aiExact.list.length === 1 && !aiExact.list.some((p) => p.title.includes('AIGC')), JSON.stringify(aiExact.list.map((p) => p.title)));
  const aigc = await list({ tag: 'AIGC' });
  check('tag=AIGC 能精确筛出 AIGC 文章', aigc.list.length === 1 && aigc.list[0].title.includes('AIGC'));

  console.log('\n场景 3：与其他条件组合');
  const combo = await list({ tag: 'AI', category: '3' });
  check('tag=AI + 分类3 仍能筛出', combo.list.length >= 1 && combo.list.some((p) => p.title.includes('Vibe Coding')));
  const kw = await list({ tag: 'AI', keyword: 'Vibe' });
  check('tag=AI + 关键词Vibe 命中', kw.list.length === 1 && kw.list[0].title.includes('Vibe Coding'));

  console.log('\n场景 4：不存在的标签');
  const none = await list({ tag: '不存在的标签' });
  check('不存在的标签返回空列表', none.list.length === 0 && none.total === 0);
  const noTag = await list({});
  check('不带 tag 参数返回全部', noTag.total >= 3);

  console.log(`\n结果：${pass} 通过，${fail} 失败`);
  if (fail) process.exitCode = 1;
}

main().catch((e) => { console.error('测试异常:', e); process.exitCode = 1; });
