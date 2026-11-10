import React from 'react';

interface YAiGlobeSvgProps {
  className?: string;
  size?: number | string;
}

export const YAiGlobeSvg: React.FC<YAiGlobeSvgProps> = ({
  className = '',
  size = 56,
}) => {
  const gradId = 'yaiplayradioBrandGlobalGradient';
  const glowGradId = 'yaiplayradioGlowGradient';
  const clipId = 'yaiplayradioGlobeCircleClip';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 block select-none ${className}`}
    >
      <defs>
        {/* Official YAi Brand Gradient: Deep Blue -> Cyan -> Emerald -> Vivid Lime */}
        <linearGradient id={gradId} x1="5%" y1="95%" x2="95%" y2="5%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="28%" stopColor="#06b6d4" />
          <stop offset="60%" stopColor="#6041d8" />
          <stop offset="85%" stopColor="#1fcfeb" />
          <stop offset="100%" stopColor="#bef264" />
        </linearGradient>

        <linearGradient id={glowGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1fcfeb" stopOpacity="0.8" />
        </linearGradient>

        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="48.5" />
        </clipPath>
      </defs>

      {/* Outer ambient glow ring */}
      <circle
        cx="50"
        cy="50"
        r="49"
        fill="#02060f"
        stroke={`url(#${glowGradId})`}
        strokeWidth="1.2"
      />

      {/* Clipped Globe Content */}
      <g clipPath={`url(#${clipId})`}>
        {/* Deep space black globe body */}
        <circle cx="50" cy="50" r="48.5" fill="#030712" />

        {/* Atmospheric subtle radial depth */}
        <radialGradient id="sphereShadow" cx="65%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
          <stop offset="60%" stopColor="#020617" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
        </radialGradient>
        <circle cx="50" cy="50" r="48.5" fill="url(#sphereShadow)" />

        {/* 1. WESTERN HEMISPHERE: Cyber Matrix Digital Grid Segments */}
        <g fill={`url(#${gradId})`}>
          {/* Row 1 (Polar Arctic) */}
          <polygon points="36,7 44,9 41,15 33,13" />
          <polygon points="26,10 33,12 30,18 23,16" />
          <polygon points="17,14 24,17 21,23 14,20" />

          {/* Row 2 (Subarctic) */}
          <polygon points="42,17 50,20 46,27 38,24" />
          <polygon points="31,15 39,18 35,25 27,22" />
          <polygon points="20,18 28,21 24,28 17,25" />
          <polygon points="11,23 18,26 15,33 8,29" />

          {/* Row 3 (Upper Mid-Latitude) */}
          <polygon points="39,26 48,30 44,38 34,34" />
          <polygon points="28,24 36,27 32,35 23,31" />
          <polygon points="17,27 25,30 20,38 13,34" />
          <polygon points="8,32 15,35 11,43 5,39" />

          {/* Row 4 (Equator - High Density) */}
          <polygon points="35,36 44,40 39,49 30,45" />
          <polygon points="24,34 32,37 27,46 19,42" />
          <polygon points="13,36 21,39 16,48 9,44" />
          <polygon points="4,41 11,44 7,53 2,49" />

          {/* Row 5 (Lower Mid-Latitude) */}
          <polygon points="31,48 40,52 34,61 25,57" />
          <polygon points="20,45 28,49 22,58 14,53" />
          <polygon points="10,47 17,50 12,59 5,55" />
          <polygon points="3,52 8,54 5,63 2,60" />

          {/* Row 6 (Southern Latitude) */}
          <polygon points="27,60 36,64 29,73 21,68" />
          <polygon points="16,57 24,61 18,70 10,65" />
          <polygon points="7,59 14,62 9,71 3,67" />

          {/* Row 7 (Antarctic Pole) */}
          <polygon points="23,71 31,75 24,84 16,80" />
          <polygon points="12,69 19,72 13,81 6,77" />
          <polygon points="21,83 28,86 22,94 15,90" />
          <polygon points="29,79 37,82 32,90 24,86" />
          <polygon points="38,88 45,90 41,97 34,95" />
        </g>

        {/* 2. EASTERN HEMISPHERE: Landmass & Dynamic Radio Wave Stream */}
        {/* Main eastern landmass contour matching YAi emblem */}
        <path
          d="
            M 49 9
            C 53 7, 60 10, 66 13
            C 74 17, 82 24, 88 33
            C 94 42, 97 53, 94 65
            C 91 76, 84 86, 74 92
            C 66 96, 58 97, 51 96
            C 49 93, 49 89, 53 85
            C 57 80, 62 77, 63 72
            C 64 68, 61 65, 59 62
            C 55 58, 50 56, 47 53
            C 44 49, 44 46, 47 43
            C 49 40, 53 39, 55 35
            C 57 32, 55 28, 53 25
            C 51 22, 48 20, 47 16
            C 46 12, 47 10, 49 9
            Z
          "
          fill={`url(#${gradId})`}
        />

        {/* Dynamic sweeping radio wave ribbon */}
        <path
          d="
            M 54 18
            C 58 14, 64 16, 69 20
            C 73 23, 76 28, 73 33
            C 70 37, 66 38, 63 42
            C 60 47, 63 53, 67 57
            C 72 61, 79 63, 84 68
            C 88 73, 89 80, 85 84
            C 79 89, 72 86, 67 82
            C 62 78, 61 72, 58 68
            C 55 63, 49 62, 45 59
            C 41 55, 40 49, 44 44
            C 47 40, 53 38, 54 33
            C 56 28, 53 21, 54 18
            Z
          "
          fill={`url(#${gradId})`}
          opacity="0.95"
        />

        {/* Central & South American landmass shape */}
        <path
          d="
            M 42 55
            C 47 57, 53 60, 57 65
            C 61 70, 66 74, 67 80
            C 68 86, 62 90, 56 92
            C 50 94, 45 90, 42 86
            C 39 81, 40 75, 38 70
            C 36 65, 33 61, 36 57
            C 38 54, 40 54, 42 55
            Z
          "
          fill={`url(#${gradId})`}
        />

        {/* Dark cutout channel separating cyber grid and waves */}
        <path
          d="
            M 61 34
            C 64 40, 69 44, 72 50
            C 75 56, 74 63, 69 68
            C 65 72, 60 69, 58 64
            C 56 59, 57 52, 57 46
            C 57 40, 59 36, 61 34
            Z
          "
          fill="#030712"
        />

        {/* Inner crisp glowing rim stroke */}
        <circle
          cx="50"
          cy="50"
          r="48"
          stroke={`url(#${gradId})`}
          strokeWidth="1.2"
          fill="none"
          opacity="0.8"
        />
      </g>
    </svg>
  );
};
