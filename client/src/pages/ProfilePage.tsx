import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Phone, Mail, GraduationCap, Check } from 'lucide-react';
import api from '../lib/api';

export default function ProfilePage() {
  const { user, loadUser } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setName(user.name || '');
    setPhone((user as any).phone || '');
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/auth/me', { name, phone });
      await loadUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* */ }
    setSaving(false);
  };

  if (!user) return null;

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Profile</h1>
      <p className="text-slate-500 text-sm mb-8">Update your personal information.</p>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2">
          <Check className="w-4 h-4" /> Profile saved successfully!
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={`${inputClass} pl-11`} />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className={`${inputClass} pl-11`} placeholder="(555) 123-4567" />
          </div>
          <p className="text-xs text-slate-400 mt-1">Agents will use this to contact you if you win an auction.</p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="email" value={user.email} readOnly
              className={`${inputClass} pl-11 bg-slate-50 text-slate-500 cursor-not-allowed`} />
          </div>
          {user.isEduVerified && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <GraduationCap className="w-3.5 h-3.5" /> .edu verified
            </p>
          )}
        </div>

        {/* University (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">University</label>
          <input type="text" value={user.university} readOnly
            className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-brand-600/25 active:scale-[0.98]">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
