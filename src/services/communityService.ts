import { ref, push, get, set, update, query, limitToLast, orderByChild, equalTo } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { Community, Post } from '../types';
import { postService } from './postService';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

export const communityService = {
  /**
   * Get all active communities
   */
  async getCommunities(currentUid?: string): Promise<Community[]> {
    try {
      const snap = await get(ref(rtdb, 'communities'));
      if (!snap.exists()) return [];

      const list: Community[] = [];
      const membershipChecks: Promise<void>[] = [];

      snap.forEach((child) => {
        const c = child.val() as Community;
        c.id = child.key || c.id;
        if (c.status === 'active') {
          if (currentUid) {
            membershipChecks.push(
              get(ref(rtdb, `communityMembers/${c.id}/${currentUid}`)).then((mSnap) => {
                c.isMember = mSnap.exists();
                if (mSnap.exists()) {
                  c.userRole = mSnap.val().role;
                }
              })
            );
          }
          list.push(c);
        }
      });

      await Promise.all(membershipChecks);
      list.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
      return list;
    } catch (err) {
      console.error('Error fetching communities:', err);
      return [];
    }
  },

  /**
   * Create a new community
   */
  async createCommunity(params: {
    name: string;
    description: string;
    avatarUrl?: string;
    bannerUrl?: string;
    privacy: 'public' | 'restricted' | 'private';
    ownerId: string;
  }): Promise<Community> {
    const cRef = push(ref(rtdb, 'communities'));
    const id = cRef.key;
    if (!id) throw new Error('Failed to create community key');

    const community: Community = {
      id,
      name: params.name.trim(),
      description: params.description.trim(),
      avatarUrl: params.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${params.name}`,
      bannerUrl: params.bannerUrl || '',
      ownerId: params.ownerId,
      createdAt: Date.now(),
      memberCount: 1,
      privacy: params.privacy,
      status: 'active',
      isMember: true,
      userRole: 'owner'
    };

    const updates: Record<string, any> = {};
    updates[`communities/${id}`] = community;
    updates[`communityMembers/${id}/${params.ownerId}`] = {
      role: 'owner',
      joinedAt: Date.now()
    };

    await update(ref(rtdb), sanitizeForFirebase(updates));
    return community;
  },

  /**
   * Join a community
   */
  async joinCommunity(communityId: string, uid: string): Promise<void> {
    const cSnap = await get(ref(rtdb, `communities/${communityId}`));
    if (!cSnap.exists()) throw new Error('Community not found');
    const c = cSnap.val() as Community;

    const updates: Record<string, any> = {};
    updates[`communityMembers/${communityId}/${uid}`] = {
      role: 'member',
      joinedAt: Date.now()
    };
    updates[`communities/${communityId}/memberCount`] = (c.memberCount || 0) + 1;

    await update(ref(rtdb), updates);
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId: string, uid: string): Promise<void> {
    const cSnap = await get(ref(rtdb, `communities/${communityId}`));
    if (!cSnap.exists()) throw new Error('Community not found');
    const c = cSnap.val() as Community;

    const updates: Record<string, any> = {};
    updates[`communityMembers/${communityId}/${uid}`] = null;
    updates[`communities/${communityId}/memberCount`] = Math.max(0, (c.memberCount || 1) - 1);

    await update(ref(rtdb), updates);
  },

  /**
   * Get community posts
   */
  async getCommunityPosts(communityId: string, currentUid?: string): Promise<Post[]> {
    try {
      const q = query(ref(rtdb, 'posts'), orderByChild('communityId'), equalTo(communityId));
      const snap = await get(q);
      if (!snap.exists()) return [];

      const posts: Post[] = [];
      snap.forEach((child) => {
        const val = child.val() as Post;
        val.id = child.key || val.id;
        if (val.status === 'active') {
          posts.push(val);
        }
      });

      posts.sort((a, b) => b.createdAt - a.createdAt);
      return Promise.all(posts.map((p) => postService.hydratePost(p, currentUid)));
    } catch (err) {
      console.error(`Error fetching community posts:`, err);
      return [];
    }
  }
};
