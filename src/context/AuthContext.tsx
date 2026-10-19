import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, rtdb } from '../firebase/config';
import { UserProfile } from '../types';
import { userService } from '../services/userService';
import { messageService } from '../services/messageService';
import { authService } from '../services/authService';
import { ref, get, set } from 'firebase/database';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, userObj?: User) => {
    try {
      let profile = await userService.getUserProfile(uid, true);

      // If user is authenticated in Firebase Auth but profile record does not exist in RTDB, bootstrap it
      if (!profile && userObj) {
        const rawName = userObj.displayName || userObj.email?.split('@')[0] || 'user';
        const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'zor_user';
        const uniqueUsername = `${cleanName}_${uid.slice(0, 4)}`;
        const now = Date.now();
        const isAdmin = userObj.email?.toLowerCase() === 'bioasif77@gmail.com';

        profile = {
          uid,
          username: uniqueUsername,
          normalizedUsername: uniqueUsername.toLowerCase(),
          displayName: userObj.displayName || cleanName,
          bio: 'Welcome to my ZOR profile! 👋',
          avatarUrl: userObj.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${uniqueUsername}`,
          bannerUrl: '',
          verified: isAdmin,
          role: isAdmin ? 'admin' : 'user',
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

        await set(ref(rtdb, `users/${uid}`), sanitizeForFirebase(profile));
        await set(ref(rtdb, `usernames/${uniqueUsername.toLowerCase()}`), { uid, createdAt: now });
      }

      setUserProfile(profile);
    } catch (err) {
      console.warn('Error fetching or bootstrapping user profile:', err);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    let presenceCleanup: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid, user);
        presenceCleanup = messageService.setupPresence(user.uid);
      } else {
        setUserProfile(null);
        if (presenceCleanup) presenceCleanup();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (presenceCleanup) presenceCleanup();
    };
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser.uid, currentUser);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        refreshProfile,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
