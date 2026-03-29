import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Zap } from 'lucide-react';
import api from '../lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message || 'Your .edu email is verified!');
      })
      .catch((err) => {
        setStatus('error');
        const msg = err.response?.data?.error;
        setMessage(typeof msg === 'string' ? msg : 'Verification failed. The link may be invalid or expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 max-w-md w-full p-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">House<span className="text-brand-600">Rush</span></span>
        </Link>

        {status === 'loading' && (
          <div className="py-8">
            <Loader2 className="w-12 h-12 text-brand-500 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 font-medium">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Email Verified!</h2>
            <p className="text-slate-500 mb-6">{message}</p>
            <p className="text-slate-500 text-sm mb-6">You now have a verified .edu badge on your profile. You can bid on listings with confidence.</p>
            <Link to="/listings" className="inline-block bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold transition-all">
              Browse Listings
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Failed</h2>
            <p className="text-slate-500 mb-6">{message}</p>
            <Link to="/signup" className="inline-block bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold transition-all">
              Sign Up Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
