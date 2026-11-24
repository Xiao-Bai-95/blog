/**
 * 数据库初始化脚本
 * 按 database.md v0.3 建表，可重复运行（DROP 后重建）。
 * 顺便塞入种子数据，方便你直接体验评论和点赞。
 */
import db, { run, all } from '../src/db/index.js';
import bcrypt from 'bcryptjs';

export const createTables = async () => {
  // 按依赖顺序删：先删引用别人的，再删被引用的
  await run('DROP TABLE IF EXISTS view_logs');
  await run('DROP TABLE IF EXISTS likes');
  await run('DROP TABLE IF EXISTS comments');
  await run('DROP TABLE IF EXISTS posts');
  await run('DROP TABLE IF EXISTS categories');
  await run('DROP TABLE IF EXISTS users');

  // 1. 用户表 —— 你拍板：username 登录，密码 bcrypt，字段 255
  await run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '/default-avatar.png',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. 分类表 —— 你拍板：单独建表更易维护
  await run(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    )
  `);

  // 3. 文章表 —— tags 用 TEXT 存 JSON（SQLite 没有原生 JSON 类型）
  await run(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      cover TEXT,
      category_id INTEGER,
      tags TEXT DEFAULT '[]',
      author_id INTEGER NOT NULL,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // 4. 评论表 —— 已升级为楼中楼：加 parent_id 指向父评论
  //    parent_id = NULL 表示顶层评论；有值表示"回复某条评论"
  await run(`
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  // 5. 点赞表 —— 你拍板：防重复 + toggle
  //    唯一索引是核心：同一个人对同一目标只能有一条记录
  await run(`
    CREATE TABLE likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, target_type, target_id)
    )
  `);

  // 6. 浏览记录表 —— 你拍板：同一访客同一天看同一篇只算 1 次浏览
  //    viewer_key 用字符串，兼容两种身份：登录用户 "u:3"，游客 "g:abc123"
  //    唯一索引是核心：同一 (文章, 访客, 日期) 只能有一条记录
  await run(`
    CREATE TABLE view_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      viewer_key TEXT NOT NULL,
      view_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE (post_id, viewer_key, view_date)
    )
  `);

  console.log('✓ 6 张表已创建');
};

export const seed = async () => {
  // 两个测试用户，密码都是 Blog@2026（已 bcrypt 加密）
  const hashed = await bcrypt.hash('Blog@2026', 10);
  await run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    ['alice', 'alice@test.com', hashed]
  );
  await run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    ['bob', 'bob@test.com', hashed]
  );

  // 三个分类
  await run("INSERT INTO categories (name, description) VALUES ('技术', '技术相关文章')");
  await run("INSERT INTO categories (name, description) VALUES ('生活', '生活随笔')");
  await run("INSERT INTO categories (name, description) VALUES ('AI', '人工智能')");

  // 两篇文章，作者是 alice
  await run(
    `INSERT INTO posts (title, content, category_id, tags, author_id, views)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      '欢迎来到我的博客',
      '# 你好\n\n这是我的第一篇博客文章，用 **Markdown** 写的。\n\n- 支持标题\n- 支持列表\n- 支持加粗',
      1,
      JSON.stringify(['博客', '开始']),
      1,
      12,
    ]
  );
  await run(
    `INSERT INTO posts (title, content, category_id, tags, author_id, views)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'Vibe Coding 入门',
      '# Vibe Coding\n\n用自然语言告诉 AI 你要什么，AI 帮你写代码。\n\n核心是**你做决策，AI 做执行**。',
      3,
      JSON.stringify(['AI', '编程']),
      1,
      8,
    ]
  );

  // 一条评论，bob 评论 alice 的文章
  await run(
    'INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)',
    [1, 2, '写得不错，支持一下！']
  );

  console.log('✓ 种子数据已写入（测试账号 alice / bob，密码都是 Blog@2026）');
};

const main = async () => {
  try {
    await createTables();
    await seed();
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('✓ 当前表:', tables.map((t) => t.name).join(', '));
    console.log('\n数据库初始化完成！运行 npm start 启动服务。');
  } catch (err) {
    console.error('初始化失败:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
};

// 只有直接运行本脚本时才执行；被 import 时（发布沙盒自动建库）不执行
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
