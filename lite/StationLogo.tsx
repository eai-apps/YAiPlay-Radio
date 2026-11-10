import React from 'react';
import { LiteImage } from './Image';
export { initials, siteIconUrl } from '../src/components/StationLogo.tsx';
import { initials } from '../src/components/StationLogo.tsx';

export function StationLogo({ name, favicon, className = 'w-full h-full', textClass = 'text-sm' }: {
  name: string; favicon?: string; homepage?: string; className?: string; textClass?: string;
}) {
  return <span className={`${className} ${textClass} inline-flex items-center justify-center bg-zinc-800 text-zinc-200 relative overflow-hidden`}>
    <span aria-hidden>{initials(name)}</span>
    {favicon?.startsWith('https://') && <LiteImage src={favicon} alt="" className="absolute inset-0 w-full h-full object-contain" />}
  </span>;
}
