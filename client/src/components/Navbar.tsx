import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Search, LayoutDashboard, PlusCircle, Bell, LogOut, Menu, X, Zap } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchUnreadCount = useCallback(() => {
    if (!user) return;
    api.get('/notifications/unread-count').then(({ data }) => {
      setUnreadCount(data.count ?? 0);
    }).catch(() => {});
  }, [user]);

  // Fetch on mount + poll every 30s
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const handleBellClick = () => {
    navigate('/dashboard?tab=notifications');
    // Mark all read when navigating to notifications
    if (unreadCount > 0) {
      api.put('/notifications/read-all').then(() => setUnreadCount(0)).catch(() => {});
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'glass border-b border-slate-200/60 shadow-sm'
        : 'bg-white/0'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              House<span className="text-brand-600">Rush</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/listings" className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
              <Search className="w-4 h-4" />
              Browse
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                {user.role === 'landlord' && (
                  <Link to="/create-listing" className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                    <PlusCircle className="w-4 h-4" />
                    List Property
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <button onClick={handleBellClick} className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadCount > 9 ? '9' : unreadCount}
                    </span>
                  )}
                </button>
                <div className="w-px h-6 bg-slate-200" />
                <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-sm leading-tight hidden lg:block">
                    <p className="font-medium text-slate-900">{user.name.split(' ')[0]}</p>
                    {user.isEduVerified && (
                      <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">.edu verified</span>
                    )}
                  </div>
                </Link>
                  <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <LogOut className="w-4 h-4" />
                  </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                  Log in
                </Link>
                <Link to="/signup" className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-brand-600/25 active:scale-[0.98]">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-slate-200/60 px-4 py-3 space-y-1">
          <Link to="/listings" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Browse Listings</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Dashboard</Link>
              {user.role === 'landlord' && (
                <Link to="/create-listing" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">List Property</Link>
              )}
              <button onClick={handleLogout} className="block w-full text-left py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Login</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
