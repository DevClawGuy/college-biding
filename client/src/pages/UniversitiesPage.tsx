import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, GraduationCap, MapPin, ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface University {
  id: number;
  name: string;
  city: string;
  state: string;
  zip: string | null;
  enrollment: number | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  activeListingCount: number;
}

export default function UniversitiesPage() {
  const { user } = useAuthStore();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchUniversities = async (searchTerm: string) => {
    setLoading(true);
    try {
      const { data } = await api.get('/universities', {
        params: { search: searchTerm, state: 'NJ', page: 1, limit: 28 },
      });
      setUniversities(data.universities ?? []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities('');
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUniversities(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Find Housing Near Your University</h1>
        <p className="text-slate-500 text-sm mt-1">Browse rental market data and available listings near every NJ campus</p>
      </div>

      {/* Search & State Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search universities..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 card-shadow text-sm transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* TODO: enable state filter when national expansion adds other states */}
        <select
          disabled
          className="px-3 sm:px-4 py-3 border border-slate-200 rounded-2xl bg-white card-shadow text-sm min-w-0 opacity-60 cursor-not-allowed"
        >
          <option value="NJ">New Jersey</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-400 mb-4 sm:mb-5">
        {loading ? '' : `${universities.length} universit${universities.length !== 1 ? 'ies' : 'y'} found`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl card-shadow overflow-hidden p-5 space-y-3">
              <div className="h-6 skeleton rounded-lg w-3/4" />
              <div className="h-4 skeleton rounded-lg w-1/2" />
              <div className="h-4 skeleton rounded-lg w-1/3" />
              <div className="pt-3 border-t border-slate-100">
                <div className="h-4 skeleton rounded-lg w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : universities.length === 0 ? (
        <div className="text-center py-20 sm:py-24">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No universities found</h3>
          <p className="text-slate-500 mt-1.5 text-sm">Try a different search term</p>
          <button onClick={() => setSearch('')} className="mt-4 text-brand-600 hover:text-brand-700 font-semibold text-sm">Clear search</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {universities.map((uni) => (
            <Link key={uni.id} to={`/universities/${uni.slug}`}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="bg-white rounded-2xl card-shadow hover:card-shadow-hover transition-all duration-300 p-5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-brand-600 transition-colors">
                    {uni.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-all group-hover:translate-x-0.5 flex-shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center gap-1 text-slate-500 text-sm mt-1.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{uni.city}, {uni.state}</span>
                </div>

                {uni.enrollment != null && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-1.5">
                    <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{uni.enrollment.toLocaleString()} students</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100">
                  {uni.activeListingCount > 0 ? (
                    <span className="text-sm font-medium text-emerald-600">
                      {uni.activeListingCount} listing{uni.activeListingCount !== 1 ? 's' : ''} near campus
                    </span>
                  ) : user?.role === 'student' ? (
                    <span className="text-sm text-slate-400">No listings yet</span>
                  ) : (
                    <span className="text-sm text-slate-400">Be the first to list</span>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
