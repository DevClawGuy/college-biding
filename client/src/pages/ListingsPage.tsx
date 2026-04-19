import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const towns = ['All', 'West Long Branch', 'Long Branch', 'Deal', 'Ocean Township', 'Oakhurst'];
const bedOptions = [
  { value: '', label: 'Any' }, { value: '0', label: 'Studio' },
  { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3+' },
];
const amenityOptions = ['Parking', 'Pet Friendly', 'Utilities Included', 'Furnished', 'Laundry'];
const sortOptions = [
  { value: 'ending_soonest', label: 'Ending Soon' },
  { value: 'price_asc', label: 'Lowest Price' },
  { value: 'price_desc', label: 'Highest Price' },
  { value: 'most_bids', label: 'Most Bids' },
];

export default function ListingsPage() {
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    town: searchParams.get('town') || '',
    sort: searchParams.get('sort') || 'ending_soonest',
    beds: searchParams.get('beds') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    amenities: [] as string[],
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  const updateFilter = (key: string, value: string | string[]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedFilters(next), 300);
  };

  const toggleAmenity = (a: string) => {
    const next = filters.amenities.includes(a) ? filters.amenities.filter(x => x !== a) : [...filters.amenities, a];
    updateFilter('amenities', next);
  };

  const clearFilters = () => {
    const cleared = { search: '', town: '', sort: 'ending_soonest', beds: '', minPrice: '', maxPrice: '', amenities: [] as string[] };
    setFilters(cleared);
    setDebouncedFilters(cleared);
  };

  const { data: listingsData, isLoading: loading } = useQuery({
    queryKey: ['listings', debouncedFilters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedFilters.search) params.set('search', debouncedFilters.search);
      if (debouncedFilters.town && debouncedFilters.town !== 'All') params.set('town', debouncedFilters.town);
      if (debouncedFilters.sort) params.set('sortBy', debouncedFilters.sort);
      if (debouncedFilters.beds) params.set('beds', debouncedFilters.beds);
      if (debouncedFilters.minPrice) params.set('minPrice', debouncedFilters.minPrice);
      if (debouncedFilters.maxPrice) params.set('maxPrice', debouncedFilters.maxPrice);
      if (debouncedFilters.amenities.length > 0) params.set('amenities', debouncedFilters.amenities.join(','));
      return api.get(`/listings?${params.toString()}`).then(r => r.data as any[]);
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/favorites').then(r => r.data as Array<{ id: string }>),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const listings = listingsData ?? [];
  const favorites = new Set((favoritesData ?? []).map((f: { id: string }) => f.id));

  const toggleFavorite = async (listingId: string) => {
    if (!user) return;
    if (favorites.has(listingId)) {
      await api.delete(`/favorites/${listingId}`);
    } else {
      await api.post(`/favorites/${listingId}`);
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  const activeFilterCount = [
    filters.town && filters.town !== 'All' ? filters.town : '',
    filters.beds, filters.minPrice, filters.maxPrice,
    ...filters.amenities,
  ].filter(Boolean).length;

  const pillClass = (active: boolean) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
    active ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Browse Listings</h1>
        <p className="text-slate-500 text-sm mt-1">Find your perfect off-campus home</p>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search by name, address, or description..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 card-shadow text-sm transition-all" />
          {filters.search && (
            <button onClick={() => updateFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}
            className="px-3 sm:px-4 py-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-brand-500/20 card-shadow text-sm min-w-0">
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 border rounded-2xl card-shadow text-sm font-medium transition-all whitespace-nowrap ${
              activeFilterCount > 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}>
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 card-shadow space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Filters</h3>
                <button onClick={clearFilters} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Clear all</button>
              </div>

              {/* Town */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Town</label>
                <div className="flex flex-wrap gap-2">
                  {towns.map(t => (
                    <button key={t} onClick={() => updateFilter('town', t === 'All' ? '' : t)}
                      className={pillClass(t === 'All' ? !filters.town : filters.town === t)}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Bedrooms</label>
                <div className="flex flex-wrap gap-2">
                  {bedOptions.map(b => (
                    <button key={b.value} onClick={() => updateFilter('beds', b.value)}
                      className={pillClass(filters.beds === b.value)}>{b.label}</button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Price Range ($/mo)</label>
                <div className="flex items-center gap-3">
                  <input type="number" value={filters.minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)}
                    className="flex-1 py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white" placeholder="Min" />
                  <span className="text-slate-300">&ndash;</span>
                  <input type="number" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)}
                    className="flex-1 py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white" placeholder="Max" />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {amenityOptions.map(a => (
                    <button key={a} onClick={() => toggleAmenity(a)}
                      className={pillClass(filters.amenities.includes(a))}>{a}</button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <p className="text-sm text-slate-400 mb-4 sm:mb-5">
        {loading ? '' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}
      </p>

      {/* Grid — 1 col mobile, 2 col sm, 3 col lg */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl card-shadow overflow-hidden">
              <div className="h-48 sm:h-52 skeleton" />
              <div className="p-4 sm:p-5 space-y-3">
                <div className="h-5 skeleton rounded-lg w-3/4" />
                <div className="h-4 skeleton rounded-lg w-1/2" />
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="h-6 skeleton rounded-lg w-24" />
                  <div className="h-9 skeleton rounded-xl w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 sm:py-24">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No listings found</h3>
          <p className="text-slate-500 mt-1.5 text-sm">Try adjusting your filters or search terms</p>
          <button onClick={clearFilters} className="mt-4 text-brand-600 hover:text-brand-700 font-semibold text-sm">Clear all filters</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} onFavorite={user ? toggleFavorite : undefined} isFavorited={favorites.has(listing.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
