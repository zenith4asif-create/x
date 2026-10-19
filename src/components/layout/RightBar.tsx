import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, UserPlus, UserCheck, X, Code2 } from 'lucide-react';
import { VerifiedBadge } from '../brand/VerifiedBadge';
import { TrendItem, UserProfile } from '../../types';
import { searchService } from '../../services/searchService';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface RightBarProps {
  onSearchSubmit: (query: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onNavigate: (view: string) => void;
}

export const RightBar: React.FC<RightBarProps> = ({
  onSearchSubmit,
  onUserClick,
  onHashtagClick,
  onNavigate
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [queryText, setQueryText] = useState('');
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);

  useEffect(() => {
    // Load trends
    searchService.getTrendingTopics(5).then(setTrends);

    // Load suggested users
    if (currentUser) {
      userService.getSuggestedUsers(currentUser.uid, 4).then(setSuggestedUsers);
    } else {
      searchService.searchUsers('a', 4).then(setSuggestedUsers);
    }
  }, [currentUser]);

  // Debounced search suggestions
  useEffect(() => {
    if (!queryText.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const matches = await searchService.searchUsers(queryText, 4);
        setSuggestions(matches);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [queryText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && queryText.trim()) {
      searchService.addRecentSearch(queryText.trim());
      onSearchSubmit(queryText.trim());
      setSuggestions([]);
    }
  };

  const handleFollowToggle = async (targetUid: string) => {
    if (!currentUser) {
      showToast('Sign in to follow creators', 'info');
      return;
    }
    const isCurrentlyFollowing = followingMap[targetUid];
    setFollowingMap((prev) => ({ ...prev, [targetUid]: !isCurrentlyFollowing }));

    try {
      if (isCurrentlyFollowing) {
        await userService.unfollowUser(currentUser.uid, targetUid);
        showToast('Unfollowed', 'info');
      } else {
        await userService.followUser(currentUser.uid, targetUid);
        showToast('Following user', 'success');
      }
    } catch {
      setFollowingMap((prev) => ({ ...prev, [targetUid]: isCurrentlyFollowing }));
      showToast('Action failed', 'error');
    }
  };

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-80 lg:w-88 h-screen sticky top-0 px-4 py-3 select-none overflow-y-auto shrink-0 border-l border-[#2f3336] bg-black">
      {/* Search Input Bar (X Style Pill) */}
      <div className="relative pt-1">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#202327] border border-transparent focus-within:border-[#1d9bf0] focus-within:bg-black transition-all text-xs">
          <Search className="w-4 h-4 text-[#71767b] shrink-0" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search ZOR"
            className="w-full bg-transparent text-[#e7e9ea] placeholder-[#71767b] focus:outline-none text-sm"
          />
          {queryText && (
            <button
              onClick={() => {
                setQueryText('');
                setSuggestions([]);
              }}
              className="p-1 rounded-full bg-[#1d9bf0] text-black hover:opacity-90"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Instant Search Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-black border border-[#2f3336] shadow-2xl p-2 z-50">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#71767b] px-3 py-1.5">
              People
            </p>
            {suggestions.map((u) => (
              <div
                key={u.uid}
                onClick={() => {
                  onUserClick(u.username);
                  setQueryText('');
                  setSuggestions([]);
                }}
                className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-colors"
              >
                <img
                  src={u.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover bg-neutral-900"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#e7e9ea] truncate">{u.displayName}</span>
                    {u.verified && <VerifiedBadge size={14} />}
                  </div>
                  <span className="text-[11px] text-[#71767b] truncate font-mono">@{u.username}</span>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                onSearchSubmit(queryText);
                setSuggestions([]);
              }}
              className="w-full mt-1 pt-2.5 border-t border-[#2f3336] text-center text-xs font-bold text-[#1d9bf0] hover:underline py-1.5"
            >
              Search for "{queryText}"
            </button>
          </div>
        )}
      </div>

      {/* Developer Spotlight Card */}
      <section className="p-4 rounded-2xl border border-[#2f3336] bg-[#16181c] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black border border-[#2f3336] flex items-center justify-center text-[#1d9bf0]">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-extrabold text-[#e7e9ea]">ASIF ANSARI</span>
              <VerifiedBadge size={15} />
            </div>
            <p className="text-xs text-[#71767b]">Lead Developer & Creator</p>
          </div>
        </div>
      </section>

      {/* Trending Topics Widget (What's Happening) */}
      <section className="p-4 rounded-2xl border border-[#2f3336] bg-[#16181c]">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-base font-extrabold text-[#e7e9ea]">What's happening</h3>
          <button
            onClick={() => onNavigate('explore')}
            className="text-xs font-semibold text-[#1d9bf0] hover:underline"
          >
            Show more
          </button>
        </div>

        <div className="space-y-3.5">
          {trends.map((trend, i) => (
            <div
              key={trend.tag || i}
              onClick={() => onHashtagClick(trend.tag)}
              className="group cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 py-1 rounded-xl transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] text-[#71767b]">
                <span>{trend.category || 'Trending'}</span>
                <span className="font-mono tabular-nums">{trend.velocity}% velocity</span>
              </div>
              <p className="text-sm font-bold text-[#e7e9ea] group-hover:text-[#1d9bf0] transition-colors mt-0.5">
                #{trend.tag}
              </p>
              <p className="text-[11px] text-[#71767b] font-mono tabular-nums mt-0.5">
                {trend.count} posts
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Who to Follow Widget */}
      <section className="p-4 rounded-2xl border border-[#2f3336] bg-[#16181c]">
        <h3 className="text-base font-extrabold text-[#e7e9ea] mb-3.5">Who to follow</h3>
        <div className="space-y-3.5">
          {suggestedUsers.map((user) => {
            const isFollowing = followingMap[user.uid];

            return (
              <div key={user.uid} className="flex items-center justify-between gap-2">
                <div
                  onClick={() => onUserClick(user.username)}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.username}`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/10 bg-neutral-900"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-[#e7e9ea] truncate group-hover:underline">
                        {user.displayName}
                      </span>
                      {user.verified && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-[11px] text-[#71767b] truncate font-mono">@{user.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFollowToggle(user.uid)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm ${
                    isFollowing
                      ? 'bg-black hover:bg-rose-500/10 text-white hover:text-rose-400 border border-[#536471]'
                      : 'bg-white hover:bg-neutral-200 text-black'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3 h-3" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Navigation & Developer Credit */}
      <footer className="px-2 pt-2 text-[11px] text-[#71767b] flex flex-wrap gap-x-3 gap-y-1">
        <button onClick={() => onNavigate('settings')} className="hover:underline">Settings</button>
        <button onClick={() => onNavigate('settings')} className="hover:underline">Privacy</button>
        <button onClick={() => onNavigate('communities')} className="hover:underline">Communities</button>
        <button onClick={() => onNavigate('settings')} className="hover:underline">Data Export</button>
        <p className="w-full mt-2 font-mono text-[10px] text-[#71767b]">
          Developed by <span className="text-[#e7e9ea] font-bold">ASIF ANSARI</span> · © 2026 ZOR Network
        </p>
      </footer>
    </aside>
  );
};
