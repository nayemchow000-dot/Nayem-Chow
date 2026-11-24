import React from 'react';
import { useBranding } from '../contexts/BrandingContext';
import { cn } from '../lib/utils';

export const DEFAULT_LOGO_URL = '/assets/aistudio/e2e2df32-f624-464c-bbf2-dd5e68b4722a_268f824d.jpg';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}

export function BrandLogo({
  className,
  imgClassName,
  size = 'md',
  alt = 'দাওয়াহ মুভমেন্ট কোটবাড়ি জোন',
}: BrandLogoProps) {
  const { branding } = useBranding();
  const src = branding?.primaryLogo || DEFAULT_LOGO_URL;

  const sizeClasses =
    size === 'sm'
      ? 'h-10 px-2 py-1 rounded-xl'
      : size === 'lg'
      ? 'h-20 px-3.5 py-2 rounded-2xl'
      : 'h-14 px-2.5 py-1.5 rounded-xl';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center bg-white/95 border border-white/25 shadow-sm overflow-hidden shrink-0',
        sizeClasses,
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn('h-full w-auto max-w-full object-contain', imgClassName)}
      />
    </div>
  );
}
