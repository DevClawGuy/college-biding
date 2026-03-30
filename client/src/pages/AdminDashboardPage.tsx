import { useState, useEffect } from 'react';
import { Users, Building, TrendingUp, Activity, Loader2, RefreshCw, AlertCircle, Zap } from 'lucide-react';

const ADMIN_PASSWORD = 'creiguide2026';
const API_ADMIN_KEY = 'houserush2024';
const SESSION_KEY = 'admin_authenticated';

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-6">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthenticated(true);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${baseUrl}/admin/analytics`, {
        headers: { 'x-admin-key': API_ADMIN_KEY, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${res.status}: ${body || res.statusText}`);
      }
      const d = await res.json();
      setData(d);
      setLastRefresh(new Date());
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'Request timed out. Check that the backend is running.'
        : `Failed to load: ${err.message}`;
      console.error('Admin analytics error:', err);
      setError(msg);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30_000);
    return () => clearInterval(interval);
  }, [authenticated]);

  // Login gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <form onSubmit={handleAuth} className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-xs w-full p-8 text-center">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-5">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-0.5">HouseRush Admin</h2>
          <p className="text-sm text-slate-400 mb-6">Enter password to continue</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all mb-4"
            placeholder="Password" required />
          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold transition-all">
            Continue
          </button>
        </form>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-700 mb-2">Unable to load analytics</p>
          <p className="text-xs text-slate-400 mb-5">{error}</p>
          <button onClick={fetchAnalytics} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">Retry</button>
        </div>
      </div>
    );
  }

  // Loading
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">HouseRush</span>
            <span className="text-slate-300 mx-1">/</span>
            <span className="text-sm text-slate-500">Analytics</span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && <span className="text-[11px] text-slate-400">Updated {lastRefresh.toLocaleTimeString()}</span>}
            <button onClick={fetchAnalytics} disabled={loading} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-xs">{error}</div>}

        {/* Users */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Users</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-100">
            <Stat label="Total" value={data.users.total} sub={`${data.users.students} students, ${data.users.landlords} landlords`} />
            <Stat label="New Today" value={data.users.newToday} />
            <Stat label="This Week" value={data.users.newThisWeek} />
            <Stat label="Active 7d" value={data.users.activeLastWeek} sub="Placed a bid" />
            <Stat label=".edu Verified" value={data.users.eduVerified} sub={`${data.users.eduUnverified} unverified`} />
          </div>
        </section>

        {/* Listings */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Listings</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-100">
            <Stat label="Total" value={data.listings.total} />
            <Stat label="Active" value={data.listings.active} />
            <Stat label="Pending" value={data.listings.pending} />
            <Stat label="Closed" value={data.listings.closed} />
            <Stat label="Ending 24h" value={data.listings.endingIn24h} />
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
            <Stat label="Avg Starting" value={`$${data.listings.avgStartingPrice.toLocaleString()}`} />
            <Stat label="Avg Current Bid" value={`$${data.listings.avgCurrentBid.toLocaleString()}`} sub={data.listings.avgCurrentBid > data.listings.avgStartingPrice ? `+$${(data.listings.avgCurrentBid - data.listings.avgStartingPrice).toLocaleString()} markup` : ''} />
          </div>
        </section>

        {/* Bids */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Bids</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-100">
            <Stat label="All Time" value={data.bids.total.toLocaleString()} />
            <Stat label="Today" value={data.bids.today} />
            <Stat label="Per Listing" value={data.bids.avgPerListing} />
            <Stat label="Highest Ever" value={`$${data.bids.highestEver.toLocaleString()}`} />
            <Stat label="Most Contested" value={data.bids.mostContested?.bidCount ?? 0} sub={data.bids.mostContested?.title ?? '—'} />
          </div>
        </section>

        {/* Activity */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          </div>
          {(data.activityFeed ?? []).length === 0 ? (
            <p className="px-6 py-10 text-slate-400 text-sm text-center">No recent activity</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {data.activityFeed.map((a: any, i: number) => (
                <div key={i} className="px-6 py-3.5 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.type === 'auto_bid' ? 'bg-purple-50' : 'bg-slate-50'}`}>
                    <TrendingUp className={`w-3.5 h-3.5 ${a.type === 'auto_bid' ? 'text-purple-500' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      <span className="font-medium text-slate-900">{a.user}</span>
                      {' bid '}
                      <span className="font-semibold text-slate-900">${a.amount?.toLocaleString()}</span>
                      {' on '}
                      <span className="text-slate-600">{a.listing}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.type === 'auto_bid' && <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">AUTO</span>}
                    <span className="text-[11px] text-slate-400 tabular-nums">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
