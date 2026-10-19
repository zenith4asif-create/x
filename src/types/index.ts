export interface UserProfile {
  uid: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  website?: string;
  location?: string;
  birthDate?: string;
  verified: boolean;
  role: 'user' | 'moderator' | 'admin';
  createdAt: number;
  updatedAt?: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesCount: number;
  accountStatus: 'active' | 'suspended';
  pinnedPostId?: string;
  privacySettings?: {
    isPrivate?: boolean;
    allowDMsFromEveryone?: boolean;
    showOnlineStatus?: boolean;
    allowMentions?: boolean;
  };
}

export interface PostMediaItem {
  id: string;
  type: 'image' | 'video';
  cloudinaryUrl: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  duration?: number;
  publicId?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  expiresAt: number;
  totalVotes: number;
  voters?: Record<string, string>; // uid -> optionId
}

export interface Post {
  id: string;
  authorId: string;
  text: string;
  media?: PostMediaItem[];
  replyTo?: string; // parent postId if this is a reply
  rootReplyTo?: string; // original root postId of conversation
  quotePostId?: string;
  repostOf?: string;
  createdAt: number;
  updatedAt?: number;
  visibility: 'public' | 'followers' | 'community';
  communityId?: string;
  language?: string;
  hashtags?: string[];
  mentions?: string[];
  contentWarning?: string;
  poll?: PollData;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  status: 'active' | 'removed' | 'flagged';
  
  // Hydrated references
  author?: UserProfile;
  quotePost?: Post;
  repostPost?: Post;
  userLiked?: boolean;
  userReposted?: boolean;
  userBookmarked?: boolean;
  userVotedOptionId?: string;
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'reply' | 'repost' | 'quote' | 'follow' | 'mention' | 'dm' | 'system';
  actorId: string;
  postId?: string;
  postText?: string;
  createdAt: number;
  read: boolean;
  actor?: UserProfile;
}

export interface Conversation {
  id: string;
  members: Record<string, boolean>; // uid -> true
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: number;
  };
  updatedAt: number;
  otherUser?: UserProfile;
  unreadCount?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  media?: PostMediaItem[];
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;
  seenBy?: Record<string, number>; // uid -> timestamp
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  bannerUrl?: string;
  ownerId: string;
  createdAt: number;
  memberCount: number;
  privacy: 'public' | 'restricted' | 'private';
  status: 'active' | 'archived';
  isMember?: boolean;
  userRole?: 'owner' | 'admin' | 'moderator' | 'member';
}

export interface ReportItem {
  id: string;
  reporterId: string;
  targetType: 'post' | 'user' | 'community';
  targetId: string;
  reason: 'spam' | 'harassment' | 'impersonation' | 'copyright' | 'unsafe' | 'misleading' | 'other';
  details?: string;
  createdAt: number;
  status: 'pending' | 'resolved' | 'dismissed';
  reporter?: UserProfile;
  targetPost?: Post;
  targetUser?: UserProfile;
}

export interface TrendItem {
  tag: string;
  score: number;
  postCount?: number;
  count?: number;
  velocity: number;
  category?: string;
}

export interface PostAnalytics {
  postId: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  engagementRate: number; // percentage
}

export interface DraftItem {
  id: string;
  text: string;
  media?: PostMediaItem[];
  pollQuestion?: string;
  pollOptions?: string[];
  contentWarning?: string;
  replyTo?: string;
  updatedAt: number;
}
