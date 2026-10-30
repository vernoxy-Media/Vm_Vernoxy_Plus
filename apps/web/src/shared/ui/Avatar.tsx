import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  id?: string;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  id,
}) => {
  const [hasError, setHasError] = useState(false);

  // Compute size pixel values and Tailwind classes
  let sizeClass = 'h-10 w-10 text-sm';
  let pixelDimension = 40;

  if (typeof size === 'number') {
    pixelDimension = size;
    sizeClass = '';
  } else {
    switch (size) {
      case 'sm':
        sizeClass = 'h-8 w-8 text-xs';
        pixelDimension = 32;
        break;
      case 'md':
        sizeClass = 'h-10 w-10 text-sm';
        pixelDimension = 40;
        break;
      case 'lg':
        sizeClass = 'h-12 w-12 text-base';
        pixelDimension = 48;
        break;
      case 'xl':
        sizeClass = 'h-28 w-28 text-2xl';
        pixelDimension = 112;
        break;
    }
  }

  const initials = getInitials(name);
  const inlineStyle = typeof size === 'number' ? { width: size, height: size } : undefined;

  if (src && !hasError) {
    return (
      <img
        id={id}
        src={src}
        alt={name}
        width={pixelDimension}
        height={pixelDimension}
        loading="lazy"
        onError={() => setHasError(true)}
        style={inlineStyle}
        className={`rounded-full object-cover shrink-0 ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      id={id}
      style={inlineStyle}
      aria-label={name}
      className={`rounded-full flex items-center justify-center font-semibold bg-blue-100 text-blue-700 shrink-0 select-none ${sizeClass} ${className}`}
    >
      {initials}
    </div>
  );
};
