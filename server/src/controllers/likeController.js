import { get, run, all } from '../db/index.js';

/**
 * 点赞 toggle —— 你独立设计的交互
 * 有记录 → 删除（取消，liked=false）；没记录 → 插入（点赞，liked=true）
 * 唯一索引保证防重复：即便并发重复点击，第二次插入会失败，但我们用"先查后删/建"已覆盖正常场景。
 */
export async function toggleLike(req, res) {
  try {
    const { target_type, target_id } = req.body;

    if (!['post', 'comment'].includes(target_type) || !target_id) {
      return res.status(400).json({ error: 'target_type 或 target_id 无效' });
    }

    // target_type 先留着支持 comment（你拍板只点文章，但字段留扩展）
    const table = target_type === 'post' ? 'posts' : 'comments';
    const target = await get(`SELECT id FROM ${table} WHERE id = ?`, [target_id]);
    if (!target) return res.status(404).json({ error: '目标不存在' });

    const existing = await get(
      'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [req.user.id, target_type, target_id]
    );

    let liked;
    if (existing) {
      await run('DELETE FROM likes WHERE id = ?', [existing.id]);
      liked = false;
    } else {
      await run(
        'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)',
        [req.user.id, target_type, target_id]
      );
      liked = true;
    }

    // 返回最新计数，前端直接显示
    const countRow = await get(
      'SELECT COUNT(*) AS count FROM likes WHERE target_type = ? AND target_id = ?',
      [target_type, target_id]
    );

    res.json({ liked, count: countRow.count });
  } catch (err) {
    res.status(500).json({ error: '操作失败', detail: err.message });
  }
}

export async function getMyLikes(req, res) {
  try {
    const rows = await all(
      'SELECT target_type, target_id FROM likes WHERE user_id = ?',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '获取点赞状态失败', detail: err.message });
  }
}
