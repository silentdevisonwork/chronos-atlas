/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onAuthStateChanged } from 'firebase/auth';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Component, type ErrorInfo, type ReactNode, useEffect, useRef } from 'react';
import { Toaster } from 'sonner';
import { AuthModal } from './components/AuthModal';
import { CustomCursor } from './components/CustomCursor';
import { OnboardingFlow } from './components/OnboardingFlow';
import { SearchPalette } from './components/SearchPalette';
import { TopBar } from './components/TopBar';
import { ChronosHUD } from './components/liquid/ChronosHUD';
import { LiquidBackground } from './components/liquid/LiquidBackground';
import { SmoothScroll } from './components/liquid/SmoothScroll';
import { auth } from './lib/firebase';
import { applyDocumentThemeAndLanguage, useAtlasStore } from './store/useAtlasStore';
import {
  CivilizationsView,
  CountriesView,
  FiguresView,
} from './views/CivilizationsCountriesView';
import { ExploreMapView } from './views/ExploreMapView';
import { MonitorView } from './views/MonitorView';
import { HomeDiscoverView } from './views/HomeDiscoverView';
import {
  FavoritesView,
  LearningView,
  ProfileView,
  SettingsView,
} from './views/LearningFavoritesProfileSettingsView';
import { SolarSystemView } from './views/SolarSystemView';
import { TimelineView } from './views/TimelineView';
import type { AppView } from './types';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AtlasErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'An unexpected rendering error occurred.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Chronos Atlas ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl px-6 py-16 text-center space-y-4">
          <h2 className="font-display text-3xl font-bold text-neutral-950 dark:text-slate-50">
            Observatory View Interrupted
          </h2>
          <p className="text-sm text-neutral-600 dark:text-slate-400">{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="liquid-button h-10 px-5 text-xs font-semibold"
          >
            Restore View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const VIEWS: AppView[] = [
  'home',
  'explore',
  'map',
  'timeline',
  'civilizations',
  'countries',
  'figures',
  'discover',
  'monitor',
  'solar-system',
  'learning',
  'favorites',
  'profile',
  'settings',
];

export default function App() {
  const view = useAtlasStore((s) => s.view);
  const setView = useAtlasStore((s) => s.setView);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const isPlaying = useAtlasStore((s) => s.isTimelinePlaying);
  const setPlaying = useAtlasStore((s) => s.setTimelinePlaying);
  const prefs = useAtlasStore((s) => s.progress.preferences);
  const setAuthUser = useAtlasStore((s) => s.setAuthUser);
  const markAuthReady = useAtlasStore((s) => s.markAuthReady);
  const lastG = useRef(0);

  useEffect(() => {
    applyDocumentThemeAndLanguage(prefs);
  }, [prefs]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        void setAuthUser(firebaseUser);
      },
      () => {
        markAuthReady();
      }
    );
    return () => unsubscribe();
  }, [setAuthUser, markAuthReady]);

  /* Deep-link the current view + year: #timeline@1453 */
  useEffect(() => {
    const applyHash = () => {
      const raw = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!raw) return;
      const [viewPart, yearPart] = raw.split('@');
      if (VIEWS.includes(viewPart as AppView)) setView(viewPart as AppView);
      const year = Number(yearPart);
      if (Number.isFinite(year) && yearPart) setSelectedYear(year);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [setSelectedYear, setView]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      window.history.replaceState(null, '', `#${view}@${Math.round(selectedYear)}`);
    }, 240);
    return () => window.clearTimeout(id);
  }, [view, selectedYear]);

  /* Playback belongs to the timeline; stop it when the user leaves. */
  useEffect(() => {
    if (view !== 'timeline' && isPlaying) setPlaying(false);
  }, [view, isPlaying, setPlaying]);

  /* Scroll to the top on view change without fighting Lenis. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view]);

  /* Pointer-driven 3D depth variables for the whole stage. */
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.reducedMotion || window.matchMedia('(pointer: coarse)').matches) {
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
      return;
    }
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const render = () => {
      raf = 0;
      root.style.setProperty('--px', tx.toFixed(3));
      root.style.setProperty('--py', ty.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      tx = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      ty = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(render);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(render);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
    };
  }, [prefs.reducedMotion]);

  /* Gmail-style two-key navigation: g then h / e / t / c / m / s / f / l. */
  useEffect(() => {
    const map: Record<string, AppView> = {
      h: 'home',
      e: 'explore',
      t: 'timeline',
      c: 'civilizations',
      m: 'monitor',
      s: 'solar-system',
      f: 'figures',
      l: 'learning',
      n: 'countries',
      d: 'discover',
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === 'g') {
        lastG.current = Date.now();
        return;
      }
      if (Date.now() - lastG.current > 900) return;
      const next = map[event.key.toLowerCase()];
      if (!next) return;
      event.preventDefault();
      lastG.current = 0;
      setView(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView]);

  const renderView = () => {
    switch (view) {
      case 'home':
        return <HomeDiscoverView mode="home" />;
      case 'discover':
        return <HomeDiscoverView mode="discover" />;
      case 'explore':
        return <ExploreMapView force2D={false} />;
      case 'map':
        return <ExploreMapView force2D={true} />;
      case 'monitor':
        return <MonitorView />;
      case 'timeline':
        return <TimelineView />;
      case 'civilizations':
        return <CivilizationsView />;
      case 'countries':
        return <CountriesView />;
      case 'figures':
        return <FiguresView />;
      case 'solar-system':
        return <SolarSystemView />;
      case 'learning':
        return <LearningView />;
      case 'favorites':
        return <FavoritesView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ExploreMapView force2D={false} />;
    }
  };

  return (
    <MotionConfig reducedMotion={prefs.reducedMotion ? 'always' : 'user'}>
      <div className="relative min-h-screen overflow-x-clip bg-transparent text-neutral-900 transition-colors duration-200 dark:text-slate-100">
        <LiquidBackground />
        <div className="ambient-aurora" aria-hidden="true" />
        <div className="scroll-progress" aria-hidden="true" />
        <div className="noise-layer pointer-events-none fixed inset-0 z-[1] opacity-70" aria-hidden="true" />
        <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_55%,rgba(10,20,40,.06))] dark:bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_48%,rgba(0,0,0,.36))]" aria-hidden="true" />

        <SmoothScroll />
        <CustomCursor />
        <TopBar />

        <main className="relative z-10 flex-1 stage-3d" style={{ perspective: '1600px' }}>
          <AtlasErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={
                  prefs.reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: 18, rotateX: 3.5, scale: 0.988, filter: 'blur(12px)' }
                }
                animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, filter: 'blur(0px)' }}
                exit={prefs.reducedMotion ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.994, filter: 'blur(7px)' }}
                transition={{ duration: prefs.reducedMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="view-stage w-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </AtlasErrorBoundary>
        </main>

        {view !== 'timeline' && view !== 'explore' && view !== 'map' ? <ChronosHUD /> : null}

        <OnboardingFlow />
        <SearchPalette />
        <AuthModal />
        <Toaster
          position="bottom-center"
          theme={prefs.theme}
          toastOptions={{
            className: 'font-sans text-xs',
          }}
        />
      </div>
    </MotionConfig>
  );
}
