import React, { useState, useEffect } from 'react';
import { NotificationItem } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatRelativeTime } from '../utils/formatters';
import {
  Heart,
  Repeat2,
  MessageCircle,
  UserPlus,
  AtSign,
  Bell,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';

interface NotificationsPageProps {
  onPostClick: (postId: string) => void;
  onUserClick: (username: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onPostClick,
  onUserClick
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'verified'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    notificationService.getNotifications(currentUser.uid).then((list) => {
      setNotifications(list);
      setLoading(false);
    });
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await notificationService.markAllAsRead(currentUser.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'success');
  };

  const handleItemClick = (item: NotificationItem) => {
    if (currentUser && !item.read) {
      notificationService.markAsRead(currentUser.uid, item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }

    if (item.postId) {
      onPostClick(item.postId);
    } else if (item.actor?.username) {
      onUserClick(item.actor.username);
    }
  };

  const filtered = notifications.filter((item) => {
    if (activeTab === 'mentions') return item.type === 'mention' || item.type === 'reply';
    if (activeTab === 'verified') return item.actor?.verified;
    return true;
  });

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-[#f91880] fill-[#f91880]" />;
      case 'repost':
        return <Repeat2 className="w-4 h-4 text-[#00ba7c]" />;
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-[#1d9bf0]" />;
      case 'quote':
        return <Repeat2 className="w-4 h-4 text-[#1d9bf0]" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-[#1d9bf0]" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#1d9bf0]" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea] pb-16">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-black text-[#e7e9ea]">Notifications</h2>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs text-[#1d9bf0] hover:underline font-bold"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center border-t border-[#2f3336] text-xs font-bold">
          {[
            { id: 'all', label: 'All' },
            { id: 'mentions', label: 'Mentions & Replies' },
            { id: 'verified', label: 'Verified' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3.5 text-center relative transition-colors hover:bg-white/[0.03] ${
                activeTab === tab.id ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:text-[#e7e9ea]'
              }`}
            >
              <span className="relative">
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute -bottom-3.5 inset-x-0 h-1 bg-[#1d9bf0] rounded-full" />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-[#2f3336]">
        {loading ? (
          <div className="py-20 flex justify-center items-center text-[#71767b]">
            <Loader2 className="w-7 h-7 animate-spin text-[#1d9bf0]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center px-4">
            <h3 className="text-base font-bold text-[#e7e9ea]">Nothing to see here — yet</h3>
            <p className="text-xs text-[#71767b] mt-1">From likes to reposts and a whole lot more, this is where all the action happens.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-4 flex items-start gap-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors ${
                !item.read ? 'bg-[#1d9bf0]/[0.06]' : ''
              }`}
            >
              <div className="shrink-0 mt-0.5">{getIconForType(item.type)}</div>

              <div className="min-w-0 flex-1">
                {item.actor && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <img
                      src={item.actor.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.actor.username}`}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 bg-neutral-900"
                    />
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-[#e7e9ea] truncate">
                        {item.actor.displayName}
                      </span>
                      {item.actor.verified && <VerifiedBadge size={13} />}
                      <span className="text-xs text-[#71767b] font-mono">@{item.actor.username}</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-[#71767b]">
                  {item.type === 'like' && 'liked your post'}
                  {item.type === 'repost' && 'reposted your post'}
                  {item.type === 'reply' && 'replied to your post'}
                  {item.type === 'quote' && 'quoted your post'}
                  {item.type === 'follow' && 'followed you'}
                  {item.type === 'mention' && 'mentioned you in a post'}
                </p>

                {item.postText && (
                  <p className="mt-1 text-xs text-[#e7e9ea] line-clamp-2 bg-[#16181c] p-2.5 rounded-xl border border-[#2f3336]">
                    {item.postText}
                  </p>
                )}

                <span className="text-[10px] text-[#71767b] font-mono mt-1 block">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
