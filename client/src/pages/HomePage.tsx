import { Link } from 'react-router-dom';
import { Search, Shield, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';

export default function HomePage() {
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    api.get('/listings?sort=ending_soonest').then(({ data }) => {
      setFeatured(data.slice(0, 3));
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-electric-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-electric-400 rounded-full blur-[150px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Bid on Your
              <span className="bg-gradient-to-r from-electric-400 to-electric-300 bg-clip-text text-transparent"> Dream Dorm</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              The first real-time auction platform for student housing. Find apartments near campus, place competitive bids, and win your perfect home.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/listings"
                className="bg-electric-500 hover:bg-electric-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-electric-500/25 flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                Browse Listings
              </Link>
              <Link
                to="/signup"
                className="border border-white/20 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-all"
              >
                Create Account
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16"
          >
            {[
              { label: 'Active Listings', value: '50+' },
              { label: 'Universities', value: '25+' },
              { label: 'Bids Placed', value: '1.2K+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-electric-400">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How DormBid Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Search, title: 'Browse Listings', desc: 'Find apartments and rooms near your campus. Filter by price, size, distance, and amenities.' },
            { icon: TrendingUp, title: 'Place Your Bid', desc: 'Bid on properties you love. Set auto-bid to stay competitive without constant monitoring.' },
            { icon: Shield, title: 'Win & Move In', desc: 'When the auction ends, winners connect with landlords to finalize the lease. Secure and transparent.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="w-14 h-14 bg-electric-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-7 h-7 text-electric-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Ending Soon</h2>
            <Link to="/listings?sort=ending_soonest" className="text-electric-500 hover:text-electric-600 font-medium text-sm">
              View All →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-navy-900 text-white py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <Zap className="w-10 h-10 text-electric-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to find your place?</h2>
          <p className="text-gray-400 mb-8">Join thousands of students already bidding on the best off-campus housing.</p>
          <Link
            to="/signup"
            className="inline-block bg-electric-500 hover:bg-electric-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm">
          <p>&copy; 2026 DormBid. The smart way to find student housing.</p>
        </div>
      </footer>
    </div>
  );
}
