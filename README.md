# 个人博客系统

一个用 Vibe Coding（你说需求、AI 写码）从零做出来的全栈博客。所有设计决策都由学习者逐步拍板，代码随之演进——详见 `database.md` 的版本演进记录。

## 功能清单

- **账号**：注册（密码强度校验）、登录、JWT 鉴权、个人中心
- **文章**：发布、编辑、删除（仅本人）、分页列表、搜索（标题/正文/标签）、分类筛选、标签筛选
- **互动**：评论（楼中楼，最多两层）、点赞（toggle 再点取消、防重复）
- **浏览统计**：同一访客同一天只计 1 次（登录按用户、游客按浏览器编号）
- **编辑**：Markdown 左写右实时预览

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + React Router + axios |
| 后端 | Node.js + Express |
| 数据库 | SQLite（零配置，单文件） |
| 鉴权 | JWT（bcrypt 加密密码） |

## 本地运行

需要 Node.js 18+。

```bash
# 1. 后端
cd server
npm install
cp .env.example .env      # 首次运行；真实发布前务必替换 JWT_SECRET
node scripts/init-db.js   # 建表 + 种子数据（会清空现有数据，谨慎）
npm start                 # http://localhost:3001

# 2. 前端（另一个终端）
cd client
npm install
npm run dev               # http://localhost:5173
```

前端开发服务器把 `/api` 代理到后端 3001，无需手动处理跨域。

## 测试账号

| 账号 | 密码 | 说明 |
|---|---|---|
| `alice` | `Blog@2026` | 作者，文章属于她 |
| `bob` | `Blog@2026` | 用于验证"改别人文章会被拒" |

> 这两个是种子账号。注册新账号需满足：至少 8 位，含字母、数字、特殊符号。

## 自动化测试

在 `server/` 目录下运行：

```bash
node scripts/test-api.js              # 接口全流程（20 项）
node scripts/test-nested-comments.js  # 楼中楼评论（7 项）
node scripts/test-views.js            # 浏览量防刷（12 项）
node scripts/test-tags.js             # 标签筛选（8 项）
```

## 安全说明

- 密码用 bcrypt 哈希存储，从不存明文
- `.env`（含 JWT 密钥）、`*.db`（含数据）已被 `.gitignore` 排除，不会进 Git
- 发布到公网时，JWT 密钥通过环境变量注入，不写死在源码里
- 种子账号密码为演示用，正式使用请改掉

## 设计演进

从 v0.1 到 v0.7，每个功能都是一次"发现问题 → 拍板决策 → 全栈落地 → 测试验证"的闭环：

| 版本 | 改进点 |
|---|---|
| v0.1 | 基础设计（用户/分类/文章） |
| v0.2 | 新增评论、点赞 |
| v0.3 | 点赞防重复 + toggle 取消 |
| v0.4 | 评论平铺 → 楼中楼 |
| v0.5 | 浏览量防刷 |
| v0.6 | 标签筛选 |
| v0.7 | 搜索支持标签 + 密码强度 + 安全加固 |

完整决策过程见 `database.md` 和 `PRD.md`。
