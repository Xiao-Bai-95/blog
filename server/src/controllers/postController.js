import { get, all, run } from '../db/index.js';

// 把 Markdown 正文截成摘要（你拍板：不单独存 summary 字段，用时截取）
const makeSummary = (content, len = 100) => {
  const plain = content
    .replace(/[#*`>\-\[\]()!]/g, '') // 去掉常见 Markdown 符号
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
};

// 组装列表/详情需要的字段（带作者名、分类名、点赞数）
const decorate = (row) => ({
  ...row,
  tags: safeParseTags(row.tags),
  summary: makeSummary(row.content),
});

const safeParseTags = (tags) => {
  try {
    return JSON.parse(tags || '[]');
  } catch {
    return [];
  }
};

// 列表：分页 + 分类筛选 + 搜索，并附带当前用户的点赞状态
export async function listPosts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;
    const { category, keyword, tag } = req.query;

    const where = [];
    const params = [];
    if (category) {
      where.push('p.category_id = ?');
      params.push(category);
    }
    if (keyword) {
      // 搜索框：标题 + 正文 + 标签都匹配（你发现的缺陷：原来漏了标签）
      // 这里用模糊匹配 %关键词%，输"大数"也能找到"大数据"标签的文章
      where.push('(p.title LIKE ? OR p.content LIKE ? OR p.tags LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (tag) {
      // tags 存的是 JSON 字符串，如 ["AI","编程"]
      // 带引号匹配 %"AI"% 而不是 %AI%，否则查 "AI" 会把 "AIGC" 也捞出来
      where.push('p.tags LIKE ?');
      params.push(`%"${tag}"%`);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const total = await get(`SELECT COUNT(*) AS count FROM posts p ${whereSql}`, params);
    const rows = await all(
      `SELECT p.*, u.username AS author_name, u.avatar AS author_avatar,
              c.name AS category_name,
              (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comments_count,
              (SELECT COUNT(*) FROM likes l WHERE l.target_type = 'post' AND l.target_id = p.id) AS likes_count
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereSql}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      list: rows.map(decorate),
      total: total.count,
      page,
      pageSize,
    });
  } catch (err) {
    res.status(500).json({ error: '获取文章列表失败', detail: err.message });
  }
}

export async function getPost(req, res) {
  try {
    const id = req.params.id;
    const row = await get(
      `SELECT p.*, u.username AS author_name, u.avatar AS author_avatar,
              c.name AS category_name,
              (SELECT COUNT(*) FROM likes l WHERE l.target_type = 'post' AND l.target_id = p.id) AS likes_count
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ error: '文章不存在' });

    // 浏览量防刷（你拍板：同一访客同一天看同一篇只算 1 次）
    // 1. 认人：登录用户用 u:用户id，游客用前端传来的 X-Visitor-Id（浏览器本地生成的随机编号）
    //    没带编号的（比如 curl 测试）统一归到 anon，避免每人一个 key 等于没防
    const visitorId = req.headers['x-visitor-id'];
    const viewerKey = req.user ? `u:${req.user.id}` : `g:${visitorId || 'anon'}`;

    // 2. 当天的日期（用本地日期 YYYY-MM-DD，跨零点不会串到前一天）
    const d = new Date();
    const viewDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // 3. 关键技巧：INSERT OR IGNORE + 唯一索引，一条语句顶掉"先查再插"
    //    - 第一次看：插入成功，changes = 1 → 浏览量 +1
    //    - 再看：唯一索引冲突被忽略，changes = 0 → 浏览量不动
    //    好处：查+插是原子的，两个人同时刷也不会各自查到"没有"然后都 +1
    const viewResult = await run(
      'INSERT OR IGNORE INTO view_logs (post_id, viewer_key, view_date) VALUES (?, ?, ?)',
      [id, viewerKey, viewDate]
    );
    const counted = viewResult.changes > 0;
    if (counted) {
      await run('UPDATE posts SET views = views + 1 WHERE id = ?', [id]);
    }

    // 4. 用更新后的真实数字返回给前端（row 是 +1 之前查的，这里要补上）
    const views = row.views + (counted ? 1 : 0);

    // 我是否已点赞 —— 前端靠这个显示"已点赞"状态
    let liked = false;
    if (req.user) {
      const like = await get(
        "SELECT id FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?",
        [req.user.id, id]
      );
      liked = !!like;
    }

    // 评论列表（已升级楼中楼：带 parent_id，并查出"回复给谁"的名字）
    const comments = await all(
      `SELECT cm.*, u.username AS author_name, u.avatar AS author_avatar,
              pu.username AS reply_to_name
       FROM comments cm
       LEFT JOIN users u ON cm.author_id = u.id
       LEFT JOIN comments parent ON cm.parent_id = parent.id
       LEFT JOIN users pu ON parent.author_id = pu.id
       WHERE cm.post_id = ?
       ORDER BY cm.created_at ASC`,
      [id]
    );

    res.json({ ...decorate(row), views, liked, comments, viewCounted: counted });
  } catch (err) {
    res.status(500).json({ error: '获取文章失败', detail: err.message });
  }
}

export async function createPost(req, res) {
  try {
    const { title, content, category_id, tags, cover } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    const { lastID } = await run(
      `INSERT INTO posts (title, content, category_id, tags, cover, author_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, category_id || null, JSON.stringify(tags || []), cover || null, req.user.id]
    );
    res.status(201).json({ message: '发布成功', id: lastID });
  } catch (err) {
    res.status(500).json({ error: '发布失败', detail: err.message });
  }
}

export async function updatePost(req, res) {
  try {
    const id = req.params.id;
    // 权限：只能改自己的文章 —— author_id 校验
    const post = await get('SELECT author_id FROM posts WHERE id = ?', [id]);
    if (!post) return res.status(404).json({ error: '文章不存在' });
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: '只能修改自己的文章' });
    }

    const { title, content, category_id, tags, cover } = req.body;
    await run(
      `UPDATE posts
       SET title = ?, content = ?, category_id = ?, tags = ?, cover = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title ?? post.title,
        content ?? post.content,
        category_id ?? null,
        JSON.stringify(tags || []),
        cover || null,
        id,
      ]
    );
    res.json({ message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: '更新失败', detail: err.message });
  }
}

export async function deletePost(req, res) {
  try {
    const id = req.params.id;
    const post = await get('SELECT author_id FROM posts WHERE id = ?', [id]);
    if (!post) return res.status(404).json({ error: '文章不存在' });
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: '只能删除自己的文章' });
    }
    await run('DELETE FROM posts WHERE id = ?', [id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败', detail: err.message });
  }
}

export async function listCategories(req, res) {
  try {
    const rows = await all('SELECT * FROM categories ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '获取分类失败', detail: err.message });
  }
}
