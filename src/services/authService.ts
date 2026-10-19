import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { ref, get, set, update, query, orderByChild, equalTo } from 'firebase/database';
import { auth, rtdb } from '../firebase/config';
import { UserProfile } from '../types';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

export const authService = {
  /**
   * Check if normalized username is available
   */
  async checkUsernameAvailable(username: string): Promise<boolean> {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 20) {
      return false;
    }

    try {
      const usernameRef = ref(rtdb, `usernames/${cleanUsername}`);
      const snapshot = await get(usernameRef);
      return !snapshot.exists();
    } catch (err) {
      console.warn('Error checking username availability:', err);
      return true;
    }
  },

  /**
   * Register a new user with email, password, displayName, and username
   */
  async signUp(email: string, password: string, displayName: string, username: string): Promise<UserProfile> {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long and contain only letters, numbers, and underscores.');
    }

    // Check availability
    const isAvail = await this.checkUsernameAvailable(cleanUsername);
    if (!isAvail) {
      throw new Error(`Username @${cleanUsername} is already taken. Please choose another.`);
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update Auth displayName
    await updateAuthProfile(user, { displayName });

    const now = Date.now();
    const isSpecialAdmin = email.toLowerCase() === 'bioasif77@gmail.com' || cleanUsername === 'admin';

    const profile: UserProfile = {
      uid: user.uid,
      username: cleanUsername,
      normalizedUsername: cleanUsername,
      displayName: displayName.trim() || cleanUsername,
      bio: 'Exploring ZOR network ✨',
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanUsername}`,
      bannerUrl: '',
      verified: isSpecialAdmin,
      role: isSpecialAdmin ? 'admin' : 'user',
      createdAt: now,
      updatedAt: now,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      likesCount: 0,
      accountStatus: 'active',
      privacySettings: {
        isPrivate: false,
        allowDMsFromEveryone: true,
        showOnlineStatus: true,
        allowMentions: true
      }
    };

    // Save in RTDB users and usernames
    const updates: Record<string, any> = {};
    updates[`users/${user.uid}`] = profile;
    updates[`usernames/${cleanUsername}`] = { uid: user.uid, createdAt: now };

    await update(ref(rtdb), sanitizeForFirebase(updates));

    return profile;
  },

  /**
   * Log in existing user
   */
  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  },

  /**
   * Log out current user
   */
  async signOut(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Delete current authenticated account and RTDB node
   */
  async deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user currently signed in');

    try {
      const userSnap = await get(ref(rtdb, `users/${user.uid}`));
      if (userSnap.exists()) {
        const u = userSnap.val() as UserProfile;
        if (u.normalizedUsername) {
          await set(ref(rtdb, `usernames/${u.normalizedUsername}`), null);
        }
        await set(ref(rtdb, `users/${user.uid}`), null);
      }
    } catch (e) {
      console.warn('Error clearing user database record:', e);
    }

    await deleteUser(user);
  }
};
