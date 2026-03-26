import { Link } from 'react-router-dom';
import { Clock, MapPin, Bed, Bath, Heart, ArrowUpRight } from 'lucide-react';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="bg-white rounded-2xl card-shadow hover:card-shadow-hover transition-all duration-300 overflow-hidden group"
    >
      {/* Photo */}
      <div className="relative h-52 overflow-hidden">
        <Link to={`/listing/${listing.id}`}>
          <img
            src={listing.photos[imgIndex] || 'https://picsum.photos/800/600?grayscale'}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </Link>

        {/* Photo dots */}
        {listing.photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {listing.photos.slice(0, 4).map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === imgIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5 hover:bg-white/80'}`}
              />
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {listing.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="glass-dark text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Favorite */}
        {onFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); onFavorite(listing.id); }}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm hover:shadow-md transition-all hover:scale-110 active:scale-95"
          >
            <Heart className={`w-4 h-4 transition-colors ${isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
          </button>
        )}

        {/* Countdown badge */}
        <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full
          ${countdown.isExpired ? 'bg-slate-800/80 text-slate-300' : countdown.isUrgent ? 'bg-rose-500 text-white' : 'glass-dark text-white'}`}>
          <Clock className="w-3 h-3" />
          {countdown.display}
        </div>
      </div>

      {/* Content */}
      <Link to={`/listing/${listing.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-brand-600 transition-colors">
            {listing.title}
          </h3>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 flex-shrink-0 mt-0.5" />
        </div>

        <div className="flex items-center gap-1 text-slate-500 text-sm mt-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{listing.address}, {listing.city}</span>
        </div>

        <div className="flex items-center gap-3 mt-3 text-sm text-slate-600">
          {listing.beds > 0 ? (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              {listing.beds} bed{listing.beds !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">Studio</span>
          )}
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5 text-slate-400" />
            {listing.baths} bath{listing.baths !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-400">&middot;</span>
          <span className="text-slate-400">{listing.sqft} sqft</span>
        </div>

        <p className="text-xs text-slate-400 mt-1.5">
          {listing.distanceToCampus} mi from {listing.nearestUniversity}
        </p>

        <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              ${listing.currentBid.toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{listing.bidCount} bid{listing.bidCount !== 1 ? 's' : ''}</div>
          </div>
          <span className="text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-colors">
            Bid Now
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
