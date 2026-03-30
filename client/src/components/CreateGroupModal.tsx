import { useState } from 'react';
import { X, Plus, Users, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  onGroupCreated: () => void;
}

interface CreatedMember {
  id: string;
  email: string;
  name: string | null;
  status: string;
}

export default function CreateGroupModal({ isOpen, onClose, listingId, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdMembers, setCreatedMembers] = useState<CreatedMember[]>([]);

  const addEmailInput = () => {
    if (emails.length < 5) setEmails(prev => [...prev, '']);
  };

  const removeEmailInput = (index: number) => {
    setEmails(prev => prev.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    setEmails(prev => prev.map((e, i) => i === index ? value : e));
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    const validEmails = emails.filter(e => e.trim().length > 0);
    if (validEmails.length === 0) {
      setError('Add at least one roommate email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/bid-groups', {
        listingId,
        name: groupName.trim(),
        memberEmails: validEmails,
      });
      setCreatedMembers(data.members);
      setSuccess(true);
      onGroupCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

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
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Group Created!</h3>
                <p className="text-slate-500 mt-2 text-sm">Invitations sent to your roommates.</p>
                <div className="mt-5 space-y-2">
                  {createdMembers.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                      <span className="text-slate-700">{m.name ?? m.email}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${m.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {m.status === 'accepted' ? 'Joined' : 'Invited'}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={onClose} className="mt-6 w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-all">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-brand-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Create Group Bid</h3>
                  </div>
                  <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => { setGroupName(e.target.value); setError(''); }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    placeholder='e.g. "The Beach House Gang"'
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Roommate Emails</label>
                  <p className="text-xs text-slate-400 mb-3">Invite up to 5 roommates. They'll get an email to join your group.</p>
                  <div className="space-y-2.5">
                    {emails.map((email, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => { updateEmail(i, e.target.value); setError(''); }}
                          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                          placeholder="roommate@monmouth.edu"
                        />
                        {emails.length > 1 && (
                          <button type="button" onClick={() => removeEmailInput(i)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {emails.length < 5 && (
                    <button type="button" onClick={addEmailInput}
                      className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                      <Plus className="w-4 h-4" /> Add another roommate
                    </button>
                  )}
                </div>

                {error && (
                  <div className="text-rose-600 text-sm mb-4 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">{error}</div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-600/25 active:scale-[0.98]"
                >
                  {loading ? 'Creating Group...' : 'Create Group & Send Invites'}
                </button>

                <p className="text-xs text-slate-400 mt-4 text-center">
                  Your group will bid as one unit. Only the group leader can place bids.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
