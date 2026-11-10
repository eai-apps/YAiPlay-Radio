import React, { useMemo, useState } from 'react';
import { YAiSettings } from '../types/radio';
import { COUNTRIES } from '../constants/countries';
import { TOGGLABLE_SECTIONS, CountryScope } from '../utils/visibility';
import { BLOCKED_STATIONS } from '../constants/streamPolicy';

interface Props {
  settings: YAiSettings;
  onChange: (patch: Partial<YAiSettings>) => void;
}

const SCOPES: { id: CountryScope; label: string }[] = [
  { id: 'radio', label: '📻 Радио' },
  { id: 'tv', label: '📺 Телеканалы' },
  { id: 'webcams', label: '📷 Веб-камеры' },
];

const ISO = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
const flagOf = (cc: string) => String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
let ruNames: Intl.DisplayNames | null = null;
try {
  ruNames = new Intl.DisplayNames(['ru'], { type: 'region' });
} catch {}
const EXTRA = [{ code: 'EU', name: 'Евросоюз (общеевропейские)', flag: '🇪🇺' }];

/** Админка → «Видимость»: включение/выключение разделов и стран */
export const AdminVisibilityTab: React.FC<Props> = ({ settings, onChange }) => {
  const [scope, setScope] = useState<CountryScope>('tv');
  const [q, setQ] = useState('');

  const hiddenSections = settings.hiddenSections || [];
  const hc = {
    radio: settings.hiddenCountries?.radio || [],
    tv: settings.hiddenCountries?.tv || [],
    webcams: settings.hiddenCountries?.webcams || [],
  };
  const hidden = hc[scope];

  // Все страны мира (ISO), названия по-русски; известные из нашего списка — с нашими названиями
  const all = useMemo(() => {
    const known = new Map(COUNTRIES.filter((c) => c.code).map((c) => [c.code.toUpperCase(), c.name]));
    const rows = ISO.map((cc) => ({ code: cc, name: known.get(cc) || ruNames?.of(cc) || cc, flag: flagOf(cc) }));
    rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return [...EXTRA, ...rows];
  }, []);
  const nameOf = (cc: string) => all.find((c) => c.code === cc);

  const toggleSection = (id: string) =>
    onChange({ hiddenSections: hiddenSections.includes(id) ? hiddenSections.filter((x) => x !== id) : [...hiddenSections, id] });

  const toggleCountry = (cc: string) => {
    const next = hidden.includes(cc) ? hidden.filter((x) => x !== cc) : [...hidden, cc];
    onChange({ hiddenCountries: { ...hc, [scope]: next } });
  };

  const list = all.filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()) || c.code.includes(q.trim().toUpperCase()));

  const switchCls = (on: boolean) =>
    `relative w-11 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-violet-500' : 'bg-zinc-700'}`;
  const knob = (on: boolean) => `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`;

  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* Разделы */}
      <section className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
        <h3 className="text-sm font-bold text-white mb-1">Разделы сайта</h3>
        <p className="text-xs text-zinc-400 mb-3">Выключенный раздел полностью пропадает из меню у всех посетителей (после «🚀 Опубликовать»).</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {TOGGLABLE_SECTIONS.map((s) => {
            const on = !hiddenSections.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSection(s.id)}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-left"
              >
                <span className={`text-sm ${on ? 'text-white' : 'text-zinc-500 line-through'}`}>{s.label}</span>
                <span className={switchCls(on)}>
                  <span className={knob(on)} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Вид станций по умолчанию */}
      <section className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
        <h3 className="text-sm font-bold text-white mb-1">Вид станций по умолчанию</h3>
        <p className="text-xs text-zinc-400 mb-3">Для новых посетителей. Каждый может переключить у себя кнопкой «▦ Плитка / ☰ Список» вверху.</p>
        <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          {(['grid', 'list'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onChange({ defaultViewMode: m })}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${(settings.defaultViewMode || 'grid') === m ? 'bg-violet-500 text-zinc-950' : 'text-zinc-300'}`}
            >
              {m === 'grid' ? '▦ Плитка' : '☰ Список'}
            </button>
          ))}
        </div>
      </section>

      {/* Станции, которые сами запретили сторонние приложения */}
      <section className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
        <h3 className="text-sm font-bold text-white mb-1">🚫 Станции, запретившие сторонние приложения</h3>
        <p className="text-xs text-zinc-400 mb-3">
          На своих сайтах эти станции пишут, что их поток нельзя использовать в чужих приложениях и плеерах, поэтому мы их скрываем
          (поиск, глобус, каталог). Если получите разрешение — включите станцию и нажмите «🚀 Опубликовать». Новые находки робота —
          в отчёте docs/STREAM-PERMISSIONS.md.
        </p>
        <div className="space-y-2">
          {BLOCKED_STATIONS.map((b) => {
            const shown = (settings.allowedStreamHosts || []).includes(b.host);
            const link = (b.reason.match(/https?:\/\/\S+/) || [])[0] || `https://${b.host}`;
            return (
              <div key={b.host} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${shown ? 'text-white' : 'text-zinc-400'}`}>
                    {b.name} <span className="text-[11px] text-zinc-500 font-mono">{b.host}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{b.reason}</div>
                  <a href={link} target="_blank" rel="noreferrer" className="text-[11px] text-cyan-400 underline">правила станции</a>
                </div>
                <button
                  onClick={() => {
                    const cur = settings.allowedStreamHosts || [];
                    onChange({ allowedStreamHosts: shown ? cur.filter((h) => h !== b.host) : [...cur, b.host] });
                  }}
                  className="flex items-center gap-2 shrink-0"
                  aria-label={shown ? 'Скрыть станцию' : 'Показать станцию'}
                >
                  <span className={`text-[11px] font-bold ${shown ? 'text-violet-400' : 'text-cyan-300'}`}>{shown ? 'Показана' : 'Скрыта'}</span>
                  <span className={switchCls(shown)}>
                    <span className={knob(shown)} />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Страны */}
      <section className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
        <h3 className="text-sm font-bold text-white mb-1">Скрытые страны</h3>
        <p className="text-xs text-zinc-400 mb-3">Отдельно для радио, телеканалов и веб-камер. Нажмите на страну, чтобы скрыть или вернуть её.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border ${scope === s.id ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}
            >
              {s.label} {hc[s.id].length ? `· скрыто ${hc[s.id].length}` : ''}
            </button>
          ))}
        </div>

        {hidden.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5">Сейчас скрыты (нажмите, чтобы вернуть)</div>
            <div className="flex flex-wrap gap-1.5">
              {hidden.map((cc) => (
                <button key={cc} onClick={() => toggleCountry(cc)} className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-xs font-semibold">
                  {nameOf(cc)?.flag} {nameOf(cc)?.name || cc} ↩
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Найти страну…"
          className="w-full mb-2 text-sm py-2.5 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-violet-400 focus:outline-none text-white"
        />
        <div className="max-h-72 overflow-y-auto grid sm:grid-cols-2 gap-1.5 pr-1">
          {list.map((c) => {
            const on = !hidden.includes(c.code);
            return (
              <button key={c.code} onClick={() => toggleCountry(c.code)} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-left">
                <span className={`text-sm truncate ${on ? 'text-zinc-100' : 'text-zinc-500 line-through'}`}>
                  {c.flag} {c.name}
                </span>
                <span className={switchCls(on)}>
                  <span className={knob(on)} />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
