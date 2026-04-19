import { useState, useEffect } from 'react';
import { Shield, Check, X, Loader2 } from 'lucide-react';
import api from '../lib/api';

const ADMIN_KEY = 'houserush2024';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_KEY) {
      setAuthenticated(true);
    }
  };

  useEffect(() => {
    if (authenticated) fetchPending();
  }, [authenticated]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/listings/pending', { headers: { 'x-admin-key': ADMIN_KEY } });
      setListings(data);
    } catch { /* */ }
    setLoading(false);
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await api.post(`/admin/listings/${id}/${action}`, {}, { headers: { 'x-admin-key': ADMIN_KEY } });
      setListings(prev => prev.filter(l => l.id !== id));
    } catch { /* */ }
    setActionLoading(null);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <form onSubmit={handleAuth} className="bg-white rounded-2xl card-shadow border border-slate-200 max-w-sm w-full p-8 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Admin Access</h2>
          <p className="text-sm text-slate-500 mb-6">Enter the admin password to continue.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm mb-4"
            placeholder="Admin password" required />
          <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-all">
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm">Review and approve new listings.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">All caught up!</h3>
          <p className="text-slate-500 mt-1 text-sm">No pending listings to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{listings.length} pending listing{listings.length !== 1 ? 's' : ''}</p>
          {listings.map(listing => (
            <div key={listing.id} className="bg-white rounded-2xl card-shadow border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{listing.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{listing.address}, {listing.city}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>Provider: <strong className="text-slate-600">{listing.landlordName}</strong></span>
                    <span>Starting: <strong className="text-slate-600">${listing.startingBid}/mo</strong></span>
                    <span>Ends: <strong className="text-slate-600">{new Date(listing.auctionEnd).toLocaleDateString()}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAction(listing.id, 'approve')}
                    disabled={actionLoading === listing.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => handleAction(listing.id, 'reject')}
                    disabled={actionLoading === listing.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
