import { useState, useEffect, useMemo } from 'react';
import { Users, Building, TrendingUp, Activity, Loader2, RefreshCw, AlertCircle, Zap, Mail, Search, Check, Send } from 'lucide-react';

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

  // User outreach state
  interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    isEduVerified: boolean;
    createdAt: string;
    lastSeenAt: number | null;
    bidCount: number;
  }
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userFilter, setUserFilter] = useState<'all' | 'students' | 'landlords' | 'no_bids' | 'active_week'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [reminderSubject, setReminderSubject] = useState('Your perfect off-campus home is waiting');
  const [reminderMessage, setReminderMessage] = useState('Hi [first name],\n\nJust a friendly reminder that there are active listings near Monmouth University on HouseRush. Auctions are closing soon — don\'t miss out on securing your place for next year!\n\nBrowse listings: https://houserush.vercel.app\n\nThe HouseRush Team');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderToast, setReminderToast] = useState('');

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

      // Also fetch users for outreach
      try {
        const usersRes = await fetch(`${baseUrl}/admin/users`, {
          headers: { 'x-admin-key': API_ADMIN_KEY },
        });
        if (usersRes.ok) setAllUsers(await usersRes.json());
      } catch { /* non-fatal */ }
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
            <Stat label="Active 7d" value={data.users.active7d} sub="Any activity" />
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

        {/* User Outreach */}
        <UserOutreachSection
          allUsers={allUsers}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          reminderSubject={reminderSubject}
          setReminderSubject={setReminderSubject}
          reminderMessage={reminderMessage}
          setReminderMessage={setReminderMessage}
          sendingReminder={sendingReminder}
          setSendingReminder={setSendingReminder}
          reminderToast={reminderToast}
          setReminderToast={setReminderToast}
        />
      </div>
    </div>
  );
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isEduVerified: boolean;
  createdAt: string;
  lastSeenAt: number | null;
  bidCount: number;
}

function UserOutreachSection({
  allUsers, selectedUserIds, setSelectedUserIds, userFilter, setUserFilter,
  userSearch, setUserSearch, reminderSubject, setReminderSubject,
  reminderMessage, setReminderMessage, sendingReminder, setSendingReminder,
  reminderToast, setReminderToast,
}: {
  allUsers: AdminUser[];
  selectedUserIds: Set<string>;
  setSelectedUserIds: (s: Set<string>) => void;
  userFilter: string;
  setUserFilter: (f: 'all' | 'students' | 'landlords' | 'no_bids' | 'active_week') => void;
  userSearch: string;
  setUserSearch: (s: string) => void;
  reminderSubject: string;
  setReminderSubject: (s: string) => void;
  reminderMessage: string;
  setReminderMessage: (s: string) => void;
  sendingReminder: boolean;
  setSendingReminder: (b: boolean) => void;
  reminderToast: string;
  setReminderToast: (s: string) => void;
}) {
  const weekAgoMs = Date.now() - 7 * 86400000;

  const filteredUsers = useMemo(() => {
    let list = allUsers;
    if (userFilter === 'students') list = list.filter(u => u.role === 'student');
    else if (userFilter === 'landlords') list = list.filter(u => u.role === 'landlord');
    else if (userFilter === 'no_bids') list = list.filter(u => u.bidCount === 0);
    else if (userFilter === 'active_week') list = list.filter(u => u.lastSeenAt && u.lastSeenAt > weekAgoMs);

    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [allUsers, userFilter, userSearch]);

  const toggleUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedUserIds(next);
  };

  const selectGroup = (role: 'student' | 'landlord') => {
    const ids = filteredUsers.filter(u => u.role === role).map(u => u.id);
    setSelectedUserIds(new Set(ids));
  };

  const handleSend = async () => {
    if (selectedUserIds.size === 0) return;
    setSendingReminder(true);
    setReminderToast('');
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${baseUrl}/admin/send-reminder`, {
        method: 'POST',
        headers: { 'x-admin-key': 'houserush2024', 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds), subject: reminderSubject, message: reminderMessage }),
      });
      const result = await res.json();
      if (res.ok) {
        setReminderToast(`Reminder sent to ${result.sent} user${result.sent !== 1 ? 's' : ''}${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
        setSelectedUserIds(new Set());
        setTimeout(() => setReminderToast(''), 8000);
      } else {
        setReminderToast(result.error || 'Send failed');
      }
    } catch {
      setReminderToast('Network error — check backend');
    }
    setSendingReminder(false);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">User Outreach</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{allUsers.length} users</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => selectGroup('student')} className="text-[11px] font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg hover:bg-brand-100 transition-colors">Select Students</button>
          <button onClick={() => selectGroup('landlord')} className="text-[11px] font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors">Select Landlords</button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-all"
            placeholder="Search name or email..." />
        </div>
        {(['all', 'students', 'landlords', 'no_bids', 'active_week'] as const).map(f => (
          <button key={f} onClick={() => setUserFilter(f)}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all ${userFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            {f === 'all' ? 'All' : f === 'students' ? 'Students' : f === 'landlords' ? 'Landlords' : f === 'no_bids' ? 'No Bids' : 'Active 7d'}
          </button>
        ))}
      </div>

      {reminderToast && (
        <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-3.5 h-3.5" /> {reminderToast}
        </div>
      )}

      {/* User Table */}
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium text-slate-400 uppercase tracking-wider w-8">
                <input type="checkbox"
                  checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id))}
                  onChange={() => {
                    if (filteredUsers.every(u => selectedUserIds.has(u.id))) setSelectedUserIds(new Set());
                    else setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
                  }}
                  className="rounded border-slate-300" />
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400 uppercase tracking-wider">Email</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400 uppercase tracking-wider">Bids</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400 uppercase tracking-wider">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((u, i) => (
              <tr key={u.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${u.bidCount === 0 ? 'bg-amber-50/30' : ''} hover:bg-slate-100/50 transition-colors`}>
                <td className="px-6 py-2.5">
                  <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleUser(u.id)} className="rounded border-slate-300" />
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-900">{u.name}</td>
                <td className="px-3 py-2.5 text-slate-500 truncate max-w-[200px]">{u.email}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${u.role === 'student' ? 'bg-brand-50 text-brand-700' : 'bg-purple-50 text-purple-700'}`}>
                    {u.role === 'student' ? 'Student' : 'Landlord'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600 tabular-nums">{u.bidCount}</td>
                <td className="px-3 py-2.5 text-slate-400">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <p className="px-6 py-10 text-slate-400 text-sm text-center">No users match this filter</p>
        )}
      </div>

      {/* Send Reminder Panel */}
      {selectedUserIds.size > 0 && (
        <div className="border-t border-slate-200 p-6 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-semibold text-slate-900">{selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected</span>
            {selectedUserIds.size > 50 && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Max 50 per send</span>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
              <input type="text" value={reminderSubject} onChange={(e) => setReminderSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
              <textarea value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} rows={6}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none" />
              <p className="text-[11px] text-slate-400 mt-1">[first name] will be replaced with each recipient's actual first name</p>
            </div>
            <button onClick={handleSend} disabled={sendingReminder || selectedUserIds.size > 50}
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {sendingReminder ? 'Sending...' : `Send Reminder to ${selectedUserIds.size} User${selectedUserIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
