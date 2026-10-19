import { ref, push, get, set, update, onValue, off, onDisconnect, query, limitToLast } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { Conversation, Message, PostMediaItem, UserProfile } from '../types';
import { userService } from './userService';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

export const messageService = {
  /**
   * Helper: Generate a deterministic conversation ID for two users
   */
  getConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  },

  /**
   * Fetch conversations for user
   */
  async getConversations(currentUid: string): Promise<Conversation[]> {
    if (!currentUid) return [];

    try {
      const snap = await get(ref(rtdb, 'conversations'));
      if (!snap.exists()) return [];

      const list: Conversation[] = [];
      const userFetches: Promise<void>[] = [];

      snap.forEach((child) => {
        const c = child.val() as Conversation;
        c.id = child.key || c.id;

        if (c.members && c.members[currentUid]) {
          const otherUid = Object.keys(c.members).find((id) => id !== currentUid);
          if (otherUid) {
            userFetches.push(
              userService.getUserProfile(otherUid).then((profile) => {
                c.otherUser = profile || undefined;
              })
            );
          }
          list.push(c);
        }
      });

      await Promise.all(userFetches);
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return list;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  },

  /**
   * Send a direct message
   */
  async sendMessage(params: {
    senderId: string;
    recipientId: string;
    text: string;
    media?: PostMediaItem[];
  }): Promise<Message> {
    const { senderId, recipientId, text, media } = params;
    const conversationId = this.getConversationId(senderId, recipientId);
    const now = Date.now();

    const msgRef = push(ref(rtdb, `messages/${conversationId}`));
    const messageId = msgRef.key || now.toString();

    const message: Message = {
      id: messageId,
      senderId,
      text: text.trim(),
      media: media && media.length > 0 ? media : undefined,
      createdAt: now,
      seenBy: {
        [senderId]: now
      }
    };

    const updates: Record<string, any> = {};
    updates[`messages/${conversationId}/${messageId}`] = message;
    updates[`conversations/${conversationId}/id`] = conversationId;
    updates[`conversations/${conversationId}/members/${senderId}`] = true;
    updates[`conversations/${conversationId}/members/${recipientId}`] = true;
    updates[`conversations/${conversationId}/lastMessage`] = {
      text: text.trim() || (media ? '[Attachment]' : ''),
      senderId,
      createdAt: now
    };
    updates[`conversations/${conversationId}/updatedAt`] = now;

    await update(ref(rtdb), sanitizeForFirebase(updates));
    return message;
  },

  /**
   * Listen to messages in a conversation in real-time
   */
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    const msgQuery = query(ref(rtdb, `messages/${conversationId}`), limitToLast(60));

    const handler = onValue(msgQuery, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const list: Message[] = [];
      snapshot.forEach((child) => {
        const val = child.val() as Message;
        val.id = child.key || val.id;
        if (!val.deletedAt) {
          list.push(val);
        }
      });
      list.sort((a, b) => a.createdAt - b.createdAt);
      callback(list);
    });

    return () => off(msgQuery, 'value', handler);
  },

  /**
   * Mark messages in conversation as seen
   */
  async markSeen(conversationId: string, uid: string): Promise<void> {
    if (!conversationId || !uid) return;
    try {
      await update(ref(rtdb, `conversations/${conversationId}/seen/${uid}`), {
        at: Date.now()
      });
    } catch {
      // ignore
    }
  },

  /**
   * Delete own message
   */
  async deleteMessage(conversationId: string, messageId: string, currentUid: string): Promise<void> {
    const msgRef = ref(rtdb, `messages/${conversationId}/${messageId}`);
    const snap = await get(msgRef);
    if (!snap.exists()) return;
    const msg = snap.val() as Message;
    if (msg.senderId !== currentUid) throw new Error('Not authorized to delete this message');

    await update(msgRef, {
      text: 'This message was deleted',
      media: null,
      deletedAt: Date.now()
    });
  },

  /**
   * Typing indicator
   */
  async setTyping(conversationId: string, uid: string, isTyping: boolean): Promise<void> {
    if (!conversationId || !uid) return;
    const tRef = ref(rtdb, `typing/${conversationId}/${uid}`);
    if (isTyping) {
      await set(tRef, Date.now());
    } else {
      await set(tRef, null);
    }
  },

  subscribeToTyping(
    conversationId: string,
    currentUid: string,
    callback: (isOtherTyping: boolean) => void
  ): () => void {
    const typingRef = ref(rtdb, `typing/${conversationId}`);
    const handler = onValue(typingRef, (snap) => {
      if (!snap.exists()) {
        callback(false);
        return;
      }
      const val = snap.val() as Record<string, number>;
      const otherUid = Object.keys(val).find((k) => k !== currentUid);
      if (otherUid && Date.now() - val[otherUid] < 4000) {
        callback(true);
      } else {
        callback(false);
      }
    });

    return () => off(typingRef, 'value', handler);
  },

  /**
   * Online presence management
   */
  setupPresence(uid: string): () => void {
    if (!uid) return () => {};

    const myPresenceRef = ref(rtdb, `presence/${uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const handler = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Set onDisconnect handler
        onDisconnect(myPresenceRef).set({
          online: false,
          lastActive: Date.now()
        });

        // Set online
        set(myPresenceRef, {
          online: true,
          lastActive: Date.now()
        });
      }
    });

    return () => {
      off(connectedRef, 'value', handler);
      set(myPresenceRef, {
        online: false,
        lastActive: Date.now()
      });
    };
  },

  subscribeToUserPresence(
    targetUid: string,
    callback: (presence: { online: boolean; lastActive?: number }) => void
  ): () => void {
    const pRef = ref(rtdb, `presence/${targetUid}`);
    const handler = onValue(pRef, (snap) => {
      if (!snap.exists()) {
        callback({ online: false });
        return;
      }
      callback(snap.val());
    });

    return () => off(pRef, 'value', handler);
  }
};
