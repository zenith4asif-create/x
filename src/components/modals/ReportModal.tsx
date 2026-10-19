import React, { useState } from 'react';
import { Post, UserProfile, ReportItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { moderationService } from '../../services/moderationService';
import { X, Flag, Loader2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: Post;
  user?: UserProfile;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  post,
  user
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [reason, setReason] = useState<ReportItem['reason']>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const reasons: { id: ReportItem['reason']; label: string; desc: string }[] = [
    { id: 'spam', label: 'Spam', desc: 'Commercial bot content or misleading links' },
    { id: 'harassment', label: 'Harassment & Abuse', desc: 'Targeted hostility or threats' },
    { id: 'impersonation', label: 'Impersonation', desc: 'Pretending to be another individual or entity' },
    { id: 'unsafe', label: 'Unsafe or Illegal Content', desc: 'Dangerous material or illegal promotion' },
    { id: 'misleading', label: 'Misinformation', desc: 'Deceptive or demonstrably false claims' },
    { id: 'copyright', label: 'Copyright Infringement', desc: 'Unauthorized use of intellectual property' },
    { id: 'other', label: 'Other Concern', desc: 'Other violation of platform community standards' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please sign in to submit reports', 'info');
      return;
    }

    setSubmitting(true);
    try {
      await moderationService.submitReport({
        reporterId: currentUser.uid,
        targetType: post ? 'post' : 'user',
        targetId: post ? post.id : user?.uid || '',
        reason,
        details
      });
      showToast('Report submitted for moderation review. Thank you for keeping ZOR safe.', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-rose-400">
            <Flag className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-100">
              Report {post ? 'Post' : 'Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Please help our moderation team understand the issue with this content. Reports are investigated with priority.
          </p>

          <div className="space-y-2">
            {reasons.map((r) => (
              <label
                key={r.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  reason === r.id
                    ? 'border-indigo-500 bg-indigo-950/20 text-slate-100'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="report_reason"
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="mt-0.5 text-indigo-600 focus:ring-0"
                />
                <div>
                  <p className="font-semibold">{r.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Additional Context (Optional)</label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional details or references..."
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold transition-all shadow-md flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Submit Report</span>
          </button>
        </form>
      </div>
    </div>
  );
};
