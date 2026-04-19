import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User, GraduationCap, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';

const UNIVERSITY = 'Monmouth University';

export default function SignupPage() {
  const [form, setForm] = useState({
    email: '', password: '', name: '', university: UNIVERSITY,
    year: '', role: 'student' as 'student' | 'landlord',
    budgetMin: 500, budgetMax: 2000,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('role') === 'landlord') {
      setForm(prev => ({ ...prev, role: 'landlord', university: '' }));
    }
  }, []);

  const update = (field: string, value: any) => {
    if (field === 'role') {
      setForm(prev => ({ ...prev, role: value, university: value === 'student' ? UNIVERSITY : '' }));
      return;
    }
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await signup(form);
      navigate('/listings');
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Signup failed');
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm";
  const selectClass = "w-full py-3 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
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
            The smartest way to find off-campus housing.
          </h2>
          <p className="text-brand-200 text-lg leading-relaxed">
            Free for students. Free to list for housing providers. Real rent data for every campus in America.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <Logo size={32} />
            <span className="text-xl font-bold text-slate-900">HouseRush</span>
          </Link>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
          <p className="text-slate-500 text-sm mb-6">Find your perfect place near campus</p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>
          )}

          {/* Role toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            {(['student', 'landlord'] as const).map((role) => (
              <button key={role} type="button" onClick={() => update('role', role)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  form.role === role ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {role === 'student' ? 'Student' : 'Housing Provider'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                  className={inputClass} placeholder="Your full name" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                  className={inputClass} placeholder={form.role === 'landlord' ? 'you@example.com' : 'you@university.edu'} required />
              </div>
              {form.email.endsWith('.edu') && (
                <p className="text-emerald-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
                  <GraduationCap className="w-3.5 h-3.5" /> .edu email detected - you'll get a verified badge!
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                  placeholder="Min 6 characters" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {form.role === 'student' ? 'University' : 'Company Name'}
              </label>
              {form.role === 'student' ? (
                <div className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 font-medium flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand-500" />
                  {UNIVERSITY}
                </div>
              ) : (
                <input type="text" value={form.university} onChange={(e) => update('university', e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                  placeholder="Your company or property name" required />
              )}
            </div>

            {form.role === 'student' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
                  <select value={form.year} onChange={(e) => update('year', e.target.value)} className={selectClass}>
                    <option value="">Select</option>
                    {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Budget Range</label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={form.budgetMin} onChange={(e) => update('budgetMin', Number(e.target.value))}
                      className="w-full px-2 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Min" />
                    <span className="text-slate-300">-</span>
                    <input type="number" value={form.budgetMax} onChange={(e) => update('budgetMax', Number(e.target.value))}
                      className="w-full px-2 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Max" />
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-brand-600/25 active:scale-[0.98] mt-2">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
