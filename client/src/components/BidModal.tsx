import { useState } from 'react';
import { X, DollarSign, Zap, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  currentBid: number;
  onBidPlaced: () => void;
  groupId?: string;
  groupName?: string;
}

export default function BidModal({ isOpen, onClose, listingId, listingTitle, currentBid, onBidPlaced, groupId, groupName }: BidModalProps) {
  const [bidAmount, setBidAmount] = useState(currentBid + 25);
  const [autoBidMax, setAutoBidMax] = useState(0);
  const [showAutoBid, setShowAutoBid] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleBid = async () => {
    if (bidAmount <= currentBid) {
      setError(`Bid must be higher than $${currentBid}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (groupId) {
        await api.post(`/bid-groups/${groupId}/bid`, { amount: bidAmount });
      } else {
        await api.post(`/bids/listing/${listingId}`, { amount: bidAmount });
      }
      if (!groupId && showAutoBid && autoBidMax > bidAmount) {
        await api.post(`/bids/auto/${listingId}`, { maxAmount: autoBidMax });
      }
      setSuccess(true);
      onBidPlaced();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  const quickBids = [25, 50, 100, 200];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Bid Placed!</h3>
                <p className="text-slate-500 mt-1">Your bid of ${bidAmount.toLocaleString()} has been placed.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {groupId && <Users className="w-5 h-5 text-brand-600" />}
                    {groupId ? 'Place Group Bid' : 'Place a Bid'}
                  </h3>
                  <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-slate-500 mb-5 truncate">{listingTitle}</p>

                {groupName && (
                  <div className="bg-brand-50 border border-brand-100 rounded-xl px-3.5 py-2.5 mb-5 flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-brand-700">Bidding as "{groupName}"</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current highest bid</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">${currentBid.toLocaleString()}<span className="text-base font-normal text-slate-400">/mo</span></div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Bid</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => { setBidAmount(Number(e.target.value)); setError(''); }}
                      className="w-full pl-10 pr-16 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-lg font-semibold transition-all min-h-[48px]"
                      min={currentBid + 1}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/mo</span>
                  </div>
                </div>

                {/* Quick bid buttons */}
                <div className="flex gap-2 mb-5">
                  {quickBids.map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setBidAmount(currentBid + inc)}
                      className="flex-1 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-all"
                    >
                      +${inc}
                    </button>
                  ))}
                </div>

                {/* Auto-bid toggle (not available for group bids) */}
                {!groupId && <button
                  onClick={() => setShowAutoBid(!showAutoBid)}
                  className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 mb-4 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  {showAutoBid ? 'Hide auto-bid' : 'Set up auto-bid'}
                </button>}

                {showAutoBid && (
                  <div className="mb-5 p-4 bg-brand-50/50 rounded-xl border border-brand-100">
                    <label className="block text-sm font-medium text-brand-700 mb-1">Maximum auto-bid</label>
                    <p className="text-xs text-brand-600/70 mb-3">We'll automatically bid for you up to this amount ($25 increments).</p>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                      <input
                        type="number"
                        value={autoBidMax}
                        onChange={(e) => setAutoBidMax(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2.5 border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        min={bidAmount + 25}
                        placeholder={`Min $${bidAmount + 25}`}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-rose-600 text-sm mb-4 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">{error}</div>
                )}

                <button
                  onClick={handleBid}
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-600/25 active:scale-[0.98]"
                >
                  {loading ? 'Placing bid...' : `${groupId ? 'Place Group Bid' : 'Place Bid'} — $${bidAmount.toLocaleString()}/mo`}
                </button>

                <p className="text-xs text-slate-400 mt-4 text-center">
                  By bidding, you agree to commit to this monthly rent if you win.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
