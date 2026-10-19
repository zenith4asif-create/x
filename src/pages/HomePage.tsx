import React, { useState, useEffect, useCallback } from 'react';
import { Post } from '../types';
import { feedService } from '../services/feedService';
import { useAuth } from '../context/AuthContext';
import { Composer } from '../components/feed/Composer';
import { PostCard } from '../components/feed/PostCard';
import { RefreshCw, Sparkles, Users, Clock, Loader2, Code2, CheckCircle2 } from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';

interface HomePageProps {
  onPostClick: (postId: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onReplyClick: (post: Post) => void;
  onQuoteClick: (post: Post) => void;
  onAnalyticsClick: (post: Post) => void;
  onReportClick: (post: Post) => void;
  onMediaClick: (media: any[], index: number) => void;
  onNavigateExplore?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onPostClick,
  onUserClick,
  onHashtagClick,
  onReplyClick,
  onQuoteClick,
  onAnalyticsClick,
  onReportClick,
  onMediaClick,
  onNavigateExplore
}) => {
  const { currentUser } = useAuth();

  const [feedMode, setFeedMode] = useState<'for_you' | 'following' | 'latest'>('for_you');
  const [followingSort, setFollowingSort] = useState<'chronological' | 'ranked'>('chronological');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let result: Post[] = [];
      if (feedMode === 'for_you') {
        result = await feedService.getForYouFeed(currentUser?.uid);
      } else if (feedMode === 'following') {
        if (currentUser) {
          result = await feedService.getFollowingFeed(currentUser.uid, followingSort);
        } else {
          result = [];
        }
      } else if (feedMode === 'latest') {
        result = await feedService.getLatestFeed(currentUser?.uid);
      }
      setPosts(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [feedMode, followingSort, currentUser]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea]">
      {/* Modern X Feed Tabs Sticky Header (Pure Black) */}
      <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-[#2f3336]">
        {/* Top Developer Attribution Banner (Compact & Sleek) */}
        <div className="px-4 py-1.5 bg-[#16181c]/70 border-b border-[#2f3336]/60 flex items-center justify-between text-[11px] text-[#71767b]">
          <div className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-[#1d9bf0]" />
            <span>Architected & Built by <span className="font-bold text-[#e7e9ea]">ASIF ANSARI</span></span>
            <VerifiedBadge size={13} />
          </div>
          <span className="font-mono text-[10px] text-[#71767b] hidden sm:inline">v2.0 X-ENGINE</span>
        </div>

        {/* Tab row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            {/* For You */}
            <button
              onClick={() => setFeedMode('for_you')}
              className={`flex-1 py-3.5 text-center text-sm font-bold transition-colors relative hover:bg-white/[0.03] ${
                feedMode === 'for_you' ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:text-[#e7e9ea]'
              }`}
            >
              <span className="relative">
                For you
                {feedMode === 'for_you' && (
                  <div className="absolute -bottom-3.5 inset-x-0 h-1 bg-[#1d9bf0] rounded-full" />
                )}
              </span>
            </button>

            {/* Following */}
            <button
              onClick={() => setFeedMode('following')}
              className={`flex-1 py-3.5 text-center text-sm font-bold transition-colors relative hover:bg-white/[0.03] ${
                feedMode === 'following' ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:text-[#e7e9ea]'
              }`}
            >
              <span className="relative">
                Following
                {feedMode === 'following' && (
                  <div className="absolute -bottom-3.5 inset-x-0 h-1 bg-[#1d9bf0] rounded-full" />
                )}
              </span>
            </button>

            {/* Latest */}
            <button
              onClick={() => setFeedMode('latest')}
              className={`flex-1 py-3.5 text-center text-sm font-bold transition-colors relative hover:bg-white/[0.03] ${
                feedMode === 'latest' ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:text-[#e7e9ea]'
              }`}
            >
              <span className="relative">
                Latest
                {feedMode === 'latest' && (
                  <div className="absolute -bottom-3.5 inset-x-0 h-1 bg-[#1d9bf0] rounded-full" />
                )}
              </span>
            </button>
          </div>

          {/* Refresh action */}
          <button
            onClick={() => loadFeed(true)}
            disabled={refreshing || loading}
            className="p-3 mr-1 text-[#71767b] hover:text-[#1d9bf0] rounded-full hover:bg-white/10 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#1d9bf0]' : ''}`} />
          </button>
        </div>

        {/* Following secondary mode toggle */}
        {feedMode === 'following' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-black border-t border-[#2f3336] text-[11px] text-[#71767b]">
            <span>Sort by:</span>
            <button
              onClick={() => setFollowingSort('chronological')}
              className={`font-semibold hover:underline ${followingSort === 'chronological' ? 'text-[#1d9bf0]' : ''}`}
            >
              Newest first
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setFollowingSort('ranked')}
              className={`font-semibold hover:underline ${followingSort === 'ranked' ? 'text-[#1d9bf0]' : ''}`}
            >
              Ranked affinity
            </button>
          </div>
        )}
      </div>

      {/* Desktop Inline Post Composer (Pure Black) */}
      <div className="hidden md:block">
        <Composer onPostCreated={handlePostCreated} />
      </div>

      {/* Posts Stream */}
      <div>
        {loading ? (
          <div className="py-24 flex flex-col justify-center items-center text-[#71767b]">
            <Loader2 className="w-8 h-8 animate-spin text-[#1d9bf0]" />
            <span className="text-xs mt-3 font-mono">Loading your feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center px-4">
            <h3 className="text-base font-bold text-[#e7e9ea]">
              {feedMode === 'following'
                ? 'Welcome to your following feed!'
                : 'No posts yet'}
            </h3>
            <p className="text-xs text-[#71767b] mt-1 max-w-sm mx-auto">
              {feedMode === 'following'
                ? 'Follow people to see what they are talking about, or browse the Explore tab.'
                : 'Be the first to start a conversation or share media on ZOR.'}
            </p>
            {onNavigateExplore && feedMode === 'following' && (
              <button
                onClick={onNavigateExplore}
                className="mt-4 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
              >
                Find people to follow
              </button>
            )}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostClick={onPostClick}
              onUserClick={onUserClick}
              onHashtagClick={onHashtagClick}
              onReplyClick={onReplyClick}
              onQuoteClick={onQuoteClick}
              onAnalyticsClick={onAnalyticsClick}
              onReportClick={onReportClick}
              onMediaClick={onMediaClick}
              onPostDeleted={handlePostDeleted}
            />
          ))
        )}
      </div>
    </div>
  );
};
