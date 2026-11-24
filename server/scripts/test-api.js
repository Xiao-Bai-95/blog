/**
 * 端到端接口测试
 * 覆盖：注册 → 登录 → 发文章 → 权限校验 → 评论 → 点赞 toggle → 搜索 → 浏览量
 * 需要服务已在 localhost:3001 运行（npm start）
 */
const BASE = 'http://localhost:3001/api';
let passed = 0;
let failed = 0;

const check = (name, cond, extra = '') => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} ${extra}`);
  }
};

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function main() {
  console.log('\n=== 开始接口测试 ===\n');

  // 0. 健康检查
  const health = await request('GET', '/health');
  check('服务健康检查', health.status === 200 && health.data.status === 'ok');

  // 1. 用种子账号登录（alice / Blog@2026）
  const login = await request('POST', '/auth/login', {
    body: { username: 'alice', password: 'Blog@2026' },
  });
  check('登录成功拿到 token', login.status === 200 && !!login.data.token,
    JSON.stringify(login.data));
  const alice = login.data.token;

  const loginBob = await request('POST', '/auth/login', {
    body: { username: 'bob', password: 'Blog@2026' },
  });
  const bob = loginBob.data.token;
  check('bob 登录成功', !!bob);

  // 2. 注册新用户
  const ts = Date.now();
  const reg = await request('POST', '/auth/register', {
    body: { username: 'user' + ts, email: `u${ts}@test.com`, password: 'Blog@2026' },
  });
  check('注册成功', reg.status === 201 && !!reg.data.token, JSON.stringify(reg.data));

  // 3. 密码错误应失败
  const badLogin = await request('POST', '/auth/login', {
    body: { username: 'alice', password: 'wrongpass' },
  });
  check('错误密码被拒绝', badLogin.status === 401);

  // 4. 发文章
  const created = await request('POST', '/posts', {
    token: alice,
    body: {
      title: '测试文章 ' + ts,
      content: '# 测试\n这是**测试内容**，用于验证接口。',
      category_id: 1,
      tags: ['测试'],
    },
  });
  check('发布文章成功', created.status === 201 && !!created.data.id, JSON.stringify(created.data));
  const postId = created.data.id;

  // 5. 没登录不能发文章
  const noAuth = await request('POST', '/posts', {
    body: { title: 'x', content: 'y' },
  });
  check('未登录发文章被拒绝', noAuth.status === 401);

  // 6. 列表 + 分页 + 搜索
  const list = await request('GET', '/posts?page=1&pageSize=5');
  check('文章列表返回', list.status === 200 && Array.isArray(list.data.list) && list.data.list.length > 0,
    JSON.stringify(list.data).slice(0, 200));
  check('摘要字段自动生成', typeof list.data.list[0]?.summary === 'string');

  const search = await request('GET', '/posts?keyword=' + encodeURIComponent('测试文章'));
  check('关键词搜索生效', search.status === 200 && search.data.list.some((p) => p.title.includes('测试文章')));

  // 7. 详情 + 浏览量
  const detail1 = await request('GET', `/posts/${postId}`, { token: alice });
  const detail2 = await request('GET', `/posts/${postId}`, { token: alice });
  check('文章详情返回评论列表', detail1.status === 200 && Array.isArray(detail1.data.comments));
  check('浏览量 +1 生效', detail2.data.views === detail1.data.views + 1,
    `${detail1.data.views} -> ${detail2.data.views}`);

  // 8. 权限：bob 不能改 alice 的文章
  const forbidden = await request('PUT', `/posts/${postId}`, {
    token: bob,
    body: { title: '恶意修改' },
  });
  check('bob 改 alice 文章被拒绝（403）', forbidden.status === 403, JSON.stringify(forbidden.data));

  // 9. 评论
  const comment = await request('POST', `/posts/${postId}/comments`, {
    token: bob,
    body: { content: '测试评论' },
  });
  check('bob 评论成功', comment.status === 201, JSON.stringify(comment.data));

  const noAuthComment = await request('POST', `/posts/${postId}/comments`, {
    body: { content: '游客评论' },
  });
  check('游客评论被拒绝', noAuthComment.status === 401);

  // 10. 点赞 toggle —— 你的核心设计
  const like1 = await request('POST', '/likes/toggle', {
    token: bob,
    body: { target_type: 'post', target_id: postId },
  });
  check('第一次点赞 liked=true, count=1',
    like1.status === 200 && like1.data.liked === true && like1.data.count === 1,
    JSON.stringify(like1.data));

  const like2 = await request('POST', '/likes/toggle', {
    token: bob,
    body: { target_type: 'post', target_id: postId },
  });
  check('再次点击取消 liked=false, count=0',
    like2.status === 200 && like2.data.liked === false && like2.data.count === 0,
    JSON.stringify(like2.data));

  const like3 = await request('POST', '/likes/toggle', {
    token: bob,
    body: { target_type: 'post', target_id: postId },
  });
  check('第三次点赞 count 回到 1（防重复生效）',
    like3.status === 200 && like3.data.liked === true && like3.data.count === 1,
    JSON.stringify(like3.data));

  // 11. 详情里的 liked 状态
  const detail3 = await request('GET', `/posts/${postId}`, { token: bob });
  check('详情页返回我的已点赞状态', detail3.data.liked === true);

  const detailGuest = await request('GET', `/posts/${postId}`);
  check('游客详情 liked=false', detailGuest.data.liked === false);

  console.log(`\n=== 测试结束：${passed} 通过，${failed} 失败 ===\n`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('测试脚本异常:', err);
  process.exitCode = 1;
});
