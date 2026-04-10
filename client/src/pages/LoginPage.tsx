import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      const loggedInUser = useAuthStore.getState().user;
      navigate(loggedInUser?.role === 'landlord' ? '/dashboard' : '/universities');
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-600 to-brand-800 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-60 h-60 bg-white rounded-full blur-[80px]" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Logo size={40} />
            <span className="text-2xl font-bold text-white">HouseRush</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            The fastest way to find off-campus housing.
          </h2>
          <p className="text-brand-200 text-lg leading-relaxed">
            Browse verified homes near your campus, compare rent data, and find your perfect place.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <Logo size={32} />
            <span className="text-xl font-bold text-slate-900">HouseRush</span>
          </Link>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your account</p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                  placeholder="you@university.edu" required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                  placeholder="Your password" required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-brand-600/25 active:scale-[0.98]">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-1.5">Demo accounts</p>
            <p>Student: alex.m@monmouth.edu / password123</p>
            <p>Landlord: sarah.chen@realty.com / password123</p>
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-600 hover:text-brand-700 font-semibold">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
