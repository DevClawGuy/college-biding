import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Ruler, Clock, Heart, ChevronLeft, ChevronRight, Check, Eye, MessageCircle, Send, ChevronDown, Calendar, Users, ShoppingCart, Bus, Coffee, Bike, CreditCard, Pill, Shirt } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useCountdown } from '../hooks/useCountdown';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import api from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Listing {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  photos: string[];
  amenities: string[];
  tags: string[];
  beds: number;
  baths: number;
  sqft: number;
  distanceToCampus: number;
  nearestUniversity: string;
  startingBid: number;
  currentBid: number;
  bidCount: number;
  auctionEnd: string;
  status: 'active' | 'ended' | 'cancelled' | 'pending_landlord_confirmation';
  winnerId: string | null;
  secureLeasePrice: number | null;
  viewCount: number;
  nearbyAmenities?: string | null;
  landlordId: string;
  landlord?: { id: string; name: string; university: string; avatar: string | null };
  winner?: { id: string; name: string; email: string; university: string } | null;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  body: string;
  isRead: boolean;
  createdAt: number;
}

interface InterestedStudent {
  id: string;
  userId: string;
  moveInDate: string | null;
  occupants: number | null;
  note: string | null;
  rentSuggestion: number | null;
  createdAt: string;
  student: { id: string; name: string; university: string; isEduVerified: boolean; phone: string | null } | null;
}

const mapIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestForm, setInterestForm] = useState({ moveInDate: '', occupants: '', note: '', rentSuggestion: '' });
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [withdrawingInterest, setWithdrawingInterest] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: listing, isLoading: loading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.get(`/listings/${id}`).then(r => r.data as Listing),
    enabled: !!id,
  });

  const { data: interestData } = useQuery({
    queryKey: ['interest', id],
    queryFn: () => api.get(`/interest/${id}`).then(r => r.data as { count: number; userHasExpressed: boolean }),
    enabled: !!id,
  });

  const { data: interestDetailsData } = useQuery({
    queryKey: ['interest-details', id],
    queryFn: () => api.get(`/interest/${id}/details`).then(r => r.data as InterestedStudent[]),
    enabled: !!user && user.role === 'landlord' && !!listing && listing.landlordId === user.id,
  });

  const { data: favoriteData } = useQuery({
    queryKey: ['favorite-check', id],
    queryFn: () => api.get(`/favorites/check/${id}`).then(r => r.data as { isFavorited: boolean }),
    enabled: !!user && !!id,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get(`/messages/${id}`).then(r => r.data as Message[]),
    enabled: !!user && !!id,
  });

  const interestCount = interestData?.count ?? 0;
  const userHasExpressed = interestData?.userHasExpressed ?? false;
  const interestedStudents = interestDetailsData ?? [];
  const isFavorited = favoriteData?.isFavorited ?? false;
  const threadMessages = messagesData ?? [];

  const countdown = useCountdown(listing?.auctionEnd ?? '');

  // Dynamic page title
  useEffect(() => {
    if (!listing) return;
    document.title = `${listing.title} — HouseRush`;
    return () => { document.title = 'HouseRush - Off-Campus Student Housing'; };
  }, [listing?.title]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length]);

  const handleSendMessage = async () => {
    if (!id || !msgInput.trim() || msgSending) return;
    setMsgSending(true);
    try {
      await api.post(`/messages/${id}`, { body: msgInput.trim() });
      setMsgInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    } catch { /* */ }
    setMsgSending(false);
  };

  // Socket
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('join_listing', id);
    socket.on('new_interest', (data: { listingId: string }) => {
      if (data.listingId === id) queryClient.invalidateQueries({ queryKey: ['interest', id] });
    });
    socket.on('auction_ended', (data: { listingId: string }) => {
      if (data.listingId === id) queryClient.invalidateQueries({ queryKey: ['listing', id] });
    });
    socket.on('new_message', (data: { listingId: string }) => {
      if (data.listingId === id) queryClient.invalidateQueries({ queryKey: ['messages', id] });
    });
    return () => { socket.emit('leave_listing', id); socket.off('new_interest'); socket.off('auction_ended'); socket.off('new_message'); };
  }, [id]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    try {
      if (isFavorited) await api.delete(`/favorites/${id}`);
      else await api.post(`/favorites/${id}`);
      queryClient.invalidateQueries({ queryKey: ['favorite-check', id] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch { /* */ }
  };

  const handleExpressInterest = async () => {
    if (!id) return;
    setSubmittingInterest(true);
    try {
      await api.post(`/interest/${id}`, {
        moveInDate: interestForm.moveInDate || null,
        occupants: interestForm.occupants ? Number(interestForm.occupants) : null,
        note: interestForm.note || null,
        rentSuggestion: interestForm.rentSuggestion ? Number(interestForm.rentSuggestion) : null,
      });
      setShowInterestForm(false);
      queryClient.invalidateQueries({ queryKey: ['interest', id] });
    } catch { /* */ }
    setSubmittingInterest(false);
  };

  const handleWithdrawInterest = async () => {
    if (!id) return;
    setWithdrawingInterest(true);
    try {
      await api.delete(`/interest/${id}`);
      setInterestForm({ moveInDate: '', occupants: '', note: '', rentSuggestion: '' });
      queryClient.invalidateQueries({ queryKey: ['interest', id] });
    } catch { /* */ }
    setWithdrawingInterest(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-[420px] skeleton rounded-2xl mb-8" />
          <div className="h-8 skeleton rounded-lg w-1/2 mb-4" />
          <div className="h-5 skeleton rounded-lg w-1/3" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-slate-700">Listing not found</h2>
        <Link to="/listings" className="text-brand-600 mt-4 inline-block font-medium">Back to listings</Link>
      </div>
    );
  }

  const photos: string[] = listing.photos ?? [];
  const tags: string[] = listing.tags ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const isActive = listing.status === 'active';
  const isLandlordOwner = user && user.role === 'landlord' && listing.landlordId === user.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link to="/listings" className="text-slate-500 hover:text-slate-700 text-sm mb-6 inline-flex items-center gap-1 font-medium">
        <ChevronLeft className="w-4 h-4" /> Back to listings
      </Link>

      <div className="grid lg:grid-cols-3 gap-8 mt-2">
        <div className="lg:col-span-2 space-y-8">
          {/* Photo Gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 h-72 sm:h-[420px] card-shadow">
            <img src={photos[photoIndex] || 'https://picsum.photos/800/600?grayscale'} alt={listing.title ?? 'Listing'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIndex((p) => (p - 1 + photos.length) % photos.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2.5 shadow-lg transition-all hover:scale-105">
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button onClick={() => setPhotoIndex((p) => (p + 1) % photos.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2.5 shadow-lg transition-all hover:scale-105">
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_: string, i: number) => (
                    <button key={i} onClick={() => setPhotoIndex(i)} className={`h-2 rounded-full transition-all duration-300 ${i === photoIndex ? 'bg-white w-6' : 'bg-white/50 w-2 hover:bg-white/70'}`} />
                  ))}
                </div>
              </>
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              {tags.map((tag: string) => (
                <span key={tag} className="glass-dark text-white text-xs font-medium px-3 py-1.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{listing.title}</h1>
                <p className="text-slate-500 flex items-center gap-1.5 mt-2 text-sm">
                  <MapPin className="w-4 h-4" />{listing.address}, {listing.city}, {listing.state}
                </p>
              </div>
              {user && (
                <button onClick={toggleFavorite} className="p-2.5 rounded-xl hover:bg-slate-100 transition-all">
                  <Heart className={`w-6 h-6 ${isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: Bed, label: listing.beds === 0 ? 'Studio' : `${listing.beds} Bed${listing.beds > 1 ? 's' : ''}` },
                { icon: Bath, label: `${listing.baths} Bath${listing.baths > 1 ? 's' : ''}` },
                { icon: Ruler, label: `${listing.sqft} sqft` },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 bg-slate-50 text-slate-600 text-sm px-3 py-2 rounded-xl border border-slate-100">
                  <Icon className="w-4 h-4 text-slate-400" />{label}
                </span>
              ))}
            </div>
            {(listing.viewCount ?? 0) > 0 && (
              <div className={`flex items-center gap-1.5 mt-3 text-sm font-medium ${listing.viewCount > 100 ? 'text-rose-600' : listing.viewCount > 50 ? 'text-amber-600' : 'text-slate-500'}`}>
                <Eye className="w-4 h-4" />
                <span>{listing.viewCount} student{listing.viewCount !== 1 ? 's' : ''} viewed this{listing.viewCount > 100 ? ' — high demand!' : ''}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">About this property</h2>
            <p className="text-slate-600 leading-relaxed">{listing.description}</p>
          </div>

          {/* Amenities */}
          {amenities.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {amenities.map((amenity: string) => (
                  <div key={amenity} className="flex items-center gap-2.5 text-sm text-slate-600 bg-white px-4 py-3 rounded-xl border border-slate-100">
                    <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />{amenity}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's Nearby */}
          {(() => {
            if (!listing.nearbyAmenities) return null;
            let nearby: Array<{ category: string; name: string; distanceMeters: number }>;
            try { nearby = JSON.parse(listing.nearbyAmenities); } catch { return null; }
            if (!nearby || nearby.length === 0) return null;

            const catConfig: Record<string, { icon: typeof ShoppingCart; label: string }> = {
              grocery: { icon: ShoppingCart, label: 'Grocery & Convenience' },
              laundry: { icon: Shirt, label: 'Laundry' },
              transit: { icon: Bus, label: 'Transit' },
              pharmacy: { icon: Pill, label: 'Pharmacy' },
              cafe: { icon: Coffee, label: 'Cafes & Coffee' },
              bike: { icon: Bike, label: 'Bike Parking & Rental' },
              atm: { icon: CreditCard, label: 'ATM' },
            };

            function fmtDist(m: number): string {
              if (m < 100) return '< 100m';
              if (m < 1000) return `${Math.round(m / 10) * 10}m`;
              return `${(m / 1000).toFixed(1)}km`;
            }

            const grouped = new Map<string, typeof nearby>();
            for (const item of nearby) {
              const arr = grouped.get(item.category) ?? [];
              arr.push(item);
              grouped.set(item.category, arr);
            }

            return (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">What's Nearby</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array.from(grouped.entries()).map(([cat, items]) => {
                    const cfg = catConfig[cat];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    return (
                      <div key={cat} className="bg-white rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-4 h-4 text-brand-600" />
                          <span className="text-sm font-medium text-slate-900">{cfg.label}</span>
                        </div>
                        <div className="space-y-2">
                          {items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 truncate mr-2">{item.name}</span>
                              <span className="text-slate-400 text-xs flex-shrink-0">{fmtDist(item.distanceMeters)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-3">&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors</p>
              </div>
            );
          })()}

          {/* Interested Students — landlord owner only */}
          {isLandlordOwner && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Interested Students ({interestedStudents.length})</h2>
              {interestedStudents.length === 0 ? (
                <p className="text-slate-500 text-sm">No students have expressed interest yet.</p>
              ) : (
                <div className="space-y-3">
                  {interestedStudents.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl p-4 card-shadow border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-slate-900">{item.student?.name ?? 'Student'}</p>
                        {item.student?.isEduVerified && (
                          <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">.edu verified</span>
                        )}
                      </div>
                      {item.student?.university && <p className="text-xs text-slate-500">{item.student.university}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                        {item.moveInDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.moveInDate}</span>}
                        {item.occupants && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.occupants} occupant{item.occupants !== 1 ? 's' : ''}</span>}
                      </div>
                      {item.note && <p className="text-sm text-slate-600 mt-2 italic">"{item.note}"</p>}
                      {item.rentSuggestion && (
                        <p className="text-xs text-slate-400 mt-2">Monthly rent that works for them: ${item.rentSuggestion.toLocaleString()}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Map */}
          {listing.lat != null && listing.lng != null && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
              <div className="h-72 rounded-2xl overflow-hidden border border-slate-200 card-shadow">
                <MapContainer center={[listing.lat, listing.lng]} zoom={15} scrollWheelZoom={false}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[listing.lat, listing.lng]} icon={mapIcon}><Popup>{listing.title}</Popup></Marker>
                </MapContainer>
              </div>
              <p className="text-sm text-slate-400 mt-2">{listing.distanceToCampus} miles from {listing.nearestUniversity}</p>
            </div>
          )}

          {/* Landlord */}
          {listing.landlord && (
            <div className="bg-white rounded-2xl p-5 flex items-center gap-4 card-shadow border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {listing.landlord.name?.charAt(0) ?? 'L'}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{listing.landlord.name}</p>
                <p className="text-sm text-slate-500">{listing.landlord.university}</p>
              </div>
            </div>
          )}
        </div>

        {/* Interest Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-6">
              {/* Listing price info */}
              <div className="bg-slate-50 rounded-xl p-5 mb-5 border border-slate-100">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Listed Price</p>
                <div className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">
                  ${(listing.currentBid ?? listing.startingBid ?? 0).toLocaleString()}<span className="text-lg font-normal text-slate-400">/mo</span>
                </div>
              </div>

              {!isActive ? (
                /* State C — listing not active */
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-base font-semibold text-slate-700 mb-1">This listing is no longer active</p>
                  {interestCount > 0 && <p className="text-sm text-slate-500">{interestCount} students expressed interest</p>}
                </div>
              ) : isLandlordOwner ? (
                /* Landlord viewing own listing */
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-700">{interestCount}</p>
                  <p className="text-sm text-slate-500">student{interestCount !== 1 ? 's' : ''} interested</p>
                  {interestCount > 0 && (
                    <a href="#interested-students" className="text-sm font-medium text-brand-600 hover:text-brand-700 mt-2 inline-block">
                      View {interestCount} interested student{interestCount !== 1 ? 's' : ''} →
                    </a>
                  )}
                </div>
              ) : user && user.role === 'student' ? (
                userHasExpressed ? (
                  /* State B — student has expressed interest */
                  <div>
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <p className="text-sm font-medium text-emerald-700">You've expressed interest in this property</p>
                    </div>
                    {interestCount > 0 && <p className="text-sm text-slate-500 mb-3">{interestCount} student{interestCount !== 1 ? 's' : ''} have expressed interest</p>}
                    <button onClick={handleWithdrawInterest} disabled={withdrawingInterest}
                      className="text-xs text-slate-400 hover:text-rose-500 font-medium transition-colors disabled:opacity-50">
                      {withdrawingInterest ? 'Withdrawing...' : 'Withdraw Interest'}
                    </button>
                  </div>
                ) : (
                  /* State A — student can express interest */
                  <div>
                    <p className="text-base font-semibold text-slate-900 mb-3">Interested in this property?</p>

                    <button onClick={() => setShowInterestForm(!showInterestForm)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3 transition-colors">
                      <ChevronDown className={`w-3 h-3 transition-transform ${showInterestForm ? 'rotate-180' : ''}`} />
                      {showInterestForm ? 'Hide details' : 'Add details (optional)'}
                    </button>

                    {showInterestForm && (
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Preferred move-in date</label>
                          <input type="date" value={interestForm.moveInDate} onChange={e => setInterestForm(p => ({ ...p, moveInDate: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Number of occupants</label>
                          <input type="number" min={1} max={6} value={interestForm.occupants} onChange={e => setInterestForm(p => ({ ...p, occupants: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" placeholder="1-6" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Note to landlord</label>
                          <textarea value={interestForm.note} onChange={e => setInterestForm(p => ({ ...p, note: e.target.value }))} maxLength={280}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none" rows={3} placeholder="Tell the landlord about yourself..." />
                          <p className="text-[10px] text-slate-400 mt-0.5 text-right">{interestForm.note.length}/280</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Optional: what monthly rent would work for you?</label>
                          <input type="number" min={1} value={interestForm.rentSuggestion} onChange={e => setInterestForm(p => ({ ...p, rentSuggestion: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" placeholder="$ per month" />
                          <p className="text-[10px] text-slate-400 mt-0.5">Shared privately with the landlord only. Never shown to other students.</p>
                        </div>
                      </div>
                    )}

                    <button onClick={handleExpressInterest} disabled={submittingInterest}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-brand-600/20 active:scale-[0.98] disabled:opacity-50">
                      {submittingInterest ? 'Submitting...' : "I'm Interested"}
                    </button>

                    {interestCount > 0 && <p className="text-sm text-slate-500 mt-3 text-center">{interestCount} student{interestCount !== 1 ? 's' : ''} have expressed interest</p>}
                    <p className="text-xs text-slate-400 mt-2 text-center">Expressing interest is free and non-binding. The landlord will reach out if interested.</p>
                  </div>
                )
              ) : user && user.role === 'landlord' ? (
                /* Landlord viewing another landlord's listing */
                <p className="text-center text-slate-500 text-sm bg-slate-50 py-3.5 rounded-xl border border-slate-100">You are viewing this listing as a landlord.</p>
              ) : (
                /* Not logged in */
                <div>
                  {interestCount > 0 && <p className="text-sm text-slate-500 mb-3 text-center">{interestCount} student{interestCount !== 1 ? 's' : ''} have expressed interest</p>}
                  <Link to="/login" className="block text-center w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-semibold text-lg transition-all">
                    Sign in to express interest
                  </Link>
                </div>
              )}

              {/* Time remaining */}
              {isActive && !countdown.isExpired && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{countdown.display} remaining</span>
                </div>
              )}
            </div>

            {/* Message Landlord Section */}
            {user && user.role !== 'landlord' && listing.landlordId !== user.id && (
              <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Message Landlord</h3>
                </div>
                {threadMessages.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-3 px-1">
                    {threadMessages.map(msg => {
                      const isOwn = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${isOwn ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                            {!isOwn && <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.senderName}</p>}
                            <p className="leading-relaxed">{msg.body}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={msgEndRef} />
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Type a message..." maxLength={1000}
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                  <button onClick={handleSendMessage} disabled={msgSending || !msgInput.trim()}
                    className="px-3 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all disabled:opacity-50 active:scale-95">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {!user && (
              <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">Message Landlord</h3>
                </div>
                <Link to="/login" className="block text-center w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-all">
                  Log in to message the landlord
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
