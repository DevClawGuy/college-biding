import { useState } from 'react';
import { Mail, Send, Check } from 'lucide-react';
import api from '../lib/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
    } catch (err: any) {
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Contact Us</h1>
        <p className="text-slate-500 mt-3">Have a question? We'd love to hear from you.</p>
      </div>

      {/* Contact info */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 mb-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-brand-700" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Email Us</p>
          <a href="mailto:support@houserush.com" className="text-brand-600 hover:underline text-sm">support@houserush.com</a>
        </div>
      </div>

      {sent ? (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-10 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h2>
          <p className="text-slate-500">Thanks! We'll get back to you within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl card-shadow border border-slate-200 p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              className={inputClass} placeholder="Your name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              className={inputClass} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
              className={`${inputClass} min-h-[120px]`} placeholder="How can we help?" required />
          </div>

          {error && <p className="text-rose-600 text-sm bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-brand-600/25 active:scale-[0.98] flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  );
}
