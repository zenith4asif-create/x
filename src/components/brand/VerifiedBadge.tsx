import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
  type?: 'verified' | 'official';
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  className = '',
  size = 16,
  type = 'verified'
}) => {
  const isOfficial = type === 'official';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`shrink-0 ${isOfficial ? 'text-amber-400' : 'text-indigo-400'} ${className}`}
      style={{ width: size, height: size }}
      aria-label="Verified Account"
    >
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" className={isOfficial ? 'text-amber-500/20 fill-amber-500/20' : 'text-indigo-500/20 fill-indigo-500/20'} />
      <path d="M8.5 12.5l2.5 2.5 5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
