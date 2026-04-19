import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ArrowRight, ShieldCheck, FileText, DollarSign, Users, Info, Eye, MapPin, Bed, Bath, ShoppingCart, Bus, Coffee, Bike, CreditCard, Pill, Shirt, Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface MarketDataItem {
  id: number;
  bedroomCount: number;
  medianRent: number | null;
  dataYear: number | null;
  dataSource: string | null;
  updatedAt: string;
}

interface UniversityDetail {
  id: number;
  name: string;
  city: string;
  state: string;
  zip: string | null;
  enrollment: number | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  ipedsRoomBoardOncampus: number | null;
  ipedsHousingOffcampus: number | null;
  ipedsDataYear: number | null;
  zoriLatest: number | null;
  zori12moAgo: number | null;
  zoriYoYPct: number | null;
  zoriUpdatedAt: string | null;
  heroImageUrl: string | null;
  marketData: MarketDataItem[];
}

function bedroomLabel(n: number): string {
  if (n === 0) return 'Studio';
  if (n === 1) return '1BR';
  return `${n}BR`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = 0.2126 * (rgb.r / 255) + 0.7152 * (rgb.g / 255) + 0.0722 * (rgb.b / 255);
  return luminance > 0.5;
}

function darkenHex(hex: string, amount = 40): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, rgb.r - amount);
  const g = Math.max(0, rgb.g - amount);
  const b = Math.max(0, rgb.b - amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function getRentCheckDisplay(_score: number, label: string) {
  const labelMap: Record<string, string> = {
    great_deal: 'Great deal', good_value: 'Good value', at_market: 'Fair price',
    above_market: 'Above market', expensive: 'Expensive',
  };
  return labelMap[label] ?? '';
}

export default function UniversityPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateColor = (location.state as { primaryColor?: string } | null)?.primaryColor ?? null;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBeds, setSelectedBeds] = useState('any');
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [isRentDataOpen, setIsRentDataOpen] = useState(false);

  const { data: university, isLoading: uniLoading, isError: uniError } = useQuery({
    queryKey: ['university', slug],
    queryFn: () => api.get(`/universities/${slug}`).then(r => r.data as UniversityDetail),
    staleTime: 1000 * 60 * 5,
    enabled: !!slug,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['university-listings', slug],
    queryFn: () => api.get(`/universities/${slug}/listings`).then(r => r.data as any[]),
    staleTime: 1000 * 60 * 2,
    enabled: !!slug,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/favorites').then(r => r.data as Array<{ id: string }>),
    enabled: !!user && user.role === 'student',
    staleTime: 1000 * 60 * 2,
  });

  const listings = listingsData ?? [];
  const favorites = new Set((favoritesData ?? []).map((f: { id: string }) => f.id));
  const loading = uniLoading || listingsLoading;

  // Redirect on error
  if (uniError) {
    navigate('/universities', { replace: true });
  }

  const toggleFavorite = async (listingId: string) => {
    if (!user) return;
    if (favorites.has(listingId)) {
      await api.delete(`/favorites/${listingId}`);
    } else {
      await api.post(`/favorites/${listingId}`);
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  const showLandlordCTA = !user || user.role === 'landlord';

  const heroBackground = university?.primaryColor
    ? `linear-gradient(135deg, ${university.primaryColor} 0%, ${darkenHex(university.primaryColor)} 100%)`
    : null;

  const isLight = university?.primaryColor
    ? isLightColor(university.primaryColor)
    : false;

  // Add noindex for non-NJ portals
  useEffect(() => {
    if (!university) return;
    const existing = document.querySelector('meta[name="robots"]');
    if (existing) existing.remove();
    if (university.state !== 'NJ') {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
    }
    return () => {
      const el = document.querySelector('meta[name="robots"]');
      if (el) el.remove();
    };
  }, [university]);

  // Derived values (safe to compute even when university is null)
  const marketItems = university?.marketData.filter(d => d.medianRent != null) ?? [];
  const fmr2br = marketItems.find(d => d.bedroomCount === 2);
  const primaryColor = university?.primaryColor ?? stateColor ?? '#2a2a2a';

  const avgRent = listings.length > 0
    ? Math.round(listings.reduce((sum: number, l: any) => sum + (l.startingBid ?? 0), 0) / listings.length)
    : null;

  const toggleAmenityFilter = (a: string) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBeds('any');
    setMinPrice(null);
    setMaxPrice(null);
    setSelectedAmenities([]);
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || selectedBeds !== 'any' || minPrice != null || maxPrice != null || selectedAmenities.length > 0;

  const filteredListings = useMemo(() => {
    let result = [...listings];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.title ?? '').toLowerCase().includes(q) ||
        (l.address ?? '').toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q)
      );
    }

    if (selectedBeds !== 'any') {
      if (selectedBeds === 'studio') result = result.filter(l => l.beds === 0);
      else if (selectedBeds === '3+') result = result.filter(l => l.beds >= 3);
      else result = result.filter(l => l.beds === Number(selectedBeds));
    }

    if (minPrice != null) result = result.filter(l => (l.startingBid ?? 0) >= minPrice);
    if (maxPrice != null) result = result.filter(l => (l.startingBid ?? 0) <= maxPrice);

    if (selectedAmenities.length > 0) {
      result = result.filter(l => {
        const listAmenities: string[] = Array.isArray(l.amenities) ? l.amenities : [];
        return selectedAmenities.every(a => listAmenities.some((la: string) => la.toLowerCase().includes(a.toLowerCase())));
      });
    }

    if (sortBy === 'price_asc') result.sort((a, b) => (a.startingBid ?? 0) - (b.startingBid ?? 0));
    else if (sortBy === 'price_desc') result.sort((a, b) => (b.startingBid ?? 0) - (a.startingBid ?? 0));
    else if (sortBy === 'rentcheck') result.sort((a, b) => (b.rentcheckScore ?? 0) - (a.rentcheckScore ?? 0));
    else result.sort((a, b) => ((b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1));

    return result;
  }, [listings, searchQuery, selectedBeds, minPrice, maxPrice, selectedAmenities, sortBy]);

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="py-16 px-4" style={{ background: stateColor ? `linear-gradient(135deg, ${stateColor} 0%, ${darkenHex(stateColor)} 100%)` : 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)' }}>
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="h-4 skeleton rounded w-24 opacity-30" />
            <div className="h-10 skeleton rounded-lg w-2/3 opacity-30" />
            <div className="h-5 skeleton rounded w-1/2 opacity-30" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          <div>
            <div className="h-6 skeleton rounded-lg w-1/3 mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 space-y-3" style={{ border: '0.5px solid #e2e8f0' }}>
                  <div className="h-3 skeleton rounded w-1/2" />
                  <div className="h-7 skeleton rounded w-2/3" />
                  <div className="h-3 skeleton rounded w-full" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="h-6 skeleton rounded-lg w-1/4 mb-4" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden" style={{ border: '0.5px solid #e2e8f0' }}>
                  <div className="h-44 skeleton" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 skeleton rounded w-3/4" />
                    <div className="h-3 skeleton rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!university) return null;

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden min-h-[480px] flex flex-col justify-center">
        {/* Layer 1: Campus photo (when available) */}
        {university.heroImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${university.heroImageUrl})` }}
          />
        )}
        {/* Layer 2: Color overlay */}
        <div
          className={`absolute inset-0 ${university.heroImageUrl ? 'opacity-[0.82]' : ''}`}
          style={{ background: heroBackground ?? (stateColor ? `linear-gradient(135deg, ${stateColor} 0%, ${darkenHex(stateColor)} 100%)` : 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)') }}
        />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-60 h-60 bg-white rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white rounded-full blur-[100px]" />
        </div>
        {/* Drifting name ticker */}
        <div className="absolute bottom-0 left-0 right-0 h-9 overflow-hidden pointer-events-none z-0">
          <div className="whitespace-nowrap animate-[drift-right_35s_linear_infinite]">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <span key={i} className="inline-block pr-[60px] text-[22px] font-black leading-9 tracking-[-0.01em] text-white/[0.08]">
                {university.name}
              </span>
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative z-10">
          {/* Breadcrumb */}
          <Link to="/universities" className={`inline-flex items-center gap-1 text-sm font-medium mb-5 transition-colors ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-white/70 hover:text-white'}`}>
            <ChevronLeft className="w-4 h-4" /> All Universities
          </Link>

          {/* Title */}
          <h1 className={`text-7xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{university.name}</h1>
          <p className={`mt-1.5 text-lg ${isLight ? 'text-slate-700' : 'text-white/75'}`}>
            Off-Campus Housing Portal · {university.city}, {university.state}
            {university.enrollment != null && ` · ${university.enrollment.toLocaleString()} students`}
          </p>

          {/* Housing Provider CTA in hero */}
          {showLandlordCTA && (
            <div className="mt-6">
              <Link
                to="/create-listing"
                className="inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              >
                List Your Property Free <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ BODY ═══ */}
      <div style={{ background: '#f8f9fb', padding: '0 1.5rem 2rem' }}>
        <div className="max-w-5xl mx-auto">

          {/* ═══ LISTINGS ═══ */}
          <section style={{ paddingTop: '1.75rem' }}>
            <h2 className="font-semibold text-slate-900 tracking-tight" style={{ fontSize: 20 }}>Housing Near {university.name}</h2>
            {listings.length > 0 ? (
              <>
                {/* Search + Sort row */}
                <div className="flex items-center gap-2 mt-3 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search listings..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-lg"
                      style={{ border: '0.5px solid #e2e8f0', outline: 'none' }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                        <X className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white rounded-lg transition-all"
                    style={{ border: `0.5px solid ${showFilters || hasActiveFilters ? primaryColor : '#e2e8f0'}`, color: showFilters || hasActiveFilters ? primaryColor : '#64748b' }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filters{hasActiveFilters ? ' ·' : ''}
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 text-sm bg-white rounded-lg"
                    style={{ border: '0.5px solid #e2e8f0', color: '#64748b', outline: 'none' }}
                  >
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="rentcheck">Best Deal</option>
                  </select>
                </div>

                {/* Expanded filters */}
                {showFilters && (
                  <div className="bg-white rounded-lg p-4 mb-3 space-y-3" style={{ border: '0.5px solid #e2e8f0' }}>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bedrooms</p>
                      <div className="flex gap-1.5">
                        {[{ v: 'any', l: 'Any' }, { v: 'studio', l: 'Studio' }, { v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3+', l: '3+' }].map(o => (
                          <button key={o.v} onClick={() => setSelectedBeds(o.v)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                            style={{ background: selectedBeds === o.v ? primaryColor : '#f1f5f9', color: selectedBeds === o.v ? '#fff' : '#64748b' }}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price Range</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="Min $/mo" value={minPrice ?? ''} onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
                          className="w-28 px-2.5 py-1.5 text-xs bg-white rounded-md" style={{ border: '0.5px solid #e2e8f0', outline: 'none' }} />
                        <span className="text-slate-300">—</span>
                        <input type="number" placeholder="Max $/mo" value={maxPrice ?? ''} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                          className="w-28 px-2.5 py-1.5 text-xs bg-white rounded-md" style={{ border: '0.5px solid #e2e8f0', outline: 'none' }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amenities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['Parking', 'Pet Friendly', 'Utilities Included', 'Furnished', 'Laundry'].map(a => (
                          <button key={a} onClick={() => toggleAmenityFilter(a)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                            style={{ background: selectedAmenities.includes(a) ? primaryColor : '#f1f5f9', color: selectedAmenities.includes(a) ? '#fff' : '#64748b' }}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="text-xs font-medium transition-colors" style={{ color: primaryColor }}>Clear all filters</button>
                    )}
                  </div>
                )}

                <p className="text-slate-500 mb-3" style={{ fontSize: 13 }}>{filteredListings.length} propert{filteredListings.length !== 1 ? 'ies' : 'y'} {hasActiveFilters ? 'found' : 'available near campus'}</p>

                {filteredListings.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredListings.map((listing: any) => {
                    const rcLabel = listing.rentcheckScore != null && listing.rentcheckLabel ? getRentCheckDisplay(listing.rentcheckScore, listing.rentcheckLabel) : null;
                    const ppb = listing.pricePerBed as number | null;
                    const fmrBeds = listing.fmrForBeds as number | null;
                    const beds = listing.beds ?? 1;
                    let fmrPctText: string | null = null;
                    let fmrPctBelow = false;
                    if (ppb != null && fmrBeds != null) {
                      const fmrPerBed = Math.round(fmrBeds / Math.max(beds, 1));
                      if (fmrPerBed > 0) {
                        const pct = Math.round(Math.abs(ppb - fmrPerBed) / fmrPerBed * 100);
                        fmrPctBelow = ppb < fmrPerBed * 0.98;
                        fmrPctText = ppb < fmrPerBed * 0.98 ? `${pct}% below average rent` : ppb > fmrPerBed * 1.02 ? `${pct}% above average rent` : 'At market';
                      }
                    }

                    return (
                      <Link key={listing.id} to={`/listing/${listing.id}`} className="bg-white rounded-lg overflow-hidden transition-all hover:shadow-md" style={{ border: '0.5px solid #e2e8f0' }}>
                        {/* Image with price overlay */}
                        <div className="relative" style={{ height: 176 }}>
                          <img
                            src={listing.photos?.[0] || 'https://picsum.photos/800/600?grayscale'}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between" style={{ padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }}>
                            <p style={{ fontSize: 20, fontWeight: 500, color: '#fff' }}>
                              ${(listing.currentBid ?? listing.startingBid ?? 0).toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400 }}>/mo</span>
                            </p>
                            {rcLabel && (
                              <span style={{ background: 'rgba(59,109,17,0.9)', color: '#fff', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>{rcLabel}</span>
                            )}
                          </div>
                          {/* Favorite */}
                          {user?.role === 'student' && (
                            <button
                              onClick={(e) => { e.preventDefault(); toggleFavorite(listing.id); }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white transition-all"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.has(listing.id) ? '#f43f5e' : 'none'} stroke={favorites.has(listing.id) ? '#f43f5e' : '#64748b'} strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="p-3">
                          <h3 className="font-medium text-slate-900 truncate" style={{ fontSize: 15 }}>{listing.title}</h3>
                          <div className="flex items-center gap-1 mt-1" style={{ fontSize: 13, color: '#64748b' }}>
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{listing.address}, {listing.city}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 13, color: '#64748b' }}>
                            <Bed className="w-3 h-3" /> {listing.beds} bed{listing.beds !== 1 ? 's' : ''}
                            <span>·</span>
                            <Bath className="w-3 h-3" /> {listing.baths} bath{listing.baths !== 1 ? 's' : ''}
                            <span>·</span>
                            {listing.sqft} sqft
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: '0.5px solid #e2e8f0' }}>
                            <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#64748b' }}>
                              {ppb != null && <span>${ppb}/bed</span>}
                              {fmrPctText && (
                                <>
                                  <span>·</span>
                                  <span style={{ color: fmrPctBelow ? '#3B6D11' : '#64748b', fontWeight: fmrPctBelow ? 500 : 400 }}>{fmrPctText}</span>
                                </>
                              )}
                              {(listing.viewCount ?? 0) > 0 && (
                                <>
                                  <span>·</span>
                                  <Eye className="w-3 h-3" /> {listing.viewCount}
                                </>
                              )}
                            </div>
                            <span style={{ background: primaryColor, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500 }}>View</span>
                          </div>
                          {/* Nearby amenity icons */}
                          {(() => {
                            if (!listing.nearbyAmenities) return null;
                            let nearby: Array<{ category: string }>;
                            try { nearby = typeof listing.nearbyAmenities === 'string' ? JSON.parse(listing.nearbyAmenities) : listing.nearbyAmenities; } catch { return null; }
                            if (!nearby || nearby.length === 0) return null;
                            const catIcons: Record<string, { icon: typeof ShoppingCart; label: string }> = {
                              grocery: { icon: ShoppingCart, label: 'Grocery' },
                              laundry: { icon: Shirt, label: 'Laundry' },
                              transit: { icon: Bus, label: 'Transit' },
                              pharmacy: { icon: Pill, label: 'Pharmacy' },
                              cafe: { icon: Coffee, label: 'Cafe' },
                              bike: { icon: Bike, label: 'Bike' },
                              atm: { icon: CreditCard, label: 'ATM' },
                            };
                            const cats = [...new Set(nearby.map(n => n.category))].slice(0, 5);
                            return (
                              <div className="flex items-center gap-1.5 mt-2">
                                {cats.map(cat => {
                                  const cfg = catIcons[cat];
                                  if (!cfg) return null;
                                  const Icon = cfg.icon;
                                  return <span key={cat} title={cfg.label}><Icon className="w-4 h-4" style={{ color: '#94a3b8' }} /></span>;
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                ) : (
                  <div className="text-center py-10 bg-white rounded-lg" style={{ border: '0.5px solid #e2e8f0' }}>
                    <p className="text-sm font-medium text-slate-700">No listings match your filters.</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search.</p>
                    <button onClick={clearFilters} className="mt-3 text-xs font-medium" style={{ color: primaryColor }}>Clear filters</button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg mt-4" style={{ border: '0.5px solid #e2e8f0' }}>
                <p className="text-base font-medium text-slate-700">No listings yet near {university.name}</p>
                {showLandlordCTA && (
                  <>
                    <p className="text-slate-500 mt-1.5 text-xs">Are you a housing provider with property near here?</p>
                    <Link
                      to="/create-listing"
                      className="inline-flex items-center gap-2 mt-4 text-white transition-all"
                      style={{ background: primaryColor, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}
                    >
                      List Your Property Free <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </>
                )}
              </div>
            )}
          </section>

          {/* ═══ DATA CARDS ═══ */}
          {(fmr2br?.medianRent != null || listings.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              {fmr2br?.medianRent != null && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Federal Rent Guide</p>
                  <p className="mt-2 text-2xl font-medium text-slate-900">
                    ${fmr2br.medianRent.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">2-bedroom estimate for this county. Rent only, no utilities. Updated annually by HUD.</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4" style={{ border: `1.5px solid ${primaryColor}` }}>
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: primaryColor }}>Listed on HouseRush</p>
                {avgRent != null ? (
                  <>
                    <p className="mt-2 text-2xl font-medium text-slate-900">
                      ${avgRent.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Average rent from {listings.length} active listing{listings.length !== 1 ? 's' : ''} near campus.</p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-base font-medium text-slate-400">No listings yet</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Be the first to list near {university.name}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '0.5px', background: '#e2e8f0', marginTop: '1.75rem' }} />

          {/* ═══ RENT DATA & GOOD TO KNOW ACCORDION ═══ */}
          {(marketItems.length > 0 || (university.ipedsHousingOffcampus != null && university.ipedsHousingOffcampus > 0)) && (
            <section style={{ paddingTop: '1.75rem' }}>
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '0.5px solid #e2e8f0' }}>
                <button
                  onClick={() => setIsRentDataOpen(!isRentDataOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500" />
                    Rent Data & Good to Know
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isRentDataOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isRentDataOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                  <div className="px-4 pb-4 grid sm:grid-cols-2 gap-4">
                    {/* Left: Good to Know */}
                    {university.ipedsHousingOffcampus != null && university.ipedsHousingOffcampus > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Good to Know</p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {university.name} estimates ${university.ipedsHousingOffcampus.toLocaleString()}/mo for a student's off-campus housing and food combined. The federal rent guide shows rent-only costs for this area. Your actual rent will likely fall somewhere in between — use both numbers to build your budget.
                        </p>
                      </div>
                    )}
                    {/* Right: FMR bedroom breakdown */}
                    {marketItems.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">FMR by Bedroom</p>
                        <div className="flex flex-wrap gap-2">
                          {marketItems.map(d => (
                            <div key={d.id} className="bg-gray-50 rounded-lg px-3 py-1.5 text-center">
                              <p className="text-[10px] text-slate-400">{bedroomLabel(d.bedroomCount)}</p>
                              <p className="text-sm font-medium text-slate-900">${(d.medianRent ?? 0).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Federal rent data (FY2026) — 40th percentile including utilities</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Divider */}
          <div style={{ height: '0.5px', background: '#e2e8f0', marginTop: '1.75rem' }} />

          {/* ═══ RESOURCES ═══ */}
          <section style={{ paddingTop: '1.75rem' }}>
            <h2 className="font-semibold text-slate-900 tracking-tight" style={{ fontSize: 20 }}>Resources for {university.name} Students</h2>
            <p className="text-slate-500 mt-0.5 mb-4" style={{ fontSize: 13 }}>Everything you need to navigate off-campus housing with confidence.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, title: 'Avoiding Rental Scams', desc: 'Learn how to spot fake listings and protect yourself from fraudulent housing providers.' },
                { icon: FileText, title: 'Lease Red Flags', desc: 'Common lease clauses that have cost students thousands of dollars.' },
                { icon: DollarSign, title: 'Budgeting for Off-Campus Housing', desc: 'How to calculate your true cost of living off campus including utilities and fees.' },
              ].map(card => (
                <button key={card.title} onClick={() => navigate('/guides', { state: { fromUniversity: { slug: university.slug, name: university.name } } })} className="bg-white rounded-lg p-4 flex gap-2.5 items-start transition-all hover:shadow-sm cursor-pointer text-left" style={{ border: '0.5px solid #e2e8f0' }}>
                  <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9' }}>
                    <card.icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{card.title}</h3>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 2 }}>{card.desc}</p>
                  </div>
                </button>
              ))}
              <div className="bg-white rounded-lg p-4 flex gap-2.5 items-start" style={{ border: '0.5px solid #e2e8f0' }}>
                <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9' }}>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>Roommate Matching</h3>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 2 }}>Find compatible roommates near {university.name}.</p>
                  <span className="inline-block mt-2 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100" style={{ fontSize: 10 }}>Coming Fall 2026</span>
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: '0.5px', background: '#e2e8f0', marginTop: '1.75rem' }} />

          {/* ═══ LANDLORD CTA ═══ */}
          {showLandlordCTA && (
            <section style={{ paddingTop: '1.75rem' }}>
              <div className="relative overflow-hidden rounded-lg text-center" style={{ padding: '1.5rem' }}>
                <div
                  className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800"
                  style={heroBackground ? { background: heroBackground } : {}}
                />
                <div className="relative">
                  <p style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>Are you a housing provider with property near {university.name}?</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>List free. Reach verified students directly. No commissions, no fees.</p>
                  <Link
                    to="/create-listing"
                    className="inline-flex items-center gap-2 mt-4 transition-all hover:opacity-90"
                    style={{ background: '#fff', color: primaryColor, border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 500 }}
                  >
                    List Your Property Free <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
