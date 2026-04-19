import { Link } from 'react-router-dom';
import { Search, Shield, TrendingUp, ArrowRight, CheckSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import Logo from '../components/Logo';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function HomePage() {
  const { user } = useAuthStore();
  useScrollReveal();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-1.5 bg-[#f0fdf9] border border-[rgba(0,212,180,0.25)] rounded-full px-3 py-1 text-xs font-medium text-[#00a896] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4b4]" />
              2,716 university portals nationwide
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#111111] leading-[1.08]">
              Find Your
              <span className="text-[#00d4b4]"> Off-Campus</span>
              <br />Home
            </h1>

            <p className="text-lg md:text-xl text-[#666666] mt-6 mb-10 max-w-2xl mx-auto leading-relaxed">
              The smartest way to find off-campus housing near your campus. Browse listings from verified users, find your perfect home, and move in with confidence.
            </p>

            {/* Search bar */}
            <div className="max-w-xl mx-auto mb-10">
              <Link to="/listings" className="flex items-center gap-3 bg-white border border-[#eeeeee] rounded-2xl px-5 py-4 transition-all group cursor-pointer hover:shadow-md">
                <Search className="w-5 h-5 text-[#999999] group-hover:text-[#00d4b4] transition-colors" />
                <span className="text-[#999999] text-left flex-1">Search by city, university, or address...</span>
                <span className="bg-[#00d4b4] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#00a896] transition-colors">
                  Search
                </span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/listings"
                className="bg-[#111111] hover:bg-[#222222] text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:shadow-xl active:scale-[0.98] flex items-center gap-2"
              >
                Browse Listings
                <ArrowRight className="w-4 h-4" />
              </Link>
              {!user && (
                <Link
                  to="/signup"
                  className="text-[#666666] hover:text-[#111111] px-8 py-3.5 rounded-xl font-semibold text-base transition-colors border border-[#eeeeee] hover:border-[#cccccc] hover:bg-white"
                >
                  Create Account
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stat Strip */}
      <section className="bg-[#fafafa] border-y border-[#eeeeee]">
        <div className="max-w-3xl mx-auto px-8 py-5">
          <div className="grid grid-cols-3 text-center">
            <div className="border-r border-[#eeeeee]">
              <p className="text-xl font-bold text-[#111111]">2,716</p>
              <p className="text-xs uppercase tracking-wider text-[#999999] mt-1">University portals</p>
            </div>
            <div className="border-r border-[#eeeeee]">
              <p className="text-xl font-bold text-[#00d4b4]">Free</p>
              <p className="text-xs uppercase tracking-wider text-[#999999] mt-1">For students</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#111111]">HUD</p>
              <p className="text-xs uppercase tracking-wider text-[#999999] mt-1">Verified rent data</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] tracking-tight">How HouseRush Works</h2>
            <p className="text-[#666666] mt-3 max-w-lg mx-auto">Simple, transparent, and free for everyone.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: 'Browse Listings', desc: 'Search verified properties near your campus. Filter by price, size, distance, and amenities.', step: '01' },
              { icon: TrendingUp, title: 'Express Interest', desc: 'Tell housing providers you\'re interested. Submit your move-in date, group size, and a note. No binding commitment required.', step: '02' },
              { icon: Shield, title: 'Connect & Move In', desc: 'Housing providers review interested students and reach out directly to finalize the lease. Simple, transparent, and fair.', step: '03' },
            ].map(({ icon: Icon, title, desc, step }, i) => (
              <div key={title} className={`bg-white border border-[#eeeeee] rounded-xl p-7 hover:shadow-md transition-all duration-300 group relative overflow-hidden reveal reveal-delay-${i + 1}`}>
                <div className="absolute top-5 right-5 text-4xl font-black text-[#eeeeee] group-hover:text-[#f0fdf9] transition-colors">{step}</div>
                <div className="w-12 h-12 bg-[#f0fdf9] border border-[rgba(0,212,180,0.2)] rounded-lg flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-[#00d4b4]" />
                </div>
                <h3 className="text-lg font-semibold text-[#111111] mb-2">{title}</h3>
                <p className="text-[#888888] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Resources */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-24">
        <div className="text-center mb-10 reveal">
          <h2 className="text-2xl md:text-3xl font-bold text-[#111111] tracking-tight">Free Student Resources</h2>
          <p className="text-[#666666] mt-2 max-w-lg mx-auto">Guides and checklists to help you navigate off-campus housing like a pro.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: CheckSquare, title: 'Move-In Essentials', desc: 'Everything you need to buy and bring when moving into your first apartment.' },
            { icon: AlertTriangle, title: 'Lease Red Flags', desc: 'Common lease clauses that have cost students thousands of dollars.' },
            { icon: ShieldAlert, title: 'Rental Scam Signs', desc: 'Protect yourself from fake listings and fraudulent housing providers.' },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Link key={title} to="/guides" className={`bg-white border border-[#eeeeee] rounded-xl p-6 hover:shadow-md transition-all duration-300 group reveal reveal-delay-${i + 1}`}>
              <div className="w-10 h-10 bg-[#f0fdf9] border border-[rgba(0,212,180,0.2)] rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[#00d4b4]" />
              </div>
              <h3 className="font-semibold text-[#111111] mb-1.5">{title}</h3>
              <p className="text-sm text-[#888888] leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8 reveal">
          <Link to="/guides" className="inline-flex items-center gap-1.5 text-[#00d4b4] hover:text-[#00a896] font-semibold text-sm transition-colors">
            View All Guides <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Landlord Section */}
      <section className="bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="reveal">
              <span className="text-sm font-semibold text-[#00d4b4]">For housing providers</span>
              <h2 className="text-2xl md:text-3xl font-bold text-[#111111] tracking-tight mt-2">Own a property near a campus?</h2>
              <p className="text-[#666666] mt-3 leading-relaxed">List free and reach verified students searching for housing right now. No commissions, no fees — ever.</p>
              <Link
                to={user?.role === 'landlord' ? '/create-listing' : '/signup?role=landlord'}
                className="inline-flex items-center gap-2 bg-[#00d4b4] hover:bg-[#00a896] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-6"
              >
                List your property free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center reveal reveal-delay-2">
              <div>
                <p className="text-3xl font-bold text-[#111111]">2,716</p>
                <p className="text-sm text-[#999999] mt-1">University portals</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#111111]">Free</p>
                <p className="text-sm text-[#999999] mt-1">Always free to list</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#111111]">$0</p>
                <p className="text-sm text-[#999999] mt-1">No commissions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#111111]">
        <div className="max-w-3xl mx-auto text-center px-4 py-20 reveal">
          <div className="mx-auto mb-5 w-fit"><Logo size={48} /></div>
          {!user ? (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Ready to find your place?</h2>
              <p className="text-[#888888] mb-8 text-lg">Free for students. Free to list for housing providers.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup" className="inline-flex items-center gap-2 bg-[#00d4b4] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-[#00a896] transition-all hover:shadow-xl active:scale-[0.98]">
                  Find housing near my campus <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/signup?role=landlord" className="inline-flex items-center gap-2 border border-[#00d4b4]/40 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/10 transition-all active:scale-[0.98]">
                  List my property free <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          ) : user.role === 'student' ? (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Find housing near your campus</h2>
              <p className="text-[#888888] mb-8 text-lg">Browse listings and rent data for every university in America.</p>
              <Link to="/universities" className="inline-flex items-center gap-2 bg-[#00d4b4] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-[#00a896] transition-all hover:shadow-xl active:scale-[0.98]">
                Browse universities <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Ready to list your property?</h2>
              <p className="text-[#888888] mb-8 text-lg">Reach verified students near your campus. Free, no commissions.</p>
              <Link to="/create-listing" className="inline-flex items-center gap-2 bg-[#00d4b4] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-[#00a896] transition-all hover:shadow-xl active:scale-[0.98]">
                List your property free <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
