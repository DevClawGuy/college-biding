import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Ruler, Clock, Heart, ChevronLeft, ChevronRight, GraduationCap, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useCountdown } from '../hooks/useCountdown';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import BidModal from '../components/BidModal';
import api from '../lib/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showBidModal, setShowBidModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [bidPulse, setBidPulse] = useState(false);
  const [extensionToast, setExtensionToast] = useState(false);
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

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('join_listing', id);
    socket.on('bid_update', (data) => {
      if (data.listingId === id) {
        setListing((prev: any) => prev ? { ...prev, currentBid: data.currentBid, bidCount: data.bidCount } : prev);
        setBids((prev) => [data.bid, ...prev]);
        setBidPulse(true);
        setTimeout(() => setBidPulse(false), 1000);
      }
    });
    socket.on('auction_ended', (data) => {
      if (data.listingId === id) {
        setListing((prev: any) => prev ? { ...prev, status: 'ended', winnerId: data.winnerId, winner: data.winnerName ? { name: data.winnerName } : null } : prev);
        if (user && data.winnerId === user.id && !confettiFired.current) {
          confettiFired.current = true;
          setTimeout(() => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }), 300);
        }
      }
    });
    socket.on('auction_extended', (data) => {
      if (data.listingId === id) {
        setListing((prev: any) => prev ? { ...prev, auctionEnd: data.newAuctionEnd } : prev);
        setExtensionToast(true);
        setTimeout(() => setExtensionToast(false), 6000);
      }
    });
    return () => { socket.emit('leave_listing', id); socket.off('bid_update'); socket.off('auction_ended'); socket.off('auction_extended'); };
  }, [id]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    try {
      if (isFavorited) await api.delete(`/favorites/${id}`);
      else await api.post(`/favorites/${id}`);
      setIsFavorited(!isFavorited);
    } catch { /* */ }
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
              ) : safeBids.map((bid: any, i: number) => {
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

              {/* Only show bid actions if auction is still active */}
              {listing.status !== 'ended' && !countdown.isExpired ? (
                user ? (
                  user.role !== 'landlord' ? (
                    <button onClick={() => setShowBidModal(true)}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-brand-600/20 active:scale-[0.98]">
                      Place a Bid
                    </button>
                  ) : <p className="text-center text-slate-500 text-sm bg-slate-50 py-3.5 rounded-xl border border-slate-100">Landlords cannot bid</p>
                ) : (
                  <Link to="/login" className="block text-center w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-semibold text-lg transition-all">
                    Sign in to Bid
                  </Link>
                )
              ) : listing.status !== 'ended' && (
                <p className="text-xs text-slate-400 mt-1 text-center">Minimum bid: ${((listing.currentBid ?? 0) + 25).toLocaleString()}/mo</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showBidModal && (
        <BidModal isOpen={showBidModal} onClose={() => setShowBidModal(false)} listingId={listing.id}
          listingTitle={listing.title} currentBid={listing.currentBid ?? 0} onBidPlaced={fetchData} />
      )}
    </div>
  );
}
