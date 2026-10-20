import React, { useState, useEffect } from 'react';
import { UserProfile, Post, PostMediaItem } from '../types';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PostCard } from '../components/feed/PostCard';
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  UserPlus,
  UserCheck,
  Mail,
  Loader2,
  ArrowLeft,
  Repeat2,
  Play,
  Grid,
  List,
  LogOut
} from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';
import { formatCompactNumber } from '../utils/formatters';

interface ProfilePageProps {
  username: string;
  onBack?: () => void;
  onPostClick: (postId: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onOpenEditProfile: () => void;
  onOpenFollowList: (uid: string, type: 'followers' | 'following') => void;
  onOpenMessageWithUser: (uid: string) => void;
  onMediaClick: (media: any[], index: number) => void;
}

type ProfileTab = 'posts' | 'replies' | 'reposts' | 'media' | 'likes';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  username,
  onBack,
  onPostClick,
  onUserClick,
  onHashtagClick,
  onOpenEditProfile,
  onOpenFollowList,
  onOpenMessageWithUser,
  onMediaClick
}) => {
  const { currentUser, userProfile: myProfile, signOut } = useAuth();
  const { showToast } = useToast();

  const isMe =
    Boolean(currentUser && myProfile && (
      !username ||
      myProfile.username.toLowerCase() === username.toLowerCase() ||
      myProfile.uid === username ||
      currentUser.uid === username
    ));

  const [profile, setProfile] = useState<UserProfile | null>(isMe ? myProfile : null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [mediaViewMode, setMediaViewMode] = useState<'grid' | 'cards'>('grid');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadProfileData = async () => {
      try {
        let u: UserProfile | null = null;
        if (isMe && myProfile) {
          u = myProfile;
        } else if (username) {
          u = await userService.getUserByUsername(username);
        }

        if (!u && isMe && myProfile) {
          u = myProfile;
        }

        if (!u && currentUser && myProfile) {
          u = myProfile;
        }

        if (!u || !isMounted) {
          setLoading(false);
          return;
        }

        setProfile(u);

        if (currentUser && currentUser.uid !== u.uid) {
          const following = await userService.isFollowing(currentUser.uid, u.uid);
          if (isMounted) setIsFollowing(following);
        }

        // Fetch posts according to activeTab
        let tabPosts: Post[] = [];
        if (activeTab === 'posts') {
          tabPosts = await postService.getUserPosts(u.uid, currentUser?.uid);
        } else if (activeTab === 'replies') {
          tabPosts = await postService.getUserReplies(u.uid, currentUser?.uid);
        } else if (activeTab === 'reposts') {
          tabPosts = await postService.getUserReposts(u.uid, currentUser?.uid);
        } else if (activeTab === 'media') {
          tabPosts = await postService.getUserMedia(u.uid, currentUser?.uid);
        } else if (activeTab === 'likes') {
          tabPosts = await postService.getUserLikes(u.uid, currentUser?.uid);
        }

        if (isMounted) setPosts(tabPosts);
      } catch (err) {
        console.error('Error loading profile data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfileData();
    return () => {
      isMounted = false;
    };
  }, [username, activeTab, currentUser, isMe, myProfile]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) {
      showToast('Please sign in to follow users', 'info');
      return;
    }

    setFollowSubmitting(true);
    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      if (prev) {
        await userService.unfollowUser(currentUser.uid, profile.uid);
        setProfile((p) => (p ? { ...p, followersCount: Math.max(0, (p.followersCount || 1) - 1) } : p));
        showToast(`Unfollowed @${profile.username}`, 'info');
      } else {
        await userService.followUser(currentUser.uid, profile.uid);
        setProfile((p) => (p ? { ...p, followersCount: (p.followersCount || 0) + 1 } : p));
        showToast(`Following @${profile.username}`, 'success');
      }
    } catch {
      setIsFollowing(prev);
      showToast('Action failed', 'error');
    } finally {
      setFollowSubmitting(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="py-32 flex flex-col justify-center items-center text-[#71767b]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1d9bf0]" />
        <span className="text-xs mt-3 font-mono">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-24 text-center px-4 bg-black min-h-screen">
        <h2 className="text-lg font-bold text-[#e7e9ea]">This account doesn’t exist</h2>
        <p className="text-xs text-[#71767b] mt-1.5">Try searching for another username or profile.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-5 px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors"
          >
            Go back
          </button>
        )}
      </div>
    );
  }

  // Extract all media items for the media grid
  const allMediaItems: { media: PostMediaItem; post: Post }[] = [];
  if (activeTab === 'media') {
    posts.forEach((p) => {
      if (p.media && p.media.length > 0) {
        p.media.forEach((m) => {
          allMediaItems.push({ media: m, post: p });
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea] pb-16">
      {/* Top sticky header */}
      <div className="sticky top-0 z-30 bg-black/85 backdrop-blur-md border-b border-[#2f3336] px-4 py-2 flex items-center gap-6">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-[#e7e9ea] hover:bg-white/10 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-extrabold text-[#e7e9ea] truncate">{profile.displayName}</h2>
            {profile.verified && <VerifiedBadge size={16} />}
          </div>
          <span className="text-xs text-[#71767b] font-mono tabular-nums">
            {formatCompactNumber(profile.postsCount || 0)} posts
          </span>
        </div>
      </div>

      {/* Cover / Banner (Pure dark styling, no clipping) */}
      <div className="relative w-full h-40 sm:h-52 bg-neutral-900 border-b border-[#2f3336] overflow-hidden">
        {profile.bannerUrl ? (
          <img
            src={profile.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#16181c] via-[#202327] to-[#16181c]" />
        )}
      </div>

      {/* Profile Header & Info Details */}
      <div className="relative px-4 pb-4">
        {/* Avatar & Action Button Row (X Style: Avatar sits cleanly half over banner without clipping) */}
        <div className="flex items-end justify-between -mt-16 sm:-mt-20 mb-3.5">
          <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-black bg-black shadow-2xl overflow-hidden ring-2 ring-black shrink-0">
            <img
              src={profile.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.username}`}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center gap-2 pb-1">
            {isMe ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenEditProfile}
                  className="px-5 py-2 rounded-full border border-[#536471] bg-black hover:bg-white/10 text-white text-xs font-bold transition-all shadow-sm"
                >
                  Edit profile
                </button>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 rounded-full border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Log out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenMessageWithUser(profile.uid)}
                  className="p-2.5 rounded-full border border-[#536471] bg-black hover:bg-white/10 text-white transition-colors"
                  title="Direct Message"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFollowToggle}
                  disabled={followSubmitting}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                    isFollowing
                      ? 'bg-black border border-[#536471] text-white hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Display Name, Verified Badge, Username */}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold text-[#e7e9ea] tracking-tight">{profile.displayName}</h1>
            {profile.verified && <VerifiedBadge size={18} />}
          </div>
          <p className="text-xs text-[#71767b] font-mono mt-0.5">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-sm text-[#e7e9ea] leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        {/* Location, Website, Joined Date */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#71767b]">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#71767b]" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 text-[#71767b]" />
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1d9bf0] hover:underline"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#71767b]" />
            <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Following & Followers counts */}
        <div className="mt-3.5 flex items-center gap-5 text-xs">
          <button
            onClick={() => onOpenFollowList(profile.uid, 'following')}
            className="hover:underline flex items-center gap-1"
          >
            <span className="font-bold text-[#e7e9ea] font-mono tabular-nums">
              {formatCompactNumber(profile.followingCount || 0)}
            </span>
            <span className="text-[#71767b]">Following</span>
          </button>
          <button
            onClick={() => onOpenFollowList(profile.uid, 'followers')}
            className="hover:underline flex items-center gap-1"
          >
            <span className="font-bold text-[#e7e9ea] font-mono tabular-nums">
              {formatCompactNumber(profile.followersCount || 0)}
            </span>
            <span className="text-[#71767b]">Followers</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Modern X UI: Posts, Replies, Reposts, Media, Likes) */}
      <div className="flex items-center border-y border-[#2f3336] bg-black/90 backdrop-blur-md sticky top-12 z-20 text-xs font-bold">
        {[
          { id: 'posts', label: 'Posts' },
          { id: 'replies', label: 'Replies' },
          { id: 'reposts', label: 'Reposts' },
          { id: 'media', label: 'Media' },
          { id: 'likes', label: 'Likes' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ProfileTab)}
            className={`flex-1 py-3.5 text-center transition-colors relative hover:bg-white/[0.03] ${
              activeTab === tab.id ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:text-[#e7e9ea]'
            }`}
          >
            <span className="relative">
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute -bottom-3.5 inset-x-0 h-1 bg-[#1d9bf0] rounded-full" />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Media Layout View Switcher (Only when in media tab) */}
      {activeTab === 'media' && posts.length > 0 && (
        <div className="px-4 py-2 border-b border-[#2f3336] flex items-center justify-between text-xs text-[#71767b] bg-black">
          <span>{allMediaItems.length} media item{allMediaItems.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMediaViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                mediaViewMode === 'grid' ? 'bg-white/10 text-white' : 'text-[#71767b] hover:text-white'
              }`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMediaViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                mediaViewMode === 'cards' ? 'bg-white/10 text-white' : 'text-[#71767b] hover:text-white'
              }`}
              title="Posts view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Posts Stream / Media Stream */}
      <div>
        {loading ? (
          <div className="py-20 flex flex-col justify-center items-center text-[#71767b]">
            <Loader2 className="w-7 h-7 animate-spin text-[#1d9bf0]" />
            <span className="text-xs mt-2.5 font-mono">Loading {activeTab}...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center px-4">
            <h3 className="text-base font-bold text-[#e7e9ea]">
              No {activeTab} yet
            </h3>
            <p className="text-xs text-[#71767b] mt-1 max-w-sm mx-auto">
              {activeTab === 'posts' && `@${profile.username} hasn't posted anything yet.`}
              {activeTab === 'replies' && `@${profile.username} hasn't posted any replies.`}
              {activeTab === 'reposts' && `@${profile.username} hasn't reposted any posts yet.`}
              {activeTab === 'media' && `@${profile.username} hasn't shared any photos or videos.`}
              {activeTab === 'likes' && `@${profile.username} hasn't liked any posts yet.`}
            </p>
          </div>
        ) : activeTab === 'media' && mediaViewMode === 'grid' ? (
          /* X-Style 3-Column Media Grid */
          <div className="grid grid-cols-3 gap-1 p-1 bg-black">
            {allMediaItems.map((item, idx) => (
              <div
                key={item.media.id || idx}
                onClick={() => onMediaClick([item.media], 0)}
                className="relative aspect-square bg-[#16181c] overflow-hidden group cursor-pointer border border-[#2f3336]/40 hover:opacity-90 transition-opacity"
              >
                <img
                  src={item.media.thumbnailUrl || item.media.cloudinaryUrl}
                  alt="Media item"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {item.media.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="p-2 rounded-full bg-black/60 backdrop-blur-sm text-white">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  </div>
                )}
                {/* Overlay with post author */}
                <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-[10px] text-white">
                  <span className="truncate">@{item.post.author?.username}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onPostClick={onPostClick}
              onUserClick={onUserClick}
              onHashtagClick={onHashtagClick}
              onMediaClick={onMediaClick}
              onPostDeleted={(deletedId) => setPosts((prev) => prev.filter((item) => item.id !== deletedId))}
            />
          ))
        )}
      </div>
    </div>
  );
};
