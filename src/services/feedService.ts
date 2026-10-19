import { ref, get, query, limitToLast, orderByChild, equalTo } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { Post } from '../types';
import { postService } from './postService';
import { userService } from './userService';
import { recommendationEngine } from './recommendationEngine';

export const feedService = {
  /**
   * For You: Algorithmic ranked feed
   */
  async getForYouFeed(currentUid?: string, maxLimit = 35): Promise<Post[]> {
    try {
      // Pull recent active pool of posts
      const postsQuery = query(ref(rtdb, 'posts'), limitToLast(120));
      const snap = await get(postsQuery);
      if (!snap.exists()) return [];

      const rawPosts: Post[] = [];
      snap.forEach((child) => {
        const p = child.val() as Post;
        p.id = child.key || p.id;
        // Feed only shows root posts, not direct replies
        if (p.status === 'active' && !p.replyTo) {
          rawPosts.push(p);
        }
      });

      // Hydrate posts
      const hydrated = await Promise.all(
        rawPosts.map((p) => postService.hydratePost(p, currentUid))
      );

      // Context for recommendation engine
      const followingIds = currentUid ? new Set(await userService.getFollowingIds(currentUid)) : new Set<string>();
      const blockedIds = currentUid ? await userService.getBlockedUserIds(currentUid) : new Set<string>();
      const mutedIds = currentUid ? await userService.getMutedUserIds(currentUid) : new Set<string>();

      // Read local user interests from storage
      let userInterests: string[] = [];
      try {
        const stored = localStorage.getItem('zor_user_interests');
        if (stored) userInterests = JSON.parse(stored);
      } catch {
        // ignore
      }

      const ranked = await recommendationEngine.rankFeed(hydrated, {
        currentUid,
        followingIds,
        blockedIds,
        mutedIds,
        userInterests
      });

      return ranked.slice(0, maxLimit);
    } catch (err) {
      console.error('Error getting For You feed:', err);
      return [];
    }
  },

  /**
   * Following Feed: Posts exclusively from followed accounts
   */
  async getFollowingFeed(
    currentUid: string,
    mode: 'chronological' | 'ranked' = 'chronological',
    maxLimit = 35
  ): Promise<Post[]> {
    if (!currentUid) return [];

    try {
      const followingIds = await userService.getFollowingIds(currentUid);
      if (followingIds.length === 0) {
        // Return empty or suggested
        return [];
      }

      const followingSet = new Set(followingIds);
      const blockedIds = await userService.getBlockedUserIds(currentUid);

      const postsQuery = query(ref(rtdb, 'posts'), limitToLast(100));
      const snap = await get(postsQuery);
      if (!snap.exists()) return [];

      const rawPosts: Post[] = [];
      snap.forEach((child) => {
        const p = child.val() as Post;
        p.id = child.key || p.id;
        if (
          p.status === 'active' &&
          !p.replyTo &&
          followingSet.has(p.authorId) &&
          !blockedIds.has(p.authorId)
        ) {
          rawPosts.push(p);
        }
      });

      const hydrated = await Promise.all(
        rawPosts.map((p) => postService.hydratePost(p, currentUid))
      );

      if (mode === 'chronological') {
        hydrated.sort((a, b) => b.createdAt - a.createdAt);
        return hydrated.slice(0, maxLimit);
      } else {
        return recommendationEngine.rankFeed(hydrated, {
          currentUid,
          followingIds: followingSet,
          blockedIds,
          mutedIds: new Set()
        });
      }
    } catch (err) {
      console.error('Error getting Following feed:', err);
      return [];
    }
  },

  /**
   * Latest Feed: Pure reverse chronological
   */
  async getLatestFeed(currentUid?: string, maxLimit = 35): Promise<Post[]> {
    try {
      const postsQuery = query(ref(rtdb, 'posts'), limitToLast(maxLimit * 2));
      const snap = await get(postsQuery);
      if (!snap.exists()) return [];

      const rawPosts: Post[] = [];
      const blockedIds = currentUid ? await userService.getBlockedUserIds(currentUid) : new Set<string>();

      snap.forEach((child) => {
        const p = child.val() as Post;
        p.id = child.key || p.id;
        if (p.status === 'active' && !p.replyTo && !blockedIds.has(p.authorId)) {
          rawPosts.push(p);
        }
      });

      rawPosts.sort((a, b) => b.createdAt - a.createdAt);

      const top = rawPosts.slice(0, maxLimit);
      return Promise.all(top.map((p) => postService.hydratePost(p, currentUid)));
    } catch (err) {
      console.error('Error getting Latest feed:', err);
      return [];
    }
  },

  /**
   * Bookmarks feed
   */
  async getBookmarkedPosts(currentUid: string): Promise<Post[]> {
    if (!currentUid) return [];
    try {
      const snap = await get(ref(rtdb, `bookmarks/${currentUid}`));
      if (!snap.exists()) return [];

      const postIds = Object.keys(snap.val());
      const posts = await Promise.all(
        postIds.map((id) => postService.getPostById(id, currentUid))
      );

      return posts
        .filter((p): p is Post => p !== null && p.status === 'active')
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error('Error getting bookmarks:', err);
      return [];
    }
  }
};
