import React, { useEffect } from 'react';
import { Composer } from '../feed/Composer';
import { Post } from '../../types';
import { X, CheckCircle2 } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: Post;
  quotePost?: Post;
  communityId?: string;
  onPostCreated?: (post: Post) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  replyTo,
  quotePost,
  communityId,
  onPostCreated
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl bg-black border border-[#2f3336] shadow-2xl overflow-hidden mt-6 sm:mt-0 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2f3336] bg-black">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-full text-[#e7e9ea] hover:bg-white/10 transition-colors"
              title="Close (draft is saved)"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-extrabold text-[#e7e9ea]">
              {replyTo ? 'Reply to Post' : quotePost ? 'Quote Post' : 'New Post'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#71767b]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1d9bf0]" />
            <span>Draft saved locally</span>
          </div>
        </div>

        {/* Embedded Composer with local storage draft system */}
        <div className="p-1 sm:p-2 bg-black">
          <Composer
            isModal={true}
            replyTo={replyTo}
            quotePost={quotePost}
            communityId={communityId}
            onPostCreated={(post) => {
              if (onPostCreated) onPostCreated(post);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
