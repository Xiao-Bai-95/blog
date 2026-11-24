import { useState } from 'react';
import api, { type Comment } from '../api';
import { useAuth } from '../context/AuthContext';

interface Props {
  comments: Comment[];
  postId: number;
  onRefresh: () => void;
}

// 评论节点 = 普通评论 + 子评论（递归类型）
type CommentNode = Comment & { children: CommentNode[] };

/**
 * 楼中楼评论组件
 * 关键：组件调用自己（递归），遇到子评论就缩进一层渲染
 */
export default function CommentSection({ comments, postId, onRefresh }: Props) {
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [msg, setMsg] = useState('');

  // 把扁平列表组装成树：parent_id=null 是顶层，其余挂到父评论的 children 下
  const buildTree = () => {
    const map = new Map<number, CommentNode>();
    comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: CommentNode[] = [];
    map.forEach((c) => {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.children.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  };

  const tree = buildTree();

  const submitReply = async (parentId: number) => {
    if (!replyText.trim()) { setMsg('回复不能为空'); return; }
    try {
      await api.post(`/posts/${postId}/comments`, { content: replyText, parent_id: parentId });
      setReplyText('');
      setReplyingTo(null);
      setMsg('');
      onRefresh();
    } catch (e: any) {
      setMsg(e.response?.data?.error || '回复失败');
    }
  };

  // 递归渲染一条评论 + 它的子评论
  const renderComment = (c: CommentNode, depth = 0) => (
    <div key={c.id} className={depth > 0 ? 'ml-8 mt-3' : 'pb-4 border-b border-slate-100 last:border-0'}>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm text-slate-500 flex-shrink-0">
          {c.author_name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-700">
            {c.author_name}
            {c.reply_to_name && <span className="text-slate-400 font-normal"> 回复 {c.reply_to_name}</span>}
          </div>
          <div className="text-slate-600 mt-1">{c.content}</div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
            {user && depth < 1 && (
              <button
                onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                className="text-xs text-blue-600 hover:underline"
              >回复</button>
            )}
          </div>

          {/* 回复输入框 */}
          {replyingTo === c.id && (
            <div className="flex gap-2 mt-3">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitReply(c.id)}
                placeholder={`回复 ${c.author_name}...`}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm outline-none focus:border-slate-500"
              />
              <button onClick={() => submitReply(c.id)} className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm">发送</button>
            </div>
          )}
        </div>
      </div>

      {/* 递归：渲染子评论，缩进由上面的 ml-8 实现 */}
      {c.children.length > 0 && <div className="mt-3">{c.children.map((child) => renderComment(child, depth + 1))}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      {tree.length === 0 && <p className="text-slate-400 text-sm">还没有评论，来说点什么吧。</p>}
      {tree.map((c) => renderComment(c))}
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
