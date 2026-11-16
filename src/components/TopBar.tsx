import {
  Bookmark,
  Clock3,
  Compass,
  Globe2,
  GraduationCap,
  History,
  Home,
  Landmark,
  LayoutGrid,
  Map as MapIcon,
  Moon,
  Orbit,
  Pause,
  Play,
  Radar,
  Search,
  Settings,
  Sparkles,
  Sun,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { formatHistoricalYear, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import type { AppView } from '../types';
import { LiquidKbd } from './liquid/LiquidUI';

const EASE = [0.23, 1, 0.32, 1] as const;
const PRIMARY: AppView[] = ['home', 'explore', 'timeline', 'monitor', 'civilizations', 'solar-system'];

function LiveYearChip() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const isPlaying = useAtlasStore((s) => s.isTimelinePlaying);
  const setPlaying = useAtlasStore((s) => s.setTimelinePlaying);
  const setView = useAtlasStore((s) => s.setView);

  return (
    <div className="liquid-chip hidden h-8 items-center gap-1 ps-1 pe-1 lg:inline-flex">
      <button
        type="button"
        onClick={() => {
          setView('timeline');
          setPlaying(!isPlaying);
        }}
        aria-label={isPlaying ? 'Pause time in timeline' : 'Play time in timeline'}
        className="grid h-6 w-6 place-items-center rounded-full text-[#0a84ff] transition hover:bg-[#0a84ff]/12 active:scale-90"
      >
        {isPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 translate-x-[0.5px] fill-current" />}
      </button>
      <button
        type="button"
        onClick={() => setView('timeline')}
        className="flex items-center gap-1.5 whitespace-nowrap pe-1.5 font-mono-tabular text-[10.5px] font-semibold"
        aria-label="Open timeline at the active year"
      >
        <Clock3 className="h-3 w-3 text-neutral-500 dark:text-slate-400" />
        {formatHistoricalYear(selectedYear, lang)}
      </button>
    </div>
  );
}

export function TopBar() {
  const view = useAtlasStore((s) => s.view);
  const setView = useAtlasStore((s) => s.setView);
  const setSearchOpen = useAtlasStore((s) => s.setSearchOpen);
  const setAuthModalOpen = useAtlasStore((s) => s.setAuthModalOpen);
  const user = useAtlasStore((s) => s.user);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const theme = useAtlasStore((s) => s.progress.preferences.theme);
  const setTheme = useAtlasStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 18));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const ALL: Array<{ id: AppView; label: string; icon: typeof Home }> = [
    { id: 'home', label: t(lang, 'navHome'), icon: Home },
    { id: 'discover', label: t(lang, 'navDiscover'), icon: Sparkles },
    { id: 'explore', label: t(lang, 'navExplore'), icon: Globe2 },
    { id: 'map', label: t(lang, 'navMap'), icon: MapIcon },
    { id: 'timeline', label: t(lang, 'navTimeline'), icon: History },
    { id: 'monitor', label: 'World Monitor', icon: Radar },
    { id: 'civilizations', label: t(lang, 'navCivilizations'), icon: Compass },
    { id: 'countries', label: t(lang, 'navCountries'), icon: Landmark },
    { id: 'figures', label: t(lang, 'navFigures'), icon: Users },
    { id: 'solar-system', label: t(lang, 'navSolarSystem'), icon: Orbit },
    { id: 'learning', label: t(lang, 'navLearning'), icon: GraduationCap },
    { id: 'favorites', label: t(lang, 'navFavorites'), icon: Bookmark },
    { id: 'profile', label: t(lang, 'navProfile'), icon: UserIcon },
    { id: 'settings', label: t(lang, 'navSettings'), icon: Settings },
  ];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  const iconBtn =
    'tactile-press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-black/[.06] dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer';

  return (
    <>
      <header className={`sticky top-0 z-40 px-3 transition-all duration-500 ${scrolled ? 'pt-1.5' : 'pt-2.5'} pb-1`}>
        <div
          className={`liquid-dock mx-auto flex items-center gap-1 rounded-full ps-3 pe-1.5 transition-all duration-500 ${
            scrolled ? 'h-11 max-w-[1120px] shadow-[0_18px_50px_-28px_rgba(20,28,52,.55)]' : 'h-12 max-w-[1180px]'
          }`}
        >
          <button
            type="button"
            onClick={() => setView('home')}
            className="flex shrink-0 items-center gap-2 font-display text-[15px] font-bold tracking-tight cursor-pointer"
            aria-label={t(lang, 'appName')}
          >
            <span className="relative h-5 w-5 rounded-full bg-[radial-gradient(circle_at_30%_28%,#eaf6ff,#9ccbff_28%,#5b63d9_62%,#0b1b5c)] shadow-[0_0_16px_rgba(90,140,255,.75)]">
              <span className="absolute inset-[3px] rounded-full border border-white/40" />
            </span>
            <span className="hidden whitespace-nowrap sm:inline">{t(lang, 'appName')}</span>
          </button>

          <nav className="mx-auto hidden items-center gap-0.5 md:flex" aria-label="Main">
            {PRIMARY.map((id) => {
              const item = ALL.find((entry) => entry.id === id)!;
              const active = view === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-full px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                    active ? 'text-neutral-950 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill-liquid"
                      transition={{ type: 'spring', stiffness: 480, damping: 38, mass: 0.7 }}
                      className="absolute inset-0 rounded-full border border-white/45 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_6px_16px_-10px_rgba(20,28,52,.5)] dark:border-white/10 dark:bg-white/12"
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-0.5 md:ms-0">
            <LiveYearChip />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t(lang, 'searchTrigger')}
              className={`${iconBtn} w-auto gap-1.5 px-2.5`}
            >
              <Search className="h-4 w-4" />
              <LiquidKbd>⌘K</LiquidKbd>
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className={iconBtn}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label="All sections"
              aria-expanded={open}
              className={iconBtn}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              aria-label="User profile and authentication"
              className="tactile-press shine group relative ms-1 flex h-8 items-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(180deg,#55abff,#0a84ff_50%,#0466d6)] px-2.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_10px_22px_-10px_rgba(10,132,255,.9)] cursor-pointer"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/50" />
              ) : (
                <UserIcon className="h-3.5 w-3.5" />
              )}
              <span className="hidden max-w-[96px] truncate sm:inline">
                {user ? user.displayName?.split(' ')[0] || 'Scholar' : t(lang, 'guestMode')}
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[45] bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              key="panel"
              role="menu"
              initial={{ opacity: 0, scale: 0.96, y: -10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.97, y: -6, filter: 'blur(6px)' }}
              transition={{ duration: 0.24, ease: EASE }}
              style={{ transformOrigin: 'top center' }}
              className="liquid-dock fixed inset-x-3 top-[66px] z-50 mx-auto grid max-h-[80vh] max-w-3xl grid-cols-2 gap-2 overflow-y-auto rounded-[28px] p-3 sm:grid-cols-3 md:grid-cols-4"
              data-lenis-prevent
            >
              {ALL.map(({ id, label, icon: Icon }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setView(id);
                      setOpen(false);
                    }}
                    className={`tactile-press group relative flex min-h-[92px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-3.5 text-start transition-all ${
                      active
                        ? 'bg-[linear-gradient(160deg,#55abff,#0a84ff_55%,#0466d6)] text-white shadow-[0_16px_30px_-14px_rgba(10,132,255,.9)]'
                        : 'bg-black/[.035] hover:bg-black/[.07] dark:bg-white/[.055] dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/20 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    <span className="text-[12.5px] font-semibold leading-tight">{label}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
