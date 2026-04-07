import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <Logo size={28} />
              <span className="text-lg font-bold text-white">HouseRush</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              HouseRush is an online listing and information platform. We are not a real estate broker, agent, or property manager. We are not a party to any lease or transaction between students and landlords.
            </p>
          </div>

          {/* Platform links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/listings" className="hover:text-white transition-colors">Browse Listings</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/guides" className="hover:text-white transition-colors">Guides & Checklists</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-sm">
          <p>&copy; 2026 HouseRush. All rights reserved. Built for college students across America.</p>
        </div>
      </div>
    </footer>
  );
}
