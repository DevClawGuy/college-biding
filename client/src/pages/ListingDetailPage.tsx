import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { MapPin, Bed, Bath, Ruler, Clock, Heart, ChevronLeft, ChevronRight, GraduationCap, Check, Lock, Users, MessageCircle, Send, Eye, Sparkles, ChevronDown, Lightbulb } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useCountdown } from '../hooks/useCountdown';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import BidModal from '../components/BidModal';
import CreateGroupModal from '../components/CreateGroupModal';
import api from '../lib/api';
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
  status: 'active' | 'ended' | 'cancelled';
  winnerId: string | null;
  secureLeasePrice: number | null;
  viewCount: number;
  landlordId: string;
  landlord?: { id: string; name: string; university: string; avatar: string | null };
  winner?: { id: string; name: string; email: string; university: string } | null;
}

interface Bid {
  id: string;
  listingId: string;
  userId: string;
  amount: number;
  isAutoBid: boolean;
  isSecureLease: boolean;
  timestamp: string;
  userName: string;
  userUniversity: string;
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

interface BidRecommendation {
  recommendedMin: number;
  recommendedMid: number;
  recommendedMax: number;
  winProbAtMin: number;
  winProbAtMid: number;
  winProbAtMax: number;
  winProbAtSecureLease: number | null;
  competitionScore: number;
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
  confidence: 'high' | 'medium' | 'low';
  confidenceNote: string;
  compsUsed: number;
  urgency: 'low' | 'medium' | 'high' | 'extreme';
  insight: string;
  signals: {
    activeBidders: number;
    bidVelocity24h: number;
    viewCount: number;
    viewVelocity: number;
    hoursLeft: number;
    priceIncreasePercent: number;
    recentMomentumPercent: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    weightedMedian: number | null;
  };
  cached: boolean;
  generatedAt: number;
  disclaimer: string;
}

interface BidGroupMember {
  id: string;
  groupId: string;
  userId: string | null;
  email: string;
  name: string | null;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: number;
  joinedAt: number | null;
}

interface BidGroup {
  id: string;
  listingId: string;
  leaderId: string;
  name: string;
  status: string;
  leaderName: string;
  members: BidGroupMember[];
}

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showBidModal, setShowBidModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [bidPulse, setBidPulse] = useState(false);
  const [extensionToast, setExtensionToast] = useState(false);
  const [showSecureLeaseConfirm, setShowSecureLeaseConfirm] = useState(false);
  const [secureLeaseLoading, setSecureLeaseLoading] = useState(false);
  const [secureLeaseError, setSecureLeaseError] = useState('');
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [recommendation, setRecommendation] = useState<BidRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(false);
  const [recSignalsOpen, setRecSignalsOpen] = useState(false);
  const [bidPreFillAmount, setBidPreFillAmount] = useState<number | undefined>(undefined);
  const [bidGroup, setBidGroup] = useState<BidGroup | null>(null);
  const [groupJoinToast, setGroupJoinToast] = useState('');
  const [showGroupBidModal, setShowGroupBidModal] = useState(false);
  const { user } = useAuthStore();
  const confettiFired = useRef(false);

  // ALL hooks must be called before any early return
  const countdown = useCountdown(listing?.auctionEnd ?? '');

  // Dynamic page title and OG meta
  useEffect(() => {
    if (!listing) return;
    document.title = `${listing.title} — HouseRush`;
    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement('meta'); (el as HTMLMetaElement).setAttribute('property', prop); document.head.appendChild(el); }
      (el as HTMLMetaElement).setAttribute('content', content);
    };
    setMeta('og:title', `${listing.title} — HouseRush`);
    setMeta('og:description', `${listing.beds === 0 ? 'Studio' : listing.beds + 'BR'} at ${listing.address}, ${listing.city}. Current bid: $${(listing.currentBid ?? 0).toLocaleString()}/mo`);
    return () => { document.title = 'HouseRush - Off-Campus Student Housing'; };
  }, [listing?.title, listing?.currentBid]);

  // Confetti on win (socket event or page load)
  useEffect(() => {
    if (!listing || !user || confettiFired.current) return;
    if (listing.status === 'ended' && listing.winnerId === user.id) {
      confettiFired.current = true;
      setTimeout(() => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }), 300);
    }
  }, [listing?.status, listing?.winnerId, user?.id]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [listingRes, bidsRes] = await Promise.all([api.get(`/listings/${id}`), api.get(`/bids/listing/${id}`)]);
      setListing(listingRes.data);
      setBids(bidsRes.data ?? []);
    } catch (err) {
      console.error('Failed to fetch listing:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (user && id) api.get(`/favorites/check/${id}`).then(({ data }) => setIsFavorited(data.isFavorited)).catch(() => {});
  }, [user, id]);

  // Fetch group data
  const fetchGroup = useCallback(async () => {
    if (!user || !id) return;
    try {
      const { data } = await api.get(`/bid-groups/${id}`);
      setBidGroup(data);
    } catch { /* no group */ }
  }, [user, id]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  // Fetch messages for this listing (student sees thread with landlord)
  const fetchMessages = useCallback(async () => {
    if (!user || !id) return;
    try {
      const { data } = await api.get(`/messages/${id}`);
      setThreadMessages(data);
    } catch { /* no messages yet */ }
  }, [user, id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const openBidWithAmount = (amount: number) => {
    setBidPreFillAmount(amount);
    setShowBidModal(true);
  };

  const fetchRecommendation = async () => {
    if (!id) return;
    setRecLoading(true);
    setRecError(false);
    try {
      const { data } = await api.post(`/ai/bid-recommendation/${id}`);
      setRecommendation(data);
    } catch {
      setRecError(true);
    }
    setRecLoading(false);
  };

  // Auto-scroll messages to bottom
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length]);

  const handleSendMessage = async () => {
    if (!id || !msgInput.trim() || msgSending) return;
    setMsgSending(true);
    try {
      const { data } = await api.post(`/messages/${id}`, { body: msgInput.trim() });
      setThreadMessages(prev => [...prev, data.message]);
      setMsgInput('');
    } catch { /* */ }
    setMsgSending(false);
  };

  // Auto-join group via URL param
  useEffect(() => {
    const joinGroupId = searchParams.get('join_group');
    if (!joinGroupId || !user) return;
    api.post(`/bid-groups/${joinGroupId}/join`).then(() => {
      setGroupJoinToast('You joined the group!');
      setTimeout(() => setGroupJoinToast(''), 5000);
      fetchGroup();
      // Remove the join_group param from URL
      searchParams.delete('join_group');
      setSearchParams(searchParams, { replace: true });
    }).catch(() => {});
  }, [user, searchParams]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('join_listing', id);
    socket.on('bid_update', (data) => {
      if (data.listingId === id) {
        setListing((prev) => prev ? { ...prev, currentBid: data.currentBid, bidCount: data.bidCount } : prev);
        setBids((prev) => [data.bid, ...prev]);
        setBidPulse(true);
        setTimeout(() => setBidPulse(false), 1000);
      }
    });
    socket.on('auction_ended', (data) => {
      if (data.listingId === id) {
        setListing((prev) => prev ? { ...prev, status: 'ended' as const, winnerId: data.winnerId, winner: data.winnerName ? { id: data.winnerId, name: data.winnerName, email: '', university: '' } : null } : prev);
        if (user && data.winnerId === user.id && !confettiFired.current) {
          confettiFired.current = true;
          setTimeout(() => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }), 300);
        }
      }
    });
    socket.on('auction_extended', (data) => {
      if (data.listingId === id) {
        setListing((prev) => prev ? { ...prev, auctionEnd: data.newAuctionEnd } : prev);
        setExtensionToast(true);
        setTimeout(() => setExtensionToast(false), 6000);
      }
    });
    socket.on('new_message', (data) => {
      if (data.listingId === id) {
        setThreadMessages(prev => [...prev, {
          id: data.messageId,
          senderId: data.senderId,
          recipientId: '',
          senderName: data.senderName,
          body: data.body,
          isRead: true,
          createdAt: data.createdAt,
        }]);
      }
    });
    return () => { socket.emit('leave_listing', id); socket.off('bid_update'); socket.off('auction_ended'); socket.off('auction_extended'); socket.off('new_message'); };
  }, [id]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    try {
      if (isFavorited) await api.delete(`/favorites/${id}`);
      else await api.post(`/favorites/${id}`);
      setIsFavorited(!isFavorited);
    } catch { /* */ }
  };

  const handleSecureLease = async () => {
    if (!id) return;
    setSecureLeaseLoading(true);
    setSecureLeaseError('');
    try {
      await api.post(`/bids/secure-lease/${id}`);
      setShowSecureLeaseConfirm(false);
      confettiFired.current = true;
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSecureLeaseError(typeof msg === 'string' ? msg : 'Failed to secure lease');
    } finally {
      setSecureLeaseLoading(false);
    }
  };

  // Loading state
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

  // Not found state
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
  const safeBids = bids ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Group join toast */}
      {groupJoinToast && (
        <div className="mb-4 bg-brand-50 border border-brand-200 text-brand-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" /> {groupJoinToast}
        </div>
      )}

      {/* Auction extension toast */}
      {extensionToast && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-pulse">
          <span>⏱</span> Auction extended by 5 minutes due to a last-minute bid!
        </div>
      )}

      {/* Ending soon banners */}
      {listing.status !== 'ended' && !countdown.isExpired && countdown.isUrgent && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-pulse">
          <span>🔥</span> Auction ending soon! Less than {countdown.minutes > 0 ? `${countdown.minutes} minutes` : `${countdown.seconds} seconds`} remaining — place your bid now!
        </div>
      )}
      {listing.status !== 'ended' && !countdown.isExpired && !countdown.isUrgent && countdown.days === 0 && countdown.hours < 24 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>⏰</span> Auction ends in {countdown.hours > 0 ? `${countdown.hours} hours` : `${countdown.minutes} minutes`} — don't miss out!
        </div>
      )}

      <Link to="/listings" className="text-slate-500 hover:text-slate-700 text-sm mb-6 inline-flex items-center gap-1 font-medium">
        <ChevronLeft className="w-4 h-4" /> Back to listings
      </Link>

      <div className="grid lg:grid-cols-3 gap-8 mt-2">
        <div className="lg:col-span-2 space-y-8">
          {/* Photo Gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 h-72 sm:h-[420px] card-shadow">
            <img
              src={photos[photoIndex] || 'https://picsum.photos/800/600?grayscale'}
              alt={listing.title ?? 'Listing'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIndex((p) => (p - 1 + photos.length) % photos.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2.5 shadow-lg transition-all hover:scale-105">
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button onClick={() => setPhotoIndex((p) => (p + 1) % photos.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2.5 shadow-lg transition-all hover:scale-105">
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_: string, i: number) => (
                    <button key={i} onClick={() => setPhotoIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${i === photoIndex ? 'bg-white w-6' : 'bg-white/50 w-2 hover:bg-white/70'}`} />
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

            {/* View count */}
            {(listing.viewCount ?? 0) > 0 && (
              <div className={`flex items-center gap-1.5 mt-3 text-sm font-medium ${
                listing.viewCount > 100 ? 'text-rose-600' : listing.viewCount > 50 ? 'text-amber-600' : 'text-slate-500'
              }`}>
                <Eye className="w-4 h-4" />
                {listing.viewCount > 100
                  ? <span>{listing.viewCount} students viewed this — high demand!</span>
                  : <span>{listing.viewCount} students viewed this</span>
                }
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

          {/* Map */}
          {listing.lat != null && listing.lng != null && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
              <div className="h-72 rounded-2xl overflow-hidden border border-slate-200 card-shadow">
                <MapContainer center={[listing.lat, listing.lng]} zoom={15} scrollWheelZoom={false}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[listing.lat, listing.lng]} icon={icon}><Popup>{listing.title}</Popup></Marker>
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

          {/* Bid History */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Bid History ({safeBids.length})</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {safeBids.length === 0 ? (
                <p className="text-slate-500 text-sm">No bids yet. Be the first!</p>
              ) : safeBids.map((bid: Bid, i: number) => {
                const isYou = user && bid.userId === user.id;
                return (
                <motion.div key={bid.id ?? i} initial={i === 0 ? { opacity: 0, x: -20 } : false} animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between py-3 px-4 rounded-xl ${isYou ? 'bg-brand-50 border border-brand-200' : i === 0 ? 'bg-brand-50/50 border border-brand-100' : 'bg-white border border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isYou ? 'bg-brand-100' : 'bg-slate-100'}`}>
                      {isYou
                        ? <span className="text-brand-600 text-xs font-bold">You</span>
                        : <GraduationCap className="w-4 h-4 text-slate-500" />
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isYou ? 'text-brand-700' : 'text-slate-900'}`}>
                        {isYou ? (bid.isAutoBid ? 'You (auto-bid)' : 'You') : (bid.userUniversity ? `Student from ${bid.userUniversity}` : (bid.userName ?? 'Anonymous'))}
                      </p>
                      <p className="text-xs text-slate-400">
                        {bid.timestamp ? new Date(bid.timestamp).toLocaleString() : ''}
                        {!isYou && bid.isAutoBid && <span className="ml-1 text-brand-500 font-medium">(auto-bid)</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${isYou ? 'text-brand-700' : 'text-slate-900'}`}>${(bid.amount ?? 0).toLocaleString()}</span>
                </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bid Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            {/* Landlord viewing another listing — show info only, no bid actions */}
            {user && user.role === 'landlord' && listing.landlordId !== user.id ? (
              <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-6">
                <div className="bg-slate-50 rounded-xl p-5 mb-5 border border-slate-100">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {listing.status === 'ended' ? 'Final Bid' : 'Current Highest Bid'}
                  </p>
                  <div className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">
                    ${(listing.currentBid ?? 0).toLocaleString()}<span className="text-lg font-normal text-slate-400">/mo</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{listing.bidCount ?? 0} bid{(listing.bidCount ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-center text-slate-500 text-sm bg-slate-50 py-3.5 rounded-xl border border-slate-100">You are viewing this listing as a landlord.</p>
              </div>
            ) : (
            <div className={`bg-white rounded-2xl card-shadow border border-slate-200 p-6 ${bidPulse ? 'bid-pulse' : ''}`}>
              {/* Auction Closed Banner */}
              {(listing.status === 'ended' || countdown.isExpired) ? (
                <>
                  {user && listing.winnerId === user.id ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 text-center">
                      <p className="text-lg font-bold text-emerald-700 mb-1">You Won!</p>
                      <p className="text-sm text-emerald-600">Your agent will be in touch to finalize your lease.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-center">
                      <p className="text-base font-semibold text-slate-700 mb-1">Auction Closed</p>
                      {(listing.currentBid ?? 0) > 0 && (
                        <p className="text-sm text-slate-500">Winning bid: ${(listing.currentBid ?? 0).toLocaleString()}/mo</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className={`flex items-center gap-2 mb-5 ${countdown.isUrgent ? 'countdown-urgent' : 'text-slate-600'}`}>
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold text-sm">{countdown.display} left</span>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-5 mb-5 border border-slate-100">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {listing.status === 'ended' ? 'Final Bid' : 'Current Highest Bid'}
                </p>
                <motion.div key={listing.currentBid} initial={{ scale: 1.05 }} animate={{ scale: 1 }}
                  className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">
                  ${(listing.currentBid ?? 0).toLocaleString()}<span className="text-lg font-normal text-slate-400">/mo</span>
                </motion.div>
                <p className="text-sm text-slate-400 mt-1">{listing.bidCount ?? 0} bid{(listing.bidCount ?? 0) !== 1 ? 's' : ''}</p>
              </div>

              <div className="flex justify-between text-sm text-slate-500 mb-5">
                <span>Starting bid</span>
                <span className="font-medium text-slate-700">${(listing.startingBid ?? 0).toLocaleString()}/mo</span>
              </div>

              {/* AI Bid Recommendation — students only, active auctions */}
              {listing.status !== 'ended' && !countdown.isExpired && user && user.role === 'student' && (
                <div className="mb-5">
                  {!recommendation && !recLoading && !recError && (
                    <button onClick={fetchRecommendation}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all">
                      <Sparkles className="w-4 h-4" /> Get AI Bid Recommendation
                    </button>
                  )}

                  {recLoading && (
                    <div className="animate-pulse space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <p className="text-xs text-slate-400 mt-2">Analyzing auction data...</p>
                    </div>
                  )}

                  {recError && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <p className="text-sm text-slate-500">Recommendation unavailable right now.</p>
                      <button onClick={fetchRecommendation} className="text-xs text-indigo-500 mt-1 hover:underline">Try again</button>
                    </div>
                  )}

                  {recommendation && !recLoading && (() => {
                    const COMP_STYLES = {
                      low:       { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  label: 'Low',       desc: 'Few bidders active. Good chance to win near minimum.' },
                      medium:    { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',    label: 'Medium',    desc: 'Moderate interest. A competitive bid should do well.' },
                      high:      { bar: 'bg-orange-500',  text: 'text-orange-700',   bg: 'bg-orange-50',   label: 'High',      desc: 'Multiple active bidders. Consider bidding above minimum.' },
                      very_high: { bar: 'bg-rose-500',    text: 'text-rose-700',     bg: 'bg-rose-50',     label: 'Very High', desc: 'Intense competition. Aggressive bid or Secure Lease recommended.' },
                    } as const;
                    const comp = COMP_STYLES[recommendation.competitionLevel];
                    const s = recommendation.signals;

                    return (
                    <div className="bg-white border-l-4 border-indigo-500 rounded-lg p-4 border border-slate-200 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-700">AI Bid Recommendation</span>
                      </div>

                      {/* Competition Level */}
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Competition Level</p>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                          <div className={`h-full rounded-full ${comp.bar}`} style={{ width: `${Math.max(15, recommendation.competitionScore)}%` }} />
                        </div>
                        <p className={`text-sm font-semibold ${comp.text}`}>{comp.label}</p>
                        <p className="text-xs text-slate-500">{comp.desc}</p>
                      </div>

                      {/* Price range */}
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          ${recommendation.recommendedMin.toLocaleString()} – ${recommendation.recommendedMax.toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span>
                        </p>
                        <p className="text-[11px] text-slate-400">Recommended bid range</p>
                      </div>

                      {/* Win probability rows */}
                      <div className="space-y-1.5">
                        {/* Minimum */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-slate-500">Minimum (${recommendation.recommendedMin.toLocaleString()}/mo)</span>
                            <span className="font-semibold text-slate-700">{recommendation.winProbAtMin}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-orange-400" style={{ width: `${recommendation.winProbAtMin}%` }} />
                          </div>
                        </div>

                        {/* Recommended — highlighted */}
                        <div className="bg-indigo-50/60 rounded-lg px-2 py-1.5 -mx-1">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-indigo-700 font-medium flex items-center gap-1">
                              Recommended (${recommendation.recommendedMid.toLocaleString()}/mo)
                              <span className="text-[9px] font-semibold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">BEST VALUE</span>
                            </span>
                            <span className="font-bold text-indigo-700">{recommendation.winProbAtMid}%</span>
                          </div>
                          <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${recommendation.winProbAtMid}%` }} />
                          </div>
                        </div>

                        {/* Aggressive */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-slate-500">Aggressive (${recommendation.recommendedMax.toLocaleString()}/mo)</span>
                            <span className="font-semibold text-slate-700">{recommendation.winProbAtMax}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${recommendation.winProbAtMax}%` }} />
                          </div>
                        </div>

                        {/* Secure Lease */}
                        {listing.secureLeasePrice && (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Secure Lease (${listing.secureLeasePrice.toLocaleString()}/mo)
                              </span>
                              <span className="font-semibold text-emerald-700">Guaranteed — no auction risk</span>
                            </div>
                            <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-700 w-full" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Urgency */}
                      {(recommendation.urgency === 'high' || recommendation.urgency === 'extreme') && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                          {recommendation.urgency === 'extreme' ? 'Auction ending very soon — place your bid now' : 'Act soon — auction closing in under 6 hours'}
                        </div>
                      )}

                      {/* Suggested action */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Suggested next step</p>
                        <p className="text-sm text-slate-700 mb-2">
                          Place a bid at <span className="font-semibold">${recommendation.recommendedMid.toLocaleString()}/mo</span>
                        </p>
                        <button onClick={() => openBidWithAmount(recommendation.recommendedMid)}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.98]">
                          Bid ${recommendation.recommendedMid.toLocaleString()}/mo
                        </button>
                      </div>

                      {/* Based on */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Recommendation based on</p>
                        <ul className="text-xs text-slate-500 space-y-0.5">
                          <li>{s.viewCount} student{s.viewCount !== 1 ? 's' : ''} viewed this listing</li>
                          <li>{s.activeBidders} active bidder{s.activeBidders !== 1 ? 's' : ''}</li>
                          <li>{s.hoursLeft < 1 ? 'Less than 1 hour' : `${Math.round(s.hoursLeft)}h`} remaining</li>
                          {s.p50 != null
                            ? <li>Similar listings close around ${s.p50.toLocaleString()}/mo ({recommendation.compsUsed} comp{recommendation.compsUsed !== 1 ? 's' : ''})</li>
                            : <li>No similar closed listings yet — based on live activity</li>
                          }
                        </ul>
                      </div>

                      {/* Insight */}
                      {recommendation.insight && (
                        <div className="flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-600">{recommendation.insight}</p>
                        </div>
                      )}

                      {/* Confidence */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${recommendation.confidence === 'high' ? 'bg-emerald-500' : recommendation.confidence === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        <span className="text-[11px] text-slate-400">{recommendation.confidenceNote}</span>
                      </div>

                      {/* Signals (collapsible) */}
                      <div>
                        <button onClick={() => setRecSignalsOpen(!recSignalsOpen)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                          <ChevronDown className={`w-3 h-3 transition-transform ${recSignalsOpen ? 'rotate-180' : ''}`} />
                          Auction signals
                        </button>
                        {recSignalsOpen && (
                          <ul className="mt-1 text-[11px] text-slate-400 space-y-0.5">
                            <li>{s.viewCount} views ({s.viewVelocity > 0 ? 'trending up' : 'steady'} interest)</li>
                            <li>{s.bidVelocity24h} bid{s.bidVelocity24h !== 1 ? 's' : ''} in the last 24 hours</li>
                            <li>Bid activity {s.recentMomentumPercent > 10 ? 'accelerating' : s.recentMomentumPercent > 0 ? 'steady' : 'slowing'} ({s.recentMomentumPercent > 0 ? '+' : ''}{s.recentMomentumPercent}%)</li>
                            {s.p25 != null && s.p75 != null && <li>Comparable listings close between ${s.p25.toLocaleString()} – ${s.p75.toLocaleString()}/mo</li>}
                          </ul>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 italic">{recommendation.disclaimer}</p>
                        <button onClick={fetchRecommendation} className="text-[10px] text-indigo-400 hover:text-indigo-600 font-medium">Refresh</button>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )}

              {/* Only show bid actions if auction is still active */}
              {listing.status !== 'ended' && !countdown.isExpired ? (
                user ? (
                  <>
                    <button onClick={() => setShowBidModal(true)}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-brand-600/20 active:scale-[0.98]">
                      Place a Bid
                    </button>

                    {/* Secure Lease Now */}
                    {listing.secureLeasePrice && (
                      <div className="mt-4">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider">or</span></div>
                        </div>
                        <button onClick={() => setShowSecureLeaseConfirm(true)}
                          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-semibold text-base transition-all hover:shadow-xl hover:shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" /> Secure Lease Now — ${listing.secureLeasePrice.toLocaleString()}/mo
                        </button>
                        <p className="text-xs text-slate-400 mt-2 text-center">Skip the auction. Pay ${listing.secureLeasePrice.toLocaleString()}/mo and the lease is yours immediately.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block text-center w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-semibold text-lg transition-all">
                      Sign in to Bid
                    </Link>
                    {listing.secureLeasePrice && (
                      <Link to="/login" className="block text-center w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" /> Log in to Secure Lease — ${listing.secureLeasePrice.toLocaleString()}/mo
                      </Link>
                    )}
                  </>
                )
              ) : listing.status !== 'ended' && (
                <p className="text-xs text-slate-400 mt-1 text-center">Minimum bid: ${((listing.currentBid ?? 0) + 25).toLocaleString()}/mo</p>
              )}
            </div>
            )}

            {/* Group Bidding Section */}
            {listing.status !== 'ended' && !countdown.isExpired && user && user.role !== 'landlord' && (
              <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Group Bidding</h3>
                </div>

                {bidGroup ? (
                  <div>
                    <div className="bg-brand-50 border border-brand-100 rounded-xl p-3.5 mb-3">
                      <p className="text-sm font-semibold text-brand-800">{bidGroup.name}</p>
                      <p className="text-xs text-brand-600 mt-0.5">{bidGroup.members.length} member{bidGroup.members.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      {bidGroup.members.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                          <span className="text-slate-700 truncate">{m.name ?? m.email}</span>
                          {m.status === 'accepted'
                            ? <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            : <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          }
                        </div>
                      ))}
                    </div>
                    {bidGroup.leaderId === user.id ? (
                      <button onClick={() => setShowGroupBidModal(true)}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                        <Users className="w-4 h-4" /> Place Group Bid
                      </button>
                    ) : (
                      <p className="text-xs text-slate-500 text-center">You're in {bidGroup.leaderName}'s group. Only the leader can place bids.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Invite roommates to bid together as a group.</p>
                    <button onClick={() => setShowCreateGroupModal(true)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" /> Create Group Bid
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Message Landlord Section */}
            {user && user.role !== 'landlord' && listing.landlordId !== user.id && (
              <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Message Landlord</h3>
                </div>

                {/* Thread */}
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

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Type a message..."
                    maxLength={1000}
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={msgSending || !msgInput.trim()}
                    className="px-3 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {!user && (
              <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 mt-4">
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

      {showBidModal && (
        <BidModal isOpen={showBidModal} onClose={() => { setShowBidModal(false); setBidPreFillAmount(undefined); }} listingId={listing.id}
          listingTitle={listing.title} currentBid={listing.currentBid ?? 0} onBidPlaced={fetchData}
          initialBidAmount={bidPreFillAmount} />
      )}

      {/* Secure Lease Confirmation Modal */}
      {showSecureLeaseConfirm && listing.secureLeasePrice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowSecureLeaseConfirm(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Secure This Lease?</h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                You are committing to pay <span className="font-semibold text-slate-900">${listing.secureLeasePrice.toLocaleString()}/mo</span>. This will end the auction immediately and you will be the winner.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-700 font-medium">Lease Price</span>
                <span className="text-lg font-bold text-emerald-800">${listing.secureLeasePrice.toLocaleString()}/mo</span>
              </div>
              <p className="text-xs text-emerald-600 mt-1">{listing.title}</p>
            </div>

            {secureLeaseError && (
              <div className="text-rose-600 text-sm mb-4 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">{secureLeaseError}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowSecureLeaseConfirm(false)}
                className="flex-1 py-3.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={handleSecureLease} disabled={secureLeaseLoading}
                className="flex-1 py-3.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98]">
                {secureLeaseLoading ? 'Securing...' : 'Confirm & Secure'}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4 text-center">By confirming, you agree to commit to this monthly rent.</p>
          </motion.div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          listingId={listing.id}
          onGroupCreated={fetchGroup}
        />
      )}

      {/* Group Bid Modal (reuses BidModal but submits to group endpoint) */}
      {showGroupBidModal && bidGroup && (
        <BidModal
          isOpen={showGroupBidModal}
          onClose={() => setShowGroupBidModal(false)}
          listingId={listing.id}
          listingTitle={listing.title}
          currentBid={listing.currentBid ?? 0}
          onBidPlaced={fetchData}
          groupId={bidGroup.id}
          groupName={bidGroup.name}
        />
      )}
    </div>
  );
}
