import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import DashboardPage from './pages/DashboardPage';
import CreateListingPage from './pages/CreateListingPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HowItWorksPage from './pages/HowItWorksPage';
import ContactPage from './pages/ContactPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ParentViewPage from './pages/ParentViewPage';
import GuidesPage from './pages/GuidesPage';
import UniversitiesPage from './pages/UniversitiesPage';
import UniversityPortalPage from './pages/UniversityPortalPage';
import Logo from './components/Logo';
import { useAuthStore } from './store/authStore';
import { getSocket } from './lib/socket';

function AppContent() {
  const { user, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      const socket = getSocket();
      socket.emit('join_user', user.id);
      // TODO: add leave_user on tab close
      return () => {
        socket.emit('leave_user', user.id);
      };
    }
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/parent-view" element={<ParentViewPage />} />
      <Route path="*" element={
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/listings" element={<ListingsPage />} />
              <Route path="/listing/:id" element={<ListingDetailPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/create-listing" element={<CreateListingPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/guides" element={<GuidesPage />} />
              <Route path="/universities" element={<UniversitiesPage />} />
              {/* NJ slug redirects — old URLs without -nj suffix */}
              <Route path="/universities/rutgers-new-brunswick" element={<Navigate to="/universities/rutgers-new-brunswick-nj" replace />} />
              <Route path="/universities/rowan-university" element={<Navigate to="/universities/rowan-university-nj" replace />} />
              <Route path="/universities/montclair-state-university" element={<Navigate to="/universities/montclair-state-university-nj" replace />} />
              <Route path="/universities/ramapo-college" element={<Navigate to="/universities/ramapo-college-nj" replace />} />
              <Route path="/universities/stockton-university" element={<Navigate to="/universities/stockton-university-nj" replace />} />
              <Route path="/universities/college-of-new-jersey" element={<Navigate to="/universities/college-of-new-jersey-nj" replace />} />
              <Route path="/universities/william-paterson-university" element={<Navigate to="/universities/william-paterson-university-nj" replace />} />
              <Route path="/universities/fairleigh-dickinson-university" element={<Navigate to="/universities/fairleigh-dickinson-university-nj" replace />} />
              <Route path="/universities/seton-hall-university" element={<Navigate to="/universities/seton-hall-university-nj" replace />} />
              <Route path="/universities/njit" element={<Navigate to="/universities/njit-nj" replace />} />
              <Route path="/universities/kean-university" element={<Navigate to="/universities/kean-university-nj" replace />} />
              <Route path="/universities/monmouth-university" element={<Navigate to="/universities/monmouth-university-nj" replace />} />
              <Route path="/universities/rider-university" element={<Navigate to="/universities/rider-university-nj" replace />} />
              <Route path="/universities/stevens-institute-of-technology" element={<Navigate to="/universities/stevens-institute-of-technology-nj" replace />} />
              <Route path="/universities/saint-peters-university" element={<Navigate to="/universities/saint-peters-university-nj" replace />} />
              <Route path="/universities/rutgers-newark" element={<Navigate to="/universities/rutgers-newark-nj" replace />} />
              <Route path="/universities/rutgers-camden" element={<Navigate to="/universities/rutgers-camden-nj" replace />} />
              <Route path="/universities/nj-city-university" element={<Navigate to="/universities/nj-city-university-nj" replace />} />
              <Route path="/universities/felician-university" element={<Navigate to="/universities/felician-university-nj" replace />} />
              <Route path="/universities/drew-university" element={<Navigate to="/universities/drew-university-nj" replace />} />
              <Route path="/universities/georgian-court-university" element={<Navigate to="/universities/georgian-court-university-nj" replace />} />
              <Route path="/universities/caldwell-university" element={<Navigate to="/universities/caldwell-university-nj" replace />} />
              <Route path="/universities/bloomfield-college" element={<Navigate to="/universities/bloomfield-college-nj" replace />} />
              <Route path="/universities/centenary-university" element={<Navigate to="/universities/centenary-university-nj" replace />} />
              <Route path="/universities/saint-elizabeth-university" element={<Navigate to="/universities/saint-elizabeth-university-nj" replace />} />
              <Route path="/universities/berkeley-college" element={<Navigate to="/universities/berkeley-college-nj" replace />} />
              <Route path="/universities/pillar-college" element={<Navigate to="/universities/pillar-college-nj" replace />} />
              <Route path="/universities/princeton-university" element={<Navigate to="/universities/princeton-university-nj" replace />} />
              <Route path="/universities/:slug" element={<UniversityPortalPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      } />
    </Routes>
  );
}

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6"><Logo size={48} /></div>
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">HouseRush</h1>
      <p className="text-lg text-brand-200 mb-2">We're making some improvements. Check back soon!</p>
      <p className="text-sm text-brand-400">HouseRush will be back online shortly.</p>
      <p className="absolute bottom-6 text-xs text-brand-600">&copy; 2026 HouseRush</p>
    </div>
  );
}

function shouldBypassMaintenance(): boolean {
  // Admin and parent-view routes always bypass
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return true;
  if (path.startsWith('/parent-view')) return true;
  if (path.startsWith('/guides')) return true;
  if (path.startsWith('/create-listing')) return true;
  if (path.startsWith('/universities')) return true;

  // Check for ?preview=houserush2024 and persist in sessionStorage
  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') === 'houserush2024') {
    sessionStorage.setItem('houserush_preview', 'true');
    return true;
  }

  // Check sessionStorage for previous bypass
  if (sessionStorage.getItem('houserush_preview') === 'true') return true;

  return false;
}

export default function App() {
  if (import.meta.env.VITE_MAINTENANCE_MODE === 'true' && !shouldBypassMaintenance()) {
    return <MaintenancePage />;
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}
