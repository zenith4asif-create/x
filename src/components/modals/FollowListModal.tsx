import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { X, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '../brand/VerifiedBadge';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  type: 'followers' | 'following';
  onUserClick: (username: string) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  uid,
  type,
  onUserClick
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFollowingMap, setMyFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !uid) return;
    setLoading(true);

    const loadData = async () => {
      try {
        const uids = type === 'followers'
          ? await userService.getFollowerIds(uid)
          : await userService.getFollowingIds(uid);

        const profiles = await Promise.all(
          uids.map((id) => userService.getUserProfile(id))
        );

        setUsers(profiles.filter((p): p is UserProfile => p !== null));

        if (currentUser) {
          const myFollowing = await userService.getFollowingIds(currentUser.uid);
          const map: Record<string, boolean> = {};
          myFollowing.forEach((id) => (map[id] = true));
          setMyFollowingMap(map);
        }
      } catch (err) {
        console.warn('Error loading follow list:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, uid, type, currentUser]);

  if (!isOpen) return null;

  const handleFollowToggle = async (targetUid: string) => {
    if (!currentUser) {
      showToast('Please sign in to follow users', 'info');
      return;
    }
    const isCurrentlyFollowing = myFollowingMap[targetUid];
    setMyFollowingMap((prev) => ({ ...prev, [targetUid]: !isCurrentlyFollowing }));

    try {
      if (isCurrentlyFollowing) {
        await userService.unfollowUser(currentUser.uid, targetUid);
      } else {
        await userService.followUser(currentUser.uid, targetUid);
      }
    } catch {
      setMyFollowingMap((prev) => ({ ...prev, [targetUid]: isCurrentlyFollowing }));
      showToast('Action failed', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-slate-100 capitalize">
            {type}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center items-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No {type} yet.
            </div>
          ) : (
            users.map((user) => {
              const isFollowing = myFollowingMap[user.uid];
              const isMe = currentUser?.uid === user.uid;

              return (
                <div key={user.uid} className="flex items-center justify-between gap-2">
                  <div
                    onClick={() => {
                      onUserClick(user.username);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
                  >
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.username}`}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-800 bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-100 truncate group-hover:underline">
                          {user.displayName}
                        </span>
                        {user.verified && <VerifiedBadge size={14} />}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
                    </div>
                  </div>

                  {!isMe && (
                    <button
                      onClick={() => handleFollowToggle(user.uid)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                        isFollowing
                          ? 'bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700'
                          : 'bg-white hover:bg-slate-100 text-slate-950 shadow-sm'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
