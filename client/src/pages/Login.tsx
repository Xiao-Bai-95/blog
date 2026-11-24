import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">登录</h1>
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-8 space-y-5">
        <div>
          <label className="block text-sm text-slate-600 mb-1">用户名</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="试试 alice 或 bob"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="测试账号密码都是 123456"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700">登录</button>
        <p className="text-sm text-center text-slate-400">
          还没有账号？<Link to="/register" className="text-blue-600 hover:underline">去注册</Link>
        </p>
      </form>
    </div>
  );
}
