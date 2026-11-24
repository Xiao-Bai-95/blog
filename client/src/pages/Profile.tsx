import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { type Post } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [myPosts, setMyPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get('/posts?pageSize=50').then((res) => {
      setMyPosts(res.data.list.filter((p: Post) => p.author_id === user.id));
    });
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">个人中心需要先登录</p>
        <Link to="/login" className="text-blue-600 hover:underline">去登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl text-slate-500">
          {user.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{user.username}</h1>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">我发的文章 ({myPosts.length})</h2>
        <Link to="/write" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">写新文章</Link>
      </div>

      <div className="space-y-3">
        {myPosts.length === 0 && <p className="text-slate-400">你还没有发过文章。</p>}
        {myPosts.map((post) => (
          <div key={post.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <Link to={`/post/${post.id}`} className="font-medium text-slate-700 hover:text-blue-700">{post.title}</Link>
              <div className="text-xs text-slate-400 mt-1">
                {new Date(post.created_at).toLocaleDateString()} · 👀 {post.views} · ❤️ {post.likes_count ?? 0}
              </div>
            </div>
            <Link to={`/write/${post.id}`} className="text-sm text-blue-600 hover:underline">编辑</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
