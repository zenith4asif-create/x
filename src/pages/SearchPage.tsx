import React, { useState, useEffect } from 'react';
import { Post, UserProfile, Community } from '../types';
import { searchService } from '../services/searchService';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/feed/PostCard';
import { Search, Users, Clock, Flame, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';

interface SearchPageProps {
  initialQuery: string;
  onPostClick: (postId: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onCommunityClick: (commId: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery,
  onPostClick,
  onUserClick,
  onHashtagClick,
  onCommunityClick
}) => {
  const { currentUser } = useAuth();

  const [queryText, setQueryText] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'top' | 'latest' | 'people' | 'media' | 'communities'>('top');
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setQueryText(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setRecentSearches(searchService.getRecentSearches());
  }, []);

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);

    try {
      const [matchedPosts, matchedPeople, matchedCommunities] = await Promise.all([
        searchService.searchPosts(searchTerm, currentUser?.uid),
        searchService.searchUsers(searchTerm),
        searchService.searchCommunities(searchTerm)
      ]);

      setPosts(matchedPosts);
      setPeople(matchedPeople);
      setCommunities(matchedCommunities);
      searchService.addRecentSearch(searchTerm);
      setRecentSearches(searchService.getRecentSearches());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryText.trim()) {
      executeSearch(queryText.trim());
    }
  }, [queryText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch(queryText.trim());
    }
  };

  const filteredPosts = React.useMemo(() => {
    if (activeTab === 'media') {
      return posts.filter((p) => p.media && p.media.length > 0);
    }
    if (activeTab === 'latest') {
      return [...posts].sort((a, b) => b.createdAt - a.createdAt);
    }
    // Top: sorted by engagement
    return [...posts].sort((a, b) => {
      const aEng = (a.likeCount || 0) + (a.repostCount || 0) * 2 + (a.replyCount || 0);
      const bEng = (b.likeCount || 0) + (b.repostCount || 0) * 2 + (b.replyCount || 0);
      return bEng - aEng;
    });
  }, [posts, activeTab]);

  return (
    <div className="min-h-screen">
      {/* Search Header Bar */}
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 p-3.5 space-y-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500 transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search ZOR..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {queryText && (
            <button
              onClick={() => {
                setQueryText('');
                setPosts([]);
                setPeople([]);
                setCommunities([]);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'top', label: 'Top', icon: Flame },
            { id: 'latest', label: 'Latest', icon: Clock },
            { id: 'people', label: 'People', icon: Users },
            { id: 'media', label: 'Media', icon: ImageIcon },
            { id: 'communities', label: 'Communities', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Searches chips if empty query */}
      {!queryText && recentSearches.length > 0 && (
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
            <span className="font-semibold">Recent Searches</span>
            <button
              onClick={() => {
                searchService.clearRecentSearches();
                setRecentSearches([]);
              }}
              className="text-[11px] text-indigo-400 hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => setQueryText(term)}
                className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {loading ? (
        <div className="py-24 flex justify-center items-center text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : activeTab === 'people' ? (
        <div className="divide-y divide-slate-800/80">
          {people.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">No people found matching "{queryText}"</div>
          ) : (
            people.map((u) => (
              <div
                key={u.uid}
                onClick={() => onUserClick(u.username)}
                className="p-4 hover:bg-slate-900/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-slate-800 bg-slate-800"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-100 truncate">{u.displayName}</span>
                      {u.verified && <VerifiedBadge size={16} />}
                    </div>
                    <p className="text-xs text-slate-400">@{u.username}</p>
                    {u.bio && <p className="text-xs text-slate-300 mt-1 line-clamp-2">{u.bio}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'communities' ? (
        <div className="divide-y divide-slate-800/80">
          {communities.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">No communities found matching "{queryText}"</div>
          ) : (
            communities.map((c) => (
              <div
                key={c.id}
                onClick={() => onCommunityClick(c.id)}
                className="p-4 hover:bg-slate-900/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={c.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-1 ring-slate-800 bg-slate-800"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{c.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.description}</p>
                    <span className="text-[11px] text-slate-500 font-mono tabular-nums">{c.memberCount || 1} members</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {filteredPosts.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">No posts found matching "{queryText}"</div>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostClick={onPostClick}
                onUserClick={onUserClick}
                onHashtagClick={onHashtagClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
