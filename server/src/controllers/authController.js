import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run } from '../db/index.js';
import { config } from '../config/index.js';

const sign = (user) =>
  jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    // 参数校验 —— 用户名 3-20，密码强度规则（你拍板：发布前加）
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名需 3-20 字符' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    // 密码：至少 8 位，且同时包含字母、数字、特殊符号
    const strongPassword = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!password || !strongPassword.test(password)) {
      return res.status(400).json({ error: '密码需至少 8 位，且包含字母、数字和特殊符号' });
    }

    // 检查重复
    const exists = await get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (exists) {
      return res.status(409).json({ error: '用户名或邮箱已被占用' });
    }

    // bcrypt 加密，绝不存明文 —— 你拍板的安全底线
    const hashed = await bcrypt.hash(password, 10);
    const { lastID } = await run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashed]
    );

    const user = { id: lastID, username };
    res.status(201).json({
      message: '注册成功',
      token: sign(user),
      user,
    });
  } catch (err) {
    res.status(500).json({ error: '注册失败', detail: err.message });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    // 你拍板用 username 登录
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    res.json({
      message: '登录成功',
      token: sign(user),
      user: { id: user.id, username: user.username, avatar: user.avatar, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: '登录失败', detail: err.message });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await get(
      'SELECT id, username, email, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '获取信息失败', detail: err.message });
  }
}
