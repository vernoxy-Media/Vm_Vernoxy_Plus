import React, { useId } from 'react';
import logoImg from '@/assets/logo.png';

/** The Vernoxy "V" inside a round speech bubble with a tail, so it reads as a chat app at a glance. */
export const ChatLogo: React.FC<{ size?: number; className?: string }> = ({ size = 96, className = '' }) => {
  const gradient = useId();
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label="Vernoxy Messenger">
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0 drop-shadow-[0_8px_16px_rgba(79,70,229,0.35)]" aria-hidden>
        <defs>
          <linearGradient id={gradient} x1="12" y1="6" x2="88" y2="94" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4F46E5" />
            <stop offset="0.55" stopColor="#2563EB" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <path d="M6 96 L14 72 A42.2 42.2 0 1 1 28 86 Z" fill={`url(#${gradient})`} strokeLinejoin="round" />
        <circle cx="50" cy="50" r="35" fill="#fff" />
      </svg>
      <span className="absolute overflow-hidden rounded-full" style={{ width: size * 0.7, height: size * 0.7, left: size * 0.15, top: size * 0.15 }}>
        <img src={logoImg} alt="" className="h-full w-full object-cover" style={{ transform: 'translateY(-4.7%) scale(1.2)' }} />
      </span>
    </span>
  );
};
