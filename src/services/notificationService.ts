import { ref, push, get, set, update, query, limitToLast, orderByChild, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { NotificationItem, UserProfile } from '../types';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

export const notificationService = {
  /**
   * Send notification to a user
   */
  async sendNotification(
    notif: Omit<NotificationItem, 'id'>,
    recipientUid: string
  ): Promise<void> {
    if (!recipientUid || recipientUid === notif.actorId) {
      // Don't notify oneself
      return;
    }

    try {
      const notifRef = push(ref(rtdb, `notifications/${recipientUid}`));
      const item: NotificationItem = {
        ...notif,
        id: notifRef.key || Date.now().toString()
      };
      await set(notifRef, sanitizeForFirebase(item));
    } catch (err) {
      console.warn('Failed to send notification:', err);
    }
  },

  /**
   * Get recent notifications for user
   */
  async getNotifications(uid: string, maxLimit = 40): Promise<NotificationItem[]> {
    if (!uid) return [];
    try {
      const q = query(ref(rtdb, `notifications/${uid}`), limitToLast(maxLimit));
      const snap = await get(q);
      if (!snap.exists()) return [];

      const items: NotificationItem[] = [];
      const actorUids = new Set<string>();

      snap.forEach((child) => {
        const val = child.val() as NotificationItem;
        val.id = child.key || val.id;
        items.unshift(val);
        if (val.actorId) actorUids.add(val.actorId);
      });

      // Hydrate actor profiles
      const userSnaps = await Promise.all(
        Array.from(actorUids).map(async (actorId) => {
          const s = await get(ref(rtdb, `users/${actorId}`));
          return { actorId, profile: s.exists() ? (s.val() as UserProfile) : null };
        })
      );

      const userMap = new Map<string, UserProfile>();
      userSnaps.forEach((entry) => {
        if (entry.profile) userMap.set(entry.actorId, entry.profile);
      });

      items.forEach((item) => {
        if (item.actorId && userMap.has(item.actorId)) {
          item.actor = userMap.get(item.actorId);
        }
      });

      return items;
    } catch (err) {
      console.error('Error fetching notifications:', err);
      return [];
    }
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(uid: string, notifId: string): Promise<void> {
    if (!uid || !notifId) return;
    await update(ref(rtdb, `notifications/${uid}/${notifId}`), { read: true });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(uid: string): Promise<void> {
    if (!uid) return;
    try {
      const snap = await get(ref(rtdb, `notifications/${uid}`));
      if (!snap.exists()) return;

      const updates: Record<string, any> = {};
      snap.forEach((child) => {
        if (!child.val().read) {
          updates[`notifications/${uid}/${child.key}/read`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
      }
    } catch (err) {
      console.warn('Error marking all as read:', err);
    }
  },

  /**
   * Realtime listener for unread notifications count
   */
  subscribeToUnreadCount(uid: string, callback: (count: number) => void): () => void {
    if (!uid) {
      callback(0);
      return () => {};
    }

    const notifRef = ref(rtdb, `notifications/${uid}`);
    const handler = onValue(notifRef, (snap) => {
      if (!snap.exists()) {
        callback(0);
        return;
      }
      let unread = 0;
      snap.forEach((child) => {
        if (!child.val().read) unread++;
      });
      callback(unread);
    });

    return () => off(notifRef, 'value', handler);
  }
};
