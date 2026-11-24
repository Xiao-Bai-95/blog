/** 楼中楼评论测试：顶层 → 回复 → 层级组装 → 边界校验 */
const BASE = 'http://localhost:3001/api';
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};
async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function main() {
  console.log('\n=== 楼中楼评论测试 ===\n');
  const alice = (await req('POST', '/auth/login', { body: { username: 'alice', password: 'Blog@2026' } })).data.token;
  const bob = (await req('POST', '/auth/login', { body: { username: 'bob', password: 'Blog@2026' } })).data.token;

  // 发一条顶层评论
  const top = await req('POST', '/posts/1/comments', { token: bob, body: { content: '顶层评论 - ' + Date.now() } });
  check('发顶层评论成功', top.status === 201, JSON.stringify(top.data));

  // 回复这条评论
  const reply = await req('POST', '/posts/1/comments', {
    token: alice, body: { content: '回复顶层评论', parent_id: top.data.id },
  });
  check('回复成功', reply.status === 201, JSON.stringify(reply.data));

  // 再回复回复（第三层）—— 应被"最多两层"挡住
  const deep = await req('POST', '/posts/1/comments', {
    token: bob, body: { content: '第三层', parent_id: reply.data.id },
  });
  check('第三层回复被拒绝', deep.status === 400, JSON.stringify(deep.data));

  // 跨文章回复 —— 应被拒绝
  const cross = await req('POST', '/posts/2/comments', {
    token: bob, body: { content: '跨文章', parent_id: top.data.id },
  });
  check('跨文章回复被拒绝', cross.status === 400, JSON.stringify(cross.data));

  // 详情里验证 parent_id 和 reply_to_name
  const detail = await req('GET', '/posts/1', { token: alice });
  const theReply = detail.data.comments.find((c) => c.id === reply.data.id);
  check('详情带 parent_id', theReply?.parent_id === top.data.id, JSON.stringify(theReply));
  check('详情带 reply_to_name', theReply?.reply_to_name === 'bob', JSON.stringify(theReply));

  // 前端能据此组装成树：顶层评论的 parent_id 为 null
  const theTop = detail.data.comments.find((c) => c.id === top.data.id);
  check('顶层评论 parent_id 为 null', theTop?.parent_id === null, JSON.stringify(theTop));

  console.log(`\n=== 测试结束：${pass} 通过，${fail} 失败 ===\n`);
  process.exitCode = fail ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
