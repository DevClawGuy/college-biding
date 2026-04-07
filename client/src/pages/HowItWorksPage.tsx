import { Link } from 'react-router-dom';
import { UserPlus, Search, TrendingUp, Trophy, FileText, Building, Clock, DollarSign, Shield, Users, Eye, Zap } from 'lucide-react';

const studentSteps = [
  { icon: UserPlus, title: 'Create Your Free Account', desc: 'Sign up with your .edu email to get a verified student badge. It takes less than a minute.' },
  { icon: Search, title: 'Browse Verified Listings', desc: 'Search verified properties near your campus. Filter by price, size, distance, and amenities.' },
  { icon: TrendingUp, title: 'Express Interest', desc: 'Tell landlords you\'re interested. Submit your move-in date, group size, and a note. No binding commitment required.' },
  { icon: Trophy, title: 'Connect & Move In', desc: 'Landlords review interested students and reach out directly to finalize the lease. Simple, transparent, and fair.' },
  { icon: FileText, title: 'Sign Your Lease & Move In', desc: 'Connect with the landlord, finalize your lease, and move into your new off-campus home.' },
];

const landlordSteps = [
  { icon: Building, title: 'Post Your Listing', desc: 'Sign up as a landlord, then create a listing with photos, description, amenities, and address.' },
  { icon: DollarSign, title: 'Set Your Price', desc: 'Set your monthly rent price and list your property. Students will reach out directly when they are interested.' },
  { icon: Clock, title: 'Review Interested Students', desc: 'See exactly which students are interested, their move-in dates, group size, and a personal note. You choose who to contact.' },
  { icon: Users, title: 'Connect With Your Tenant', desc: 'Reach out directly to the student you want. No middleman, no fees, no commission.' },
  { icon: FileText, title: 'Sign the Lease', desc: 'Contact the winning student, sign the lease agreement, and welcome your new tenant.' },
];

const whyReasons = [
  { icon: TrendingUp, title: 'See Real Demand', desc: 'See exactly how many students are interested in your property before you choose a tenant.' },
  { icon: Shield, title: 'Verified Student Renters', desc: 'Every .edu email is verified. Landlords can trust that interested students are real.' },
  { icon: Eye, title: 'Free to List', desc: 'Listing your property on HouseRush is completely free. No subscription, no commission, no hidden fees.' },
  { icon: Zap, title: 'Free for Students', desc: 'Creating an account, browsing listings, and placing bids is completely free for students.' },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">How HouseRush Works</h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">The smartest way to find and fill off-campus housing near your campus.</p>
      </div>

      {/* For Students */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-brand-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">For Students</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {studentSteps.map((step, i) => (
            <div key={step.title} className="bg-white rounded-2xl p-6 card-shadow border border-slate-100 relative">
              <div className="absolute top-5 right-5 text-3xl font-black text-slate-100">{String(i + 1).padStart(2, '0')}</div>
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                <step.icon className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/signup" className="inline-block bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-brand-600/20">
            Create Free Student Account
          </Link>
        </div>
      </section>

      {/* For Landlords */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Building className="w-5 h-5 text-slate-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">For Landlords</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {landlordSteps.map((step, i) => (
            <div key={step.title} className="bg-white rounded-2xl p-6 card-shadow border border-slate-100 relative">
              <div className="absolute top-5 right-5 text-3xl font-black text-slate-100">{String(i + 1).padStart(2, '0')}</div>
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <step.icon className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/signup" className="inline-block bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-all">
            Create Landlord Account
          </Link>
        </div>
      </section>

      {/* Why HouseRush */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Why HouseRush?</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {whyReasons.map((r) => (
            <div key={r.title} className="bg-gradient-to-br from-brand-50 to-white rounded-2xl p-6 border border-brand-100">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                <r.icon className="w-5 h-5 text-brand-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{r.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
