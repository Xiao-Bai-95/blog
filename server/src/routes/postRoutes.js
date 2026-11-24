import { Router } from 'express';
import {
  listPosts, getPost, createPost, updatePost, deletePost, listCategories,
} from '../controllers/postController.js';
import { auth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// 列表和详情允许访客访问，但带 token 时多返回"我是否点赞"
router.get('/', optionalAuth, listPosts);
router.get('/:id', optionalAuth, getPost);
router.get('/meta/categories', listCategories);

// 写操作必须登录
router.post('/', auth, createPost);
router.put('/:id', auth, updatePost);
router.delete('/:id', auth, deletePost);

export default router;
