import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isNativeApp } from '../utils/platform';

const TITLE = 'YAi Radio';

function shouldShow(): boolean {
  try {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isNativeApp || standalone) {
      // В приложении — при каждом «холодном» запуске
      if (sessionStorage.getItem('yaiplayradio_intro_done')) return false;
      sessionStorage.setItem('yaiplayradio_intro_done', '1');
      return true;
    }
    // На сайте — только при самом первом посещении
    if (localStorage.getItem('yaiplayradio_intro_seen')) return false;
    localStorage.setItem('yaiplayradio_intro_seen', '1');
    return true;
  } catch {
    return false;
  }
}

/** Эффектное открытие: глобус влетает с вращением, расходятся радиоволны, появляется название */
export const IntroSplash: React.FC = () => {
  const [stage, setStage] = useState<'show' | 'leave' | 'gone'>(() => (shouldShow() ? 'show' : 'gone'));

  useEffect(() => {
    if (stage !== 'show') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t1 = setTimeout(() => setStage('leave'), reduce ? 700 : 2500);
    return () => clearTimeout(t1);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'leave') return;
    const t = setTimeout(() => setStage('gone'), 550);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === 'gone') return null;

  // Через портал в body — чтобы поверх всего сайта, независимо от родительских блоков
  return createPortal(
    <div
      onClick={() => setStage('leave')}
      className={`yaiplayradio-intro fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none ${stage === 'leave' ? 'is-leaving' : ''}`}
      aria-hidden
    >
      <style>{`
        .yaiplayradio-intro{background:radial-gradient(circle at 50% 45%,#06281f 0%,#05110f 38%,#09090b 75%);animation:si-bg 2.5s ease-out both}
        .yaiplayradio-intro.is-leaving{animation:si-out .55s ease-in forwards}
        @keyframes si-out{to{opacity:0;transform:scale(1.08);filter:blur(6px)}}
        @keyframes si-bg{from{background-size:60% 60%}to{background-size:100% 100%}}
        .si-stage{position:relative;width:min(56vw,260px);aspect-ratio:1}
        .si-ring{position:absolute;inset:0;border-radius:9999px;border:2px solid rgba(52,211,153,.55);opacity:0;animation:si-wave 2.1s cubic-bezier(.2,.6,.3,1) infinite}
        .si-ring:nth-child(2){animation-delay:.45s;border-color:rgba(34,211,238,.5)}
        .si-ring:nth-child(3){animation-delay:.9s;border-color:rgba(31,206,235,.45)}
        @keyframes si-wave{0%{transform:scale(.55);opacity:.9}100%{transform:scale(2.3);opacity:0}}
        .si-glow{position:absolute;inset:-18%;border-radius:9999px;background:radial-gradient(circle,rgba(96,65,216,.55),rgba(6,182,212,.25) 45%,transparent 70%);filter:blur(18px);animation:si-pulse 1.6s ease-in-out infinite alternate}
        @keyframes si-pulse{from{opacity:.55;transform:scale(.92)}to{opacity:1;transform:scale(1.06)}}
        .si-globe{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 22px rgba(96,65,216,.55));animation:si-in 1s cubic-bezier(.17,1.4,.4,1) both,si-spin 9s linear 1s infinite}
        @keyframes si-in{from{opacity:0;transform:scale(.25) rotate(-220deg)}to{opacity:1;transform:scale(1) rotate(0)}}
        @keyframes si-spin{to{transform:rotate(360deg)}}
        .si-title{margin-top:min(9vw,44px);font-weight:800;font-size:clamp(30px,9vw,46px);letter-spacing:-.02em;color:#fff;display:flex}
        .si-title span{display:inline-block;opacity:0;transform:translateY(18px);animation:si-letter .5s cubic-bezier(.2,.9,.3,1.3) forwards}
        @keyframes si-letter{to{opacity:1;transform:none}}
        .si-title .acc{background:linear-gradient(90deg,#22d3ee,#6041d8,#1fcfeb);-webkit-background-clip:text;background-clip:text;color:transparent}
        .si-sub{margin-top:8px;font-family:"JetBrains Mono",monospace;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#6ee7b7;opacity:0;animation:si-fade .6s ease-out 1.35s forwards}
        @keyframes si-fade{to{opacity:.9}}
        .si-eq{display:flex;gap:5px;height:26px;align-items:flex-end;margin-top:22px;opacity:0;animation:si-fade .4s ease-out 1.5s forwards}
        .si-eq i{width:5px;border-radius:3px;background:linear-gradient(#1fcfeb,#6041d8);animation:si-bar .7s ease-in-out infinite alternate}
        .si-eq i:nth-child(2){animation-delay:.15s}.si-eq i:nth-child(3){animation-delay:.3s}.si-eq i:nth-child(4){animation-delay:.1s}.si-eq i:nth-child(5){animation-delay:.25s}
        @keyframes si-bar{from{height:5px}to{height:26px}}
        @media (prefers-reduced-motion: reduce){.yaiplayradio-intro *{animation-duration:.01s!important;animation-iteration-count:1!important}}
      `}</style>

      <div className="si-stage">
        <div className="si-glow" />
        <span className="si-ring" />
        <span className="si-ring" />
        <span className="si-ring" />
        <img src="./logo-globe.png" alt="" className="si-globe" />
      </div>

      <div className="si-title">
        {TITLE.split('').map((ch, i) => (
          <span key={i} className={i >= 7 ? 'acc' : ''} style={{ animationDelay: `${0.7 + i * 0.045}s` }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </div>
      <div className="si-sub">Радио со всего мира</div>
      <div className="si-eq">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>,
    document.body
  );
};
