import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api, { type Post } from '../api';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get(`/posts/${id}`).then((res) => setPost(res.data));

  useEffect(() => { load(); }, [id]);

  // 你的 toggle 点赞：前端只调一个接口，用返回的 liked 更新按钮
  const toggleLike = async () => {
    if (!user) { setMsg('请先登录再点赞'); return; }
    const res = await api.post('/likes/toggle', { target_type: 'post', target_id: Number(id) });
    setPost((p) => p ? { ...p, liked: res.data.liked, likes_count: res.data.count } : p);
  };

  // 提交评论
  const submitComment = async () => {
    if (!user) { setMsg('请先登录再评论'); return; }
    if (!comment.trim()) { setMsg('评论不能为空'); return; }
    try {
      await api.post(`/posts/${id}/comments`, { content: comment });
      setComment('');
      setMsg('');
      load(); // 重新加载，评论列表会更新
    } catch (e: any) {
      setMsg(e.response?.data?.error || '评论失败');
    }
  };

  if (!post) return <div className="max-w-3xl mx-auto px-4 py-10 text-slate-400">加载中...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-700">← 返回列表</Link>
      <article className="bg-white border border-slate-200 rounded-xl p-8 mt-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{post.title}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-400 mb-6 pb-4 border-b">
          <span>{post.author_name}</span>
          <span>{new Date(post.created_at).toLocaleString()}</span>
          <span>👀 {post.views} 次浏览</span>
        </div>

        <div className="prose text-slate-700">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="flex gap-2 mt-6">
          {post.tags?.map((tag) => (
            <Link
              key={tag}
              to={`/?tag=${encodeURIComponent(tag)}`}
              className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded hover:bg-blue-100 hover:text-blue-700"
            >#{tag}</Link>
          ))}
        </div>

        {/* 点赞按钮 —— 放在标题区下方，显示数字，你当初定的体验验证 */}
        <div className="mt-6 pt-6 border-t flex items-center gap-4">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition ${
              post.liked ? 'bg-red-50 border-red-300 text-red-600' : 'border-slate-300 text-slate-500 hover:border-red-300'
            }`}
          >
            <span>{post.liked ? '❤️' : '🤍'}</span>
            <span>{post.liked ? '已点赞' : '点赞'}</span>
            <span className="font-bold">{post.likes_count ?? 0}</span>
          </button>
        </div>
      </article>

      {/* 评论区 —— 平铺一层 */}
      <section className="bg-white border border-slate-200 rounded-xl p-8 mt-6">
        <h3 className="text-lg font-bold text-slate-800 mb-6">评论 ({post.comments?.length ?? 0})</h3>

        <div className="flex gap-3 mb-6">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            placeholder={user ? '写下你的评论...' : '请先登录再评论'}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500"
          />
          <button onClick={submitComment} className="px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">发表</button>
        </div>
        {msg && <p className="text-sm text-red-600 mb-4">{msg}</p>}

        <CommentSection comments={post.comments ?? []} postId={Number(id)} onRefresh={load} />
      </section>
    </div>
  );
}
