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
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-slate-100">Thread Discussion</h2>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center items-center text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : !post ? (
        <div className="py-24 text-center text-xs text-slate-500">
          This post could not be found or has been removed.
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
              />
              {/* Visual Thread Connecting Line */}
              <div className="absolute left-9 bottom-0 top-14 w-0.5 bg-slate-800 pointer-events-none" />
            </div>
          )}

          {/* Focused Post */}
          <PostCard
            post={post}
            isDetailView={true}
            onUserClick={onUserClick}
            onHashtagClick={onHashtagClick}
            onMediaClick={onMediaClick}
          />

          {/* Reply Composer Bar */}
          <div className="border-y border-slate-800/80 bg-slate-950/40">
            <Composer
              replyTo={post}
              placeholder="Post your reply to this thread..."
              onPostCreated={handleReplyCreated}
            />
          </div>

          {/* Replies Stream */}
          <div className="divide-y divide-slate-800/80">
            {replies.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
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
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
