import { ref, get, query, limitToLast, limitToFirst } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { Post, UserProfile, Community, TrendItem } from '../types';
import { postService } from './postService';

export const searchService = {
  /**
   * Search users by prefix, partial match on username or displayName
   */
  async searchUsers(queryText: string, maxLimit = 15): Promise<UserProfile[]> {
    const q = queryText.trim().toLowerCase().replace('@', '');
    if (!q) return [];

    try {
      const usersSnap = await get(query(ref(rtdb, 'users'), limitToFirst(100)));
      if (!usersSnap.exists()) return [];

      const matches: UserProfile[] = [];
      usersSnap.forEach((child) => {
        const u = child.val() as UserProfile;
        if (u.accountStatus === 'active') {
          const uName = (u.username || '').toLowerCase();
          const dName = (u.displayName || '').toLowerCase();
          if (uName.includes(q) || dName.includes(q)) {
            matches.push(u);
          }
        }
      });

      // Rank exact prefix matches higher
      matches.sort((a, b) => {
        const aPrefix = a.username.toLowerCase().startsWith(q) || a.displayName.toLowerCase().startsWith(q);
        const bPrefix = b.username.toLowerCase().startsWith(q) || b.displayName.toLowerCase().startsWith(q);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;
        return (b.followersCount || 0) - (a.followersCount || 0);
      });

      return matches.slice(0, maxLimit);
    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  },

  /**
   * Search posts by text or hashtag
   */
  async searchPosts(queryText: string, currentUid?: string, maxLimit = 25): Promise<Post[]> {
    const q = queryText.trim().toLowerCase();
    if (!q) return [];

    try {
      // If starts with #, search hashtag index
      if (q.startsWith('#')) {
        const cleanTag = q.slice(1);
        const tagSnap = await get(ref(rtdb, `hashtags/${cleanTag}`));
        if (!tagSnap.exists()) return [];

        const postIds = Object.keys(tagSnap.val());
        const posts = await Promise.all(
          postIds.slice(-maxLimit).map((id) => postService.getPostById(id, currentUid))
        );
        return posts.filter((p): p is Post => p !== null && p.status === 'active');
      }

      // General keyword search
      const postsSnap = await get(query(ref(rtdb, 'posts'), limitToLast(120)));
      if (!postsSnap.exists()) return [];

      const matches: Post[] = [];
      postsSnap.forEach((child) => {
        const p = child.val() as Post;
        p.id = child.key || p.id;
        if (p.status === 'active') {
          const textMatch = p.text && p.text.toLowerCase().includes(q);
          const tagMatch = p.hashtags && p.hashtags.some((t) => t.toLowerCase().includes(q));
          if (textMatch || tagMatch) {
            matches.push(p);
          }
        }
      });

      matches.sort((a, b) => b.createdAt - a.createdAt);

      return Promise.all(matches.slice(0, maxLimit).map((p) => postService.hydratePost(p, currentUid)));
    } catch (err) {
      console.error('Error searching posts:', err);
      return [];
    }
  },

  /**
   * Search communities
   */
  async searchCommunities(queryText: string, maxLimit = 10): Promise<Community[]> {
    const q = queryText.trim().toLowerCase();
    if (!q) return [];

    try {
      const snap = await get(ref(rtdb, 'communities'));
      if (!snap.exists()) return [];

      const matches: Community[] = [];
      snap.forEach((child) => {
        const c = child.val() as Community;
        c.id = child.key || c.id;
        if (c.status === 'active') {
          const nameMatch = c.name && c.name.toLowerCase().includes(q);
          const descMatch = c.description && c.description.toLowerCase().includes(q);
          if (nameMatch || descMatch) {
            matches.push(c);
          }
        }
      });

      matches.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
      return matches.slice(0, maxLimit);
    } catch (err) {
      console.error('Error searching communities:', err);
      return [];
    }
  },

  /**
   * Real-time trending calculation with time decay
   */
  async getTrendingTopics(maxLimit = 8): Promise<TrendItem[]> {
    try {
      // Pull recent posts to calculate real hashtag velocity
      const postsSnap = await get(query(ref(rtdb, 'posts'), limitToLast(150)));
      const tagStats = new Map<string, { count: number; recentCount: number; authors: Set<string> }>();
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      if (postsSnap.exists()) {
        postsSnap.forEach((child) => {
          const p = child.val() as Post;
          if (p.status === 'active' && p.hashtags && p.hashtags.length > 0) {
            const isRecent = p.createdAt > oneHourAgo;
            for (const tag of p.hashtags) {
              const lower = tag.toLowerCase();
              if (!tagStats.has(lower)) {
                tagStats.set(lower, { count: 0, recentCount: 0, authors: new Set() });
              }
              const stat = tagStats.get(lower)!;
              stat.count++;
              stat.authors.add(p.authorId);
              if (isRecent) stat.recentCount++;
            }
          }
        });
      }

      // Default trending topics if database is fresh
      const defaultTopics: TrendItem[] = [
        { tag: 'Technology', count: 1420, velocity: 88, score: 95, category: 'Tech' },
        { tag: 'ArtificialIntelligence', count: 980, velocity: 94, score: 92, category: 'AI & Data' },
        { tag: 'WebDev', count: 750, velocity: 76, score: 85, category: 'Programming' },
        { tag: 'DesignSystems', count: 530, velocity: 68, score: 79, category: 'Design' },
        { tag: 'ZORPlatform', count: 420, velocity: 99, score: 98, category: 'Trending' }
      ];

      const calculatedTrends: TrendItem[] = [];

      tagStats.forEach((stat, tag) => {
        // Unique user weighting prevents single-user spamming
        const uniqueAuthors = stat.authors.size;
        const velocity = Math.min(100, Math.round((stat.recentCount / Math.max(1, stat.count)) * 100));
        const score = stat.count * 2 + uniqueAuthors * 5 + velocity * 1.5;

        calculatedTrends.push({
          tag,
          count: stat.count,
          velocity,
          score,
          category: 'Trending'
        });
      });

      if (calculatedTrends.length === 0) {
        return defaultTopics.slice(0, maxLimit);
      }

      calculatedTrends.sort((a, b) => b.score - a.score);

      // Merge with default if fewer than maxLimit
      const merged = [...calculatedTrends];
      for (const d of defaultTopics) {
        if (!merged.some((m) => m.tag.toLowerCase() === d.tag.toLowerCase())) {
          merged.push(d);
        }
      }

      return merged.slice(0, maxLimit);
    } catch (err) {
      console.warn('Error calculating trending topics:', err);
      return [];
    }
  },

  /**
   * Search History in LocalStorage
   */
  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem('zor_recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addRecentSearch(term: string): void {
    if (!term || !term.trim()) return;
    try {
      const current = this.getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase().trim());
      current.unshift(term.trim());
      localStorage.setItem('zor_recent_searches', JSON.stringify(current.slice(0, 10)));
    } catch {
      // ignore
    }
  },

  clearRecentSearches(): void {
    try {
      localStorage.removeItem('zor_recent_searches');
    } catch {
      // ignore
    }
  }
};
