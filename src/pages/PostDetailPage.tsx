import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { postService } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/feed/PostCard';
import { Composer } from '../components/feed/Composer';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface PostDetailPageProps {
  postId: string;
  onBack: () => void;
  onPostClick: (postId: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onMediaClick: (media: any[], index: number) => void;
}

export const PostDetailPage: React.FC<PostDetailPageProps> = ({
  postId,
  onBack,
  onPostClick,
  onUserClick,
  onHashtagClick,
  onMediaClick
}) => {
  const { currentUser } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [parentPost, setParentPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadThread = async () => {
      try {
        const target = await postService.getPostById(postId, currentUser?.uid);
        if (!target || !isMounted) return;

        setPost(target);

        // If this post is a reply to another post, fetch the parent
        if (target.replyTo) {
          const parent = await postService.getPostById(target.replyTo, currentUser?.uid);
          if (isMounted) setParentPost(parent);
        } else {
          if (isMounted) setParentPost(null);
        }

        // Fetch replies to this post
        const threadReplies = await postService.getRepliesForPost(postId, currentUser?.uid);
        if (isMounted) setReplies(threadReplies);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadThread();
    return () => {
      isMounted = false;
    };
  }, [postId, currentUser]);

  const handleReplyCreated = (newReply: Post) => {
    setReplies((prev) => [newReply, ...prev]);
    if (post) {
      setPost({ ...post, replyCount: (post.replyCount || 0) + 1 });
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-[#2f3336] px-4 py-3 flex items-center gap-6">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full text-[#e7e9ea] hover:bg-white/10 transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-extrabold text-[#e7e9ea]">Post</h2>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col justify-center items-center text-[#71767b]">
          <Loader2 className="w-8 h-8 animate-spin text-[#1d9bf0]" />
          <span className="text-xs mt-3 font-mono">Loading post...</span>
        </div>
      ) : !post ? (
        <div className="py-24 text-center px-4">
          <h3 className="text-base font-bold text-[#e7e9ea]">Post unavailable</h3>
          <p className="text-xs text-[#71767b] mt-1">This post has been deleted by its author.</p>
          <button
            onClick={onBack}
            className="mt-4 px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
          >
            Go back
          </button>
        </div>
      ) : (
        <div>
          {/* Parent Post if this is a reply */}
          {parentPost && (
            <div className="relative">
              <PostCard
                post={parentPost}
                onPostClick={onPostClick}
                onUserClick={onUserClick}
                onHashtagClick={onHashtagClick}
                onMediaClick={onMediaClick}
                onPostDeleted={() => setParentPost(null)}
              />
              {/* Visual Thread Connecting Line */}
              <div className="absolute left-9 bottom-0 top-14 w-0.5 bg-[#2f3336] pointer-events-none" />
            </div>
          )}

          {/* Focused Post */}
          <PostCard
            post={post}
            isDetailView={true}
            onUserClick={onUserClick}
            onHashtagClick={onHashtagClick}
            onMediaClick={onMediaClick}
            onPostDeleted={() => onBack()}
          />

          {/* Reply Composer Bar */}
          <div className="border-y border-[#2f3336] bg-black">
            <Composer
              replyTo={post}
              placeholder="Post your reply"
              onPostCreated={handleReplyCreated}
            />
          </div>

          {/* Replies Stream */}
          <div className="divide-y divide-[#2f3336]">
            {replies.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#71767b]">
                No replies yet. Be the first to start the conversation!
              </div>
            ) : (
              replies.map((reply) => (
                <PostCard
                  key={reply.id}
                  post={reply}
                  onPostClick={onPostClick}
                  onUserClick={onUserClick}
                  onHashtagClick={onHashtagClick}
                  onMediaClick={onMediaClick}
                  onPostDeleted={(rId) => setReplies((prev) => prev.filter((r) => r.id !== rId))}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
