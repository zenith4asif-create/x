import React from 'react';
import { Home, Compass, Plus, Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenCompose: () => void;
  unreadNotificationsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenCompose,
  unreadNotificationsCount = 0
}) => {
  const { userProfile } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-black/95 backdrop-blur-lg border-t border-[#2f3336] px-2 flex items-center justify-around select-none">
      {/* Home */}
      <button
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] rounded-xl transition-colors ${
          currentView === 'home' ? 'text-white' : 'text-[#71767b] hover:text-[#e7e9ea]'
        }`}
        aria-label="Home"
      >
        <Home className={`w-6 h-6 ${currentView === 'home' ? 'stroke-[2.5]' : ''}`} />
      </button>

      {/* Explore */}
      <button
        onClick={() => onNavigate('explore')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] rounded-xl transition-colors ${
          currentView === 'explore' || currentView === 'search' ? 'text-white' : 'text-[#71767b] hover:text-[#e7e9ea]'
        }`}
        aria-label="Explore"
      >
        <Compass className={`w-6 h-6 ${currentView === 'explore' || currentView === 'search' ? 'stroke-[2.5]' : ''}`} />
      </button>

      {/* Floating Center Compose Button (Modern X Blue) */}
      <button
        onClick={onOpenCompose}
        className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-[#1d9bf0] text-white shadow-lg shadow-[#1d9bf0]/25 active:scale-95 transition-transform"
        aria-label="Create Post"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Notifications */}
      <button
        onClick={() => onNavigate('notifications')}
        className={`relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] rounded-xl transition-colors ${
          currentView === 'notifications' ? 'text-white' : 'text-[#71767b] hover:text-[#e7e9ea]'
        }`}
        aria-label="Notifications"
      >
        <Bell className={`w-6 h-6 ${currentView === 'notifications' ? 'stroke-[2.5]' : ''}`} />
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#1d9bf0] ring-2 ring-black" />
        )}
      </button>

      {/* Profile */}
      <button
        onClick={() => onNavigate('profile', userProfile?.username)}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] rounded-xl transition-colors ${
          currentView === 'profile' ? 'text-white' : 'text-[#71767b] hover:text-[#e7e9ea]'
        }`}
        aria-label="Profile"
      >
        <User className={`w-6 h-6 ${currentView === 'profile' ? 'stroke-[2.5]' : ''}`} />
      </button>
    </nav>
  );
};
