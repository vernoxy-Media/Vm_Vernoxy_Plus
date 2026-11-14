import React, { useEffect, useState } from 'react';

const TONES = ['bg-[color:var(--ac-main,#0052CC)]', 'bg-[#6554C0]', 'bg-[#00875A]', 'bg-[#FF8B00]', 'bg-[#DE350B]', 'bg-[#00A3BF]'];

export const initialsOf = (name?: string | null) =>
  (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

interface JiraAvatarProps {
  name?: string | null;
  /** Picks the colour, so one person always has the same one. */
  id?: number;
  src?: string | null;
  size?: number;
  /** White ring, for avatars that overlap in a stack. */
  ring?: boolean;
  className?: string;
}

/** A round avatar. When the picture is missing or fails to load it falls back to coloured initials. */
export const JiraAvatar: React.FC<JiraAvatarProps> = ({ name, id = 0, src, size = 24, ring = false, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.4)) };
  const base = `shrink-0 rounded-full ${ring ? 'ring-2 ring-white' : ''} ${className}`;

  if (src && !failed) {
    return <img src={src} alt={name ?? ''} title={name ?? undefined} style={style} className={`${base} object-cover`} onError={() => setFailed(true)} />;
  }
  return (
    <span title={name ?? undefined} aria-label={name ?? undefined} style={style} className={`${base} flex items-center justify-center font-semibold text-white ${TONES[Math.abs(id) % TONES.length]}`}>
      {initialsOf(name)}
    </span>
  );
};
