import React from 'react';
import { useImagesEnabled } from './preferences';
export function LiteImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const enabled = useImagesEnabled();
  return enabled ? <img {...props} loading="lazy" decoding="async" /> : null;
}
