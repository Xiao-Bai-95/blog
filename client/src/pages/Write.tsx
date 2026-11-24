import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Write() {
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/posts/meta/categories').then((res) => setCategories(res.data));
    if (editing) {
      api.get(`/posts/${id}`).then((res) => {
        const p = res.data;
        setTitle(p.title);
        setContent(p.content);
        setCategoryId(String(p.category_id || ''));
        setTags(p.tags?.join(',') || '');
      });
    }
  }, [id]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">写文章需要先登录</p>
        <a href="/login" className="text-blue-600 hover:underline">去登录</a>
      </div>
    );
  }

  const save = async () => {
    setMsg('');
    if (!title.trim() || !content.trim()) { setMsg('标题和内容不能为空'); return; }
    const payload = {
      title,
      content,
      category_id: categoryId ? Number(categoryId) : null,
      tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await api.put(`/posts/${id}`, payload);
      } else {
        await api.post('/posts', payload);
      }
      navigate('/');
    } catch (err: any) {
      setMsg(err.response?.data?.error || '保存失败');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{editing ? '编辑文章' : '写文章'}</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题"
          className="w-full text-xl px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-500"
        />
        <div className="flex gap-4 flex-wrap">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">选择分类</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签，用逗号分隔，如 AI,编程"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {/* 左写右预览 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-slate-500 mb-2">Markdown 编辑</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# 标题&#10;&#10;用 Markdown 写正文..."
            className="w-full h-96 p-4 border border-slate-300 rounded-lg font-mono text-sm outline-none focus:border-slate-500 resize-none"
          />
        </div>
        <div>
          <div className="text-sm text-slate-500 mb-2">实时预览</div>
          <div className="h-96 p-4 border border-slate-300 rounded-lg bg-white overflow-auto prose">
            <ReactMarkdown>{content || '*预览会显示在这里*'}</ReactMarkdown>
          </div>
        </div>
      </div>

      {msg && <p className="text-sm text-red-600 mt-4">{msg}</p>}
      <div className="mt-6 flex gap-3">
        <button onClick={save} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700">保存文章</button>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100">取消</button>
      </div>
    </div>
  );
}
