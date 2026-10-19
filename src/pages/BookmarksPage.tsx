import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { feedService } from '../services/feedService';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/feed/PostCard';
import { Bookmark, Loader2 } from 'lucide-react';

interface BookmarksPageProps {
  onPostClick: (postId: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onMediaClick: (media: any[], index: number) => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({
  onPostClick,
  onUserClick,
  onHashtagClick,
  onMediaClick
}) => {
  const { currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    feedService.getBookmarkedPosts(currentUser.uid).then((list) => {
      setPosts(list);
      setLoading(false);
    });
  }, [currentUser]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-100">Saved Bookmarks</h2>
        <p className="text-[11px] text-slate-400">@{userProfile?.username || 'user'}</p>
      </div>

      <div className="divide-y divide-slate-800/80">
        {loading ? (
          <div className="py-24 flex justify-center items-center text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : !currentUser ? (
          <div className="py-20 text-center px-4">
            <p className="text-xs text-slate-400">Sign in to view your saved bookmarks.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center px-4">
            <Bookmark className="w-8 h-8 text-indigo-400/60 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-100">Save posts for later</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              Click the bookmark icon on any post to easily reference it here anytime.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostClick={onPostClick}
              onUserClick={onUserClick}
              onHashtagClick={onHashtagClick}
              onMediaClick={onMediaClick}
              onPostDeleted={handlePostDeleted}
            />
          ))
        )}
      </div>
    </div>
  );
};
