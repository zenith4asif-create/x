import React from 'react';
import { ZorLogo } from '../brand/ZorLogo';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Compass,
  Bell,
  Mail,
  Bookmark,
  Users,
  User,
  ShieldAlert,
  Settings,
  PenSquare,
  LogOut,
  Code2
} from 'lucide-react';
import { VerifiedBadge } from '../brand/VerifiedBadge';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenCompose: () => void;
  unreadNotificationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenCompose,
  unreadNotificationsCount = 0
}) => {
  const { currentUser, userProfile, signOut } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'communities', label: 'Communities', icon: Users },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      param: userProfile?.username
    },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (userProfile?.role === 'admin') {
    navItems.splice(7, 0, { id: 'admin', label: 'Admin Panel', icon: ShieldAlert, badge: undefined });
  }

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 h-screen sticky top-0 px-4 py-5 border-r border-[#2f3336] bg-black select-none shrink-0">
      <div className="flex flex-col gap-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3">
          <div
            onClick={() => onNavigate('home')}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          >
            <ZorLogo size={36} />
          </div>
        </div>

        {/* Navigation Items (Modern X Navigation) */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id, item.param)}
                className={`flex items-center justify-between px-4 py-3 rounded-full text-base font-medium transition-all group ${
                  isActive
                    ? 'font-extrabold text-white bg-white/10'
                    : 'text-[#e7e9ea] hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Icon
                    className={`w-6 h-6 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-[#e7e9ea]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1d9bf0] text-white font-mono tabular-nums">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Primary Post CTA (Iconic Modern X Style) */}
        <button
          onClick={onOpenCompose}
          className="w-full mt-2 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <PenSquare className="w-5 h-5 text-black" />
          <span>Post</span>
        </button>
      </div>

      {/* Bottom Area: Developer Credit + User Profile */}
      <div className="flex flex-col gap-3">
        {/* Developer Attribution Card */}
        <div className="p-3 rounded-2xl bg-[#16181c] border border-[#2f3336] flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-black border border-[#2f3336] text-[#1d9bf0]">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#71767b] uppercase font-bold tracking-wider leading-none">
                Platform Developer
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-[#e7e9ea] truncate">ASIF ANSARI</span>
                <VerifiedBadge size={14} />
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1d9bf0]/15 text-[#1d9bf0] font-bold">
            LEAD
          </span>
        </div>

        {/* Current User Pill / Login state */}
        {currentUser && userProfile ? (
          <div className="pt-2 border-t border-[#2f3336]">
            <div className="flex items-center justify-between p-2 rounded-full hover:bg-white/10 transition-colors">
              <div
                onClick={() => onNavigate('profile', userProfile.username)}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
              >
                <img
                  src={userProfile.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userProfile.username}`}
                  alt={userProfile.displayName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 bg-neutral-900"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#e7e9ea] truncate">{userProfile.displayName}</p>
                  <p className="text-[11px] text-[#71767b] truncate font-mono">@{userProfile.username}</p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-2 text-[#71767b] hover:text-rose-400 rounded-full hover:bg-rose-500/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#16181c] border border-[#2f3336] text-center">
            <p className="text-xs text-[#71767b] mb-2 font-medium">Join the conversation on ZOR</p>
            <button
              onClick={() => onNavigate('auth')}
              className="w-full py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-extrabold transition-all shadow-md"
            >
              Sign In / Sign Up
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
