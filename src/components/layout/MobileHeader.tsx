import React from 'react';
import { ZorLogo } from '../brand/ZorLogo';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Search, LogIn } from 'lucide-react';

interface MobileHeaderProps {
  title?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  onSearchClick?: () => void;
  onAuthClick?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  canGoBack,
  onBack,
  onSearchClick,
  onAuthClick
}) => {
  const { currentUser } = useAuth();

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 bg-black/85 backdrop-blur-md border-b border-[#2f3336] px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-3 min-w-0">
        {canGoBack ? (
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-full text-[#e7e9ea] hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <ZorLogo size={28} showText={false} />
        )}

        <h1 className="text-sm font-extrabold text-[#e7e9ea] truncate">
          {title || 'ZOR'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="p-2 rounded-full text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/10"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {!currentUser && onAuthClick && (
          <button
            onClick={onAuthClick}
            className="ml-1 px-4 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
