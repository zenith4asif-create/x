import { Post, UserProfile } from '../types';
import { userService } from './userService';

export interface RecommendationContext {
  currentUid?: string;
  followingIds: Set<string>;
  blockedIds: Set<string>;
  mutedIds: Set<string>;
  userInterests?: string[];
}

export const recommendationEngine = {
  /**
   * Run the full multi-stage recommendation pipeline on a pool of candidate posts
   */
  async rankFeed(
    candidates: Post[],
    context: RecommendationContext
  ): Promise<Post[]> {
    const { currentUid, followingIds, blockedIds, mutedIds, userInterests = [] } = context;

    // Stage 1: Safety & Hard Filtering
    const validCandidates = candidates.filter((post) => {
      if (post.status !== 'active') return false;
      if (blockedIds.has(post.authorId)) return false;
      if (mutedIds.has(post.authorId)) return false;
      if (post.visibility === 'followers' && currentUid && !followingIds.has(post.authorId) && post.authorId !== currentUid) {
        return false;
      }
      return true;
    });

    if (validCandidates.length === 0) return [];

    const now = Date.now();
    const scoredPosts: { post: Post; score: number }[] = [];

    // Stage 2 & 3: Multi-factor Scoring
    for (const post of validCandidates) {
      let score = 0;

      // 1. Relationship Score (Following gets high affinity, self gets moderate)
      if (currentUid && post.authorId === currentUid) {
        score += 35;
      } else if (followingIds.has(post.authorId)) {
        score += 80;
      }

      // 2. Freshness Score (Exponential decay over time)
      const ageHours = Math.max(0.01, (now - post.createdAt) / (1000 * 60 * 60));
      // Fresh posts within 6 hours get high boost, decays gracefully
      const freshnessScore = Math.max(0, 100 * Math.exp(-0.08 * ageHours));
      score += freshnessScore;

      // 3. Engagement Score (Logarithmic dampening to prevent viral runaway)
      const likes = post.likeCount || 0;
      const replies = post.replyCount || 0;
      const reposts = post.repostCount || 0;
      const quotes = post.quoteCount || 0;
      const bookmarks = post.bookmarkCount || 0;
      const views = post.viewCount || 0;

      const engagementScore =
        likes * 4.0 +
        replies * 7.0 +
        reposts * 8.0 +
        quotes * 6.0 +
        bookmarks * 5.0 +
        Math.min(30, Math.log10(views + 1) * 8);

      score += engagementScore;

      // 4. Quality & Media Score
      if (post.media && post.media.length > 0) {
        score += 15; // Visual media attracts higher attention
      }
      if (post.poll) {
        score += 12; // Interactive polls drive community participation
      }
      if (post.text && post.text.length > 80) {
        score += 6; // Thoughtful longer posts
      }

      // 5. Interest & Hashtag Relevance
      if (userInterests.length > 0 && post.hashtags && post.hashtags.length > 0) {
        const matches = post.hashtags.filter((tag) => userInterests.includes(tag.toLowerCase()));
        score += matches.length * 20;
      }

      // 6. Verified Author bonus
      if (post.author?.verified) {
        score += 10;
      }

      scoredPosts.push({ post, score });
    }

    // Stage 4: Initial sort by score
    scoredPosts.sort((a, b) => b.score - a.score);

    // Stage 5: Diversity Pass & Repetition Penalty (prevent 1 author dominating feed)
    const finalFeed: Post[] = [];
    const authorPostCount = new Map<string, number>();

    for (const item of scoredPosts) {
      const authorId = item.post.authorId;
      const currentAuthorCount = authorPostCount.get(authorId) || 0;

      // Apply author repetition penalty if author appeared in recent feed
      if (currentAuthorCount >= 3) {
        // Skip or push back
        continue;
      }

      authorPostCount.set(authorId, currentAuthorCount + 1);
      finalFeed.push(item.post);
    }

    // If feed is short, include remainder
    if (finalFeed.length < scoredPosts.length && finalFeed.length < 15) {
      for (const item of scoredPosts) {
        if (!finalFeed.includes(item.post)) {
          finalFeed.push(item.post);
        }
      }
    }

    return finalFeed;
  }
};
