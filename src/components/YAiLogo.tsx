import React, { useRef, useState, useEffect } from 'react';
import { YAiGlobeSvg } from './YAiGlobeSvg';
import { Camera } from 'lucide-react';
import { useYAiSettings, optimizeImageFile } from '../context/YAiSettingsContext';
import { useAudio } from '../context/AudioPlayerContext';

export interface YAiLogoProps {
  customLogoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  onUploadLogo?: (base64: string) => void;
  allowUpload?: boolean;
  isSpinning?: boolean;
}

export const YAiLogo: React.FC<YAiLogoProps> = ({
  customLogoUrl: propLogoUrl,
  size = 'lg',
  className = '',
  onUploadLogo,
  allowUpload = false,
  isSpinning: propIsSpinning,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { customLogoUrl: contextLogoUrl, updateLogo } = useYAiSettings();

  // Safely check audio playing state for PC neon rotation
  let isPlayingAudio = false;
  try {
    const audio = useAudio();
    isPlayingAudio = audio.isPlaying;
  } catch {
    // If used outside AudioProvider, fallback to false
    isPlayingAudio = false;
  }

  const isPlaying = propIsSpinning !== undefined ? propIsSpinning : isPlayingAudio;

  // Mobile 3-second startup spin animation state
  const [isMobileStartup, setIsMobileStartup] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      setIsMobileDevice(isMobile);
      if (isMobile) {
        setIsMobileStartup(true);
        const timer = setTimeout(() => {
          setIsMobileStartup(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Active logo: prop > contextLogoUrl > embedded vector globe
  const activeLogo =
    propLogoUrl !== undefined && propLogoUrl !== ''
      ? propLogoUrl
      : contextLogoUrl || '';

  const pixelSizes = {
    xs: 24,
    sm: 36,
    md: 44,
    lg: 56,
    xl: 88,
    '2xl': 120,
  }[size];

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20 sm:w-24 sm:h-24',
    '2xl': 'w-28 h-28 sm:w-32 sm:h-32',
  }[size];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения (PNG, JPG, SVG, WebP)');
      return;
    }

    try {
      const base64 = await optimizeImageFile(file, 512);
      updateLogo(base64);
      if (onUploadLogo) {
        onUploadLogo(base64);
      }
    } catch (err) {
      console.warn('Image optimization error, falling back to FileReader', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const b64 = event.target?.result as string;
        if (b64) {
          updateLogo(b64);
          if (onUploadLogo) onUploadLogo(b64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (allowUpload) {
      e.stopPropagation();
      fileInputRef.current?.click();
    }
  };

  // Spin ONLY when isPlaying is true (e.g. inside audio player during playback)
  const animationClasses = isPlaying
    ? 'animate-[spin_10s_linear_infinite] shadow-[0_0_25px_rgba(6,182,212,0.85),0_0_40px_rgba(96,65,216,0.65)] border-cyan-400'
    : 'shadow-[0_0_15px_rgba(96,65,216,0.3)] border-violet-500/40';

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-center justify-center shrink-0 rounded-full bg-black border p-0 overflow-hidden select-none transition-all duration-300 ${animationClasses} ${
        allowUpload
          ? 'cursor-pointer hover:border-cyan-400 hover:scale-105 hover:shadow-[0_0_35px_rgba(31,206,235,0.6)]'
          : ''
      } ${sizeClasses} ${className}`}
      title={allowUpload ? 'Нажмите, чтобы загрузить свой файл логотипа YAi' : 'YAi Radio'}
    >
      {/* Hidden file input for 1-click upload */}
      {allowUpload && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      )}

      {/* Upload hover overlay badge if upload enabled */}
      {allowUpload && (
        <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-cyan-400">
          <Camera className={size === 'xl' || size === '2xl' ? 'w-7 h-7' : 'w-4 h-4'} />
          {(size === 'xl' || size === '2xl') && (
            <span className="text-[10px] font-bold mt-1 text-white">Загрузить</span>
          )}
        </div>
      )}

      {activeLogo ? (
        <img
          src={activeLogo}
          alt="YAi Radio Logo"
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <YAiGlobeSvg size={pixelSizes} />
      )}
    </div>
  );
};
