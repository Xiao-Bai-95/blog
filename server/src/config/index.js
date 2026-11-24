import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 从 src/config 往上两级到 server 根目录，读取 .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 发布沙盒不上传 .env。没有环境变量时生成随机密钥（进程内固定、重启即变），
// 绝不把密钥写死在源码里——写死等于公开。
const randomSecret = () => crypto.randomBytes(32).toString('hex');

export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || randomSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../blog.db'),
};
