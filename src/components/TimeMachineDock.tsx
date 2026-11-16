import { Bookmark, ChevronDown, ChevronUp, Globe2, Map, Pause, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { getActiveCivilizationsForYear } from '../data/civilizations';
import { formatHistoricalYear, localize, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import {
  ERA_MARKERS,
  getEraClassification,
  PrecisionTimelineSlider,
  TIMELINE_MAX_YEAR,
  TIMELINE_MIN_YEAR,
} from './PrecisionTimelineSlider';
import { SegmentedControl, TooltipHint } from './ui/DesignPrimitives';

export function TimeMachineDock() {
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const isPlaying = useAtlasStore((s) => s.isTimelinePlaying);
  const setPlaying = useAtlasStore((s) => s.setTimelinePlaying);
  const speed = useAtlasStore((s) => s.timelineSpeed);
  const setSpeed = useAtlasStore((s) => s.setTimelineSpeed);
  const mapMode = useAtlasStore((s) => s.mapMode);
  const setMapMode = useAtlasStore((s) => s.setMapMode);
  const hudCollapsed = useAtlasStore((s) => s.hudCollapsed);
  const setHudCollapsed = useAtlasStore((s) => s.setHudCollapsed);
  const savedPeriods = useAtlasStore((s) => s.progress.savedPeriods);
  const toggleSavedPeriod = useAtlasStore((s) => s.toggleSavedPeriod);
  const lang = useAtlasStore((s) => s.progress.preferences.language);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const cur = useAtlasStore.getState().selectedYear;
      const step = speed * 8;
      if (cur + step >= TIMELINE_MAX_YEAR) {
        useAtlasStore.getState().setSelectedYear(TIMELINE_MAX_YEAR);
        useAtlasStore.getState().setTimelinePlaying(false);
      } else {
        useAtlasStore.getState().setSelectedYear(cur + step);
      }
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'h') {
        setHudCollapsed(!hudCollapsed);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!isPlaying);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hudCollapsed, isPlaying, setHudCollapsed, setPlaying]);

  const activeCivs = getActiveCivilizationsForYear(selectedYear);
  const isBookmarked = savedPeriods.includes(selectedYear);
  const activeMarker = ERA_MARKERS.find((m) => Math.abs(m.year - selectedYear) <= 5);
  const eraName = getEraClassification(selectedYear);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center px-3">
      <TooltipHint label="Toggle Time Machine Dock (H)">
        <button
          type="button"
          onClick={() => setHudCollapsed(!hudCollapsed)}
          className="pointer-events-auto mb-1.5 flex items-center gap-1.5 rounded-t-xl webgl-hud-surface px-3.5 py-1 text-[11px] font-medium text-neutral-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer whitespace-nowrap"
        >
          {hudCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{hudCollapsed ? t(lang, 'showControls') : t(lang, 'hideControls')}</span>
          {hudCollapsed && (
            <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400 ml-1">
              · {formatHistoricalYear(selectedYear, lang)}
            </span>
          )}
        </button>
      </TooltipHint>

      <AnimatePresence>
        {!hudCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="pointer-events-auto w-full max-w-[980px] rounded-2xl webgl-hud-surface px-4 py-3 space-y-2.5"
          >
            {/* Dynamic Year Display & Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TooltipHint label={isPlaying ? 'Pause (Space)' : 'Play History (Space)'}>
                  <button
                    type="button"
                    onClick={() => setPlaying(!isPlaying)}
                    aria-label={isPlaying ? 'Pause time progression' : 'Play time progression'}
                    className="tactile-press flex h-9 w-9 items-center justify-center rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-[0_4px_14px_-4px_rgba(128,128,128,0.65)] cursor-pointer shrink-0"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                </TooltipHint>

                {/* Live Dynamic Year Display + Direct Numeric Input */}
                <div className="flex items-baseline gap-2.5">
                  <div className="font-mono-tabular text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white whitespace-nowrap">
                    {formatHistoricalYear(selectedYear, lang)}
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-500 dark:text-slate-400 whitespace-nowrap">
                    <span>{eraName}</span>
                    {activeMarker && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {activeMarker.milestone}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <input
                  type="number"
                  aria-label="Exact historical year"
                  min={TIMELINE_MIN_YEAR}
                  max={TIMELINE_MAX_YEAR}
                  value={selectedYear}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(parsed)) {
                      setSelectedYear(Math.max(TIMELINE_MIN_YEAR, Math.min(TIMELINE_MAX_YEAR, parsed)));
                    }
                  }}
                  className="hidden sm:block w-20 rounded-lg border border-neutral-300/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/90 px-2 py-1 font-mono-tabular text-xs font-semibold text-neutral-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <div className="hidden lg:block">
                  <SegmentedControl
                    size="xs"
                    value={String(speed)}
                    onChange={(v) => setSpeed(Number(v))}
                    options={[
                      { value: '1', label: '1x' },
                      { value: '4', label: '4x' },
                      { value: '15', label: '15x' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden xl:block text-[11px] text-neutral-500 dark:text-slate-400 truncate max-w-[230px]">
                  {activeCivs.length > 0
                    ? activeCivs
                        .slice(0, 2)
                        .map((c) => localize(c.name, lang).split('(')[0].trim())
                        .join(' · ')
                    : 'Prehistoric / Transition'}
                </div>

                <SegmentedControl
                  size="xs"
                  value={mapMode}
                  onChange={(m) => setMapMode(m)}
                  options={[
                    { value: '3d', label: t(lang, 'mode3DGlobe'), icon: <Globe2 className="h-3.5 w-3.5" /> },
                    { value: '2d', label: t(lang, 'mode2DMap'), icon: <Map className="h-3.5 w-3.5" /> },
                  ]}
                />

                <TooltipHint label={isBookmarked ? 'Remove period bookmark' : 'Bookmark this year'}>
                  <button
                    type="button"
                    onClick={() => toggleSavedPeriod(selectedYear)}
                    aria-label="Bookmark historical year"
                    className={`tactile-press rounded-xl border px-2.5 py-1.5 text-xs font-medium cursor-pointer flex items-center gap-1 ${
                      isBookmarked
                        ? 'border-blue-600 bg-blue-600/15 text-blue-800 dark:text-blue-300'
                        : 'border-neutral-300/80 dark:border-slate-700/80 text-neutral-700 dark:text-slate-300 hover:border-blue-600/60'
                    }`}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </TooltipHint>
              </div>
            </div>

            {/* High-Precision Dual-Track Interactive Timeline Slider */}
            <PrecisionTimelineSlider
              year={selectedYear}
              onChange={setSelectedYear}
              lang={lang}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
