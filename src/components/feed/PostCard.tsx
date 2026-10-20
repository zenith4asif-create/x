import React, { useState } from 'react';
import { Post, PostMediaItem } from '../../types';
import { formatRelativeTime, formatCompactNumber, formatFullDate } from '../../utils/formatters';
import {
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Eye,
  BarChart3,
  Trash2,
  Flag,
  VolumeX,
  Volume2,
  Play,
  Pause,
  AlertTriangle,
  Link as LinkIcon
} from 'lucide-react';
import { VerifiedBadge } from '../brand/VerifiedBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { postService } from '../../services/postService';
import { userService } from '../../services/userService';
import { PollWidget } from './PollWidget';
import { XVideoPlayer } from './XVideoPlayer';

interface PostCardProps {
  post: Post;
  onPostClick?: (postId: string) => void;
  onUserClick?: (username: string) => void;
  onHashtagClick?: (tag: string) => void;
  onReplyClick?: (post: Post) => void;
  onQuoteClick?: (post: Post) => void;
  onAnalyticsClick?: (post: Post) => void;
  onReportClick?: (post: Post) => void;
  onMediaClick?: (media: PostMediaItem[], index: number) => void;
  onPostDeleted?: (postId: string) => void;
  isDetailView?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostClick,
  onUserClick,
  onHashtagClick,
  onReplyClick,
  onQuoteClick,
  onAnalyticsClick,
  onReportClick,
  onMediaClick,
  onPostDeleted,
  isDetailView = false
}) => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [liked, setLiked] = useState(Boolean(post.userLiked));
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [reposted, setReposted] = useState(Boolean(post.userReposted));
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [bookmarked, setBookmarked] = useState(Boolean(post.userBookmarked));
  const [showCw, setShowCw] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePoll, setActivePoll] = useState(post.poll);
  const [userVotedOptionId, setUserVotedOptionId] = useState(post.userVotedOptionId);

  const author = post.author;
  const isAuthor = currentUser?.uid === post.authorId;
  const isAdmin = userProfile?.role === 'admin';

  // Increment view count on mount
  React.useEffect(() => {
    postService.incrementViewCount(post.id);
  }, [post.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast('Please sign in to like posts', 'info');
      return;
    }
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await postService.toggleLike(post.id, currentUser.uid);
      setLiked(res.liked);
      setLikeCount(res.newCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      showToast('Failed to update like', 'error');
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast('Please sign in to repost', 'info');
      return;
    }
    const prev = reposted;
    const prevCount = repostCount;
    setReposted(!prev);
    setRepostCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await postService.toggleRepost(post.id, currentUser.uid);
      setReposted(res.reposted);
      setRepostCount(res.newCount);
      showToast(res.reposted ? 'Reposted to your profile' : 'Repost removed', 'success');
    } catch {
      setReposted(prev);
      setRepostCount(prevCount);
      showToast('Failed to repost', 'error');
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast('Please sign in to bookmark', 'info');
      return;
    }
    const prev = bookmarked;
    setBookmarked(!prev);

    try {
      const res = await postService.toggleBookmark(post.id, currentUser.uid);
      setBookmarked(res.bookmarked);
      showToast(res.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks', 'success');
    } catch {
      setBookmarked(prev);
      showToast('Failed to bookmark', 'error');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${author?.username || 'user'} on ZOR`,
          text: post.text,
          url
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(url);
    showToast('Post link copied to clipboard', 'success');
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    setMenuOpen(false);
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await postService.deletePost(post.id, currentUser.uid, isAdmin);
      showToast('Post deleted', 'success');
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete post', 'error');
    }
  };

  const handleVotePoll = async (optionId: string) => {
    if (!currentUser) {
      showToast('Please sign in to vote', 'info');
      return;
    }
    try {
      const updated = await postService.votePoll(post.id, optionId, currentUser.uid);
      setActivePoll(updated);
      setUserVotedOptionId(optionId);
      showToast('Vote submitted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to vote', 'error');
    }
  };

  // Render text with clickable #hashtags and @mentions
  const renderFormattedText = (content: string) => {
    if (!content) return null;
    const tokens = content.split(/(\s+)/);

    return tokens.map((part, index) => {
      if (part.startsWith('#') && part.length > 1) {
        const cleanTag = part.slice(1).replace(/[^a-zA-Z0-9_]/g, '');
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              if (onHashtagClick) onHashtagClick(cleanTag);
            }}
            className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-medium"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        const cleanUser = part.slice(1).replace(/[^a-zA-Z0-9_]/g, '');
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              if (onUserClick) onUserClick(cleanUser);
            }}
            className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer font-medium"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-indigo-400 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isRepost = Boolean((post as any).repostedByUid || post.repostOf);

  return (
    <article
      onClick={() => onPostClick && onPostClick(post.id)}
      className={`relative px-4 py-3 border-b border-[#2f3336] hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer ${
        isDetailView ? 'bg-transparent' : 'bg-black'
      }`}
    >
      {/* Repost Header Indicator (X Style) */}
      {isRepost && (
        <div className="flex items-center gap-2 text-xs font-bold text-[#71767b] mb-1.5 ml-8">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>Reposted</span>
        </div>
      )}

      <div className="flex gap-3 items-start">
        {/* User Avatar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (author && onUserClick) onUserClick(author.username);
          }}
          className="shrink-0 relative cursor-pointer group"
        >
          <img
            src={author?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${post.authorId}`}
            alt={author?.displayName || 'User'}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 group-hover:opacity-90 transition-all bg-neutral-900"
          />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Name, Username, Time, Menu */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 text-sm">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (author && onUserClick) onUserClick(author.username);
                }}
                className="font-bold text-[#e7e9ea] hover:underline truncate cursor-pointer"
              >
                {author?.displayName || 'User'}
              </span>

              {author?.verified && (
                <VerifiedBadge size={16} />
              )}

              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (author && onUserClick) onUserClick(author.username);
                }}
                className="text-[#71767b] truncate text-xs cursor-pointer font-mono"
              >
                @{author?.username || 'user'}
              </span>

              <span className="text-[#71767b] text-xs" aria-hidden="true">·</span>

              <time
                dateTime={new Date(post.createdAt).toISOString()}
                title={formatFullDate(post.createdAt)}
                className="text-[#71767b] text-xs shrink-0 hover:underline"
              >
                {formatRelativeTime(post.createdAt)}
              </time>
            </div>

            {/* Post Options Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1.5 rounded-full text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-black border border-[#2f3336] shadow-2xl py-1.5 z-40 text-xs animate-in zoom-in-95 duration-150">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        handleShare(e);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[#e7e9ea] hover:bg-white/10 transition-colors font-medium text-left"
                    >
                      <LinkIcon className="w-4 h-4 text-[#71767b]" />
                      <span>Copy link to post</span>
                    </button>

                    {isAuthor && onAnalyticsClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onAnalyticsClick(post);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[#e7e9ea] hover:bg-white/10 transition-colors font-medium text-left"
                      >
                        <BarChart3 className="w-4 h-4 text-[#71767b]" />
                        <span>View post analytics</span>
                      </button>
                    )}

                    {onQuoteClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onQuoteClick(post);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[#e7e9ea] hover:bg-white/10 transition-colors font-medium text-left"
                      >
                        <Repeat2 className="w-4 h-4 text-[#71767b]" />
                        <span>Quote post</span>
                      </button>
                    )}

                    {!isAuthor && onReportClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onReportClick(post);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-amber-400 hover:bg-amber-500/10 transition-colors font-medium text-left"
                      >
                        <Flag className="w-4 h-4" />
                        <span>Report post</span>
                      </button>
                    )}

                    {(isAuthor || isAdmin) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[#f4212e] hover:bg-rose-500/10 transition-colors border-t border-[#2f3336] mt-1 font-bold text-left"
                      >
                        <Trash2 className="w-4 h-4 text-[#f4212e]" />
                        <span>Delete post</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content Warning Spoiler */}
          {post.contentWarning && !showCw && (
            <div className="mt-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-950/20 flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>CW: {post.contentWarning}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCw(true);
                }}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-medium transition-colors"
              >
                Show content
              </button>
            </div>
          )}

          {/* Post Text */}
          {(!post.contentWarning || showCw) && post.text && (
            <p className="mt-2 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {renderFormattedText(post.text)}
            </p>
          )}

          {/* Media Attachments */}
          {(!post.contentWarning || showCw) && post.media && post.media.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800/80">
              {post.media.length === 1 ? (
                post.media[0].type === 'video' ? (
                  <div className="w-full overflow-hidden bg-black">
                    <XVideoPlayer
                      src={post.media[0].cloudinaryUrl}
                      poster={post.media[0].thumbnailUrl}
                      onExpand={() => {
                        if (onMediaClick) onMediaClick(post.media!, 0);
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onMediaClick) onMediaClick(post.media!, 0);
                    }}
                    className="relative max-h-[460px] w-full overflow-hidden bg-black group cursor-pointer"
                  >
                    <img
                      src={post.media[0].cloudinaryUrl}
                      alt="Post visual attachment"
                      referrerPolicy="no-referrer"
                      className="w-full max-h-[460px] object-cover group-hover:opacity-95 transition-opacity"
                    />
                  </div>
                )
              ) : (
                <div className={`grid gap-0.5 bg-[#2f3336] ${post.media.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {post.media.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMediaClick) onMediaClick(post.media!, idx);
                      }}
                      className="relative h-44 sm:h-52 overflow-hidden bg-black group cursor-pointer"
                    >
                      <img
                        src={item.thumbnailUrl || item.cloudinaryUrl}
                        alt="Post visual"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-white">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Poll Component */}
          {(!post.contentWarning || showCw) && activePoll && (
            <div onClick={(e) => e.stopPropagation()}>
              <PollWidget
                poll={activePoll}
                postId={post.id}
                userVotedOptionId={userVotedOptionId}
                onVote={handleVotePoll}
              />
            </div>
          )}

          {/* Quoted Post Embed (X Style) */}
          {post.quotePost && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onPostClick) onPostClick(post.quotePost!.id);
              }}
              className="mt-3 p-3 rounded-2xl border border-[#2f3336] bg-black hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={post.quotePost.author?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${post.quotePost.authorId}`}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="font-bold text-xs text-[#e7e9ea]">
                  {post.quotePost.author?.displayName || 'User'}
                </span>
                <span className="text-[#71767b] text-xs font-mono">@{post.quotePost.author?.username}</span>
                <span className="text-[#71767b] text-xs">·</span>
                <span className="text-[#71767b] text-xs">{formatRelativeTime(post.quotePost.createdAt)}</span>
              </div>
              <p className="text-xs text-[#e7e9ea] line-clamp-3">{post.quotePost.text}</p>
            </div>
          )}

          {/* Action Row (Modern X Interactive Buttons) */}
          <div className="mt-3 flex items-center justify-between text-[#71767b] max-w-md select-none text-xs">
            {/* Reply */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onReplyClick) onReplyClick(post);
              }}
              className="flex items-center gap-1.5 hover:text-[#1d9bf0] transition-colors p-1.5 -ml-1.5 rounded-full hover:bg-[#1d9bf0]/10 group"
              title="Reply"
            >
              <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-mono tabular-nums">{formatCompactNumber(post.replyCount || 0)}</span>
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-[#00ba7c]/10 group ${
                reposted ? 'text-[#00ba7c] font-semibold' : 'hover:text-[#00ba7c]'
              }`}
              title="Repost"
            >
              <Repeat2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-mono tabular-nums">{formatCompactNumber(repostCount)}</span>
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-[#f91880]/10 group ${
                liked ? 'text-[#f91880] font-semibold' : 'hover:text-[#f91880]'
              }`}
              title="Like"
            >
              <Heart
                className={`w-4 h-4 group-hover:scale-110 transition-transform ${
                  liked ? 'fill-[#f91880] text-[#f91880]' : ''
                }`}
              />
              <span className="font-mono tabular-nums">{formatCompactNumber(likeCount)}</span>
            </button>

            {/* Views */}
            <div
              className="flex items-center gap-1 text-[#71767b] hover:text-[#1d9bf0] p-1.5"
              title={`${post.viewCount || 0} views`}
            >
              <Eye className="w-4 h-4" />
              <span className="font-mono tabular-nums">{formatCompactNumber(post.viewCount || 0)}</span>
            </div>

            {/* Bookmark & Share */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleBookmark}
                className={`p-1.5 rounded-full hover:bg-[#1d9bf0]/10 transition-colors group ${
                  bookmarked ? 'text-[#1d9bf0]' : 'hover:text-[#1d9bf0]'
                }`}
                title="Bookmark"
              >
                <Bookmark
                  className={`w-4 h-4 group-hover:scale-110 transition-transform ${
                    bookmarked ? 'fill-[#1d9bf0]' : ''
                  }`}
                />
              </button>

              <button
                onClick={handleShare}
                className="p-1.5 rounded-full text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
