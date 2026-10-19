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
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'repost':
        return <Repeat2 className="w-4 h-4 text-emerald-400" />;
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-sky-400" />;
      case 'quote':
        return <Repeat2 className="w-4 h-4 text-indigo-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-indigo-400" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-bold text-slate-100">Notifications</h2>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center border-t border-slate-800/60 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'mentions', label: 'Mentions & Replies' },
            { id: 'verified', label: 'Verified' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-center font-semibold relative transition-colors ${
                activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-slate-800/80">
        {loading ? (
          <div className="py-20 flex justify-center items-center text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            No notifications yet in this category.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-4 flex items-start gap-3.5 hover:bg-slate-900/40 cursor-pointer transition-colors ${
                !item.read ? 'bg-indigo-950/15' : ''
              }`}
            >
              <div className="shrink-0 mt-0.5">{getIconForType(item.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={item.actor?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.actorId}`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover bg-slate-800"
                  />
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {item.actor?.displayName || 'Someone'}
                    </span>
                    {item.actor?.verified && (
                      <VerifiedBadge size={14} />
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono ml-auto shrink-0">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {item.type === 'like' && 'liked your post'}
                  {item.type === 'repost' && 'reposted your post'}
                  {item.type === 'reply' && 'replied to your thread'}
                  {item.type === 'quote' && 'quoted your post'}
                  {item.type === 'follow' && 'followed you'}
                  {item.type === 'mention' && 'mentioned you in a post'}
                </p>

                {item.postText && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                    {item.postText}
                  </p>
                )}
              </div>

              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
