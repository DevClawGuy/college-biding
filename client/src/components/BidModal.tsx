import { useState } from 'react';
import { X, DollarSign, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  currentBid: number;
  onBidPlaced: () => void;
}

export default function BidModal({ isOpen, onClose, listingId, listingTitle, currentBid, onBidPlaced }: BidModalProps) {
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
      await api.post(`/bids/listing/${listingId}`, { amount: bidAmount });
      if (showAutoBid && autoBidMax > bidAmount) {
        await api.post(`/bids/auto/${listingId}`, { maxAmount: autoBidMax });
      }
      setSuccess(true);
      onBidPlaced();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place bid');
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Bid Placed!</h3>
                <p className="text-gray-500 mt-1">Your bid of ${bidAmount.toLocaleString()} has been placed.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Place a Bid</h3>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4 truncate">{listingTitle}</p>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <span className="text-sm text-gray-500">Current highest bid</span>
                  <div className="text-2xl font-bold text-navy-800">${currentBid.toLocaleString()}/mo</div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Bid</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => { setBidAmount(Number(e.target.value)); setError(''); }}
                      className="w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500 text-lg font-semibold"
                      min={currentBid + 1}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/mo</span>
                  </div>
                </div>

                {/* Quick bid buttons */}
                <div className="flex gap-2 mb-4">
                  {quickBids.map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setBidAmount(currentBid + inc)}
                      className="flex-1 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-electric-50 hover:border-electric-300 transition-colors"
                    >
                      +${inc}
                    </button>
                  ))}
                </div>

                {/* Auto-bid toggle */}
                <button
                  onClick={() => setShowAutoBid(!showAutoBid)}
                  className="flex items-center gap-2 text-sm text-electric-600 hover:text-electric-700 mb-3"
                >
                  <Zap className="w-4 h-4" />
                  {showAutoBid ? 'Hide auto-bid' : 'Set up auto-bid'}
                </button>

                {showAutoBid && (
                  <div className="mb-4 p-3 bg-electric-50 rounded-lg">
                    <label className="block text-sm font-medium text-electric-700 mb-1">Maximum auto-bid</label>
                    <p className="text-xs text-electric-600 mb-2">We'll automatically bid for you up to this amount ($25 increments).</p>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-electric-400" />
                      <input
                        type="number"
                        value={autoBidMax}
                        onChange={(e) => setAutoBidMax(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2 border border-electric-200 rounded-lg focus:ring-2 focus:ring-electric-500"
                        min={bidAmount + 25}
                        placeholder={`Min $${bidAmount + 25}`}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-sm mb-3">{error}</p>
                )}

                <button
                  onClick={handleBid}
                  disabled={loading}
                  className="w-full bg-electric-500 hover:bg-electric-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Placing bid...' : `Place Bid — $${bidAmount.toLocaleString()}/mo`}
                </button>

                <p className="text-xs text-gray-400 mt-3 text-center">
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
