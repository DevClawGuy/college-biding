import { Link } from 'react-router-dom';
import { Clock, MapPin, Bed, Bath, Heart } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    photos: string[];
    beds: number;
    baths: number;
    sqft: number;
    currentBid: number;
    bidCount: number;
    auctionEnd: string;
    distanceToCampus: number;
    nearestUniversity: string;
    tags: string[];
    startingBid: number;
  };
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export default function ListingCard({ listing, onFavorite, isFavorited }: ListingCardProps) {
  const countdown = useCountdown(listing.auctionEnd);
  const [imgIndex, setImgIndex] = useState(0);
  const [bidAnimating] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
    >
      {/* Photo */}
      <div className="relative h-48 overflow-hidden">
        <Link to={`/listing/${listing.id}`}>
          <img
            src={listing.photos[imgIndex] || 'https://picsum.photos/800/600?grayscale'}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Photo dots */}
        {listing.photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {listing.photos.slice(0, 4).map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-3' : 'bg-white/60'}`}
              />
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {listing.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="bg-navy-900/80 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>

        {/* Favorite */}
        {onFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); onFavorite(listing.id); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
          </button>
        )}

        {/* Countdown */}
        <div className={`absolute bottom-2 right-2 flex items-center gap-1 text-xs px-2 py-1 rounded-full backdrop-blur-sm
          ${countdown.isExpired ? 'bg-gray-800/80 text-gray-300' : countdown.isUrgent ? 'bg-red-500/90 text-white' : 'bg-navy-900/80 text-white'}`}>
          <Clock className="w-3 h-3" />
          {countdown.display}
        </div>
      </div>

      {/* Content */}
      <Link to={`/listing/${listing.id}`} className="block p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-electric-600 transition-colors">
          {listing.title}
        </h3>

        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{listing.address}, {listing.city}</span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
          {listing.beds > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" />
              {listing.beds} {listing.beds === 1 ? 'bed' : 'beds'}
            </span>
          )}
          {listing.beds === 0 && <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">Studio</span>}
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {listing.baths} {listing.baths === 1 ? 'bath' : 'baths'}
          </span>
          <span className="text-gray-400">{listing.sqft} sqft</span>
        </div>

        <div className="text-xs text-gray-400 mt-1">
          {listing.distanceToCampus} mi from {listing.nearestUniversity}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div>
            <div className={`text-lg font-bold text-navy-800 ${bidAnimating ? 'bid-flip' : ''}`}>
              ${listing.currentBid.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span>
            </div>
            <div className="text-xs text-gray-400">{listing.bidCount} bid{listing.bidCount !== 1 ? 's' : ''}</div>
          </div>
          <span className="text-sm bg-electric-50 text-electric-600 px-3 py-1.5 rounded-lg font-medium hover:bg-electric-100 transition-colors">
            Bid Now
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
