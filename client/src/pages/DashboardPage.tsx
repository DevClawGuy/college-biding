import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Gavel, Home, Heart, Bell, Clock, Trophy, XCircle, Check, ChevronRight } from 'lucide-react';
// framer-motion available if needed
import { useAuthStore } from '../store/authStore';
import { useCountdown } from '../hooks/useCountdown';
import api from '../lib/api';

const tabs = [
  { id: 'bids', label: 'My Bids', icon: Gavel },
  { id: 'listings', label: 'My Listings', icon: Home },
  { id: 'favorites', label: 'Saved', icon: Heart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function BidStatusBadge({ bid }: { bid: any }) {
  const countdown = useCountdown(bid.auctionEnd || '');
  const isWinning = bid.amount >= (bid.currentBid || 0);

  if (bid.listingStatus === 'ended') {
    return isWinning
      ? <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"><Trophy className="w-3 h-3" /> Won</span>
      : <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Lost</span>;
  }
  if (countdown.isExpired) {
    return isWinning
      ? <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"><Trophy className="w-3 h-3" /> Won</span>
      : <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Lost</span>;
  }
  return isWinning
    ? <span className="flex items-center gap-1 text-xs font-medium text-electric-600 bg-electric-50 px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> Winning</span>
    : <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> Outbid</span>;
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
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTabData();
  }, [activeTab, user]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'bids':
          const bidsRes = await api.get('/bids/my/bids');
          setBids(bidsRes.data);
          break;
        case 'listings':
          const listingsRes = await api.get('/listings/my/listings');
          setListings(listingsRes.data);
          break;
        case 'favorites':
          const favsRes = await api.get('/favorites');
          setFavorites(favsRes.data);
          break;
        case 'notifications':
          const notifsRes = await api.get('/notifications');
          setNotifications(notifsRes.data);
          break;
      }
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSearchParams({ tab: id })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === id ? 'bg-white shadow text-navy-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'notifications' && notifications.filter(n => !n.read).length > 0 && activeTab !== 'notifications' && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* My Bids */}
          {activeTab === 'bids' && (
            <div className="space-y-3">
              {bids.length === 0 ? (
                <EmptyState icon={Gavel} title="No bids yet" desc="Start browsing listings and place your first bid!" />
              ) : (
                bids.map(bid => (
                  <Link key={bid.id} to={`/listing/${bid.listingId}`}
                    className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <img src={bid.listingPhoto ? JSON.parse(bid.listingPhoto)[0] : ''} alt=""
                      className="w-20 h-20 rounded-lg object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{bid.listingTitle}</h3>
                      <p className="text-sm text-gray-500">Your bid: <span className="font-medium text-navy-800">${bid.amount?.toLocaleString()}/mo</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">Current: ${bid.currentBid?.toLocaleString()}/mo</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <BidStatusBadge bid={bid} />
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* My Listings */}
          {activeTab === 'listings' && (
            <div className="space-y-3">
              {user.role !== 'landlord' ? (
                <EmptyState icon={Home} title="Student Account" desc="Switch to a landlord account to create listings." />
              ) : listings.length === 0 ? (
                <EmptyState icon={Home} title="No listings yet" desc="Create your first listing to start receiving bids!">
                  <Link to="/create-listing" className="mt-4 inline-block bg-electric-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors">
                    Create Listing
                  </Link>
                </EmptyState>
              ) : (
                listings.map(listing => (
                  <Link key={listing.id} to={`/listing/${listing.id}`}
                    className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <img src={listing.photos[0]} alt="" className="w-20 h-20 rounded-lg object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                      <p className="text-sm text-gray-500">{listing.bidCount} bids &middot; ${listing.currentBid.toLocaleString()}/mo</p>
                      <p className="text-xs text-gray-400">{listing.status === 'active' ? 'Active' : 'Ended'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Favorites */}
          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {favorites.length === 0 ? (
                <EmptyState icon={Heart} title="No saved listings" desc="Heart listings to save them here for later." />
              ) : (
                favorites.map(listing => (
                  <Link key={listing.id} to={`/listing/${listing.id}`}
                    className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <img src={listing.photos[0]} alt="" className="w-20 h-20 rounded-lg object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                      <p className="text-sm text-gray-500">${listing.currentBid.toLocaleString()}/mo &middot; {listing.bidCount} bids</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div>
              {notifications.length > 0 && (
                <div className="flex justify-end mb-3">
                  <button onClick={markAllRead} className="text-sm text-electric-500 hover:text-electric-600 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" /> Mark all read
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <EmptyState icon={Bell} title="No notifications" desc="You'll be notified when you get outbid or win an auction." />
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markRead(notif.id);
                        if (notif.listingId) navigate(`/listing/${notif.listingId}`);
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-colors ${
                        notif.read ? 'bg-white border border-gray-100' : 'bg-electric-50 border border-electric-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                          {notif.message}
                        </p>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-electric-500 mt-1.5 ml-2 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
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
    <div className="text-center py-16">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-gray-500 mt-1 text-sm">{desc}</p>
      {children}
    </div>
  );
}
