import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { get } from './db/index.js';
import { createTables, seed } from '../scripts/init-db.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', interactionRoutes);

// 未匹配的 /api 返回 404 JSON（必须放在静态托管之前）
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在: ' + req.path }));

// 托管前端构建产物（发布时 client/dist 会被拷到 server/public）
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA 回退：非 /api 且非静态文件的请求都返回 index.html，交给前端路由
  app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

// 错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误', detail: err.message });
});

// 启动时：沙盒是全新环境，若数据库没建表则自动建表 + 种子数据
const ensureDb = async () => {
  try {
    const table = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'");
    if (!table) {
      console.log('检测到空数据库，自动初始化...');
      await createTables();
      await seed();
      console.log('✓ 数据库初始化完成');
    }
  } catch (err) {
    console.error('自动建库失败:', err);
  }
};

await ensureDb();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`博客服务已启动: http://localhost:${config.port}`);
  console.log(`监听端口: ${config.port} (0.0.0.0)`);
});
