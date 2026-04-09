import { Link } from 'react-router-dom';
import { Clock, MapPin, Bed, Bath, Heart, ArrowUpRight, Eye } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';
import { motion } from 'framer-motion';
import { useState } from 'react';

type HeatTier = 'none' | 'warm' | 'hot' | 'fire';

function getHeatmapTier(listing: ListingCardProps['listing']): HeatTier {
  // Bid count score (0-40)
  const bids = listing.bidCount ?? 0;
  let bidScore: number;
  if (bids >= 10) bidScore = 40;
  else if (bids >= 6) bidScore = 33;
  else if (bids >= 3) bidScore = 25;
  else if (bids >= 1) bidScore = 15;
  else bidScore = 0;

  // Time urgency score (0-35)
  const hoursLeft = listing.auctionEnd
    ? Math.max(0, (new Date(listing.auctionEnd).getTime() - Date.now()) / 3600000)
    : Infinity;
  let timeScore: number;
  if (hoursLeft < 6) timeScore = 35;
  else if (hoursLeft < 24) timeScore = 28;
  else if (hoursLeft < 72) timeScore = 20;
  else if (hoursLeft < 168) timeScore = 10;
  else timeScore = 0;

  // Price trajectory score (0-25)
  const start = listing.startingBid ?? 0;
  const current = listing.currentBid ?? 0;
  const pctAbove = start > 0 ? ((current - start) / start) * 100 : 0;
  let priceScore: number;
  if (pctAbove >= 16) priceScore = 25;
  else if (pctAbove >= 6) priceScore = 16;
  else if (pctAbove >= 1) priceScore = 8;
  else priceScore = 0;

  const total = bidScore + timeScore + priceScore;
  if (total >= 76) return 'fire';
  if (total >= 51) return 'hot';
  if (total >= 26) return 'warm';
  return 'none';
}

const HEAT_GLOW: Record<Exclude<HeatTier, 'none'>, { border: string; duration: string }> = {
  warm: { border: 'border-indigo-400', duration: '2.5s' },
  hot:  { border: 'border-orange-400', duration: '1.5s' },
  fire: { border: 'border-red-500',    duration: '0.8s' },
};

function getRentCheckBadge(
  score: number,
  label: string,
  pricePerBed: number,
  beds: number,
  fmrForBeds: number
) {
  const stars = Math.round(score);

  const labelMap: Record<string, string> = {
    great_deal: 'Great deal', good_value: 'Good value', at_market: 'Fair price',
    above_market: 'Above market', expensive: 'Expensive',
  };
  const colorMap: Record<string, string> = {
    great_deal: 'text-green-700', good_value: 'text-green-600', at_market: 'text-slate-500',
    above_market: 'text-amber-600', expensive: 'text-red-600',
  };
  const bgMap: Record<string, string> = {
    great_deal: 'bg-green-50', good_value: 'bg-green-50', at_market: 'bg-slate-50',
    above_market: 'bg-amber-50', expensive: 'bg-red-50',
  };

  const fmrPerBed = Math.round(fmrForBeds / Math.max(beds, 1));
  const pctDiff = fmrPerBed > 0 ? Math.round(Math.abs(pricePerBed - fmrPerBed) / fmrPerBed * 100) : 0;

  let priceDiff: string;
  if (pricePerBed < fmrPerBed * 0.98) priceDiff = `${pctDiff}% below FMR`;
  else if (pricePerBed > fmrPerBed * 1.02) priceDiff = `${pctDiff}% above FMR`;
  else priceDiff = 'At market rate';

  return {
    stars,
    labelText: labelMap[label] ?? 'Unknown',
    colorClass: colorMap[label] ?? 'text-slate-500',
    bgClass: bgMap[label] ?? 'bg-slate-50',
    priceDiff,
  };
}

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
    viewCount?: number;
    rentcheckScore?: number | null;
    rentcheckLabel?: string | null;
    pricePerBed?: number | null;
    fmrForBeds?: number | null;
  };
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export default function ListingCard({ listing, onFavorite, isFavorited }: ListingCardProps) {
  const countdown = useCountdown(listing.auctionEnd);
  const [imgIndex, setImgIndex] = useState(0);
  const heatTier = getHeatmapTier(listing);

  return (
    <div className="relative rounded-2xl">
      {/* Glow ring — pulses independently, behind card */}
      {heatTier !== 'none' && (
        <div
          className={`absolute -inset-[3px] rounded-2xl border-2 ${HEAT_GLOW[heatTier].border} animate-pulse pointer-events-none z-0`}
          style={{ animationDuration: HEAT_GLOW[heatTier].duration }}
        />
      )}
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative z-10 bg-white rounded-2xl card-shadow hover:card-shadow-hover transition-all duration-300 overflow-hidden group"
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

        {/* Heat badge */}
        {heatTier === 'hot' && (
          <span className="absolute top-3 right-14 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full z-10">
            🔥 Hot
          </span>
        )}
        {heatTier === 'fire' && (
          <span className="absolute top-3 right-14 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full z-10">
            🔥 On Fire
          </span>
        )}

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
            {(listing.viewCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{listing.viewCount}</span>
              </div>
            )}
            {listing.rentcheckScore != null && listing.rentcheckLabel && listing.pricePerBed != null && listing.fmrForBeds != null && (() => {
              const rc = getRentCheckBadge(listing.rentcheckScore, listing.rentcheckLabel, listing.pricePerBed, listing.beds, listing.fmrForBeds);
              return (
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium mt-1.5 ${rc.bgClass}`}>
                  <span className={`flex items-center gap-0.5 ${rc.colorClass}`}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="8" height="8" viewBox="0 0 8 8">
                        {i < rc.stars
                          ? <circle cx="4" cy="4" r="3" fill="currentColor" />
                          : <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        }
                      </svg>
                    ))}
                  </span>
                  <span className={rc.colorClass}>{rc.labelText}</span>
                  <span className="text-slate-400">&middot;</span>
                  <span className="text-slate-600">${listing.pricePerBed}/bed</span>
                  <span className="text-slate-400">&middot;</span>
                  <span className={rc.colorClass}>{rc.priceDiff}</span>
                </div>
              );
            })()}
          </div>
          <span className="text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-colors">
            View Property
          </span>
        </div>
      </Link>
    </motion.div>
    </div>
  );
}
