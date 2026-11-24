import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { type Post } from '../api';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 标签筛选状态放在网址里（?tag=AI），这样链接可分享、刷新不丢
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag') || '';

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '5' });
    if (category) params.append('category', category);
    if (keyword) params.append('keyword', keyword);
    if (activeTag) params.append('tag', activeTag);
    api.get(`/posts?${params}`)
      .then((res) => {
        setPosts(res.data.list);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, category, activeTag]);
  useEffect(() => { api.get('/posts/meta/categories').then((res) => setCategories(res.data)); }, []);

  const search = () => { setPage(1); load(); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 搜索 + 分类筛选 —— 对应你 PRD 定要保留的搜索功能 */}
      <div className="flex gap-3 mb-8">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="搜索标题、正文或标签..."
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500"
        />
        <button onClick={search} className="px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">搜索</button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => { setCategory(''); setPage(1); }}
          className={`px-3 py-1 rounded-full text-sm ${!category ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
        >全部</button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCategory(String(c.id)); setPage(1); }}
            className={`px-3 py-1 rounded-full text-sm ${category === String(c.id) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
          >{c.name}</button>
        ))}
      </div>

      {/* 标签筛选状态条：点了标签后出现，可一键清除 */}
      {activeTag && (
        <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="text-blue-700">正在按标签筛选：#{activeTag}</span>
          <button
            onClick={() => { setSearchParams({}); setPage(1); }}
            className="ml-auto text-blue-600 hover:text-blue-800 underline"
          >清除筛选</button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">加载中...</p>
      ) : posts.length === 0 ? (
        <p className="text-slate-400">还没有文章，去写一篇吧。</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition">
              <Link to={`/post/${post.id}`}>
                <h2 className="text-xl font-bold text-slate-800 hover:text-blue-700 mb-2">{post.title}</h2>
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed mb-3">{post.summary}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{post.author_name}</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                <span>{post.category_name}</span>
                <span>👀 {post.views}</span>
                <span>❤️ {post.likes_count ?? 0}</span>
                <span>💬 {post.comments_count ?? 0}</span>
              </div>
              <div className="flex gap-2 mt-3">
                {post.tags?.map((tag) => (
                  <button
                    key={tag}
                    onClick={(e) => { e.preventDefault(); setSearchParams({ tag }); setPage(1); }}
                    className={`text-xs px-2 py-0.5 rounded transition ${
                      activeTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >#{tag}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {total > 5 && (
        <div className="flex justify-center gap-3 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border rounded disabled:opacity-40"
          >上一页</button>
          <span className="px-4 py-2 text-slate-600">第 {page} 页 / 共 {Math.ceil(total / 5)} 页</span>
          <button
            disabled={page >= Math.ceil(total / 5)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded disabled:opacity-40"
          >下一页</button>
        </div>
      )}
    </div>
  );
}
