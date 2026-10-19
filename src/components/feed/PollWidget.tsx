import React, { useState } from 'react';
import { PollData } from '../../types';
import { CheckCircle2, Clock } from 'lucide-react';

interface PollWidgetProps {
  poll: PollData;
  postId: string;
  userVotedOptionId?: string;
  onVote: (optionId: string) => Promise<void>;
}

export const PollWidget: React.FC<PollWidgetProps> = ({
  poll,
  postId,
  userVotedOptionId,
  onVote
}) => {
  const [submitting, setSubmitting] = useState(false);
  const isExpired = Date.now() > poll.expiresAt;
  const hasVoted = Boolean(userVotedOptionId);
  const showResults = hasVoted || isExpired;
  const totalVotes = Math.max(poll.totalVotes || 0, 1);

  const handleVote = async (optId: string) => {
    if (showResults || submitting) return;
    setSubmitting(true);
    try {
      await onVote(optId);
    } finally {
      setSubmitting(false);
    }
  };

  const getRemainingTimeText = () => {
    if (isExpired) return 'Final results';
    const remainingMs = poll.expiresAt - Date.now();
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    if (hours > 24) {
      return `${Math.floor(hours / 24)} days left`;
    }
    if (hours > 0) {
      return `${hours} hours left`;
    }
    const mins = Math.floor(remainingMs / (1000 * 60));
    return `${Math.max(1, mins)} mins left`;
  };

  return (
    <div className="mt-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 select-none">
      <div className="space-y-2">
        {poll.options.map((option) => {
          const pct = Math.round(((option.votes || 0) / totalVotes) * 100);
          const isSelected = userVotedOptionId === option.id;

          if (showResults) {
            return (
              <div
                key={option.id}
                className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 flex items-center justify-between text-sm"
              >
                {/* Visual Fill Percentage Bar */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isSelected ? 'bg-indigo-600/30 border-r-2 border-indigo-500' : 'bg-slate-800/40'
                  }`}
                  style={{ width: `${pct}%` }}
                />
                
                <div className="relative z-10 flex items-center gap-2 font-medium text-slate-200">
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                  <span className={isSelected ? 'text-indigo-200 font-semibold' : ''}>{option.text}</span>
                </div>

                <div className="relative z-10 font-mono text-xs font-semibold tabular-nums text-slate-400">
                  {pct}%
                </div>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={submitting}
              className="w-full text-left px-3.5 py-2.5 rounded-lg border border-indigo-500/30 hover:border-indigo-500 bg-slate-900/60 hover:bg-indigo-950/30 text-sm font-medium text-slate-200 hover:text-indigo-200 transition-all active:scale-[0.99] flex items-center justify-between group"
            >
              <span>{option.text}</span>
              <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Vote
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-mono tabular-nums">{poll.totalVotes || 0} votes</span>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{getRemainingTimeText()}</span>
        </div>
      </div>
    </div>
  );
};
