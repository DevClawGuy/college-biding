import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Trophy, XCircle, Gavel, Heart, AlertCircle } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';
import api from '../lib/api';

interface ParentSavedListing {
  id: string;
  title: string;
  address: string;
  city: string;
  photos: string[];
  currentBid: number;
  auctionEnd: string;
  status: string;
  beds: number;
  baths: number;
}

interface ParentBid {
  listingId: string;
  listingTitle: string;
  listingAddress: string;
  listingCity: string;
  listingPhotos: string[];
  bidAmount: number;
  currentBid: number;
  auctionEnd: string;
  listingStatus: string;
  winnerId: string | null;
}

interface ParentViewData {
  studentFirstName: string;
  university: string;
  savedListings: ParentSavedListing[];
  activeBids: ParentBid[];
}

function BidStatusPill({ bid }: { bid: ParentBid }) {
  const countdown = useCountdown(bid.auctionEnd || '');
  const isWinning = bid.bidAmount >= (bid.currentBid || 0);
  const ended = bid.listingStatus === 'ended' || countdown.isExpired;

  if (ended) {
    return isWinning || bid.winnerId
      ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg"><Trophy className="w-3 h-3" /> Won</span>
      : <span className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg"><XCircle className="w-3 h-3" /> Outbid</span>;
  }
  return isWinning
    ? <span className="flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg"><Clock className="w-3 h-3" /> Winning</span>
    : <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg"><Clock className="w-3 h-3" /> Outbid</span>;
}

function CountdownText({ endDate }: { endDate: string }) {
  const countdown = useCountdown(endDate);
  if (countdown.isExpired) return <span className="text-xs text-slate-400">Ended</span>;
  return <span className="text-xs text-slate-500"><Clock className="w-3 h-3 inline mr-1" />{countdown.display} left</span>;
}

export default function ParentViewPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState<ParentViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No access token provided.');
      setLoading(false);
      return;
    }
    api.get(`/parent-access/${token}`)
      .then(res => setData(res.data))
      .catch(() => setError('This link is invalid or has expired. Ask your student to resend the invitation.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-bold text-slate-900 text-lg">HouseRush</span>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 skeleton rounded-lg w-1/3" />
            <div className="h-5 skeleton rounded-lg w-1/2" />
            <div className="h-40 skeleton rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-bold text-slate-900 text-lg">HouseRush</span>
          </div>
        </header>
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Unavailable</h1>
          <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Standalone header — no auth buttons */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-bold text-slate-900 text-lg">HouseRush</span>
          </div>
          <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-lg">Read-only access</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{data.studentFirstName}'s Housing Search</h1>
          <p className="text-slate-500 text-sm mt-1">{data.university} — You have read-only access. You cannot place bids or make changes.</p>
        </div>

        {/* Active Bids */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Gavel className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-900">Active Bids</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{data.activeBids.length}</span>
          </div>
          {data.activeBids.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Gavel className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">{data.studentFirstName} hasn't placed any bids yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.activeBids.map(bid => (
                <div key={bid.listingId} className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-slate-200 card-shadow">
                  <img
                    src={bid.listingPhotos?.[0] || 'https://picsum.photos/200/200?grayscale'}
                    alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{bid.listingTitle}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{bid.listingAddress}, {bid.listingCity}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-sm text-slate-500">Their bid: <span className="font-semibold text-slate-900">${bid.bidAmount.toLocaleString()}/mo</span></span>
                      <span className="text-xs text-slate-400">Current: ${(bid.currentBid ?? 0).toLocaleString()}/mo</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <BidStatusPill bid={bid} />
                    <CountdownText endDate={bid.auctionEnd} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Saved Listings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-slate-900">Saved Listings</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{data.savedListings.length}</span>
          </div>
          {data.savedListings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Heart className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">{data.studentFirstName} hasn't saved any listings yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {data.savedListings.map(listing => (
                <div key={listing.id} className="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
                  <img
                    src={listing.photos?.[0] || 'https://picsum.photos/400/200?grayscale'}
                    alt="" className="w-full h-36 object-cover bg-slate-100"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 truncate">{listing.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{listing.address}, {listing.city}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-semibold text-slate-900">${(listing.currentBid ?? 0).toLocaleString()}/mo</span>
                      <CountdownText endDate={listing.auctionEnd} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                      <span>{listing.beds === 0 ? 'Studio' : `${listing.beds} bed`}</span>
                      <span>·</span>
                      <span>{listing.baths} bath</span>
                      {listing.status === 'ended' && <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Closed</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} HouseRush — The fastest way to find off-campus housing.</p>
        </div>
      </div>
    </div>
  );
}
