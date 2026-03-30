import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
      <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mb-6">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </div>
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
