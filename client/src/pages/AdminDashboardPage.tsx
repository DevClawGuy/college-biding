import { useState, useEffect } from 'react';
import { Shield, Users, Building, TrendingUp, Activity, Loader2, RefreshCw } from 'lucide-react';
import api from '../lib/api';

const ADMIN_KEY = 'houserush2024';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 card-shadow border border-slate-100">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_KEY) setAuthenticated(true);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/admin/analytics', { headers: { 'x-admin-key': ADMIN_KEY } });
      setData(d);
      setLastRefresh(new Date());
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30_000);
    return () => clearInterval(interval);
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <form onSubmit={handleAuth} className="bg-white rounded-2xl card-shadow border border-slate-200 max-w-sm w-full p-8 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Admin Analytics</h2>
          <p className="text-sm text-slate-500 mb-6">Enter the admin password to continue.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm mb-4"
            placeholder="Admin password" required />
          <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-all">Enter</button>
        </form>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
            {lastRefresh && <p className="text-xs text-slate-400">Last updated: {lastRefresh.toLocaleTimeString()} (auto-refreshes every 30s)</p>}
          </div>
        </div>
        <button onClick={fetchAnalytics} disabled={loading} className="p-2 text-slate-400 hover:text-brand-600 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* User Stats */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4"><Users className="w-4 h-4 text-brand-500" /> User Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Users" value={data.users.total} sub={`${data.users.students} students, ${data.users.landlords} landlords`} />
          <StatCard label="New Today" value={data.users.newToday} />
          <StatCard label="New This Week" value={data.users.newThisWeek} />
          <StatCard label="Active (7d)" value={data.users.activeLastWeek} sub="Placed a bid" />
          <StatCard label=".edu Verified" value={data.users.eduVerified} sub={`${data.users.eduUnverified} unverified`} />
        </div>
      </div>

      {/* Listing Stats */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4"><Building className="w-4 h-4 text-brand-500" /> Listing Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Listings" value={data.listings.total} />
          <StatCard label="Active" value={data.listings.active} />
          <StatCard label="Pending Approval" value={data.listings.pending} />
          <StatCard label="Closed" value={data.listings.closed} />
          <StatCard label="Ending in 24h" value={data.listings.endingIn24h} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <StatCard label="Avg Starting Price" value={`$${data.listings.avgStartingPrice.toLocaleString()}/mo`} />
          <StatCard label="Avg Current Bid" value={`$${data.listings.avgCurrentBid.toLocaleString()}/mo`} sub={data.listings.avgCurrentBid > data.listings.avgStartingPrice ? `+$${(data.listings.avgCurrentBid - data.listings.avgStartingPrice).toLocaleString()} from bidding` : ''} />
        </div>
      </div>

      {/* Bid Stats */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4"><TrendingUp className="w-4 h-4 text-brand-500" /> Bid Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Bids" value={data.bids.total.toLocaleString()} />
          <StatCard label="Bids Today" value={data.bids.today} />
          <StatCard label="Avg Per Listing" value={data.bids.avgPerListing} />
          <StatCard label="Highest Bid Ever" value={`$${data.bids.highestEver.toLocaleString()}/mo`} />
          <StatCard label="Most Contested" value={data.bids.mostContested?.bidCount ?? 0} sub={data.bids.mostContested?.title ?? 'N/A'} />
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4"><Activity className="w-4 h-4 text-brand-500" /> Recent Activity</h2>
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 divide-y divide-slate-100">
          {(data.activityFeed ?? []).length === 0 ? (
            <p className="p-6 text-slate-500 text-sm text-center">No recent activity</p>
          ) : (
            data.activityFeed.map((a: any, i: number) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${a.type === 'auto_bid' ? 'bg-purple-50 text-purple-700' : 'bg-brand-50 text-brand-700'}`}>
                    {a.type === 'auto_bid' ? 'Auto-Bid' : 'Bid'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 truncate"><span className="font-medium">{a.user}</span> bid <span className="font-semibold">${a.amount?.toLocaleString()}</span> on <span className="font-medium">{a.listing}</span></p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-3">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
