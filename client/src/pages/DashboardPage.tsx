import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Home, Heart, Bell, Clock, Trophy, Check, ChevronRight, Phone, Mail, Trash2, MessageCircle, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCountdown } from '../hooks/useCountdown';
import api from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const studentTabs = [
  { id: 'interests', label: 'My Interests', icon: Heart },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'favorites', label: 'Saved', icon: Heart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const landlordTabs = [
  { id: 'listings', label: 'My Listings', icon: Home },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function ListingStatusBadge({ listing }: { listing: any }) {
  const countdown = useCountdown(listing.auctionEnd || '');
  if (listing.status === 'pending_landlord_confirmation') return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">Awaiting Your Confirmation</span>;
  if (listing.status === 'ended') return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Closed</span>;
  if (listing.approvalStatus === 'pending') return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">Pending Approval</span>;
  if (listing.approvalStatus === 'rejected') return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">Rejected</span>;
  if (countdown.isUrgent) return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-orange-50 text-orange-700">Ending Soon</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Active</span>;
}

function CountdownText({ endDate }: { endDate: string }) {
  const countdown = useCountdown(endDate);
  if (countdown.isExpired) return <span className="text-xs text-slate-400">Ended</span>;
  return <span className="text-xs text-slate-500"><Clock className="w-3 h-3 inline mr-1" />{countdown.display} left</span>;
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const tabs = user?.role === 'landlord' ? landlordTabs : studentTabs;
  const defaultTab = user?.role === 'landlord' ? 'listings' : 'interests';
  const rawTab = searchParams.get('tab');
  const activeTab = rawTab && tabs.some(t => t.id === rawTab) ? rawTab : defaultTab;
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [convMsgInput, setConvMsgInput] = useState('');
  const [convMsgSending, setConvMsgSending] = useState(false);

  if (!user) { navigate('/login'); }

  const { data: msgCountData } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: () => api.get('/messages/unread-count').then(r => r.data as { count: number }),
    enabled: !!user,
  });
  const unreadMsgCount = msgCountData?.count ?? 0;

  const { data: interestsData, isLoading: interestsLoading } = useQuery({
    queryKey: ['my-interests'],
    queryFn: () => api.get('/interest/my').then(r => r.data as any[]),
    enabled: !!user && activeTab === 'interests',
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const listData = (await api.get('/listings/my/listings')).data as any[];
      const counts: Record<string, number> = {};
      for (const l of listData) {
        try {
          const { data: ic } = await api.get(`/interest/${l.id}`);
          counts[l.id] = (ic as { count: number }).count ?? 0;
        } catch { counts[l.id] = 0; }
      }
      return { listings: listData, interestCounts: counts };
    },
    enabled: !!user && activeTab === 'listings',
  });

  const { data: favoritesData, isLoading: favLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/favorites').then(r => r.data as any[]),
    enabled: !!user && activeTab === 'favorites',
  });

  const { data: notificationsData, isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const notifsData = (await api.get('/notifications')).data as any[];
      if (notifsData.some((n: any) => !n.read)) api.put('/notifications/read-all').catch(() => {});
      return notifsData;
    },
    enabled: !!user && activeTab === 'notifications',
  });

  const { data: conversationsData, isLoading: convoLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then(r => r.data as any[]),
    enabled: !!user && activeTab === 'messages',
  });

  const interests = interestsData ?? [];
  const listings = listingsData?.listings ?? [];
  const interestCounts = listingsData?.interestCounts ?? {};
  const favorites = favoritesData ?? [];
  const notifications = notificationsData ?? [];
  const conversations = conversationsData ?? [];

  const loading = activeTab === 'interests' ? interestsLoading
    : activeTab === 'listings' ? listingsLoading
    : activeTab === 'favorites' ? favLoading
    : activeTab === 'notifications' ? notifsLoading
    : activeTab === 'messages' ? convoLoading
    : false;

  const removeFavorite = async (listingId: string) => {
    try {
      await api.delete(`/favorites/${listingId}`);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch { /* */ }
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
  };
  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
  };

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
            {id === 'messages' && unreadMsgCount > 0 && (
              <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadMsgCount > 9 ? '9+' : unreadMsgCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 card-shadow border border-slate-100">
              <div className="flex gap-4"><div className="w-20 h-20 skeleton rounded-xl" /><div className="flex-1 space-y-2.5"><div className="h-5 skeleton rounded-lg w-1/3" /><div className="h-4 skeleton rounded-lg w-1/4" /></div></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* MY INTERESTS */}
          {activeTab === 'interests' && (
            <div className="space-y-3">
              {interests.length === 0 ? <EmptyState icon={Heart} title="No interests yet" desc="Browse listings and express interest to see them here." /> : interests.map((item: any) => (
                <Link key={item.expressionId} to={`/listing/${item.listingId}`}
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 card-shadow hover:card-shadow-hover transition-all border border-slate-100 group">
                  <img src={item.listing?.photos?.[0] || ''} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">{item.listing?.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{item.listing?.address}, {item.listing?.city}</p>
                    {item.moveInDate && <p className="text-xs text-slate-400 mt-0.5">Move-in: {item.moveInDate}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Interested
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* MY LISTINGS (Landlord) */}
          {activeTab === 'listings' && (
            <div className="space-y-4">
              {user.role !== 'landlord' ? <EmptyState icon={Home} title="Student Account" desc="Switch to a landlord account to create listings." /> :
               listings.length === 0 ? (
                <EmptyState icon={Home} title="No listings yet" desc="Create your first listing to start receiving bids!">
                  <Link to="/create-listing" className="mt-5 inline-block bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-all">Create Listing</Link>
                </EmptyState>
              ) : listings.map(listing => (
                <div key={listing.id} className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
                  <Link to={`/listing/${listing.id}`} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                    <img src={listing.photos?.[0] || ''} alt="" className="w-24 h-20 rounded-xl object-cover bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{listing.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{listing.address}, {listing.city}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">${listing.currentBid?.toLocaleString()}/mo</span>
                        {(interestCounts[listing.id] ?? 0) > 0 && (
                          <span className="text-xs font-medium text-emerald-600">{interestCounts[listing.id]} interested</span>
                        )}
                        <ListingStatusBadge listing={listing} />
                        <CountdownText endDate={listing.auctionEnd} />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </Link>

                  {/* Winner info for closed auctions */}
                  {listing.status === 'ended' && listing.winner && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                        <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Auction Winner</p>
                        <p className="text-sm font-medium text-slate-900">{listing.winner.name}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                          <a href={`mailto:${listing.winner.email}`} className="flex items-center gap-1 text-brand-600 hover:underline"><Mail className="w-3 h-3" />{listing.winner.email}</a>
                          {listing.winner.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{listing.winner.phone}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending landlord confirmation — confirm or decline */}
                  {listing.status === 'pending_landlord_confirmation' && listing.winner && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Action Required — Confirm Top Bidder</p>
                        <p className="text-sm font-medium text-slate-900">{listing.winner.name}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                          <a href={`mailto:${listing.winner.email}`} className="flex items-center gap-1 text-brand-600 hover:underline"><Mail className="w-3 h-3" />{listing.winner.email}</a>
                          {listing.winner.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{listing.winner.phone}</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Top bid: <span className="font-semibold text-slate-900">${listing.currentBid?.toLocaleString()}/mo</span></p>
                        <p className="text-[11px] text-slate-400 mt-1">This is a non-binding offer. You retain full discretion to accept or decline.</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={async (e) => { e.preventDefault(); if (confirm('Confirm this offer? The student will be notified as the winner.')) { try { await api.post(`/listings/${listing.id}/confirm-offer`); queryClient.invalidateQueries({ queryKey: ['my-listings'] }); } catch {} } }}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                          >
                            Confirm Offer
                          </button>
                          <button
                            onClick={async (e) => { e.preventDefault(); if (confirm('Decline and relist? The listing will be relisted for 7 more days.')) { try { await api.post(`/listings/${listing.id}/decline-relist`); queryClient.invalidateQueries({ queryKey: ['my-listings'] }); } catch {} } }}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-[0.98]"
                          >
                            Decline & Relist
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete button for listings with no bids */}
                  {listing.status === 'active' && listing.bidCount === 0 && (
                    <div className="px-4 pb-3 pt-0">
                      <button onClick={async () => { if (confirm('Delete this listing?')) { try { await api.delete(`/listings/${listing.id}`); queryClient.invalidateQueries({ queryKey: ['my-listings'] }); } catch {} } }}
                        className="text-xs text-rose-400 hover:text-rose-600 font-medium transition-colors flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete listing
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-3">
              {conversations.length === 0 ? <EmptyState icon={MessageCircle} title="No messages yet" desc="Message a landlord from any listing page to start a conversation." /> :
               conversations.map(conv => {
                const key = `${conv.listingId}:${conv.otherUserId}`;
                const isExpanded = expandedConv === key;
                return (
                  <div key={key} className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
                    <button
                      onClick={async () => {
                        if (isExpanded) { setExpandedConv(null); return; }
                        setExpandedConv(key);
                        try {
                          const withParam = user?.role === 'landlord' ? `?with=${conv.otherUserId}` : '';
                          const { data } = await api.get(`/messages/${conv.listingId}${withParam}`);
                          setConvMessages(data);
                        } catch { /* */ }
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors text-left"
                    >
                      <img src={conv.listingPhoto || ''} alt="" className="w-14 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate text-sm">{conv.otherUserName}</h3>
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{conv.unreadCount}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{conv.listingTitle}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{conv.lastMessage}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-slate-400">{new Date(conv.lastMessageAt).toLocaleDateString()}</span>
                        <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4">
                        <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                          {convMessages.map((msg: { id: string; senderId: string; senderName: string; body: string; createdAt: number }) => {
                            const isOwn = msg.senderId === user?.id;
                            return (
                              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${isOwn ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                  {!isOwn && <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.senderName}</p>}
                                  <p className="leading-relaxed">{msg.body}</p>
                                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={convMsgInput}
                            onChange={(e) => setConvMsgInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!convMsgInput.trim() || convMsgSending) return;
                                setConvMsgSending(true);
                                const recipientId = user?.role === 'landlord' ? conv.otherUserId : undefined;
                                api.post(`/messages/${conv.listingId}`, { body: convMsgInput.trim(), recipientId }).then(({ data }) => {
                                  setConvMessages(prev => [...prev, data.message]);
                                  setConvMsgInput('');
                                }).catch(() => {}).finally(() => setConvMsgSending(false));
                              }
                            }}
                            placeholder="Type a reply..."
                            maxLength={1000}
                            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          />
                          <button
                            onClick={() => {
                              if (!convMsgInput.trim() || convMsgSending) return;
                              setConvMsgSending(true);
                              const recipientId = user?.role === 'landlord' ? conv.otherUserId : undefined;
                              api.post(`/messages/${conv.listingId}`, { body: convMsgInput.trim(), recipientId }).then(({ data }) => {
                                setConvMessages(prev => [...prev, data.message]);
                                setConvMsgInput('');
                              }).catch(() => {}).finally(() => setConvMsgSending(false));
                            }}
                            disabled={convMsgSending || !convMsgInput.trim()}
                            className="px-3 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all disabled:opacity-50 active:scale-95"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {favorites.length === 0 ? <EmptyState icon={Heart} title="No saved listings" desc="Heart listings to save them here for later." /> :
               favorites.map(listing => (
                <div key={listing.id} className="flex items-center gap-4 bg-white rounded-2xl p-4 card-shadow hover:card-shadow-hover transition-all border border-slate-100 group">
                  <Link to={`/listing/${listing.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <img src={listing.photos?.[0] || 'https://picsum.photos/200/200?grayscale'} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">{listing.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{listing.address}, {listing.city}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-semibold text-slate-900">${(listing.currentBid ?? 0).toLocaleString()}/mo</span>
                        <CountdownText endDate={listing.auctionEnd} />
                      </div>
                    </div>
                  </Link>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <Link to={`/listing/${listing.id}`} className="text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-colors">Bid Now</Link>
                    <button onClick={() => removeFavorite(listing.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NOTIFICATIONS */}
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
