import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home, Search, LayoutDashboard, PlusCircle, Bell, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      api.get('/notifications').then(({ data }) => {
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }).catch(() => {});
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="bg-navy-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Home className="w-6 h-6 text-electric-400" />
            <span className="bg-gradient-to-r from-electric-400 to-electric-300 bg-clip-text text-transparent">
              HouseRush
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/listings" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors">
              <Search className="w-4 h-4" />
              Browse
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                {user.role === 'landlord' && (
                  <Link to="/create-listing" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors">
                    <PlusCircle className="w-4 h-4" />
                    List Property
                  </Link>
                )}
                <Link to="/dashboard?tab=notifications" className="relative text-gray-300 hover:text-white transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="text-gray-400">Hi, </span>
                  <span className="font-medium">{user.name.split(' ')[0]}</span>
                  {user.isEduVerified && (
                    <span className="ml-1 text-xs bg-electric-500/20 text-electric-300 px-1.5 py-0.5 rounded-full">.edu</span>
                  )}
                </div>
                <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
                <Link to="/signup" className="bg-electric-500 hover:bg-electric-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-gray-300" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-navy-800 border-t border-navy-700 px-4 py-3 space-y-2">
          <Link to="/listings" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white">Browse Listings</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white">Dashboard</Link>
              {user.role === 'landlord' && (
                <Link to="/create-listing" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white">List Property</Link>
              )}
              <button onClick={handleLogout} className="block py-2 text-gray-300 hover:text-white w-full text-left">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white">Login</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
