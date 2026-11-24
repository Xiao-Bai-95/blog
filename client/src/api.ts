import axios from 'axios';

// 统一封装 axios：自动带 token（你 PRD 里定的"封装 axios 自动加 token"）
const api = axios.create({ baseURL: '/api' });

// 游客身份编号：浏览量防刷要认人，但游客没账号。
// 所以第一次打开浏览器时生成一个随机编号存 localStorage，之后一直带着它。
// 换浏览器/清缓存 = 换一个游客编号（这跟真实网站的行为一致）。
const getVisitorId = (): string => {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'g' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    localStorage.setItem('visitor_id', id);
  }
  return id;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Visitor-Id'] = getVisitorId();
  return config;
});

export interface User {
  id: number;
  username: string;
  avatar?: string;
  email?: string;
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  parent_id: number | null;  // null=顶层评论；有值=回复某条
  reply_to_name?: string;    // "回复给谁"
  created_at: string;
  author_name: string;       // 后端联表补上的字段
  author_avatar: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  summary?: string;
  cover?: string;
  category_id?: number;
  category_name?: string;
  tags: string[];
  author_id: number;
  author_name?: string;
  author_avatar?: string;
  views: number;
  likes_count?: number;
  comments_count?: number;
  liked?: boolean;
  created_at: string;
  updated_at: string;
  comments?: Comment[];
}

export default api;
