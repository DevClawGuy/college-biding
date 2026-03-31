import { Link } from 'react-router-dom';
import { Search, Shield, TrendingUp, ArrowRight, CheckSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import Logo from '../components/Logo';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';

export default function HomePage() {
  const { user } = useAuthStore();
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    api.get('/listings?sort=ending_soonest').then(({ data }) => {
      setFeatured(data.slice(0, 3));
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        {/* Abstract background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-brand-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-brand-50 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-brand-50/50 to-transparent rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              Find Your
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 bg-clip-text text-transparent"> Off-Campus</span>
              <br />Home
            </h1>

            <p className="text-lg md:text-xl text-slate-500 mt-6 mb-10 max-w-2xl mx-auto leading-relaxed">
              The fastest way to secure off-campus student housing. Browse verified homes near your campus, place bids, and move in with confidence.
            </p>

            {/* Search bar */}
            <div className="max-w-xl mx-auto mb-10">
              <Link to="/listings" className="flex items-center gap-3 bg-white card-shadow hover:card-shadow-hover rounded-2xl px-5 py-4 transition-all group cursor-pointer">
                <Search className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                <span className="text-slate-400 text-left flex-1">Search by city, university, or address...</span>
                <span className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
                  Search
                </span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/listings"
                className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:shadow-xl hover:shadow-brand-600/20 active:scale-[0.98] flex items-center gap-2"
              >
                Browse Listings
                <ArrowRight className="w-4 h-4" />
              </Link>
              {!user && (
                <Link
                  to="/signup"
                  className="text-slate-600 hover:text-slate-900 px-8 py-3.5 rounded-xl font-semibold text-base transition-colors border border-slate-200 hover:border-slate-300 hover:bg-white"
                >
                  Create Account
                </Link>
              )}
            </div>
          </motion.div>

        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">How HouseRush Works</h2>
          <p className="text-slate-500 mt-3 max-w-lg mx-auto">Three simple steps to secure your perfect off-campus home.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Search, title: 'Browse Listings', desc: 'Find apartments and rooms near your campus. Filter by price, size, distance, and amenities.', step: '01' },
            { icon: TrendingUp, title: 'Place Your Bid', desc: 'Bid on properties you love. Set auto-bid to stay competitive without constant monitoring.', step: '02' },
            { icon: Shield, title: 'Win & Move In', desc: 'When the auction ends, connect with landlords to finalize the lease. Secure and transparent.', step: '03' },
          ].map(({ icon: Icon, title, desc, step }) => (
            <div key={title} className="bg-white rounded-2xl p-7 card-shadow hover:card-shadow-hover transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-5 right-5 text-4xl font-black text-slate-100 group-hover:text-brand-100 transition-colors">{step}</div>
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-brand-100 transition-colors">
                <Icon className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Ending Soon</h2>
              <p className="text-slate-500 mt-1">Don't miss these auctions about to close.</p>
            </div>
            <Link to="/listings?sort=ending_soonest" className="hidden sm:flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-semibold text-sm transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          <Link to="/listings?sort=ending_soonest" className="sm:hidden flex items-center justify-center gap-1.5 text-brand-600 font-semibold text-sm mt-6">
            View All Listings <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* Free Resources */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Free Student Resources</h2>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">Guides and checklists to help you navigate off-campus housing like a pro.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: CheckSquare, title: 'Move-In Essentials', desc: 'Everything you need to buy and bring when moving into your first apartment.' },
            { icon: AlertTriangle, title: 'Lease Red Flags', desc: 'Common lease clauses that have cost students thousands of dollars.' },
            { icon: ShieldAlert, title: 'Rental Scam Signs', desc: 'Protect yourself from fake listings and fraudulent landlords.' },
          ].map(({ icon: Icon, title, desc }) => (
            <Link key={title} to="/guides" className="bg-white rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-all duration-300 group border border-slate-100">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/guides" className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-semibold text-sm transition-colors">
            View All Guides <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-60 h-60 bg-white rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center px-4 py-20 relative">
          <div className="mx-auto mb-5 w-fit"><Logo size={48} /></div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Ready to find your place?</h2>
          <p className="text-brand-200 mb-8 text-lg">Join thousands of students already bidding on the best off-campus housing.</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-white text-brand-700 px-8 py-4 rounded-xl font-semibold text-base hover:bg-brand-50 transition-all hover:shadow-xl active:scale-[0.98]"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer is rendered globally in App layout */}
    </div>
  );
}
