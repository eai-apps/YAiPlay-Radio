import React from 'react';
import { LiteImg } from './LiteImg';
import { ExternalLink } from 'lucide-react';
import { PartnerLink } from '../types/radio';

/** Ненавязчивый блок «Рекомендуем» (ссылки задаются в админке) */
export const PartnersBlock: React.FC<{ partners?: PartnerLink[] }> = ({ partners }) => {
  if (!partners?.length) return null;
  return (
    <section className="mt-10">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Рекомендуем</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {partners.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel={p.isAd ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
            className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800/70 transition-colors"
          >
            {p.image ? <LiteImg src={p.image} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : null}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white truncate">{p.title}</span>
              {p.description ? <span className="block text-[11px] text-zinc-400 truncate">{p.description}</span> : null}
            </span>
            {p.isAd && <span className="text-[9px] font-bold uppercase text-amber-400 border border-amber-500/40 rounded px-1.5 py-0.5 shrink-0">Реклама</span>}
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
};
