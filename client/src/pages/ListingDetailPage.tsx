import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Ruler, Clock, Heart, ChevronLeft, ChevronRight, User, GraduationCap } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import { useCountdown } from '../hooks/useCountdown';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import BidModal from '../components/BidModal';
import api from '../lib/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icons
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
  const { user } = useAuthStore();

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [listingRes, bidsRes] = await Promise.all([
        api.get(`/listings/${id}`),
        api.get(`/bids/listing/${id}`),
      ]);
      setListing(listingRes.data);
      setBids(bidsRes.data);
    } catch (error) {
      console.error('Failed to fetch listing');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (user && id) {
      api.get(`/favorites/check/${id}`).then(({ data }) => {
        setIsFavorited(data.isFavorited);
      }).catch(() => {});
    }
  }, [user, id]);

  // Socket.io real-time updates
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

    return () => {
      socket.emit('leave_listing', id);
      socket.off('bid_update');
    };
  }, [id]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    if (isFavorited) {
      await api.delete(`/favorites/${id}`);
    } else {
      await api.post(`/favorites/${id}`);
    }
    setIsFavorited(!isFavorited);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-2xl mb-6" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-6 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-700">Listing not found</h2>
        <Link to="/listings" className="text-electric-500 mt-4 inline-block">Back to listings</Link>
      </div>
    );
  }

  const countdown = useCountdown(listing.auctionEnd);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <Link to="/listings" className="text-gray-500 hover:text-gray-700 text-sm mb-4 inline-flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back to listings
      </Link>

      <div className="grid lg:grid-cols-3 gap-8 mt-4">
        {/* Left column - Photos & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 h-72 sm:h-96">
            <img
              src={listing.photos[photoIndex] || 'https://picsum.photos/800/600?grayscale'}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIndex((prev: number) => (prev - 1 + listing.photos.length) % listing.photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPhotoIndex((prev: number) => (prev + 1) % listing.photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {listing.photos.map((_: any, i: number) => (
                    <button key={i} onClick={() => setPhotoIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? 'bg-white w-5' : 'bg-white/60'}`} />
                  ))}
                </div>
              </>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              {listing.tags.map((tag: string) => (
                <span key={tag} className="bg-navy-900/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">{tag}</span>
              ))}
            </div>
          </div>

          {/* Title & Info */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{listing.title}</h1>
                <p className="text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {listing.address}, {listing.city}, {listing.state}
                </p>
              </div>
              {user && (
                <button onClick={toggleFavorite}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <Heart className={`w-6 h-6 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4 text-gray-600">
              <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Bed className="w-4 h-4" />
                {listing.beds === 0 ? 'Studio' : `${listing.beds} Bed${listing.beds > 1 ? 's' : ''}`}
              </span>
              <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Bath className="w-4 h-4" />
                {listing.baths} Bath{listing.baths > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Ruler className="w-4 h-4" />
                {listing.sqft} sqft
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold mb-2">About this property</h2>
            <p className="text-gray-600 leading-relaxed">{listing.description}</p>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {listing.amenities.map((amenity: string) => (
                <div key={amenity} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-electric-500" />
                  {amenity}
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Location</h2>
            <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
              <MapContainer center={[listing.lat, listing.lng]} zoom={15} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[listing.lat, listing.lng]} icon={icon}>
                  <Popup>{listing.title}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {listing.distanceToCampus} miles from {listing.nearestUniversity}
            </p>
          </div>

          {/* Landlord */}
          {listing.landlord && (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-navy-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{listing.landlord.name}</p>
                <p className="text-sm text-gray-500">{listing.landlord.university}</p>
              </div>
            </div>
          )}

          {/* Bid History */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Bid History ({bids.length})</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {bids.length === 0 ? (
                <p className="text-gray-500 text-sm">No bids yet. Be the first!</p>
              ) : (
                bids.map((bid, i) => (
                  <motion.div
                    key={bid.id}
                    initial={i === 0 ? { opacity: 0, x: -20 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${i === 0 ? 'bg-electric-50 border border-electric-100' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-navy-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {bid.userUniversity ? `Student from ${bid.userUniversity}` : bid.userName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(bid.timestamp).toLocaleString()}
                          {bid.isAutoBid && <span className="ml-1 text-electric-500">(auto-bid)</span>}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-navy-800">${bid.amount.toLocaleString()}</span>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Bid Panel (sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 p-6 ${bidPulse ? 'bid-pulse' : ''}`}>
              {/* Timer */}
              <div className={`flex items-center gap-2 mb-4 ${countdown.isUrgent ? 'countdown-urgent' : 'text-gray-600'}`}>
                <Clock className="w-5 h-5" />
                <span className="font-medium">
                  {countdown.isExpired ? 'Auction Ended' : `${countdown.display} left`}
                </span>
              </div>

              {/* Current Bid */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-500">Current Highest Bid</p>
                <motion.div
                  key={listing.currentBid}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-bold text-navy-800"
                >
                  ${listing.currentBid.toLocaleString()}<span className="text-lg font-normal text-gray-500">/mo</span>
                </motion.div>
                <p className="text-sm text-gray-400 mt-1">{listing.bidCount} bid{listing.bidCount !== 1 ? 's' : ''}</p>
              </div>

              {/* Starting bid info */}
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <span>Starting bid</span>
                <span className="font-medium">${listing.startingBid.toLocaleString()}/mo</span>
              </div>

              {/* Bid button */}
              {!countdown.isExpired ? (
                user ? (
                  user.role !== 'landlord' ? (
                    <button
                      onClick={() => setShowBidModal(true)}
                      className="w-full bg-electric-500 hover:bg-electric-600 text-white py-3.5 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-electric-500/25"
                    >
                      Place a Bid
                    </button>
                  ) : (
                    <p className="text-center text-gray-500 text-sm bg-gray-50 py-3 rounded-xl">Landlords cannot bid</p>
                  )
                ) : (
                  <Link
                    to="/login"
                    className="block text-center w-full bg-electric-500 hover:bg-electric-600 text-white py-3.5 rounded-xl font-semibold text-lg transition-colors"
                  >
                    Sign in to Bid
                  </Link>
                )
              ) : (
                <div className="text-center bg-gray-100 py-3 rounded-xl text-gray-600 font-medium">
                  Auction has ended
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3 text-center">
                Minimum bid: ${(listing.currentBid + 25).toLocaleString()}/mo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Modal */}
      <BidModal
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        listingId={listing.id}
        listingTitle={listing.title}
        currentBid={listing.currentBid}
        onBidPlaced={fetchData}
      />
    </div>
  );
}
