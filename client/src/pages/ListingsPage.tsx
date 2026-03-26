import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../store/authStore';

const cities = ['All Cities', 'Boston', 'Cambridge', 'Austin', 'Los Angeles', 'New York', 'Chicago', 'Evanston'];
const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'ending_soonest', label: 'Ending Soon' },
  { value: 'lowest_bid', label: 'Lowest Bid' },
];

export default function ListingsPage() {
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    city: searchParams.get('city') || '',
    sort: searchParams.get('sort') || 'ending_soonest',
    beds: searchParams.get('beds') || '',
    baths: searchParams.get('baths') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    maxDistance: searchParams.get('maxDistance') || '',
  });

  useEffect(() => { fetchListings(); }, [filters]);

  useEffect(() => {
    if (user) {
      api.get('/favorites').then(({ data }) => {
        setFavorites(new Set(data.map((l: any) => l.id)));
      }).catch(() => {});
    }
  }, [user]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.city && filters.city !== 'All Cities') params.set('city', filters.city);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.beds) params.set('beds', filters.beds);
      if (filters.baths) params.set('baths', filters.baths);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.maxDistance) params.set('maxDistance', filters.maxDistance);
      const { data } = await api.get(`/listings?${params.toString()}`);
      setListings(data);
    } catch { /* */ } finally { setLoading(false); }
  };

  const updateFilter = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters({ search: '', city: '', sort: 'ending_soonest', beds: '', baths: '', minPrice: '', maxPrice: '', maxDistance: '' });

  const toggleFavorite = async (listingId: string) => {
    if (!user) return;
    if (favorites.has(listingId)) {
      await api.delete(`/favorites/${listingId}`);
      setFavorites(prev => { const next = new Set(prev); next.delete(listingId); return next; });
    } else {
      await api.post(`/favorites/${listingId}`);
      setFavorites(prev => new Set(prev).add(listingId));
    }
  };

  const activeFilterCount = [filters.city, filters.beds, filters.baths, filters.minPrice, filters.maxPrice, filters.maxDistance]
    .filter(v => v && v !== 'All Cities').length;

  const filterInputClass = "w-full py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Browse Listings</h1>
        <p className="text-slate-500 text-sm mt-1">Find your perfect off-campus home</p>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search by name, address, or description..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 card-shadow text-sm transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-brand-500/20 card-shadow text-sm">
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-2xl card-shadow text-sm font-medium transition-all ${
              activeFilterCount > 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-900">Filter Listings</h3>
                <button onClick={clearFilters} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Clear all</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">City</label>
                  <select value={filters.city} onChange={(e) => updateFilter('city', e.target.value)} className={filterInputClass}>
                    {cities.map(c => <option key={c} value={c === 'All Cities' ? '' : c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Beds</label>
                  <select value={filters.beds} onChange={(e) => updateFilter('beds', e.target.value)} className={filterInputClass}>
                    <option value="">Any</option><option value="0">Studio</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Baths</label>
                  <select value={filters.baths} onChange={(e) => updateFilter('baths', e.target.value)} className={filterInputClass}>
                    <option value="">Any</option><option value="1">1+</option><option value="2">2+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Max Distance (mi)</label>
                  <input type="number" value={filters.maxDistance} onChange={(e) => updateFilter('maxDistance', e.target.value)} className={filterInputClass} placeholder="e.g. 2" step="0.5" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Min Price</label>
                  <input type="number" value={filters.minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)} className={filterInputClass} placeholder="$0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Max Price</label>
                  <input type="number" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} className={filterInputClass} placeholder="$5000" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <p className="text-sm text-slate-400 mb-5">
        {loading ? '' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl card-shadow overflow-hidden">
              <div className="h-52 skeleton" />
              <div className="p-5 space-y-3">
                <div className="h-5 skeleton rounded-lg w-3/4" />
                <div className="h-4 skeleton rounded-lg w-1/2" />
                <div className="h-4 skeleton rounded-lg w-2/3" />
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="h-6 skeleton rounded-lg w-24" />
                  <div className="h-9 skeleton rounded-xl w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No listings found</h3>
          <p className="text-slate-500 mt-1.5 text-sm">Try adjusting your filters or search terms</p>
          <button onClick={clearFilters} className="mt-4 text-brand-600 hover:text-brand-700 font-semibold text-sm">Clear all filters</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onFavorite={user ? toggleFavorite : undefined} isFavorited={favorites.has(listing.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
