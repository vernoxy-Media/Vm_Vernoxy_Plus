import React from 'react';

export interface LinkValueProps {
  type: string;
  value: string;
  label?: string | null;
  className?: string;
}

export const LinkValue: React.FC<LinkValueProps> = ({
  type,
  value,
  label,
  className = '',
}) => {
  if (!value) return null;

  const rawTrimmed = value.trim();
  const lower = rawTrimmed.toLowerCase();

  // Explicit safety check: reject javascript:, data:, vbscript:
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return <span className={`text-slate-600 ${className}`}>{label || rawTrimmed}</span>;
  }

  let href = '';
  let isExternal = false;

  switch (type.toLowerCase()) {
    case 'email':
      href = `mailto:${rawTrimmed}`;
      break;
    case 'phone': {
      const cleanPhone = rawTrimmed.replace(/[\s\-\(\)\[\]]/g, '');
      href = `tel:${cleanPhone}`;
      break;
    }
    case 'whatsapp': {
      const cleanWa = rawTrimmed.replace(/[\s\-\(\)\[\]\+]/g, '');
      href = `https://wa.me/${cleanWa}`;
      isExternal = true;
      break;
    }
    case 'website':
    case 'facebook':
    case 'instagram':
    case 'x':
    case 'linkedin':
    case 'url':
    default: {
      let candidate = rawTrimmed;
      if (!/^https?:\/\//i.test(candidate)) {
        candidate = `https://${candidate}`;
      }
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          href = parsed.href;
          isExternal = true;
        } else {
          href = '';
        }
      } catch {
        href = '';
      }
      break;
    }
  }

  if (!href) {
    return <span className={`text-slate-700 ${className}`}>{label || rawTrimmed}</span>;
  }

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 break-all ${className}`}
    >
      {label || rawTrimmed}
    </a>
  );
};
