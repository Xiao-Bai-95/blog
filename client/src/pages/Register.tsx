import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/register', { username, email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">注册</h1>
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-8 space-y-5">
        <div>
          <label className="block text-sm text-slate-600 mb-1">用户名（3-20 字符）</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="可以用测试邮箱，如 test@test.com"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">密码（至少 8 位，含字母、数字、特殊符号）</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500"
          />
          {/* 实时强度提示：你随手一填也能知道差在哪一条 */}
          {password && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {[
                { ok: password.length >= 8, text: '至少 8 位' },
                { ok: /[A-Za-z]/.test(password), text: '含字母' },
                { ok: /\d/.test(password), text: '含数字' },
                { ok: /[^A-Za-z0-9]/.test(password), text: '含特殊符号' },
              ].map((rule) => (
                <li key={rule.text} className={rule.ok ? 'text-green-600' : 'text-slate-400'}>
                  {rule.ok ? '✓' : '○'} {rule.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700">注册</button>
        <p className="text-sm text-center text-slate-400">
          已有账号？<Link to="/login" className="text-blue-600 hover:underline">去登录</Link>
        </p>
      </form>
    </div>
  );
}
