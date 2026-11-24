import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Write from './pages/Write';
import Profile from './pages/Profile';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-slate-800">📝 我的博客</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-600 hover:text-slate-900">首页</Link>
          {user ? (
            <>
              <Link to="/write" className="text-slate-600 hover:text-slate-900">写文章</Link>
              <Link to="/profile" className="text-slate-600 hover:text-slate-900">{user.username}</Link>
              <button onClick={doLogout} className="text-slate-500 hover:text-red-600">退出</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-slate-900">登录</Link>
              <Link to="/register" className="px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700">注册</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-16 py-8 text-center text-sm text-slate-400">
      个人博客系统 · 用 Vibe Coding 做出来
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/write" element={<Write />} />
          <Route path="/write/:id" element={<Write />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
