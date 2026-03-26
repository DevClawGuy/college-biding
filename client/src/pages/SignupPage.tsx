import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home, Mail, Lock, User, GraduationCap, Eye, EyeOff } from 'lucide-react';

const universities = [
  'Boston University', 'MIT', 'Harvard', 'UT Austin', 'UCLA', 'USC',
  'NYU', 'Columbia', 'UChicago', 'Northwestern', 'Stanford', 'UC Berkeley',
  'University of Michigan', 'Georgia Tech', 'Duke', 'Other'
];

export default function SignupPage() {
  const [form, setForm] = useState({
    email: '', password: '', name: '', university: '',
    year: '', role: 'student' as 'student' | 'landlord',
    budgetMin: 500, budgetMax: 2000,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

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
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <Home className="w-7 h-7 text-electric-500" />
          <span className="text-2xl font-bold bg-gradient-to-r from-navy-800 to-electric-600 bg-clip-text text-transparent">
            HouseRush
          </span>
        </Link>

        <h2 className="text-2xl font-bold text-center mb-1">Create Account</h2>
        <p className="text-gray-500 text-center text-sm mb-6">Start bidding on student housing</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm mb-4">{error}</div>
        )}

        {/* Role toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
          {(['student', 'landlord'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => update('role', role)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                form.role === role ? 'bg-white shadow text-navy-800' : 'text-gray-500'
              }`}
            >
              {role === 'student' ? 'Student' : 'Landlord'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500"
                placeholder="Your full name" required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500"
                placeholder="you@university.edu" required
              />
            </div>
            {form.email.endsWith('.edu') && (
              <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> .edu email - you'll get a verified badge!
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'} value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500"
                placeholder="Min 6 characters" required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.role === 'student' ? 'University' : 'Company Name'}
            </label>
            {form.role === 'student' ? (
              <select
                value={form.university} onChange={(e) => update('university', e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500" required
              >
                <option value="">Select university</option>
                {universities.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            ) : (
              <input
                type="text" value={form.university} onChange={(e) => update('university', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500"
                placeholder="Your company or property name" required
              />
            )}
          </div>

          {form.role === 'student' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select value={form.year} onChange={(e) => update('year', e.target.value)}
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500">
                  <option value="">Select</option>
                  {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
                <div className="flex items-center gap-1">
                  <input type="number" value={form.budgetMin} onChange={(e) => update('budgetMin', Number(e.target.value))}
                    className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-electric-500"
                    placeholder="Min" />
                  <span className="text-gray-400">-</span>
                  <input type="number" value={form.budgetMax} onChange={(e) => update('budgetMax', Number(e.target.value))}
                    className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-electric-500"
                    placeholder="Max" />
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full bg-electric-500 hover:bg-electric-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 mt-2">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-electric-500 hover:text-electric-600 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
