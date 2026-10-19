import { Post, PostAnalytics } from '../types';
import { postService } from './postService';
import { userService } from './userService';

export const analyticsService = {
  /**
   * Calculate detailed analytics for a post
   */
  getPostAnalytics(post: Post): PostAnalytics {
    const views = post.viewCount || 0;
    const likes = post.likeCount || 0;
    const replies = post.replyCount || 0;
    const reposts = post.repostCount || 0;
    const quotes = post.quoteCount || 0;
    const bookmarks = post.bookmarkCount || 0;

    const totalEngagements = likes + replies + reposts + quotes + bookmarks;
    const baseViews = Math.max(views, totalEngagements, 1);
    const engagementRate = Math.min(100, Number(((totalEngagements / baseViews) * 100).toFixed(1)));

    return {
      postId: post.id,
      views,
      likes,
      replies,
      reposts,
      quotes,
      bookmarks,
      engagementRate
    };
  },

  /**
   * Export complete user archive as JSON (GDPR / Data portability compliance - Section 46)
   */
  async exportUserData(uid: string): Promise<string> {
    const [profile, posts, replies, bookmarks] = await Promise.all([
      userService.getUserProfile(uid),
      postService.getUserPosts(uid),
      postService.getUserReplies(uid),
      postService.getUserLikes(uid)
    ]);

    const archive = {
      exportTimestamp: new Date().toISOString(),
      platform: 'ZOR Social Network',
      user: profile,
      posts,
      replies,
      likedPosts: bookmarks
    };

    return JSON.stringify(archive, null, 2);
  }
};
