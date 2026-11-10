import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioProvider, useAudio } from '../src/context/AudioPlayerContext';
import { YAiSettingsProvider, useYAiSettings } from '../src/context/YAiSettingsContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useFavorites } from '../src/hooks/useFavorites';
import { useCustomStations } from '../src/hooks/useCustomStations';
import { COUNTRIES } from '../src/constants/countries';
import { GENRES } from '../src/constants/genres';
import { deduplicateStations, fetchStations, fetchStationsByUuids } from '../src/services/radioApi';
import { getMyCountry } from '../src/services/geoService';
import { syncNow } from '../src/services/syncService';
import { isSectionHidden } from '../src/utils/visibility';
import { isOwnerMode } from '../src/utils/owner';
import { WeakNetToggle } from '../src/components/QualityChip';
import { ShareSheet, openShare } from '../src/components/ShareSheet';
import { AddToPlaylistModal, SharedPlaylistModal, openAddToPlaylist } from '../src/components/PlaylistModals';
import { parseSharedPlaylist, parseSharedStation, type SharedPlaylist } from '../src/services/share';
import type { Station } from '../src/types/radio';
import { StationGrid } from './StationGrid';
import { loadPlaybackCatalog, type LiteCatalog } from './catalog';
import { setImagesEnabled, useImagesEnabled } from './preferences';

const Artists = lazy(() => import('../src/components/ArtistsView').then((m) => ({ default: m.ArtistsView })));
const Moods = lazy(() => import('../src/components/MoodsView').then((m) => ({ default: m.MoodsView })));
const History = lazy(() => import('../src/components/HistoryView').then((m) => ({ default: m.HistoryView })));
const Playlists = lazy(() => import('../src/components/MyPlaylist').then((m) => ({ default: m.MyPlaylist })));
const TV = lazy(() => import('../src/components/LiveTVView').then((m) => ({ default: m.LiveTVView })));
const Webcams = lazy(() => import('../src/components/WebcamsView').then((m) => ({ default: m.WebcamsView })));
const Globe = lazy(() => import('./Geography'));
const Pro = lazy(() => import('../src/components/ProView').then((m) => ({ default: m.ProView })));
const Apps = lazy(() => import('../src/components/AppsView').then((m) => ({ default: m.AppsView })));
const Info = lazy(() => import('../src/components/InfoTelegramView').then((m) => ({ default: m.InfoTelegramView })));
const FullPlayer = lazy(() => import('../src/components/FullScreenPlayer').then((m) => ({ default: m.FullScreenPlayer })));
const Sleep = lazy(() => import('../src/components/SleepTimerModal').then((m) => ({ default: m.SleepTimerModal })));
const Alarm = lazy(() => import('../src/components/AlarmModal').then((m) => ({ default: m.AlarmModal })));
const Recorder = lazy(() => import('../src/components/RecorderModal').then((m) => ({ default: m.RecorderModal })));
const Car = lazy(() => import('../src/components/CarModeModal').then((m) => ({ default: m.CarModeModal })));
const Sync = lazy(() => import('../src/components/SyncModal').then((m) => ({ default: m.SyncModal })));
const Support = lazy(() => import('../src/components/SupportModal').then((m) => ({ default: m.SupportModal })));
const About = lazy(() => import('../src/components/AboutModal').then((m) => ({ default: m.AboutModal })));
const Admin = lazy(() => import('../src/components/AdminModal').then((m) => ({ default: m.AdminModal })));
const Partners = lazy(() => import('../src/components/PartnersBlock').then((m) => ({ default: m.PartnersBlock })));

const TABS = [
  ['popular', 'Главная'], ['search', 'Поиск'], ['genres', 'Жанры и страны'], ['favorites', 'Избранное'],
  ['playlists', 'Мои плейлисты'], ['curated', 'Подборки YAi'], ['exclusive', 'Эксклюзивы / Record'],
  ['artists', 'Артисты и саундтреки'], ['moods', 'Настроение'], ['globe', 'Радио по городам'],
  ['tv', 'Телеканалы'], ['webcams', 'Веб-камеры'], ['history', 'История и треки'],
  ['pro', 'Оформление'], ['apps', 'Приложения'], ['info', 'Информация'],
] as const;
type Tab = typeof TABS[number][0];
type Modal = 'sync' | 'support' | 'about' | 'admin' | null;
function initialTab(): Tab {
  const hash = location.hash.slice(1);
  return TABS.some(([id]) => id === hash) ? hash as Tab : 'popular';
}

function MediaGate({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return open ? <>{children}</> : <div className="lite-panel"><p>{label} доступны по запросу. Видео требует больше трафика, чем радио.</p><button onClick={() => setOpen(true)}>Открыть {label.toLowerCase()}</button></div>;
}

function RadioApp() {
  const audio = useAudio();
  const { settings, updateSettings, resetLogo, togglePro, setTheme } = useYAiSettings();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { customStations, addCustomStation, deleteCustomStation } = useCustomStations();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [modal, setModal] = useState<Modal>(() => location.hash === '#admin' ? 'admin' : null);
  const [menu, setMenu] = useState(false);
  const [catalog, setCatalog] = useState<LiteCatalog | null>(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [genre, setGenre] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [results, setResults] = useState<Station[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [sleepOpen, setSleepOpen] = useState(false);
  const [group, setGroup] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [sharedPlaylist, setSharedPlaylist] = useState<SharedPlaylist | null>(null);
  const [sharedStation, setSharedStation] = useState<Station | null>(null);
  const images = useImagesEnabled();
  const heading = useRef<HTMLHeadingElement>(null);
  const requestId = useRef(0);

  const reloadCatalog = useCallback(() => {
    setLoadError('');
    loadPlaybackCatalog().then(setCatalog).catch((e) => setLoadError(e.message));
  }, []);
  useEffect(reloadCatalog, [reloadCatalog]);
  useEffect(() => () => recognitionRef.current?.abort(), []);
  const voiceSearch = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setNotice('Голосовой поиск не поддерживается этим браузером. Введите название станции.'); return; }
    try {
      const recognition = new Recognition(); recognitionRef.current = recognition;
      recognition.lang = settings.language === 'de' ? 'de-DE' : settings.language === 'en' ? 'en-US' : 'ru-RU';
      recognition.interimResults = false; recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => { const text = event.results[0]?.[0]?.transcript; if (text) setQuery(text); };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => { setListening(false); setNotice('Голосовой поиск не сработал. Введите название станции.'); };
      setListening(true); recognition.start();
    } catch { setListening(false); setNotice('Не удалось включить голосовой поиск.'); }
  };

  const navigate = (next: Tab) => {
    requestId.current++; setBusy(false); setTab(next); setMenu(false); setGroup('');
    setResults(null); setNotice('');
    history.replaceState(null, '', `#${next}`);
    heading.current?.focus(); window.scrollTo({ top: 0, behavior: 'auto' });
  };
  useEffect(() => {
    if (isSectionHidden(settings, tab)) { setTab('popular'); setResults(null); }
  }, [tab, settings.hiddenSections]);

  // The same account and sync protocol as the main site; browser storage is per address.
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout>;
    const sync = () => syncNow().catch(() => {});
    const changed = () => { clearTimeout(pending); pending = setTimeout(sync, 2000); };
    const start = setTimeout(sync, 1500);
    window.addEventListener('YAi_local_change', changed);
    window.addEventListener('focus', sync);
    return () => { clearTimeout(start); clearTimeout(pending); window.removeEventListener('YAi_local_change', changed); window.removeEventListener('focus', sync); };
  }, [settings.apiUrl]);
  useEffect(() => {
    const support = () => setModal('support');
    const sync = () => setModal('sync');
    window.addEventListener('YAi_open_support', support);
    window.addEventListener('YAi_open_sync', sync);
    return () => { window.removeEventListener('YAi_open_support', support); window.removeEventListener('YAi_open_sync', sync); };
  }, []);

  const handleLink = useCallback(async () => {
    const hash = location.hash;
    try {
      if (hash === '#admin') {
        if (!isOwnerMode) { localStorage.setItem('YAi_owner_mode', '1'); location.reload(); return; }
        setModal('admin'); return;
      }
      if (hash.startsWith('#fav=')) {
        const { importFavoritesFromLink } = await import('../src/components/SyncModal');
        const n = await importFavoritesFromLink(customStations);
        setNotice(`Перенесено станций: ${n || 0}`); setTab('favorites'); return;
      }
      if (hash.startsWith('#pl=')) { setSharedPlaylist(parseSharedPlaylist(hash.slice(4))); }
      else if (hash.startsWith('#st=')) { setSharedStation(parseSharedStation(hash.slice(4))); }
      else if (hash.startsWith('#station=')) {
        const id = hash.slice(9);
        if (id.startsWith('ex-')) {
          const c = await loadPlaybackCatalog();
          setSharedStation((c.exclusive || []).flatMap((g) => g.stations).find((s) => s.stationuuid === id) || null);
        } else setSharedStation((await fetchStationsByUuids([id]))[0] || null);
      } else {
        const name = hash.slice(1);
        if (TABS.some(([id]) => id === name)) { setTab(name as Tab); setResults(null); }
        return;
      }
      history.replaceState(null, '', location.pathname);
    } catch { setNotice('Не удалось открыть ссылку. Проверьте интернет и попробуйте ещё раз.'); }
  }, [settings.customStations]);
  useEffect(() => {
    // Wait for published content so custom favorites and backend settings are available.
    if (!settings.apiUrl) return;
    void handleLink(); window.addEventListener('hashchange', handleLink);
    return () => window.removeEventListener('hashchange', handleLink);
  }, [handleLink, settings.apiUrl]);

  const runSearch = async (order?: 'random' | 'clicktrend', mine = false) => {
    const id = ++requestId.current;
    setBusy(true); setLoadError('');
    try {
      const cc = mine ? await getMyCountry() : country;
      if (mine) setCountry(cc);
      const selectedGenre = GENRES.find((g) => g.id === genre);
      const stations = await fetchStations({ name: query.trim() || undefined, countrycode: cc || undefined, tag: selectedGenre?.tag || undefined, limit: 30, ...(order ? { order } : {}) });
      if (id === requestId.current) {
        setResults(stations);
        if (order === 'random' && stations[0]) audio.playStation(stations[0], stations);
      }
    } catch { if (id === requestId.current) setLoadError('Не удалось загрузить станции. Повторите поиск.'); }
    finally { if (id === requestId.current) setBusy(false); }
  };

  const baseStations = useMemo(() => {
    if (tab === 'favorites') return favorites;
    if (results) return [...customStations, ...results];
    if (tab === 'curated' || tab === 'exclusive') {
      const groups = tab === 'curated' ? catalog?.curated : catalog?.exclusive;
      return groups?.find((g) => g.id === group)?.stations || [];
    }
    return [...(settings.featuredStation ? [settings.featuredStation] : []), ...customStations,
      ...(audio.recentStations || []), ...(catalog?.curated || []).flatMap((g) => g.stations).slice(0, 25),
      ...(catalog?.exclusive || []).flatMap((g) => g.stations).slice(0, 10)];
  }, [tab, results, favorites, settings.featuredStation, settings.customStations, catalog, group, audio.recentStations]);
  const stations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tag = GENRES.find((g) => g.id === genre)?.tag;
    return deduplicateStations(baseStations).filter((s) =>
      (!q || `${s.name} ${s.tags || ''} ${s.country || ''}`.toLowerCase().includes(q)) &&
      (!country || s.countrycode?.toUpperCase() === country) &&
      (!tag || (s.tags || '').toLowerCase().includes(tag.toLowerCase())) &&
      (!lowOnly || (s.bitrate && s.bitrate <= 64) || s.alt?.some((a) => a.bitrate > 0 && a.bitrate <= 64)));
  }, [baseStations, query, country, genre, lowOnly, settings.hiddenCountries, settings.allowedStreamHosts, catalog]);
  const gridProps = { currentStation: audio.currentStation, isPlaying: audio.isPlaying, isLoading: busy,
    isFavorite, onPlayStation: audio.playStation, onToggleFavorite: toggleFavorite };
  const commonPageProps = { isFavorite, onToggleFavorite: toggleFavorite };
  const listing = ['popular', 'search', 'genres', 'favorites', 'curated', 'exclusive'].includes(tab);
  const title = TABS.find(([id]) => id === tab)?.[1];
  const current = audio.currentStation;

  return <div className="lite-app" data-images={images}>
    <header className="lite-header">
      <button className="lite-brand" onClick={() => navigate('popular')}>{settings.appTitle} <span>2G</span></button>
      <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="lite-menu">{menu ? 'Закрыть' : 'Меню'}</button>
    </header>
    {menu && <nav id="lite-menu" aria-label="Все разделы" className="lite-menu">
      <a className="lite-full-link" href="https://yaiplay-radio.pages.dev/">← Полная версия сайта (глобус, анимация, обложки)</a>
      {TABS.filter(([id]) => !isSectionHidden(settings, id)).map(([id, name]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>{name}</button>)}
      <button onClick={() => { setModal('sync'); setMenu(false); }}>Аккаунт и синхронизация</button>
      <button onClick={() => { setModal('support'); setMenu(false); }}>Поддержка</button>
      <button onClick={() => { setModal('about'); setMenu(false); }}>О проекте и обновления</button>
      {isOwnerMode && <button onClick={() => setModal('admin')}>Админка</button>}
    </nav>}
    <nav className="lite-quick" aria-label="Быстрый переход">
      {(['popular', 'search', 'favorites', 'playlists'] as Tab[]).filter((id) => !isSectionHidden(settings, id)).map((id) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>{TABS.find(([key]) => key === id)?.[1]}</button>)}
    </nav>
    <main id="main">
      <h1 ref={heading} tabIndex={-1}>{title}</h1>
      {tab === 'popular' && <>
        <p className="lite-intro">Радио с вами. Даже когда сеть слабая.</p>
        <p className="lite-muted">Общий каталог YAi. Без анимации и загрузки картинок по умолчанию.</p>
        <div className="lite-actions"><button className="lite-primary" disabled={!current && !stations.length} onClick={() => current ? audio.togglePlayPause() : stations[0] && audio.playStation(stations[0], stations)}>{current && audio.isPlaying ? 'Пауза' : 'Слушать радио'}</button><WeakNetToggle /></div>
        <button onClick={() => setModal('sync')}>Войти / перенести избранное</button>
        <div className="lite-actions"><button disabled={busy} onClick={() => void runSearch('random')}>Мне повезёт</button><button disabled={busy} onClick={() => void runSearch('clicktrend')}>В тренде</button><button disabled={busy} onClick={() => void runSearch(undefined, true)}>Моя страна</button></div>
        <details className="lite-preferences"><summary>Экономия трафика</summary><p>Выбираем лёгкий поток, если вещатель его предоставляет. Можно слушать любые станции; у некоторых есть только поток высокого качества.</p><label><input type="checkbox" checked={images} onChange={(e) => setImagesEnabled(e.target.checked)} /> Загружать картинки и обложки</label><p>На другом адресе браузер хранит настройки отдельно. Войдите в свой аккаунт или перенесите избранное через меню синхронизации.</p></details>
      </>}
      {listing && <>
        <details className="lite-search-panel" open={tab !== 'popular'}><summary>Поиск по названию, стране и жанру</summary>
        <form className="lite-filters" onSubmit={(e) => { e.preventDefault(); if (tab !== 'favorites') void runSearch(); }}>
          <label className="lite-query">Название или жанр<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти радиостанцию" type="search" /></label>
          <button type="button" onClick={voiceSearch} aria-pressed={listening}>{listening ? 'Остановить микрофон' : 'Голосовой поиск'}</button>
          <label>Страна<select value={country} onChange={(e) => setCountry(e.target.value)}><option value="">Все страны</option>{COUNTRIES.filter((c) => c.code && !(settings.hiddenCountries?.radio || []).includes(c.code)).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
          <label>Жанр<select value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">Все жанры</option>{GENRES.filter((g) => g.tag).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="lite-check"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Есть поток до 64 кбит/с</label>
          {tab !== 'favorites' && <button type="submit" disabled={busy}>Найти в мировом каталоге</button>}
          <button type="button" onClick={() => { setQuery(''); setCountry(''); setGenre(''); setLowOnly(false); setResults(null); }}>Сбросить</button>
        </form>
        </details>
        {(tab === 'curated' || tab === 'exclusive') && <div className="lite-groups">{(tab === 'curated' ? catalog?.curated : catalog?.exclusive)?.map((g) => <button key={g.id} aria-pressed={g.id === group} onClick={() => { setGroup(g.id); setResults(null); }}>{g.name} · {g.stations.length}</button>)}</div>}
        {loadError && <p role="alert">{loadError} <button onClick={reloadCatalog}>Повторить</button></p>}
        {!catalog && !loadError && tab !== 'favorites' ? <p role="status">Загружаем каталог…</p> : <StationGrid {...gridProps} stations={stations} emptySubtitle={tab === 'favorites' ? 'Добавляйте станции сердечком или войдите в аккаунт.' : 'Выберите подборку или выполните поиск в мировом каталоге.'} />}
      </>}
      {notice && <p role="status" className="lite-notice">{notice}</p>}
      {audio.error && <div role="alert" className="lite-error">{audio.error} <button onClick={audio.clearError}>Закрыть</button></div>}
      <Suspense fallback={<p role="status">Загружаем выбранный раздел…</p>}>
        {tab === 'playlists' && <Playlists onGoFavorites={() => navigate('favorites')} />}
        {tab === 'artists' && <Artists {...commonPageProps} />}
        {tab === 'moods' && <Moods {...commonPageProps} selectedCountry={country} />}
        {tab === 'globe' && <Globe />}
        {tab === 'tv' && <MediaGate key="tv" label="Телеканалы"><TV /></MediaGate>}
        {tab === 'webcams' && <MediaGate key="webcams" label="Веб-камеры"><Webcams /></MediaGate>}
        {tab === 'history' && <History {...commonPageProps} />}
        {tab === 'pro' && <Pro isPro={settings.isPro} onTogglePro={togglePro} activeTheme={settings.activeTheme} onSelectTheme={setTheme} />}
        {tab === 'apps' && <Apps />}
        {tab === 'info' && <Info telegramUrl={settings.telegramUrl} onSuggestStation={() => setModal('support')} onOpenAdmin={isOwnerMode ? () => setModal('admin') : undefined} />}
        {tab === 'info' && settings.partners?.length > 0 && <Partners partners={settings.partners} />}
      </Suspense>
      <footer className="lite-footer"><a href="https://yaiplay-radio.pages.dev/">Полная версия ↗</a><button onClick={() => setModal('support')}>Поддержка</button><a href="/privacy.html">Конфиденциальность</a><button onClick={() => setModal('about')}>О проекте</button><p>© {new Date().getFullYear()} {settings.appTitle} · Radio Browser · laut.fm<br />Эфиры принадлежат их правообладателям.</p></footer>
    </main>
    {current && <section className="lite-player" aria-label="Радиоплеер">
      <div className="lite-player-title"><button onClick={() => audio.setIsFullScreenOpen(true)}><strong>{current.name}</strong><small>{audio.isLoading ? 'Подключаемся…' : audio.currentTrackTitle || (audio.isPlaying ? 'В эфире' : 'На паузе')}</small></button><button onClick={() => toggleFavorite(current)} aria-label="В избранное" aria-pressed={isFavorite(current.stationuuid)}>{isFavorite(current.stationuuid) ? '♥' : '♡'}</button></div>
      <div className="lite-actions"><button aria-label="Предыдущая станция" onClick={audio.playPrevious}>↤</button><button className="lite-primary" onClick={audio.togglePlayPause}>{audio.isPlaying ? 'Пауза' : 'Слушать'}</button><button aria-label="Следующая станция" onClick={audio.playNext}>↦</button><button onClick={() => audio.setIsFullScreenOpen(true)}>Плеер</button><details><summary>Ещё</summary><div className="lite-player-tools">
        <label>Громкость<input aria-label="Громкость" type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={(e) => audio.setVolume(Number(e.target.value))} /></label><button onClick={audio.toggleMute}>{audio.isMuted ? 'Включить звук' : 'Без звука'}</button>
        <button onClick={() => openShare({ kind: 'station', station: current })}>Поделиться</button><button onClick={() => openAddToPlaylist(current)}>В плейлист</button><button onClick={() => { audio.bookmarkCurrentTrack(); setNotice('Трек сохранён в истории'); }}>Сохранить трек</button><button onClick={() => setSleepOpen(true)}>Таймер сна</button><button onClick={() => audio.setIsAlarmOpen(true)}>Будильник</button><button onClick={() => audio.setIsRecorderOpen(true)}>Запись эфира</button><button onClick={() => audio.setIsCarModeOpen(true)}>За рулём</button><WeakNetToggle />
      </div></details></div>
      {audio.sleepTimerRemainingSec !== null && <small>Таймер: {Math.ceil(audio.sleepTimerRemainingSec / 60)} мин.</small>}
    </section>}
    <ShareSheet /><AddToPlaylistModal />
    {sharedPlaylist && <SharedPlaylistModal data={sharedPlaylist} onClose={() => setSharedPlaylist(null)} />}
    {sharedStation && <SharedPlaylistModal data={{ name: sharedStation.name, items: [] }} preset={[sharedStation]} onClose={() => setSharedStation(null)} />}
    <Suspense fallback={<div className="lite-modal-loading" role="status">Загружаем окно…</div>}>
      {audio.isFullScreenOpen && <FullPlayer isFavorite={current ? isFavorite(current.stationuuid) : false} onToggleFavorite={() => current && toggleFavorite(current)} />}
      {sleepOpen && <Sleep isOpen onClose={() => setSleepOpen(false)} />}
      {audio.isAlarmOpen && <Alarm onClose={() => audio.setIsAlarmOpen(false)} favorites={favorites} />}
      {audio.isRecorderOpen && <Recorder onClose={() => audio.setIsRecorderOpen(false)} />}
      {audio.isCarModeOpen && <Car onClose={() => audio.setIsCarModeOpen(false)} favorites={favorites} {...commonPageProps} />}
      {modal === 'sync' && <Sync onClose={() => setModal(null)} />}
      {modal === 'support' && <Support onClose={() => setModal(null)} telegramUrl={settings.telegramUrl} contactEmail={settings.contactEmail} />}
      {modal === 'about' && <About onClose={() => setModal(null)} />}
      {modal === 'admin' && isOwnerMode && <Admin isOpen onClose={() => setModal(null)} settings={settings} onUpdateSettings={updateSettings} onResetLogo={resetLogo} customStations={customStations} onAddCustomStation={addCustomStation} onDeleteCustomStation={deleteCustomStation} />}
    </Suspense>
  </div>;
}

export default function App() {
  return <ErrorBoundary><YAiSettingsProvider><AudioProvider><RadioApp /></AudioProvider></YAiSettingsProvider></ErrorBoundary>;
}
