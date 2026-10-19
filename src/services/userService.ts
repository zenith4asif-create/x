import { ref, get, set, update, query, limitToFirst, orderByChild } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { UserProfile } from '../types';
import { notificationService } from './notificationService';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

// In-memory cache for profiles to optimize reads
const profileCache = new Map<string, { profile: UserProfile; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const userService = {
  /**
   * Fetch a user profile by UID with in-memory caching
   */
  async getUserProfile(uid: string, forceFresh = false): Promise<UserProfile | null> {
    if (!uid) return null;

    if (!forceFresh) {
      const cached = profileCache.get(uid);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.profile;
      }
    }

    try {
      const snapshot = await get(ref(rtdb, `users/${uid}`));
      if (!snapshot.exists()) return null;
      const profile = snapshot.val() as UserProfile;
      profileCache.set(uid, { profile, timestamp: Date.now() });
      return profile;
    } catch (err) {
      console.error(`Error fetching user ${uid}:`, err);
      return null;
    }
  },

  /**
   * Fetch a user profile by username
   */
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const clean = username.trim().toLowerCase().replace('@', '');
    if (!clean) return null;

    try {
      // 1. Direct usernames index mapping
      const uRef = ref(rtdb, `usernames/${clean}`);
      const snap = await get(uRef);
      if (snap.exists()) {
        const data = snap.val();
        const uid = typeof data === 'string' ? data : data.uid;
        if (uid) {
          const profile = await this.getUserProfile(uid);
          if (profile) return profile;
        }
      }

      // 2. Direct UID lookup in users node
      const directProfile = await this.getUserProfile(clean);
      if (directProfile) return directProfile;

      // 3. Fallback: Scan users node by username/normalizedUsername/key
      const usersSnap = await get(ref(rtdb, 'users'));
      if (usersSnap.exists()) {
        let matched: UserProfile | null = null;
        usersSnap.forEach((child) => {
          const u = child.val() as UserProfile;
          if (
            u.username?.toLowerCase() === clean ||
            u.normalizedUsername?.toLowerCase() === clean ||
            child.key?.toLowerCase() === clean
          ) {
            matched = u;
          }
        });
        if (matched) return matched;
      }

      return null;
    } catch (err) {
      console.error(`Error getting user by username ${username}:`, err);
      return null;
    }
  },

  /**
   * Update profile fields
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    updates.updatedAt = Date.now();
    await update(ref(rtdb, `users/${uid}`), sanitizeForFirebase(updates));
    profileCache.delete(uid);
  },

  /**
   * Check if currentUid is following targetUid
   */
  async isFollowing(currentUid: string, targetUid: string): Promise<boolean> {
    if (!currentUid || !targetUid || currentUid === targetUid) return false;
    try {
      const snap = await get(ref(rtdb, `following/${currentUid}/${targetUid}`));
      return snap.exists();
    } catch {
      return false;
    }
  },

  /**
   * Follow user
   */
  async followUser(currentUid: string, targetUid: string): Promise<void> {
    if (!currentUid || !targetUid || currentUid === targetUid) return;

    const now = Date.now();
    const updates: Record<string, any> = {};
    updates[`following/${currentUid}/${targetUid}`] = now;
    updates[`followers/${targetUid}/${currentUid}`] = now;

    // Update denormalized counts
    const [currentProfile, targetProfile] = await Promise.all([
      this.getUserProfile(currentUid),
      this.getUserProfile(targetUid)
    ]);

    if (currentProfile) {
      updates[`users/${currentUid}/followingCount`] = Math.max(0, (currentProfile.followingCount || 0) + 1);
    }
    if (targetProfile) {
      updates[`users/${targetUid}/followersCount`] = Math.max(0, (targetProfile.followersCount || 0) + 1);
    }

    await update(ref(rtdb), updates);
    profileCache.delete(currentUid);
    profileCache.delete(targetUid);

    // Send notification to target user
    await notificationService.sendNotification({
      type: 'follow',
      actorId: currentUid,
      createdAt: now,
      read: false
    }, targetUid);
  },

  /**
   * Unfollow user
   */
  async unfollowUser(currentUid: string, targetUid: string): Promise<void> {
    if (!currentUid || !targetUid || currentUid === targetUid) return;

    const updates: Record<string, any> = {};
    updates[`following/${currentUid}/${targetUid}`] = null;
    updates[`followers/${targetUid}/${currentUid}`] = null;

    const [currentProfile, targetProfile] = await Promise.all([
      this.getUserProfile(currentUid),
      this.getUserProfile(targetUid)
    ]);

    if (currentProfile) {
      updates[`users/${currentUid}/followingCount`] = Math.max(0, (currentProfile.followingCount || 1) - 1);
    }
    if (targetProfile) {
      updates[`users/${targetUid}/followersCount`] = Math.max(0, (targetProfile.followersCount || 1) - 1);
    }

    await update(ref(rtdb), updates);
    profileCache.delete(currentUid);
    profileCache.delete(targetUid);
  },

  /**
   * Get list of following UIDs
   */
  async getFollowingIds(uid: string): Promise<string[]> {
    try {
      const snap = await get(ref(rtdb, `following/${uid}`));
      if (!snap.exists()) return [];
      return Object.keys(snap.val());
    } catch {
      return [];
    }
  },

  /**
   * Get list of follower UIDs
   */
  async getFollowerIds(uid: string): Promise<string[]> {
    try {
      const snap = await get(ref(rtdb, `followers/${uid}`));
      if (!snap.exists()) return [];
      return Object.keys(snap.val());
    } catch {
      return [];
    }
  },

  /**
   * Block / unblock user
   */
  async blockUser(currentUid: string, targetUid: string): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`blocks/${currentUid}/${targetUid}`] = Date.now();
    // also unfollow if following
    updates[`following/${currentUid}/${targetUid}`] = null;
    updates[`followers/${targetUid}/${currentUid}`] = null;
    updates[`following/${targetUid}/${currentUid}`] = null;
    updates[`followers/${currentUid}/${targetUid}`] = null;
    await update(ref(rtdb), updates);
  },

  async unblockUser(currentUid: string, targetUid: string): Promise<void> {
    await set(ref(rtdb, `blocks/${currentUid}/${targetUid}`), null);
  },

  /**
   * Mute / unmute user
   */
  async muteUser(currentUid: string, targetUid: string): Promise<void> {
    await set(ref(rtdb, `mutes/${currentUid}/${targetUid}`), Date.now());
  },

  async unmuteUser(currentUid: string, targetUid: string): Promise<void> {
    await set(ref(rtdb, `mutes/${currentUid}/${targetUid}`), null);
  },

  async getBlockedUserIds(currentUid: string): Promise<Set<string>> {
    if (!currentUid) return new Set();
    try {
      const snap = await get(ref(rtdb, `blocks/${currentUid}`));
      if (!snap.exists()) return new Set();
      return new Set(Object.keys(snap.val()));
    } catch {
      return new Set();
    }
  },

  async getMutedUserIds(currentUid: string): Promise<Set<string>> {
    if (!currentUid) return new Set();
    try {
      const snap = await get(ref(rtdb, `mutes/${currentUid}`));
      if (!snap.exists()) return new Set();
      return new Set(Object.keys(snap.val()));
    } catch {
      return new Set();
    }
  },

  /**
   * Suggested users to follow
   */
  async getSuggestedUsers(currentUid: string, maxLimit = 5): Promise<UserProfile[]> {
    try {
      const followingIds = new Set(await this.getFollowingIds(currentUid));
      const blockedIds = await this.getBlockedUserIds(currentUid);

      const usersRef = query(ref(rtdb, 'users'), limitToFirst(30));
      const snap = await get(usersRef);
      if (!snap.exists()) return [];

      const results: UserProfile[] = [];
      snap.forEach((child) => {
        const u = child.val() as UserProfile;
        if (u.uid !== currentUid && !followingIds.has(u.uid) && !blockedIds.has(u.uid) && u.accountStatus === 'active') {
          results.push(u);
        }
      });

      // Sort by followers count or verification
      results.sort((a, b) => {
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
        return (b.followersCount || 0) - (a.followersCount || 0);
      });

      return results.slice(0, maxLimit);
    } catch (err) {
      console.warn('Error fetching suggested users:', err);
      return [];
    }
  }
};
