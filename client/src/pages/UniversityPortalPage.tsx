import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, ShieldCheck, FileText, DollarSign, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../store/authStore';

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
  marketData: MarketDataItem[];
}

function bedroomLabel(n: number): string {
  if (n === 0) return 'Studio';
  if (n === 1) return '1 Bedroom';
  return `${n} Bedrooms`;
}

export default function UniversityPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [university, setUniversity] = useState<UniversityDetail | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const fetches: Promise<any>[] = [
      api.get(`/universities/${slug}`),
      api.get(`/universities/${slug}/listings`),
    ];

    Promise.all(fetches)
      .then(([uniRes, listRes]) => {
        setUniversity(uniRes.data);
        setListings(listRes.data ?? []);
      })
      .catch(() => {
        navigate('/universities', { replace: true });
      })
      .finally(() => setLoading(false));

    if (user?.role === 'student') {
      api.get('/favorites').then(({ data }) => {
        setFavorites(new Set(data.map((l: any) => l.id)));
      }).catch(() => {});
    }
  }, [slug, user]);

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

  const showLandlordCTA = !user || user.role === 'landlord';

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 py-16 px-4">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="h-4 skeleton rounded w-24 opacity-30" />
            <div className="h-10 skeleton rounded-lg w-2/3 opacity-30" />
            <div className="h-5 skeleton rounded w-1/2 opacity-30" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          <div>
            <div className="h-6 skeleton rounded-lg w-1/3 mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="min-w-[180px] bg-white rounded-2xl card-shadow p-5 space-y-3">
                  <div className="h-4 skeleton rounded w-2/3" />
                  <div className="h-8 skeleton rounded w-1/2" />
                  <div className="h-3 skeleton rounded w-full" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="h-6 skeleton rounded-lg w-1/4 mb-4" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl card-shadow overflow-hidden">
                  <div className="h-48 sm:h-52 skeleton" />
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="h-5 skeleton rounded-lg w-3/4" />
                    <div className="h-4 skeleton rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="h-6 skeleton rounded-lg w-1/3 mb-4" />
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl card-shadow p-5 space-y-3">
                  <div className="h-5 skeleton rounded w-1/3" />
                  <div className="h-4 skeleton rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!university) return null;

  const marketItems = university.marketData.filter(d => d.medianRent != null);

  return (
    <div>
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-60 h-60 bg-white rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <Link to="/universities" className="inline-flex items-center gap-1 text-brand-200 hover:text-white text-sm font-medium mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> All Universities
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{university.name}</h1>
          <p className="text-brand-200 mt-2 text-base sm:text-lg">
            Off-Campus Housing Portal · {university.city}, {university.state}
            {university.enrollment != null && ` · ${university.enrollment.toLocaleString()} students`}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 bg-white/95 text-brand-700 text-sm font-medium px-4 py-2 rounded-full">
            <span>✓</span> University portal — at no cost to {university.name}
          </div>

          {showLandlordCTA && (
            <div className="mt-6">
              <Link to="/create-listing" className="inline-flex items-center gap-2 border border-white/40 text-white hover:bg-white/10 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">
                List Your Property Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Section 2 — Market Data */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1">Rental Market Near {university.name}</h2>
          {marketItems.length > 0 ? (
            <>
              <div className="flex gap-4 overflow-x-auto pb-2 mt-5 snap-x snap-mandatory">
                {marketItems.map(d => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-w-[180px] snap-start bg-white rounded-2xl p-5 card-shadow flex-shrink-0"
                  >
                    <p className="text-sm text-slate-500">{bedroomLabel(d.bedroomCount)}</p>
                    <p className="text-2xl font-bold text-brand-700 mt-1">${(d.medianRent ?? 0).toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span></p>
                    <p className="text-xs text-slate-400 mt-2">Estimated area rent (HUD FMR, FY2026)</p>
                  </motion.div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">HUD Fair Market Rents are annual estimates of typical rent plus utilities for standard units in this area. Actual asking rents for specific properties may differ.</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-4">Market data coming soon for this area.</p>
          )}
        </section>

        {/* Section 3 — Listings */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1">Housing Near {university.name}</h2>
          {listings.length > 0 ? (
            <>
              <p className="text-slate-500 text-sm mt-1 mb-5">{listings.length} propert{listings.length !== 1 ? 'ies' : 'y'} available near campus</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {listings.map((listing: any) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onFavorite={user?.role === 'student' ? toggleFavorite : undefined}
                    isFavorited={favorites.has(listing.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl card-shadow border border-slate-100 mt-5">
              <p className="text-lg font-semibold text-slate-700">No listings yet near {university.name}</p>
              {showLandlordCTA && (
                <>
                  <p className="text-slate-500 mt-2 text-sm">Are you a landlord with property near here?</p>
                  <p className="text-slate-500 text-sm">List free on HouseRush and reach verified students directly.</p>
                  <Link to="/create-listing" className="inline-flex items-center gap-2 mt-5 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">
                    List Your Property Free <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          )}
        </section>

        {/* Section 4 — Student Resources */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1">Resources for {university.name} Students</h2>
          <p className="text-slate-500 text-sm mt-1 mb-5">Everything you need to navigate off-campus housing with confidence.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'Avoiding Rental Scams', desc: 'Learn how to spot fake listings and protect yourself from fraudulent landlords.', link: '/guides' },
              { icon: FileText, title: 'Lease Red Flags', desc: 'Common lease clauses that have cost students thousands of dollars.', link: '/guides' },
              { icon: DollarSign, title: 'Budgeting for Off-Campus Housing', desc: 'How to calculate your true cost of living off campus including utilities and fees.', link: '/guides' },
            ].map(card => (
              <Link key={card.title} to={card.link} className="bg-white rounded-2xl p-5 card-shadow hover:card-shadow-hover transition-all group">
                <card.icon className="w-6 h-6 text-brand-600 mb-3" />
                <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{card.title}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
              </Link>
            ))}
            <div className="bg-white rounded-2xl p-5 card-shadow">
              <Users className="w-6 h-6 text-slate-400 mb-3" />
              <h3 className="font-semibold text-slate-900">Roommate Matching</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Find compatible roommates near {university.name}.</p>
              <span className="inline-block mt-3 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">Coming Fall 2026</span>
            </div>
          </div>
        </section>

        {/* Section 5 — Landlord Footer CTA */}
        {showLandlordCTA && (
          <section className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800" />
            <div className="relative px-6 sm:px-10 py-10 text-center">
              <p className="text-xl sm:text-2xl font-bold text-white">Are you a landlord with property near {university.name}?</p>
              <p className="text-brand-200 mt-2 text-sm sm:text-base">List free. Reach verified students directly. No commissions, no fees.</p>
              <Link to="/create-listing" className="inline-flex items-center gap-2 mt-6 bg-white text-brand-700 hover:bg-brand-50 px-8 py-3.5 rounded-xl font-semibold text-base transition-all active:scale-[0.98]">
                List Your Property Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
