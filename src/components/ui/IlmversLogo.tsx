'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface IlmversLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  href?: string;
}

export function IlmversLogo({
  variant = 'light',
  size = 'md',
  showTagline = true,
  className = '',
  href = '/',
}: IlmversLogoProps) {
  const isDark = variant === 'dark';

  const dimensions = {
    sm: { img: 36, title: 'text-base', sub: 'text-[9px]', tag: 'text-[8px]' },
    md: { img: 48, title: 'text-xl', sub: 'text-[10px]', tag: 'text-[9px]' },
    lg: { img: 64, title: 'text-2xl', sub: 'text-xs', tag: 'text-[10px]' },
    xl: { img: 80, title: 'text-3xl', sub: 'text-sm', tag: 'text-xs' },
  }[size];

  const content = (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem from the brand images */}
      <div 
        className="relative overflow-hidden rounded-xl shrink-0 transition-transform hover:scale-105 duration-300 shadow-sm"
        style={{ width: dimensions.img, height: dimensions.img }}
      >
        <Image
          src={isDark ? '/assets/images/logo dark.jpeg' : '/assets/images/logo.jpeg'}
          alt="ILMVERS Institute Logo"
          fill
          className="object-cover"
          sizes={`${dimensions.img}px`}
          priority={size === 'md' && !isDark}
        />
      </div>

      {/* Brand Typographic Identity */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline tracking-[0.06em] sm:tracking-[0.12em] font-extrabold uppercase font-headers leading-none">
          <span className={isDark ? 'text-white' : 'text-[#004D4A]'}>ILM</span>
          <span className="text-[#D4AF37]">V</span>
          <span className={isDark ? 'text-[#D4AF37]' : 'text-[#004D4A]'}>ERS</span>
        </div>
        <div className={`tracking-[0.3em] uppercase font-semibold mt-0.5 flex items-center gap-1.5 ${dimensions.sub} ${isDark ? 'text-white/80' : 'text-[#0F3D38]'}`}>
          <span className="h-[1px] w-2 bg-[#D4AF37]"></span>
          <span>INSTITUTE</span>
          <span className="h-[1px] w-2 bg-[#D4AF37]"></span>
        </div>
        {showTagline && (
          <span className={`hidden sm:block tracking-wider font-medium mt-0.5 ${dimensions.tag} ${isDark ? 'text-[#A7B7B5]' : 'text-[#5A6E6C]'}`}>
            Knowledge. Faith. Excellence.
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

export default IlmversLogo;
