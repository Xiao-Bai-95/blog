import { Router } from 'express';
import { createComment, deleteComment } from '../controllers/commentController.js';
import { toggleLike, getMyLikes } from '../controllers/likeController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// 评论：只有登录用户能评论/删除自己的评论
router.post('/posts/:id/comments', auth, createComment);
router.delete('/comments/:id', auth, deleteComment);

// 点赞：toggle
router.post('/likes/toggle', auth, toggleLike);
router.get('/likes/mine', auth, getMyLikes);

export default router;
