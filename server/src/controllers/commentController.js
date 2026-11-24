import { get, run } from '../db/index.js';

export async function createComment(req, res) {
  try {
    const postId = req.params.id;
    const { content, parent_id } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }
    const post = await get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: '文章不存在' });

    // 楼中楼：如果要回复某条评论，验证它存在且属于同一篇文章
    let parentId = parent_id || null;
    if (parentId) {
      const parent = await get('SELECT post_id FROM comments WHERE id = ?', [parentId]);
      if (!parent) return res.status(404).json({ error: '要回复的评论不存在' });
      if (parent.post_id !== Number(postId)) {
        return res.status(400).json({ error: '不能跨文章回复评论' });
      }
      // 防无限深：只允许回复两层（顶层 → 回复 → 回复的回复就挡住）
      const grandparent = await get('SELECT parent_id FROM comments WHERE id = ?', [parentId]);
      if (grandparent?.parent_id) {
        return res.status(400).json({ error: '最多支持两层回复' });
      }
    }

    const { lastID } = await run(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, content.trim(), parentId]
    );
    res.status(201).json({ message: '评论成功', id: lastID });
  } catch (err) {
    res.status(500).json({ error: '评论失败', detail: err.message });
  }
}

export async function deleteComment(req, res) {
  try {
    const id = req.params.id;
    const comment = await get('SELECT author_id FROM comments WHERE id = ?', [id]);
    if (!comment) return res.status(404).json({ error: '评论不存在' });
    if (comment.author_id !== req.user.id) {
      return res.status(403).json({ error: '只能删除自己的评论' });
    }
    // ON DELETE CASCADE：删父评论时，下面的回复会一起删掉
    await run('DELETE FROM comments WHERE id = ?', [id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败', detail: err.message });
  }
}
