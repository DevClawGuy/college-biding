import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, ShieldCheck, FileText, DollarSign, Users, AlertTriangle, Eye, MapPin, Bed, Bath } from 'lucide-react';
import api from '../lib/api';
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
  primaryColor: string | null;
  secondaryColor: string | null;
  ipedsRoomBoardOncampus: number | null;
  ipedsHousingOffcampus: number | null;
  ipedsDataYear: number | null;
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

  const marketItems = university.marketData.filter(d => d.medianRent != null);
  const fmr2br = marketItems.find(d => d.bedroomCount === 2);
  const primaryColor = university.primaryColor ?? '#4f46e5';

  // Insight text computation
  let insightText: string | null = null;
  if (fmr2br?.medianRent && university.ipedsHousingOffcampus) {
    const uniEst = university.ipedsHousingOffcampus;
    const fmr = fmr2br.medianRent;
    const pctDiff = Math.round(Math.abs(uniEst - fmr) / fmr * 100);
    if (uniEst > fmr * 1.10) {
      insightText = `Heads up: ${university.name}'s official housing estimate is ${pctDiff}% higher than federal rent data for this area. You may have more aid budget remaining than you think.`;
    } else if (uniEst < fmr * 0.90) {
      insightText = `Heads up: ${university.name}'s official housing estimate is ${pctDiff}% lower than federal rent data for this area. Budget more than your financial aid letter suggests.`;
    }
  }

  // Average rent from listings
  const avgRent = listings.length > 0
    ? Math.round(listings.reduce((sum: number, l: any) => sum + (l.startingBid ?? 0), 0) / listings.length)
    : null;

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-900"
          style={heroBackground ? { background: heroBackground } : {}}
        />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-60 h-60 bg-white rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
          {/* Breadcrumb */}
          <Link to="/universities" className={`inline-flex items-center gap-1 text-sm font-medium mb-5 transition-colors ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-white/70 hover:text-white'}`}>
            <ChevronLeft className="w-4 h-4" /> All Universities
          </Link>

          {/* Badge */}
          <div className="text-center mb-4">
            <div
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)', color: isLight ? '#1e293b' : '#fff' }}
            >
              <span>✓</span> University portal — at no cost to {university.name}
            </div>
          </div>

          {/* Title */}
          <h1 className={`font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`} style={{ fontSize: 32 }}>{university.name}</h1>
          <p className={`mt-1.5 ${isLight ? 'text-slate-700' : 'text-white/75'}`} style={{ fontSize: 14 }}>
            Off-Campus Housing Portal · {university.city}, {university.state}
            {university.enrollment != null && ` · ${university.enrollment.toLocaleString()} students`}
          </p>

          {/* Insight callout in hero */}
          {insightText && (
            <div
              className="mt-5 flex items-start gap-3"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', padding: '1rem 1.25rem' }}
            >
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 8 }}>
                <AlertTriangle className="w-4 h-4" style={{ color: isLight ? '#1e293b' : '#fff' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, color: isLight ? '#1e293b' : '#fff', marginBottom: 4, fontWeight: 600 }}>Good to know</p>
                <p style={{ fontSize: 15, fontWeight: 500, color: isLight ? '#1e293b' : '#fff', lineHeight: 1.45 }}>{insightText}</p>
              </div>
            </div>
          )}

          {/* FMR pills in hero */}
          {marketItems.length > 0 && (
            <div className="mt-5">
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {marketItems.map(d => (
                  <div
                    key={d.id}
                    className="flex-shrink-0 text-center"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 14px' }}
                  >
                    <p style={{ fontSize: 11, opacity: 0.65, color: isLight ? '#1e293b' : '#fff' }}>{bedroomLabel(d.bedroomCount)}</p>
                    <p style={{ fontSize: 16, fontWeight: 500, color: isLight ? '#1e293b' : '#fff' }}>${(d.medianRent ?? 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10, opacity: 0.55, color: isLight ? '#1e293b' : '#fff', marginTop: 6 }}>Federal rent data (FY2026) — 40th percentile including utilities</p>
            </div>
          )}

          {/* Landlord CTA in hero */}
          {showLandlordCTA && (
            <div className="mt-6">
              <Link
                to="/create-listing"
                className="inline-flex items-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.7)', color: isLight ? '#1e293b' : '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500 }}
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

          {/* ═══ THREE-WAY COMPARISON ═══ */}
          {university.ipedsHousingOffcampus != null && (
            <section style={{ paddingTop: '1.75rem' }}>
              <h2 className="font-semibold text-slate-900 tracking-tight" style={{ fontSize: 20 }}>How does {university.name} compare?</h2>
              <p className="text-slate-500 mt-0.5 mb-4" style={{ fontSize: 13 }}>University estimate vs federal benchmark vs active listings</p>

              <div className="grid sm:grid-cols-3 gap-3">
                {/* University estimate */}
                <div className="bg-white rounded-lg p-4" style={{ border: '0.5px solid #e2e8f0' }}>
                  <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888', fontWeight: 600 }}>What {university.name} estimates</p>
                  <p className="mt-2" style={{ fontSize: 24, fontWeight: 500, color: '#1e293b' }}>
                    ${university.ipedsHousingOffcampus.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>/mo</span>
                  </p>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 4 }}>This is what {university.name} reports to the government as the typical cost of off-campus housing per month.</p>
                  {fmr2br?.medianRent && university.ipedsHousingOffcampus < fmr2br.medianRent * 0.90 && (
                    <span className="inline-block mt-2" style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 500 }}>Probably underestimated</span>
                  )}
                </div>

                {/* HUD benchmark */}
                {fmr2br?.medianRent != null && (
                  <div className="bg-white rounded-lg p-4" style={{ border: '0.5px solid #e2e8f0' }}>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#185FA5', fontWeight: 600 }}>Federal rent guide</p>
                    <p className="mt-2" style={{ fontSize: 24, fontWeight: 500, color: '#1e293b' }}>
                      ${fmr2br.medianRent.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>/mo</span>
                    </p>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 4 }}>The federal government's estimate of fair rent for a 2-bedroom in this area. A reliable reality check.</p>
                  </div>
                )}

                {/* HouseRush */}
                <div className="bg-white rounded-lg p-4" style={{ border: `2px solid ${primaryColor}` }}>
                  <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: primaryColor, fontWeight: 600 }}>Listed on HouseRush</p>
                  {avgRent != null ? (
                    <>
                      <p className="mt-2" style={{ fontSize: 24, fontWeight: 500, color: '#1e293b' }}>
                        ${avgRent.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>/mo</span>
                      </p>
                      <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 4 }}>Average rent from properties currently listed near campus on HouseRush.</p>
                      {fmr2br?.medianRent && avgRent < fmr2br.medianRent && (
                        <span className="inline-block mt-2" style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 500 }}>Great deal</span>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-slate-400" style={{ fontSize: 16, fontWeight: 500 }}>No listings yet</p>
                      <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 4 }}>Be the first to list near {university.name}</p>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 italic mt-3">University estimates are self-reported to the US Department of Education each year. Federal rent data represents the 40th percentile of actual rents in this county. HouseRush figures reflect active listings only.</p>
            </section>
          )}

          {/* Divider */}
          <div style={{ height: '0.5px', background: '#e2e8f0', marginTop: '1.75rem' }} />

          {/* ═══ LISTINGS ═══ */}
          <section style={{ paddingTop: '1.75rem' }}>
            <h2 className="font-semibold text-slate-900 tracking-tight" style={{ fontSize: 20 }}>Housing Near {university.name}</h2>
            {listings.length > 0 ? (
              <>
                <p className="text-slate-500 mt-0.5 mb-4" style={{ fontSize: 13 }}>{listings.length} propert{listings.length !== 1 ? 'ies' : 'y'} available near campus</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {listings.map((listing: any) => {
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
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg mt-4" style={{ border: '0.5px solid #e2e8f0' }}>
                <p className="text-base font-medium text-slate-700">No listings yet near {university.name}</p>
                {showLandlordCTA && (
                  <>
                    <p className="text-slate-500 mt-1.5 text-xs">Are you a landlord with property near here?</p>
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

          {/* Divider */}
          <div style={{ height: '0.5px', background: '#e2e8f0', marginTop: '1.75rem' }} />

          {/* ═══ RESOURCES ═══ */}
          <section style={{ paddingTop: '1.75rem' }}>
            <h2 className="font-semibold text-slate-900 tracking-tight" style={{ fontSize: 20 }}>Resources for {university.name} Students</h2>
            <p className="text-slate-500 mt-0.5 mb-4" style={{ fontSize: 13 }}>Everything you need to navigate off-campus housing with confidence.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, title: 'Avoiding Rental Scams', desc: 'Learn how to spot fake listings and protect yourself from fraudulent landlords.', link: '/guides' },
                { icon: FileText, title: 'Lease Red Flags', desc: 'Common lease clauses that have cost students thousands of dollars.', link: '/guides' },
                { icon: DollarSign, title: 'Budgeting for Off-Campus Housing', desc: 'How to calculate your true cost of living off campus including utilities and fees.', link: '/guides' },
              ].map(card => (
                <Link key={card.title} to={card.link} className="bg-white rounded-lg p-4 flex gap-2.5 items-start transition-all hover:shadow-sm cursor-pointer" style={{ border: '0.5px solid #e2e8f0' }}>
                  <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9' }}>
                    <card.icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{card.title}</h3>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 2 }}>{card.desc}</p>
                  </div>
                </Link>
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
                  <p style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>Are you a landlord with property near {university.name}?</p>
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
