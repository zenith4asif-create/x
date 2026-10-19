import React from 'react';

interface ZorLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const ZorLogo: React.FC<ZorLogoProps> = ({ className = '', size = 32, showText = true }) => {
  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* Original ZOR Brand Mark: An isometric angular hyper-Z vector */}
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-sky-400 p-0.5 shadow-md shadow-indigo-500/20"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3/5 h-3/5 text-white"
        >
          <path d="M4 6h16l-10 12h10" />
          <path d="M7 6l10 12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        </svg>
      </div>
      {showText && (
        <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
          ZOR
        </span>
      )}
    </div>
  );
};
