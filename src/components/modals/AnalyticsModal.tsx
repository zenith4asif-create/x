import React from 'react';
import { Post } from '../../types';
import { analyticsService } from '../../services/analyticsService';
import { X, BarChart3, Eye, Heart, Repeat2, MessageCircle, Bookmark, Percent } from 'lucide-react';
import { formatCompactNumber } from '../../utils/formatters';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  post
}) => {
  if (!isOpen) return null;

  const stats = analyticsService.getPostAnalytics(post);

  const metrics = [
    { label: 'Impressions & Views', value: stats.views, icon: Eye, color: 'text-sky-400' },
    { label: 'Likes', value: stats.likes, icon: Heart, color: 'text-rose-400' },
    { label: 'Reposts', value: stats.reposts, icon: Repeat2, color: 'text-emerald-400' },
    { label: 'Replies', value: stats.replies, icon: MessageCircle, color: 'text-indigo-400' },
    { label: 'Bookmarks', value: stats.bookmarks, icon: Bookmark, color: 'text-amber-400' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Post Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post snippet */}
        <div className="p-3 mb-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
          <p className="line-clamp-2">{post.text || '[Media Post]'}</p>
        </div>

        {/* Big Engagement Rate Hero */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-tr from-indigo-950/40 via-slate-900 to-indigo-900/20 border border-indigo-500/20 flex items-center justify-between">
          <div>
            <p className="text-xs text-indigo-300 font-medium">Engagement Rate</p>
            <p className="text-3xl font-extrabold font-mono text-white mt-1">
              {stats.engagementRate}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Breakdown Metric Rows */}
        <div className="space-y-2.5">
          {metrics.map((m) => {
            const Icon = m.icon;
            const pctOfViews = Math.round((m.value / Math.max(stats.views, 1)) * 100);

            return (
              <div
                key={m.label}
                className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${m.color}`} />
                  <span className="font-medium text-slate-300">{m.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-100 tabular-nums">
                    {formatCompactNumber(m.value)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono w-10 text-right tabular-nums">
                    {pctOfViews}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
