import React from 'react';
import logoImg from '@/assets/logo.png';

export interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, className = '' }) => {
  return (
    <img
      src={logoImg}
      alt="Vernoxy Pulse Logo"
      width={size}
      height={size}
      className={`rounded-xl object-contain shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};
