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
    <div className="min-h-screen bg-black text-[#e7e9ea] pb-16">
      <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-[#2f3336] px-4 py-3">
        <h2 className="text-base font-black text-[#e7e9ea]">Bookmarks</h2>
        <p className="text-xs text-[#71767b] font-mono">@{userProfile?.username || 'user'}</p>
      </div>

      <div className="divide-y divide-[#2f3336]">
        {loading ? (
          <div className="py-24 flex justify-center items-center text-[#71767b]">
            <Loader2 className="w-7 h-7 animate-spin text-[#1d9bf0]" />
          </div>
        ) : !currentUser ? (
          <div className="py-24 text-center px-4">
            <h3 className="text-base font-bold text-[#e7e9ea]">Save posts for later</h3>
            <p className="text-xs text-[#71767b] mt-1 max-w-xs mx-auto">
              Sign in to your real account to save posts and easily access them anytime.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center px-4">
            <Bookmark className="w-10 h-10 text-[#71767b] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#e7e9ea]">Save posts for later</h3>
            <p className="text-xs text-[#71767b] max-w-xs mx-auto mt-1">
              Don’t let the good ones fly away! Bookmark posts to easily find them again in the future.
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
