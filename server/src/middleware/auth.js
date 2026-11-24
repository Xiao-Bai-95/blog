import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * 强制登录：没 token 或 token 无效 → 401
 * 用法：路由后面加 auth
 */
export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload; // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期或无效，请重新登录' });
  }
}

/**
 * 可选登录：有 token 就解析出 user，没有也放行（访客可读）
 * 用法：需要知道"当前用户是谁"但又允许访客访问的路由
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch {
      // token 坏了当访客处理，不报错
    }
  }
  next();
}
