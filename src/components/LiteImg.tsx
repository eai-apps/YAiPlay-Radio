import React from 'react';
import { useLiteMode } from '../utils/liteMode';

/** Обычная картинка, которая в «Лёгком режиме» не загружается вообще */
export const LiteImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  const [lite] = useLiteMode();
  if (lite) return null;
  return <img loading="lazy" decoding="async" {...props} />;
};
