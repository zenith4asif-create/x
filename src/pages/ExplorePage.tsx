import React, { useState, useEffect } from 'react';
import { TrendItem, UserProfile, Post } from '../types';
import { searchService } from '../services/searchService';
import { feedService } from '../services/feedService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { Search, TrendingUp, Sparkles, UserPlus, Play, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';

interface ExplorePageProps {
  onSearchSubmit: (q: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onPostClick: (postId: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onSearchSubmit,
  onUserClick,
  onHashtagClick,
  onPostClick
}) => {
  const { currentUser } = useAuth();

  const [activeCategory, setActiveCategory] = useState('Trending');
  const [queryInput, setQueryInput] = useState('');
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<UserProfile[]>([]);
  const [mediaPosts, setMediaPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['Trending', 'Tech & AI', 'Design', 'News', 'Creative', 'Sports'];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      searchService.getTrendingTopics(10),
      userService.getSuggestedUsers(currentUser?.uid || '', 6),
      feedService.getLatestFeed(currentUser?.uid, 30)
    ]).then(([trendData, creators, latestPosts]) => {
      setTrends(trendData);
      setSuggestedCreators(creators);
      const withMedia = latestPosts.filter((p) => p.media && p.media.length > 0);
      setMediaPosts(withMedia.slice(0, 8));
      setLoading(false);
    });
  }, [currentUser]);

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && queryInput.trim()) {
      onSearchSubmit(queryInput.trim());
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Search Header */}
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 p-3.5 space-y-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search keywords, #hashtags, @users, communities..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {queryInput && (
            <button
              onClick={() => onSearchSubmit(queryInput.trim())}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[11px]"
            >
              Search
            </button>
          )}
        </div>

        {/* Categories Tab Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center items-center text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {/* Trending Spotlight Banner */}
          {trends.length > 0 && (
            <div
              onClick={() => onHashtagClick(trends[0].tag)}
              className="p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/30 cursor-pointer hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>TOP TRENDING ON ZOR</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">#{trends[0].tag}</h2>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                <span className="font-mono tabular-nums">{trends[0].count} posts</span>
                <span aria-hidden="true">·</span>
                <span>{trends[0].velocity}% engagement surge</span>
              </div>
            </div>
          )}

          {/* Trending Topics List */}
          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Trending Discussions</span>
            </h3>

            <div className="space-y-3">
              {trends.map((t, idx) => (
                <div
                  key={t.tag}
                  onClick={() => onHashtagClick(t.tag)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-0.5">
                      <span>#{idx + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.category || 'Topic'}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-100 hover:text-indigo-400 transition-colors">
                      #{t.tag}
                    </p>
                    <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                      {t.count} posts
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 font-mono text-[11px] font-bold">
                      +{t.velocity}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Showcase: Popular Media */}
          {mediaPosts.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-bold text-slate-100 mb-3">Popular Photos & Clips</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {mediaPosts.map((post) => {
                  const mediaItem = post.media![0];
                  return (
                    <div
                      key={post.id}
                      onClick={() => onPostClick(post.id)}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer group"
                    >
                      <img
                        src={mediaItem.thumbnailUrl || mediaItem.cloudinaryUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {mediaItem.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="w-6 h-6 text-white fill-white/80" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[11px] text-white truncate">@{post.author?.username}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Creators */}
          {suggestedCreators.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-bold text-slate-100 mb-3">Who to Follow</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedCreators.map((creator) => (
                  <div
                    key={creator.uid}
                    onClick={() => onUserClick(creator.username)}
                    className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={creator.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${creator.username}`}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-800 bg-slate-800"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {creator.displayName}
                          </span>
                          {creator.verified && (
                            <VerifiedBadge size={14} />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">@{creator.username}</p>
                        {creator.bio && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{creator.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
