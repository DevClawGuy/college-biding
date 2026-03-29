import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Gavel, Home, Heart, Bell, Clock, Trophy, XCircle, Check, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCountdown } from '../hooks/useCountdown';
import api from '../lib/api';

const tabs = [
  { id: 'bids', label: 'My Bids', icon: Gavel },
  { id: 'listings', label: 'My Listings', icon: Home },
  { id: 'favorites', label: 'Saved', icon: Heart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function BidStatusBadge({ bid, userId }: { bid: any; userId?: string }) {
  const countdown = useCountdown(bid.auctionEnd || '');
  const isHighestBidder = bid.amount >= (bid.currentBid || 0);
  const ended = bid.listingStatus === 'ended' || countdown.isExpired;

  if (ended) {
    // If the listing has a winnerId, use it for definitive won/lost
    if (bid.winnerId && userId) {
      return bid.winnerId === userId
        ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100"><Trophy className="w-3 h-3" /> Won</span>
        : <span className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100"><XCircle className="w-3 h-3" /> Lost</span>;
    }
    // Fallback: compare bid amount
    return isHighestBidder
      ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100"><Trophy className="w-3 h-3" /> Won</span>
      : <span className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100"><XCircle className="w-3 h-3" /> Lost</span>;
  }
  return isHighestBidder
    ? <span className="flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100"><Clock className="w-3 h-3" /> Winning</span>
    : <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100"><Clock className="w-3 h-3" /> Outbid</span>;
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bids';
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [bids, setBids] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchTabData();
  }, [activeTab, user]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'bids': setBids((await api.get('/bids/my/bids')).data); break;
        case 'listings': setListings((await api.get('/listings/my/listings')).data); break;
        case 'favorites': setFavorites((await api.get('/favorites')).data); break;
        case 'notifications': {
          const notifsData = (await api.get('/notifications')).data;
          setNotifications(notifsData);
          // Auto-mark all as read when tab is opened
          if (notifsData.some((n: any) => !n.read)) {
            api.put('/notifications/read-all').catch(() => {});
          }
          break;
        }
      }
    } catch { /* */ } finally { setLoading(false); }
  };

  const markAllRead = async () => { await api.put('/notifications/read-all'); setNotifications(p => p.map(n => ({ ...n, read: true }))); };
  const markRead = async (id: string) => { await api.put(`/notifications/${id}/read`); setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)); };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back, {user.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSearchParams({ tab: id })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="w-4 h-4" />{label}
            {id === 'notifications' && notifications.filter(n => !n.read).length > 0 && activeTab !== 'notifications' && (
              <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{notifications.filter(n => !n.read).length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 card-shadow border border-slate-100">
              <div className="flex gap-4">
                <div className="w-20 h-20 skeleton rounded-xl" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-5 skeleton rounded-lg w-1/3" />
                  <div className="h-4 skeleton rounded-lg w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'bids' && (
            <div className="space-y-3">
              {bids.length === 0 ? <EmptyState icon={Gavel} title="No bids yet" desc="Start browsing listings and place your first bid!" /> : bids.map(bid => (
                <Link key={bid.id} to={`/listing/${bid.listingId}`}
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 card-shadow hover:card-shadow-hover transition-all border border-slate-100 group">
                  <img src={bid.listingPhoto ? JSON.parse(bid.listingPhoto)[0] : ''} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">{bid.listingTitle}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Your bid: <span className="font-semibold text-slate-900">${bid.amount?.toLocaleString()}/mo</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">Current: ${bid.currentBid?.toLocaleString()}/mo</p>
                  </div>
                  <div className="flex flex-col items-end gap-2.5">
                    <BidStatusBadge bid={bid} userId={user?.id} />
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="space-y-3">
              {user.role !== 'landlord' ? <EmptyState icon={Home} title="Student Account" desc="Switch to a landlord account to create listings." /> :
               listings.length === 0 ? (
                <EmptyState icon={Home} title="No listings yet" desc="Create your first listing to start receiving bids!">
                  <Link to="/create-listing" className="mt-5 inline-block bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-all">Create Listing</Link>
                </EmptyState>
              ) : listings.map(listing => (
                <div key={listing.id} className="flex items-center gap-4 bg-white rounded-2xl p-4 card-shadow hover:card-shadow-hover transition-all border border-slate-100 group">
                  <Link to={`/listing/${listing.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <img src={listing.photos?.[0] || ''} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">{listing.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{listing.bidCount} bids &middot; ${listing.currentBid?.toLocaleString()}/mo</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${listing.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {listing.status === 'active' ? 'Active' : 'Ended'}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${listing.approvalStatus === 'approved' ? 'bg-blue-50 text-blue-700' : listing.approvalStatus === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {listing.approvalStatus === 'approved' ? 'Approved' : listing.approvalStatus === 'rejected' ? 'Rejected' : 'Pending Review'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex flex-col gap-1.5">
                    <Link to={`/listing/${listing.id}`} className="text-xs text-slate-400 hover:text-brand-600 font-medium transition-colors">View</Link>
                    {listing.status === 'active' && listing.bidCount === 0 && (
                      <button onClick={async () => { if (confirm('Delete this listing?')) { try { await api.delete(`/listings/${listing.id}`); fetchTabData(); } catch {} } }}
                        className="text-xs text-rose-400 hover:text-rose-600 font-medium transition-colors">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {favorites.length === 0 ? <EmptyState icon={Heart} title="No saved listings" desc="Heart listings to save them here for later." /> :
               favorites.map(listing => (
                <Link key={listing.id} to={`/listing/${listing.id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 card-shadow hover:card-shadow-hover transition-all border border-slate-100 group">
                  <img src={listing.photos[0]} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">{listing.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">${listing.currentBid.toLocaleString()}/mo &middot; {listing.bidCount} bids</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              ))}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              {notifications.length > 0 && (
                <div className="flex justify-end mb-4">
                  <button onClick={markAllRead} className="text-sm text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Mark all read
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" desc="You'll be notified when you get outbid or win an auction." /> :
                 notifications.map(notif => (
                  <div key={notif.id} onClick={() => { markRead(notif.id); if (notif.listingId) navigate(`/listing/${notif.listingId}`); }}
                    className={`p-4 rounded-2xl cursor-pointer transition-all ${notif.read ? 'bg-white border border-slate-100 hover:border-slate-200' : 'bg-brand-50 border border-brand-100 hover:bg-brand-100/50'}`}>
                    <div className="flex items-start justify-between">
                      <p className={`text-sm leading-relaxed ${notif.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>{notif.message}</p>
                      {!notif.read && <span className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1 ml-3 flex-shrink-0 ring-4 ring-brand-100" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-20">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      <p className="text-slate-500 mt-1 text-sm">{desc}</p>
      {children}
    </div>
  );
}
