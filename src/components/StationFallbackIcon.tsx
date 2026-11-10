import React from 'react';
import { YAiLogo } from './YAiLogo';

interface StationFallbackIconProps {
  className?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const StationFallbackIcon: React.FC<StationFallbackIconProps> = ({
  className = '',
  name = 'YAiPlay Radio',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-56 h-56 sm:w-64 sm:h-64',
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl overflow-hidden shrink-0 shadow-xl bg-gradient-to-br from-zinc-950 via-black to-zinc-950 border border-violet-500/20 ${sizeClasses} ${className}`}
      title={name}
    >
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-radial from-violet-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Official Unified YAi Logo */}
      <YAiLogo size={size} className="w-full h-full rounded-2xl" />
    </div>
  );
};
