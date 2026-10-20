import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post } from '../types';
import { feedService } from '../services/feedService';
import { postService } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { Composer } from '../components/feed/Composer';
import { PostCard } from '../components/feed/PostCard';
import {
  RefreshCw,
  Sparkles,
  Users,
  Clock,
  Loader2,
  Code2,
  ArrowUp,
  ChevronDown
} from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';
import { ref, onChildAdded } from 'firebase/database';
import { rtdb } from '../firebase/config';

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

const POSTS_PER_CHUNK = 5;

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
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(POSTS_PER_CHUNK);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-detect new content algorithm state
  const [incomingPosts, setIncomingPosts] = useState<Post[]>([]);
  const lastFeedLoadTimeRef = useRef<number>(Date.now());
  const sentinelRef = useRef<HTMLDivElement>(null);

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
      setAllPosts(result);
      setVisibleCount(POSTS_PER_CHUNK);
      setIncomingPosts([]);
      lastFeedLoadTimeRef.current = Date.now();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [feedMode, followingSort, currentUser]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Real-time algorithm: Auto-detect new content published on the platform
  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    const unsubscribe = onChildAdded(postsRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const newPostVal = snapshot.val() as Post;
      newPostVal.id = snapshot.key || newPostVal.id;

      // Only detect posts created AFTER the current feed was loaded
      if (
        newPostVal.createdAt > lastFeedLoadTimeRef.current &&
        newPostVal.status !== 'removed' &&
        !newPostVal.replyTo
      ) {
        // Hydrate post for feed display
        try {
          const hydrated = await postService.hydratePost(newPostVal, currentUser?.uid);
          setIncomingPosts((prev) => {
            // Avoid duplicates
            if (prev.some((p) => p.id === hydrated.id)) return prev;
            return [hydrated, ...prev];
          });
        } catch {
          // If hydration fails, queue basic post
          setIncomingPosts((prev) => {
            if (prev.some((p) => p.id === newPostVal.id)) return prev;
            return [newPostVal, ...prev];
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Click to view latest detected content (Iconic X feature)
  const handleRevealNewPosts = () => {
    if (incomingPosts.length === 0) return;
    setAllPosts((prev) => [...incomingPosts, ...prev]);
    setVisibleCount((prev) => prev + incomingPosts.length);
    setIncomingPosts([]);
    lastFeedLoadTimeRef.current = Date.now();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 5-by-5 Progressive post pagination on scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loading && !loadingMore) {
          if (visibleCount < allPosts.length) {
            setLoadingMore(true);
            setTimeout(() => {
              setVisibleCount((prev) => Math.min(prev + POSTS_PER_CHUNK, allPosts.length));
              setLoadingMore(false);
            }, 250);
          }
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, allPosts.length, loading, loadingMore]);

  const handlePostCreated = (newPost: Post) => {
    setAllPosts((prev) => [newPost, ...prev]);
    setVisibleCount((prev) => prev + 1);
    lastFeedLoadTimeRef.current = Date.now();
  };

  const handlePostDeleted = (postId: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const visiblePosts = allPosts.slice(0, visibleCount);
  const hasMore = visibleCount < allPosts.length;

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea]">
      {/* Modern X Feed Tabs Sticky Header (Pure Black) */}
      <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-[#2f3336]">
        {/* Top Developer Attribution Banner */}
        <div className="px-4 py-1.5 bg-[#16181c]/70 border-b border-[#2f3336]/60 flex items-center justify-between text-[11px] text-[#71767b]">
          <div className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-[#1d9bf0]" />
            <span>
              Architected & Built by <span className="font-bold text-[#e7e9ea]">ASIF ANSARI</span>
            </span>
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

      {/* Floating Pill Banner for Auto-detected New Content (Iconic X feature) */}
      {incomingPosts.length > 0 && (
        <div className="sticky top-[98px] z-30 flex justify-center py-2 pointer-events-none animate-in slide-in-from-top-3 duration-200">
          <button
            onClick={handleRevealNewPosts}
            className="pointer-events-auto px-5 py-2.5 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-95 text-white font-extrabold text-xs shadow-xl shadow-[#1d9bf0]/30 flex items-center gap-2 transition-all border border-white/20"
          >
            <ArrowUp className="w-4 h-4 animate-bounce text-white" />
            <span>
              Show {incomingPosts.length} new post{incomingPosts.length > 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      {/* Desktop Inline Post Composer (Pure Black) */}
      <div className="hidden md:block">
        <Composer onPostCreated={handlePostCreated} />
      </div>

      {/* Posts Stream (Fast chunk-wise 5-by-5 render) */}
      <div>
        {loading ? (
          <div className="py-24 flex flex-col justify-center items-center text-[#71767b]">
            <Loader2 className="w-8 h-8 animate-spin text-[#1d9bf0]" />
            <span className="text-xs mt-3 font-mono">Loading fast stream...</span>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="py-24 text-center px-4">
            <h3 className="text-base font-bold text-[#e7e9ea]">
              {feedMode === 'following'
                ? 'Welcome to your following feed!'
                : 'No posts yet'}
            </h3>
            <p className="text-xs text-[#71767b] mt-1 max-w-sm mx-auto">
              {feedMode === 'following'
                ? 'Follow people to see what they are talking about, or browse the Explore tab.'
                : 'Be the first to publish a post with up to 1,000 words, high-res photos, or video.'}
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
          <>
            {visiblePosts.map((post) => (
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
            ))}

            {/* Progressive 5-post Pagination Sentinel & Status */}
            <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs text-[#71767b] font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1d9bf0]" />
                  <span>Loading next 5 posts...</span>
                </div>
              ) : hasMore ? (
                <button
                  onClick={() => setVisibleCount((prev) => Math.min(prev + POSTS_PER_CHUNK, allPosts.length))}
                  className="px-4 py-2 rounded-full border border-[#2f3336] hover:bg-white/5 text-[#71767b] hover:text-[#e7e9ea] text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Load 5 more posts</span>
                </button>
              ) : allPosts.length > 5 ? (
                <div className="text-center text-xs text-[#71767b] py-4 font-mono">
                  ✨ You're all caught up with the latest posts
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
