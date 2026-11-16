import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpDown,
  Bookmark,
  CalendarRange,
  Check,
  Clock3,
  Crosshair,
  Gauge,
  GitCompareArrows,
  Globe2,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type ReactNode,
  type UIEvent as ReactUIEvent,
} from 'react';
import { toast } from 'sonner';
import { CIVILIZATIONS, CIVILIZATION_MAP, CIVILIZATION_REGIONS } from '../../data/civilizations';
import { TIMELINE_EVENTS } from '../../data/timeline';
import { MAJOR_WARS_AND_BATTLES } from '../../data/warsAndTrade';
import { formatHistoricalYear, localize } from '../../i18n/languages';
import { useAtlasStore } from '../../store/useAtlasStore';
import type { Civilization, TimelineEvent, WarConflictRecord } from '../../types';
import {
  Eyebrow,
  LiquidButton,
  LiquidChip,
  LiquidInput,
  LiquidKbd,
  LiquidPanel,
  LiquidTooltip,
} from './LiquidUI';

export const FULL_START = -15000;
export const FULL_END = 2026;
const FULL_SPAN = FULL_END - FULL_START;
const MIN_SPAN = 55;
const ROW_HEIGHT = 38;
const BASE_YEARS_PER_SECOND = 55;
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

type EraKey = TimelineEvent['era'];
type SortKey = 'chronology' | 'peak' | 'duration' | 'name';
type Focus =
  | { kind: 'civ'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'war'; id: string }
  | null;

interface ViewWindow {
  start: number;
  end: number;
}

interface EraBand {
  id: EraKey;
  label: string;
  short: string;
  from: number;
  to: number;
  tint: string;
  solid: string;
}

const ERAS: EraBand[] = [
  { id: 'prehistory', label: 'Prehistory', short: 'PRE', from: FULL_START, to: -3300, tint: 'rgba(217, 119, 6, 0.16)', solid: '#d97706' },
  { id: 'ancient', label: 'Ancient', short: 'ANC', from: -3300, to: -800, tint: 'rgba(234, 88, 12, 0.15)', solid: '#ea580c' },
  { id: 'classical', label: 'Classical', short: 'CLA', from: -800, to: 500, tint: 'rgba(13, 148, 136, 0.14)', solid: '#0d9488' },
  { id: 'medieval', label: 'Medieval', short: 'MED', from: 500, to: 1450, tint: 'rgba(79, 70, 229, 0.14)', solid: '#4f46e5' },
  { id: 'early-modern', label: 'Early Modern', short: 'EMO', from: 1450, to: 1800, tint: 'rgba(147, 51, 234, 0.14)', solid: '#9333ea' },
  { id: 'modern', label: 'Modern', short: 'MOD', from: 1800, to: FULL_END, tint: 'rgba(2, 132, 199, 0.15)', solid: '#0284c7' },
];

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'chronology', label: 'Chronology' },
  { id: 'peak', label: 'Peak year' },
  { id: 'duration', label: 'Longest span' },
  { id: 'name', label: 'A → Z' },
];

const QUICK_JUMPS: Array<{ label: string; year: number }> = [
  { label: 'Göbekli Tepe', year: -9600 },
  { label: 'First writing', year: -3200 },
  { label: 'Giza', year: -2560 },
  { label: 'Hammurabi', year: -1750 },
  { label: 'Kadesh', year: -1274 },
  { label: 'Rome falls', year: 476 },
  { label: 'Constantinople', year: 1453 },
  { label: 'Moon landing', year: 1969 },
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const clampWindow = (start: number, end: number): ViewWindow => {
  let s = start;
  let e = end;
  let span = e - s;
  if (!Number.isFinite(span) || span <= 0) span = FULL_SPAN;
  if (span >= FULL_SPAN) return { start: FULL_START, end: FULL_END };
  if (span < MIN_SPAN) {
    const center = (s + e) / 2;
    s = center - MIN_SPAN / 2;
    e = center + MIN_SPAN / 2;
    span = MIN_SPAN;
  }
  if (s < FULL_START) {
    s = FULL_START;
    e = s + span;
  }
  if (e > FULL_END) {
    e = FULL_END;
    s = e - span;
  }
  return { start: s, end: e };
};

const zoomedWindow = (prev: ViewWindow, factor: number, anchorYear: number): ViewWindow => {
  const span = prev.end - prev.start;
  const ratio = clamp((anchorYear - prev.start) / span, 0, 1);
  const nextSpan = clamp(span * factor, MIN_SPAN, FULL_SPAN);
  const start = anchorYear - nextSpan * ratio;
  return clampWindow(start, start + nextSpan);
};

const pctFor = (year: number, view: ViewWindow) =>
  ((year - view.start) / Math.max(1, view.end - view.start)) * 100;

const yearAtPct = (pct: number, view: ViewWindow) =>
  view.start + (clamp(pct, 0, 100) / 100) * (view.end - view.start);

const shortYear = (year: number) =>
  year < 0 ? `${Math.abs(Math.round(year)).toLocaleString()} BCE` : `${Math.round(year).toLocaleString()} CE`;

const rangeLabel = (start: number, end: number) => `${shortYear(start)} → ${shortYear(end)}`;

const durationLabel = (years: number) => {
  const abs = Math.abs(Math.round(years));
  if (abs >= 1000) return `${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k yrs`;
  return `${abs} yrs`;
};

const tickStepFor = (span: number) => {
  const candidates = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];
  return candidates.find((step) => span / step <= 11) ?? 5000;
};

function useVirtualRows(count: number, rowHeight: number, ref: RefObject<HTMLDivElement | null>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(560);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setViewport(el.clientHeight || 560);
    const observer = new ResizeObserver(() => setViewport(el.clientHeight || 560));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  const onScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const end = Math.min(count, Math.ceil((scrollTop + viewport) / rowHeight) + 6);
  return { start, end, onScroll };
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                               */
/* -------------------------------------------------------------------------- */

function Stat({ value, label, accent }: { value: ReactNode; label: string; accent?: string }) {
  return (
    <div className="min-w-[76px]">
      <div className="font-display text-xl font-bold tracking-tight text-neutral-950 dark:text-white" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-black/[.055] py-2 last:border-0 dark:border-white/[.075]">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-[11.5px] font-medium leading-relaxed text-neutral-800 dark:text-slate-200">{value || '—'}</span>
    </div>
  );
}

function HeritageList({ items, max = 4 }: { items: string[]; max?: number }) {
  if (!items.length) return <span className="text-neutral-500 dark:text-slate-400">—</span>;
  return (
    <span>
      {items.slice(0, max).join(' · ')}
      {items.length > max ? ` +${items.length - max}` : ''}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail drawer                                                              */
/* -------------------------------------------------------------------------- */

function CivilizationDrawer({
  civ,
  onClose,
  onCompare,
  compareActive,
}: {
  civ: Civilization;
  onClose: () => void;
  onCompare: () => void;
  compareActive: boolean;
}) {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setView = useAtlasStore((s) => s.setView);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);
  const toggleSavedPeriod = useAtlasStore((s) => s.toggleSavedPeriod);
  const favorites = useAtlasStore((s) => s.progress.favoriteCivilizations);
  const savedPeriods = useAtlasStore((s) => s.progress.savedPeriods);
  const isFav = favorites.includes(civ.id);
  const isSaved = savedPeriods.includes(civ.peakYear);
  const inside = selectedYear >= civ.startYear && selectedYear <= civ.endYear;

  const openGlobe = (year: number) => {
    setSelectedYear(year);
    setFlyToCoords(civ.capital.coords);
    setInspector({ type: 'civilization', id: civ.id, coords: civ.capital.coords });
    setView('explore');
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 24, filter: 'blur(8px)' }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      data-lenis-prevent
      className="glass-surface fixed inset-x-3 bottom-3 z-[62] max-h-[78vh] overflow-y-auto rounded-[26px] p-5 sm:inset-y-20 sm:left-auto sm:right-4 sm:w-[400px] sm:max-h-none"
      aria-label={`${localize(civ.name, lang)} details`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full shadow-[0_0_16px_currentColor]" style={{ backgroundColor: civ.color, color: civ.color }} />
          <div>
            <Eyebrow>{civ.region ?? 'Civilization'} · {inside ? 'active now' : 'archived'}</Eyebrow>
            <h3 className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight">{localize(civ.name, lang)}</h3>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[.05] transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="liquid-chip h-7 px-2.5 text-[10px] font-semibold">{rangeLabel(civ.startYear, civ.endYear)}</span>
        <span className="liquid-chip h-7 px-2.5 text-[10px] font-semibold">{durationLabel(civ.endYear - civ.startYear)}</span>
        <button type="button" onClick={() => setSelectedYear(civ.peakYear)} className="liquid-chip h-7 px-2.5 text-[10px] font-semibold text-[#0a84ff] dark:text-[#8ec5ff]">
          Peak · {shortYear(civ.peakYear)}
        </button>
      </div>

      <p className="text-[12.5px] leading-relaxed text-neutral-700 dark:text-slate-300">{localize(civ.summary, lang)}</p>

      <div className="mt-4 space-y-0">
        <MetricRow label="Capital" value={localize(civ.capital.name, lang)} />
        <MetricRow label="Modern states" value={civ.modernCountries.join(', ')} />
        <MetricRow label="Rulers" value={<HeritageList items={civ.rulers} max={5} />} />
        <MetricRow label="Languages" value={<HeritageList items={civ.languages} max={5} />} />
        <MetricRow label="Innovations" value={<HeritageList items={civ.inventions} max={4} />} />
        <MetricRow label="Landmarks" value={<HeritageList items={civ.architecture} max={3} />} />
      </div>

      {civ.verifiedFacts.length ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified archive
          </div>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-neutral-700 dark:text-slate-300">
            {civ.verifiedFacts.slice(0, 3).map((fact) => (
              <li key={fact} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex flex-wrap gap-2 border-t border-black/[.06] bg-[var(--lg-bg-strong)] px-5 py-4 backdrop-blur-2xl dark:border-white/10">
        <LiquidButton size="sm" variant="primary" onClick={() => openGlobe(clamp(selectedYear, civ.startYear, civ.endYear))}>
          <Globe2 className="h-3.5 w-3.5" /> Open on 3D globe
        </LiquidButton>
        <LiquidButton size="sm" variant={isFav ? 'glass' : 'quiet'} onClick={() => toggleFavorite('favoriteCivilizations', civ.id)}>
          <Bookmark className={`h-3.5 w-3.5 ${isFav ? 'fill-current text-amber-500' : ''}`} /> {isFav ? 'Saved' : 'Save'}
        </LiquidButton>
        <LiquidButton size="sm" variant={compareActive ? 'primary' : 'quiet'} onClick={onCompare}>
          <GitCompareArrows className="h-3.5 w-3.5" /> Compare
        </LiquidButton>
        <LiquidTooltip label={isSaved ? 'Remove peak bookmark' : 'Bookmark peak year'}>
          <LiquidButton size="sm" variant="quiet" onClick={() => toggleSavedPeriod(civ.peakYear)} aria-label="Bookmark peak year">
            {isSaved ? <Check className="h-3.5 w-3.5" /> : <CalendarRange className="h-3.5 w-3.5" />}
          </LiquidButton>
        </LiquidTooltip>
      </div>
    </motion.aside>
  );
}

function EventDrawer({ event, onClose }: { event: TimelineEvent; onClose: () => void }) {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setView = useAtlasStore((s) => s.setView);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 24, filter: 'blur(8px)' }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      data-lenis-prevent
      className="glass-surface fixed inset-x-3 bottom-3 z-[62] max-h-[78vh] overflow-y-auto rounded-[26px] p-5 sm:inset-y-20 sm:left-auto sm:right-4 sm:w-[400px] sm:max-h-none"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Eyebrow icon={<Sparkles className="h-3 w-3" />}>{event.category} · {event.locationName}</Eyebrow>
          <h3 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-tight">{localize(event.title, lang)}</h3>
          <div className="mt-1 font-mono-tabular text-xs font-semibold text-[#0a84ff]">{formatHistoricalYear(event.year, lang)}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[.05] transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[12.5px] leading-relaxed text-neutral-700 dark:text-slate-300">{localize(event.summary, lang)}</p>
      {event.rulerOrKeyFigure ? <div className="mt-3 text-xs"><span className="font-semibold">Key figure:</span> {event.rulerOrKeyFigure}</div> : null}
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Verified
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-neutral-700 dark:text-slate-300">{event.verifiedFact}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <LiquidButton size="sm" variant="primary" onClick={() => { setSelectedYear(event.year); setFlyToCoords(event.coords); if (event.countryId) setInspector({ type: 'country', id: event.countryId, coords: event.coords }); else if (event.civilizationId) setInspector({ type: 'civilization', id: event.civilizationId, coords: event.coords }); setView('explore'); }}>
          <Globe2 className="h-3.5 w-3.5" /> Travel to this moment
        </LiquidButton>
        <LiquidButton size="sm" variant="quiet" onClick={() => setSelectedYear(event.year)}>
          <Crosshair className="h-3.5 w-3.5" /> Set active year
        </LiquidButton>
      </div>
    </motion.aside>
  );
}

function WarDrawer({ war, onClose }: { war: WarConflictRecord; onClose: () => void }) {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setView = useAtlasStore((s) => s.setView);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 24, filter: 'blur(8px)' }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      data-lenis-prevent
      className="glass-surface fixed inset-x-3 bottom-3 z-[62] max-h-[78vh] overflow-y-auto rounded-[26px] p-5 sm:inset-y-20 sm:left-auto sm:right-4 sm:w-[410px] sm:max-h-none"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Eyebrow icon={<Swords className="h-3 w-3" />}>Conflict · {war.locationName}</Eyebrow>
          <h3 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-tight">{war.name}</h3>
          <div className="mt-1 font-mono-tabular text-xs font-semibold text-rose-600 dark:text-rose-300">
            {formatHistoricalYear(war.startYear, lang)}{war.endYear !== war.startYear ? ` – ${formatHistoricalYear(war.endYear, lang)}` : ''}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[.05] transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[12.5px] leading-relaxed text-neutral-700 dark:text-slate-300">{war.historicalSignificance}</p>
      <div className="mt-4 space-y-0">
        <MetricRow label="Belligerents" value={war.belligerents.join(' vs. ')} />
        <MetricRow label="Commanders" value={war.commanders.join(' · ')} />
        <MetricRow label="Scale" value={war.scaleNote} />
        <MetricRow label="Outcome" value={<span className="text-[#0a84ff] dark:text-[#8ec5ff]">{war.outcome}</span>} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <LiquidButton size="sm" variant="primary" onClick={() => { setSelectedYear(war.startYear); setFlyToCoords(war.coords); if (war.relatedCivIds?.[0]) setInspector({ type: 'civilization', id: war.relatedCivIds[0], coords: war.coords }); else if (war.relatedCountryIds?.[0]) setInspector({ type: 'country', id: war.relatedCountryIds[0], coords: war.coords }); setView('explore'); }}>
          <Globe2 className="h-3.5 w-3.5" /> Inspect theater
        </LiquidButton>
        <LiquidButton size="sm" variant="quiet" onClick={() => setSelectedYear(war.startYear)}>
          <Crosshair className="h-3.5 w-3.5" /> Set active year
        </LiquidButton>
      </div>
    </motion.aside>
  );
}

/* -------------------------------------------------------------------------- */
/*  Overview map                                                               */
/* -------------------------------------------------------------------------- */

interface OverviewMapProps {
  overviewRef: RefObject<HTMLDivElement | null>;
  viewWindow: ViewWindow;
  span: number;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
}

const OverviewMap = memo(function OverviewMap({
  overviewRef,
  viewWindow,
  span,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: OverviewMapProps) {
  return (
    <div
      ref={overviewRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative h-[46px] cursor-crosshair touch-none overflow-hidden rounded-xl border border-black/[.06] bg-black/[.025] dark:border-white/[.08] dark:bg-white/[.025]"
      aria-label="Timeline overview. Click to recenter."
    >
      <div className="absolute inset-0">
        {CIVILIZATIONS.map((civ, index) => {
          const left = ((civ.startYear - FULL_START) / FULL_SPAN) * 100;
          const width = Math.max(0.35, ((civ.endYear - civ.startYear) / FULL_SPAN) * 100);
          return (
            <span
              key={civ.id}
              className="absolute h-[3px] rounded-full opacity-55"
              style={{ left: `${left}%`, width: `${width}%`, top: `${3 + (index % 13) * 3}px`, backgroundColor: civ.color }}
            />
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 rounded-lg border border-[#0a84ff] bg-[#0a84ff]/12 shadow-[inset_0_0_18px_rgba(10,132,255,.18)]"
        style={{
          left: `${((viewWindow.start - FULL_START) / FULL_SPAN) * 100}%`,
          width: `${(span / FULL_SPAN) * 100}%`,
        }}
      >
        <div className="absolute inset-y-0 left-0 w-0.5 bg-[#0a84ff]" />
        <div className="absolute inset-y-0 right-0 w-0.5 bg-[#0a84ff]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-2 pb-0.5 font-mono-tabular text-[8px] text-neutral-500 dark:text-slate-500">
        {[0, 0.33, 0.66, 1].map((fraction) => (
          <span key={fraction}>{shortYear(FULL_START + FULL_SPAN * fraction)}</span>
        ))}
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Compare overlay                                                            */
/* -------------------------------------------------------------------------- */

function CompareOverlay({ civs, onClose, onRemove }: { civs: Civilization[]; onClose: () => void; onRemove: (id: string) => void }) {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const rows: Array<[string, (civ: Civilization) => ReactNode]> = [
    ['Lifespan', (civ) => rangeLabel(civ.startYear, civ.endYear)],
    ['Duration', (civ) => durationLabel(civ.endYear - civ.startYear)],
    ['Peak', (civ) => shortYear(civ.peakYear)],
    ['Region', (civ) => civ.region ?? '—'],
    ['Capital', (civ) => localize(civ.capital.name, lang)],
    ['Modern states', (civ) => civ.modernCountries.join(', ')],
    ['Rulers', (civ) => <HeritageList items={civ.rulers} max={3} />],
    ['Languages', (civ) => <HeritageList items={civ.languages} max={4} />],
    ['Innovations', (civ) => <HeritageList items={civ.inventions} max={3} />],
    ['Belief systems', (civ) => <HeritageList items={civ.beliefSystems} max={2} />],
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-3 backdrop-blur-md sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, filter: 'blur(12px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        onClick={(event) => event.stopPropagation()}
        data-lenis-prevent
        className="glass-surface max-h-[88vh] w-full max-w-5xl overflow-auto rounded-[30px] p-5 sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-label="Compare civilizations"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <Eyebrow icon={<GitCompareArrows className="h-3 w-3" />}>Comparative dossier</Eyebrow>
            <h3 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Civilizations side by side</h3>
            <p className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Lifespan, institutions, language and innovation across {civs.length} selected cultures.</p>
          </div>
          <LiquidButton size="icon" variant="quiet" onClick={onClose} aria-label="Close comparison"><X className="h-4 w-4" /></LiquidButton>
        </div>

        <div className="min-w-[640px] overflow-x-auto" data-lenis-prevent>
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="sticky left-0 w-32 bg-transparent pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-slate-400">Attribute</th>
                {civs.map((civ) => (
                  <th key={civ.id} className="pb-3 ps-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: civ.color }} />
                      <span className="font-display text-sm font-bold leading-tight">{localize(civ.name, lang)}</span>
                      <button type="button" onClick={() => onRemove(civ.id)} aria-label={`Remove ${localize(civ.name, lang)}`} className="ms-auto grid h-5 w-5 place-items-center rounded-full bg-black/[.05] hover:bg-black/10 dark:bg-white/10">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, render], index) => (
                <tr key={label} className={index % 2 ? 'bg-black/[.025] dark:bg-white/[.03]' : ''}>
                  <th className="sticky left-0 border-t border-black/[.05] bg-[var(--lg-bg-strong)] py-2.5 pe-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 backdrop-blur-xl dark:border-white/10 dark:text-slate-400">{label}</th>
                  {civs.map((civ) => (
                    <td key={civ.id} className="border-t border-black/[.05] px-4 py-2.5 align-top text-[11.5px] leading-relaxed dark:border-white/10">{render(civ)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main timeline                                                              */
/* -------------------------------------------------------------------------- */

export function LiquidTimeline() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const isPlaying = useAtlasStore((s) => s.isTimelinePlaying);
  const setPlaying = useAtlasStore((s) => s.setTimelinePlaying);
  const speed = useAtlasStore((s) => s.timelineSpeed);
  const setSpeed = useAtlasStore((s) => s.setTimelineSpeed);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  const savedPeriods = useAtlasStore((s) => s.progress.savedPeriods);
  const toggleSavedPeriod = useAtlasStore((s) => s.toggleSavedPeriod);

  const [viewWindow, setViewWindow] = useState<ViewWindow>({ start: FULL_START, end: FULL_END });
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [era, setEra] = useState<EraKey | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('chronology');
  const [focus, setFocus] = useState<Focus>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [hoverPin, setHoverPin] = useState<{ x: number; title: string; meta: string; kind: 'event' | 'war' } | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const [axisWidth, setAxisWidth] = useState(0);
  const overviewRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; start: number; end: number; width: number; moved: boolean } | null>(null);
  const overviewDrag = useRef(false);

  const span = viewWindow.end - viewWindow.start;

  /* Playback ---------------------------------------------------------------- */
  useEffect(() => {
    if (!isPlaying || reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(120, now - last) / 1000;
      last = now;
      const current = useAtlasStore.getState().selectedYear;
      const next = current + dt * BASE_YEARS_PER_SECOND * speed;
      setSelectedYear(next > FULL_END ? FULL_START : next);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, reducedMotion, speed, setSelectedYear]);

  /* Auto-follow playhead ---------------------------------------------------- */
  useEffect(() => {
    if (!isPlaying || !follow) return;
    setViewWindow((prev) => {
      if (prev.end - prev.start >= FULL_SPAN) return prev;
      if (selectedYear >= prev.end || selectedYear <= prev.start) {
        const width = prev.end - prev.start;
        return clampWindow(selectedYear - width / 2, selectedYear + width / 2);
      }
      return prev;
    });
  }, [selectedYear, isPlaying, follow]);

  /* Zen body lock ----------------------------------------------------------- */
  useEffect(() => {
    if (!zen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [zen]);

  /* Filters ----------------------------------------------------------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const eraBand = era === 'all' ? null : ERAS.find((band) => band.id === era) ?? null;
    const rows = CIVILIZATIONS.filter((civ) => {
      if (region !== 'all' && civ.region !== region) return false;
      if (eraBand && !(civ.startYear <= eraBand.to && civ.endYear >= eraBand.from)) return false;
      if (activeOnly && !(selectedYear >= civ.startYear && selectedYear <= civ.endYear)) return false;
      if (!q) return true;
      return (
        localize(civ.name, lang).toLowerCase().includes(q) ||
        civ.id.includes(q) ||
        (civ.region ?? '').toLowerCase().includes(q) ||
        civ.capital.name.en.toLowerCase().includes(q) ||
        civ.aliases.some((alias) => alias.toLowerCase().includes(q)) ||
        civ.modernCountries.some((country) => country.toLowerCase().includes(q))
      );
    });
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sort === 'name') return localize(a.name, lang).localeCompare(localize(b.name, lang));
      if (sort === 'peak') return a.peakYear - b.peakYear;
      if (sort === 'duration') return (b.endYear - b.startYear) - (a.endYear - a.startYear);
      return a.startYear - b.startYear || a.endYear - b.endYear;
    });
    return sorted;
  }, [query, region, era, activeOnly, selectedYear, sort, lang]);

  const { start: rowStart, end: rowEnd, onScroll } = useVirtualRows(filtered.length, ROW_HEIGHT, listRef);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [query, region, era, activeOnly, sort]);

  /* Derived counts ---------------------------------------------------------- */
  const activeCivs = useMemo(
    () => CIVILIZATIONS.filter((civ) => selectedYear >= civ.startYear && selectedYear <= civ.endYear).length,
    [selectedYear]
  );

  const inWindow = useMemo(
    () => CIVILIZATIONS.filter((civ) => civ.endYear >= viewWindow.start && civ.startYear <= viewWindow.end),
    [viewWindow.start, viewWindow.end]
  );

  const eventsInView = useMemo(
    () => TIMELINE_EVENTS.filter((event) => event.year >= viewWindow.start && event.year <= viewWindow.end).sort((a, b) => a.year - b.year),
    [viewWindow.start, viewWindow.end]
  );

  const warsInView = useMemo(
    () => MAJOR_WARS_AND_BATTLES.filter((war) => war.startYear >= viewWindow.start && war.startYear <= viewWindow.end).sort((a, b) => a.startYear - b.startYear),
    [viewWindow.start, viewWindow.end]
  );

  /* Density ----------------------------------------------------------------- */
  const density = useMemo(() => {
    const buckets = 76;
    const step = (viewWindow.end - viewWindow.start) / buckets;
    const counts = new Array<number>(buckets).fill(0);
    CIVILIZATIONS.forEach((civ) => {
      const from = Math.max(civ.startYear, viewWindow.start);
      const to = Math.min(civ.endYear, viewWindow.end);
      if (to < from) return;
      const first = clamp(Math.floor((from - viewWindow.start) / step), 0, buckets - 1);
      const lastIndex = clamp(Math.floor((to - viewWindow.start) / step), 0, buckets - 1);
      for (let i = first; i <= lastIndex; i += 1) counts[i] += 1;
    });
    const max = Math.max(1, ...counts);
    return { counts, max, step, buckets };
  }, [viewWindow.start, viewWindow.end]);

  /* Ticks ------------------------------------------------------------------- */
  const ticks = useMemo(() => {
    const step = tickStepFor(span);
    const first = Math.ceil(viewWindow.start / step) * step;
    const result: number[] = [];
    const minGapPct = axisWidth > 0 ? (58 / axisWidth) * 100 : 0;
    let lastPct = Number.NEGATIVE_INFINITY;
    for (let year = first; year <= viewWindow.end; year += step) {
      const pct = ((year - viewWindow.start) / span) * 100;
      if (pct - lastPct < minGapPct) continue;
      result.push(year);
      lastPct = pct;
    }
    return result;
  }, [viewWindow.start, viewWindow.end, span, axisWidth]);

  useEffect(() => {
    const element = axisRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      setAxisWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const eraBands = useMemo(
    () =>
      ERAS.map((band) => {
        const from = Math.max(band.from, viewWindow.start);
        const to = Math.min(band.to, viewWindow.end);
        if (to <= from) return null;
        return {
          ...band,
          left: pctFor(from, viewWindow),
          width: ((to - from) / span) * 100,
        };
      }).filter((band): band is EraBand & { left: number; width: number } => band !== null),
    [viewWindow.start, viewWindow.end, span]
  );

  /* Actions ----------------------------------------------------------------- */
  const zoomAt = useCallback((factor: number, anchor: number) => {
    setViewWindow((prev) => zoomedWindow(prev, factor, anchor));
  }, []);

  const zoomToFit = useCallback(() => setViewWindow({ start: FULL_START, end: FULL_END }), []);

  const zoomCentered = useCallback(
    (factor: number) => {
      const anchor = selectedYear >= viewWindow.start && selectedYear <= viewWindow.end
        ? selectedYear
        : (viewWindow.start + viewWindow.end) / 2;
      zoomAt(factor, anchor);
    },
    [selectedYear, viewWindow.start, viewWindow.end, zoomAt]
  );

  const jumpTo = useCallback(
    (year: number, customSpan?: number) => {
      setSelectedYear(year);
      const nextSpan = customSpan ?? clamp(span, 120, 900);
      setViewWindow(clampWindow(year - nextSpan / 2, year + nextSpan / 2));
    },
    [setSelectedYear, span]
  );

  const stepYear = useCallback((delta: number) => setSelectedYear(useAtlasStore.getState().selectedYear + delta), [setSelectedYear]);

  const toggleCompare = useCallback((id: string) => {
    setCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        toast.error('Compare up to 4 civilizations at once.');
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const focusCiv = useCallback(
    (civ: Civilization) => {
      setFocus({ kind: 'civ', id: civ.id });
      const year = clamp(selectedYear, civ.startYear, civ.endYear);
      if (year !== selectedYear) setSelectedYear(year);
    },
    [selectedYear, setSelectedYear]
  );

  /* Chart pointer interactions ---------------------------------------------- */
  const onChartPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, start: viewWindow.start, end: viewWindow.end, width: rect.width, moved: false };
  };

  const onChartPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    if (!drag.moved) return;
    const deltaYears = -(dx / Math.max(1, drag.width)) * (drag.end - drag.start);
    setViewWindow(clampWindow(drag.start + deltaYears, drag.end + deltaYears));
  };

  const onChartPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    setSelectedYear(yearAtPct(pct, viewWindow));
  };

  const onOverviewPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = overviewRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const year = FULL_START + pct * FULL_SPAN;
      setViewWindow(clampWindow(year - span / 2, year + span / 2));
      if (event.type === 'pointerdown') {
        overviewDrag.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [span]
  );

  const overviewMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (overviewDrag.current) onOverviewPointer(event);
    },
    [onOverviewPointer]
  );
  const overviewUp = useCallback(() => {
    overviewDrag.current = false;
  }, []);

  /* Wheel zoom / horizontal pan --------------------------------------------- */
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = el.getBoundingClientRect();
        const pct = (event.clientX - rect.left) / Math.max(1, rect.width);
        setViewWindow((prev) => zoomedWindow(prev, event.deltaY > 0 ? 1.18 : 0.85, prev.start + pct * (prev.end - prev.start)));
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault();
        setViewWindow((prev) => clampWindow(prev.start + event.deltaX * 1.4, prev.end + event.deltaX * 1.4));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* Keyboard ---------------------------------------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      const state = useAtlasStore.getState();
      if (event.key === ' ') {
        event.preventDefault();
        setPlaying(!state.isTimelinePlaying);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedYear(state.selectedYear + (event.shiftKey ? 100 : 10));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedYear(state.selectedYear - (event.shiftKey ? 100 : 10));
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setViewWindow((prev) => zoomedWindow(prev, 0.82, state.selectedYear));
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setViewWindow((prev) => zoomedWindow(prev, 1.22, state.selectedYear));
      } else if (event.key.toLowerCase() === 'f') {
        setViewWindow({ start: FULL_START, end: FULL_END });
      } else if (event.key === 'Escape') {
        setFocus(null);
        setCompareOpen(false);
        setZen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPlaying, setSelectedYear]);

  /* Focus data -------------------------------------------------------------- */
  const focusCivData = focus?.kind === 'civ' ? CIVILIZATION_MAP[focus.id] : undefined;
  const focusEvent = focus?.kind === 'event' ? TIMELINE_EVENTS.find((event) => event.id === focus.id) : undefined;
  const focusWar = focus?.kind === 'war' ? MAJOR_WARS_AND_BATTLES.find((war) => war.id === focus.id) : undefined;
  const compareCivs = useMemo(() => compare.map((id) => CIVILIZATION_MAP[id]).filter(Boolean), [compare]);

  const oldest = useMemo(() => CIVILIZATIONS.reduce((min, civ) => Math.min(min, civ.startYear), FULL_END), []);
  const newest = useMemo(() => CIVILIZATIONS.reduce((max, civ) => Math.max(max, civ.endYear), FULL_START), []);
  const regions = CIVILIZATION_REGIONS;

  return (
    <div className={zen ? 'fixed inset-0 z-[55] overflow-y-auto bg-[#f1f3f8]/88 p-2 backdrop-blur-2xl sm:p-5 dark:bg-[#05060b]/90' : 'relative'} data-lenis-prevent={zen || undefined}>
      <LiquidPanel
        strong
        glow
        className={`relative ${zen ? 'mx-auto max-w-[1700px]' : ''} rounded-[30px] p-3 sm:p-5`}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/40" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(10,132,255,0.24),transparent_65%)] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(139,125,255,0.18),transparent_65%)] blur-2xl" />

        {/* Header ---------------------------------------------------------- */}
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow icon={<Clock3 className="h-3 w-3" />}>Temporal observatory · live glass engine</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-[40px] sm:leading-[1.03]">
              <span className="text-iridescent">Deep time</span> as a physical object
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-600 sm:text-sm dark:text-slate-400">
              Drag to pan, pinch or <span className="font-semibold text-neutral-800 dark:text-slate-200">⌘/Ctrl + scroll</span> to zoom, press <LiquidKbd>Space</LiquidKbd> to play. {CIVILIZATIONS.length} civilizations and {TIMELINE_EVENTS.length} events across {rangeLabel(FULL_START, FULL_END)}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-5 rounded-2xl border border-white/30 bg-white/20 px-4 py-2.5 backdrop-blur-xl sm:flex dark:border-white/10 dark:bg-white/[.05]">
              <Stat value={activeCivs} label="Alive now" accent="#0a84ff" />
              <Stat value={inWindow.length} label="In frame" />
              <Stat value={`${((span / FULL_SPAN) * 100).toFixed(0)}%`} label="Zoom" />
            </div>
            <LiquidTooltip label={zen ? 'Leave focus mode' : 'Focus mode'}>
              <LiquidButton size="icon" variant="quiet" onClick={() => setZen((value) => !value)} aria-label="Toggle focus mode">
                {zen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </LiquidButton>
            </LiquidTooltip>
          </div>
        </div>

        {/* Transport ------------------------------------------------------- */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-white/35 bg-white/25 p-2 backdrop-blur-2xl dark:border-white/[.09] dark:bg-white/[.045]">
          <LiquidButton
            variant="primary"
            size="icon"
            onClick={() => setPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
            className="h-12 w-12 shrink-0 rounded-full"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 translate-x-[1px] fill-current" />}
          </LiquidButton>

          <div className="flex min-w-[150px] flex-col leading-none">
            <span className="font-mono-tabular text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              {shortYear(selectedYear)}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-slate-400">
              {isPlaying ? `${speed}× · ${follow ? 'following' : 'free playhead'}` : 'active year'}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <LiquidTooltip label="Back 100 years (Shift + ←)"><LiquidButton size="icon" variant="quiet" onClick={() => stepYear(-100)} aria-label="Back 100 years"><span className="font-mono text-[10px] font-bold">−100</span></LiquidButton></LiquidTooltip>
            <LiquidTooltip label="Back 10 years (←)"><LiquidButton size="icon" variant="quiet" onClick={() => stepYear(-10)} aria-label="Back 10 years"><Minus className="h-4 w-4" /></LiquidButton></LiquidTooltip>
            <LiquidTooltip label="Forward 10 years (→)"><LiquidButton size="icon" variant="quiet" onClick={() => stepYear(10)} aria-label="Forward 10 years"><Plus className="h-4 w-4" /></LiquidButton></LiquidTooltip>
            <LiquidTooltip label="Forward 100 years (Shift + →)"><LiquidButton size="icon" variant="quiet" onClick={() => stepYear(100)} aria-label="Forward 100 years"><span className="font-mono text-[10px] font-bold">+100</span></LiquidButton></LiquidTooltip>
          </div>

          <div className="mx-1 hidden h-7 w-px bg-black/10 sm:block dark:bg-white/10" />

          <div className="flex items-center gap-1">
            <Gauge className="me-1 h-3.5 w-3.5 text-neutral-500 dark:text-slate-400" />
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSpeed(value)}
                className={`h-7 min-w-8 rounded-full px-1.5 font-mono-tabular text-[10px] font-bold transition ${speed === value ? 'bg-[#0a84ff] text-white shadow-[0_6px_16px_-6px_rgba(10,132,255,.9)]' : 'text-neutral-600 hover:bg-black/[.06] dark:text-slate-300 dark:hover:bg-white/10'}`}
                aria-pressed={speed === value}
              >
                {value}×
              </button>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFollow((value) => !value)}
              className={`liquid-chip h-7 px-2.5 text-[10px] font-semibold ${follow ? 'text-[#0a84ff] dark:text-[#8ec5ff]' : ''}`}
              data-active={follow ? 'true' : 'false'}
              aria-pressed={follow}
            >
              <Crosshair className="h-3 w-3" /> Follow
            </button>
            <LiquidTooltip label="Zoom out (−)"><LiquidButton size="icon" variant="quiet" onClick={() => zoomCentered(1.3)} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></LiquidButton></LiquidTooltip>
            <LiquidTooltip label="Fit all (F)"><LiquidButton size="icon" variant="quiet" onClick={zoomToFit} aria-label="Fit all"><RotateCcw className="h-4 w-4" /></LiquidButton></LiquidTooltip>
            <LiquidTooltip label="Zoom in (+)"><LiquidButton size="icon" variant="quiet" onClick={() => zoomCentered(0.77)} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></LiquidButton></LiquidTooltip>
          </div>
        </div>

        {/* View range + quick jumps ---------------------------------------- */}
        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[.045] px-2.5 py-1 font-mono-tabular text-[10px] font-semibold text-neutral-700 dark:bg-white/[.06] dark:text-slate-300">
            <CalendarRange className="h-3 w-3" /> {rangeLabel(viewWindow.start, viewWindow.end)}
          </span>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_JUMPS.map((jump) => (
              <LiquidChip key={jump.label} onClick={() => jumpTo(jump.year, 520)} className="text-[10px]">
                {jump.label}
              </LiquidChip>
            ))}
            {savedPeriods.slice(0, 4).map((year) => (
              <LiquidChip key={`saved-${year}`} onClick={() => jumpTo(year, 520)} className="text-[10px] text-amber-600 dark:text-amber-300">
                <Bookmark className="h-3 w-3 fill-current/20" /> {shortYear(year)}
              </LiquidChip>
            ))}
          </div>
        </div>

        {/* Temporal canvas ------------------------------------------------- */}
        <div className="relative mt-4 overflow-hidden rounded-[24px] border border-white/30 bg-gradient-to-b from-white/40 to-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.6)] dark:border-white/[.08] dark:from-white/[.055] dark:to-white/[.015]">
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500 dark:text-slate-400">
              <LayersIcon /> Lifespan density
            </div>
            <div className="flex items-center gap-2 font-mono-tabular text-[10px] text-neutral-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0a84ff]" /> Events {eventsInView.length}</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rotate-45 bg-rose-500" /> Wars {warsInView.length}</span>
            </div>
          </div>

          <div
            ref={chartRef}
            className="relative mt-1 cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onChartPointerDown}
            onPointerMove={onChartPointerMove}
            onPointerUp={onChartPointerUp}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            {/* Era bands */}
            <div className="relative mx-3 h-6 overflow-hidden rounded-lg">
              {eraBands.map((band) => (
                <div
                  key={band.id}
                  className="absolute inset-y-0 flex items-center overflow-hidden border-e border-white/40 px-1.5 dark:border-white/10"
                  style={{ left: `${band.left}%`, width: `${band.width}%`, backgroundColor: band.tint }}
                  title={band.label}
                >
                  {band.width > 7 ? (
                    <span className="truncate text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: band.solid }}>
                      {band.width > 14 ? band.label : band.short}
                    </span>
                  ) : null}
                </div>
              ))}
              <div className="pointer-events-none absolute inset-y-0 w-px bg-[#0a84ff] shadow-[0_0_14px_#0a84ff]" style={{ left: `${clamp(pctFor(selectedYear, viewWindow), 0, 100)}%` }} />
            </div>

            {/* Density histogram */}
            <div className="relative mx-3 mt-1 flex h-[58px] items-end gap-px overflow-hidden rounded-lg">
              {density.counts.map((count, index) => {
                const height = Math.max(3, (count / density.max) * 100);
                const bucketYear = viewWindow.start + density.step * (index + 0.5);
                const near = Math.abs(bucketYear - selectedYear) < density.step * 0.6;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedYear(bucketYear);
                    }}
                    className="group relative h-full flex-1 outline-none"
                    aria-label={`Jump to ${shortYear(bucketYear)}`}
                    tabIndex={-1}
                  >
                    <span
                      className={`absolute bottom-0 left-0 w-full rounded-t-[3px] transition-[height,background-color] duration-300 ${near ? 'bg-[#0a84ff]' : 'bg-gradient-to-t from-[#0a84ff]/35 to-[#8ec5ff]/60 group-hover:from-[#0a84ff]/60 group-hover:to-[#8ec5ff]/90 dark:from-[#0a84ff]/45 dark:to-[#8ec5ff]/70'}`}
                      style={{ height: `${height}%` }}
                    />
                  </button>
                );
              })}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/10 dark:bg-white/10" />
            </div>

            {/* Marker lanes */}
            <div className="relative mx-3 mt-1.5 h-[42px]">
              <div className="absolute inset-x-0 top-0 h-[13px]">
                {eventsInView.map((event) => {
                  const pct = pctFor(event.year, viewWindow);
                  const isHover = hoverPin?.kind === 'event' && hoverPin.title === localize(event.title, lang);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onPointerEnter={() => setHoverPin({ x: pct, title: localize(event.title, lang), meta: `${shortYear(event.year)} · ${event.locationName}`, kind: 'event' })}
                      onPointerLeave={() => setHoverPin(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedYear(event.year);
                        setFocus({ kind: 'event', id: event.id });
                      }}
                      className={`absolute top-0 h-[9px] w-[9px] -translate-x-1/2 rounded-full border border-white/70 bg-[#0a84ff] shadow-[0_0_10px_rgba(10,132,255,.7)] transition hover:scale-150 ${isHover ? 'scale-150' : ''}`}
                      style={{ left: `${pct}%` }}
                      aria-label={`${localize(event.title, lang)} — ${shortYear(event.year)}`}
                    />
                  );
                })}
              </div>
              <div className="absolute inset-x-0 top-[19px] h-[11px]">
                {warsInView.map((war) => {
                  const pct = pctFor(war.startYear, viewWindow);
                  const isHover = hoverPin?.kind === 'war' && hoverPin.title === war.name;
                  const widthPx = Math.max(7, ((war.endYear - war.startYear) / span) * 100);
                  return (
                    <button
                      key={war.id}
                      type="button"
                      onPointerEnter={() => setHoverPin({ x: pct, title: war.name, meta: `${shortYear(war.startYear)} · ${war.locationName}`, kind: 'war' })}
                      onPointerLeave={() => setHoverPin(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedYear(war.startYear);
                        setFocus({ kind: 'war', id: war.id });
                      }}
                      className={`absolute top-0 h-[8px] -translate-x-1/2 rotate-45 border border-white/70 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,.55)] transition hover:scale-150 ${isHover ? 'scale-150' : ''}`}
                      style={{ left: `${pct}%`, width: `${widthPx}px` }}
                      aria-label={`${war.name} — ${shortYear(war.startYear)}`}
                    />
                  );
                })}
              </div>

              {hoverPin ? (
                <div
                  className="pointer-events-none absolute top-[32px] z-40 w-[210px] -translate-x-1/2 rounded-xl border border-white/15 bg-neutral-950/92 px-3 py-2 text-white shadow-2xl backdrop-blur-xl dark:bg-white/94 dark:text-neutral-950"
                  style={{ left: `${clamp(hoverPin.x, 10, 90)}%` }}
                >
                  <div className="text-[11px] font-semibold leading-snug">{hoverPin.title}</div>
                  <div className="mt-0.5 font-mono-tabular text-[9.5px] opacity-70">{hoverPin.meta}</div>
                </div>
              ) : null}
            </div>

            {/* Axis */}
            <div ref={axisRef} className="relative mx-3 mt-1 h-8 border-t border-black/[.08] dark:border-white/10">
              {ticks.map((year) => {
                const pct = clamp(pctFor(year, viewWindow), 0, 100);
                return (
                  <div
                    key={year}
                    className="absolute top-0"
                    style={{ left: `${pct}%`, transform: pct < 4 ? 'translateX(0)' : pct > 96 ? 'translateX(-100%)' : 'translateX(-50%)' }}
                  >
                    <div className="h-1.5 w-px bg-neutral-400/60 dark:bg-slate-500/60" />
                    <span className="mt-0.5 block whitespace-nowrap font-mono-tabular text-[9px] font-medium text-neutral-500 dark:text-slate-400">
                      {shortYear(year)}
                    </span>
                  </div>
                );
              })}
              <div className="absolute top-0 z-30 -translate-x-1/2" style={{ left: `${clamp(pctFor(selectedYear, viewWindow), 0, 100)}%` }}>
                <div className="timeline-playhead relative h-8 w-px" />
              </div>
            </div>
          </div>

          {/* Overview / minimap */}
          <div className="mx-3 mb-3 mt-2">
            <OverviewMap
              overviewRef={overviewRef}
              viewWindow={viewWindow}
              span={span}
              onPointerDown={onOverviewPointer}
              onPointerMove={overviewMove}
              onPointerUp={overviewUp}
            />
          </div>
        </div>

        {/* Filters --------------------------------------------------------- */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-72">
            <LiquidInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${CIVILIZATIONS.length} civilizations, capitals, countries…`}
              leading={<Search className="h-3.5 w-3.5" />}
              trailing={query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="grid h-6 w-6 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"><X className="h-3 w-3" /></button> : null}
              className="w-full"
            />
          </div>
          <div className="flex w-full min-w-0 gap-1 overflow-x-auto pb-0.5 [mask-image:linear-gradient(90deg,#000_92%,transparent)] [scrollbar-width:none] sm:w-auto sm:flex-1 [&::-webkit-scrollbar]:hidden">
            <LiquidChip active={region === 'all'} onClick={() => setRegion('all')}>All regions</LiquidChip>
            {regions.map((item) => (
              <LiquidChip key={item} active={region === item} onClick={() => setRegion(item)}>{item}</LiquidChip>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setActiveOnly((value) => !value)}
            className={`liquid-chip h-8 shrink-0 px-3 text-[11px] font-semibold ${activeOnly ? 'text-[#0a84ff] dark:text-[#8ec5ff]' : ''}`}
            data-active={activeOnly ? 'true' : 'false'}
            aria-pressed={activeOnly}
          >
            <Sparkles className="h-3 w-3" /> Alive in {shortYear(selectedYear)}
          </button>
          <label className="liquid-chip h-8 shrink-0 gap-1.5 px-2.5 text-[11px] font-semibold">
            <ArrowUpDown className="h-3 w-3" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="cursor-pointer bg-transparent text-[11px] font-semibold outline-none"
              aria-label="Sort civilizations"
            >
              {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id} className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white">{option.label}</option>)}
            </select>
          </label>
        </div>

        {/* Era filters ----------------------------------------------------- */}
        <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
          <LiquidChip active={era === 'all'} onClick={() => setEra('all')}>All eras</LiquidChip>
          {ERAS.map((band) => (
            <LiquidChip key={band.id} active={era === band.id} onClick={() => setEra(band.id)}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: band.solid }} />
              {band.label}
            </LiquidChip>
          ))}
          <span className="ms-auto hidden font-mono-tabular text-[10px] text-neutral-500 sm:inline dark:text-slate-400">
            {filtered.length} of {CIVILIZATIONS.length} lifespans · oldest {shortYear(oldest)} · latest {shortYear(newest)}
          </span>
        </div>

        {/* Lifespan list --------------------------------------------------- */}
        <div className="relative mt-3 overflow-hidden rounded-[22px] border border-white/25 bg-white/15 dark:border-white/[.07] dark:bg-white/[.025]">
          <div className="grid grid-cols-[minmax(110px,190px)_1fr_auto] items-center gap-2 border-b border-black/[.06] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-neutral-500 sm:grid-cols-[224px_1fr_128px_58px] dark:border-white/[.08] dark:text-slate-400">
            <span>Civilization</span>
            <span className="flex items-center justify-between"><span>Lifespan</span><span className="hidden sm:inline">{rangeLabel(viewWindow.start, viewWindow.end)}</span></span>
            <span className="hidden text-right sm:block">Years</span>
            <span className="hidden text-right sm:block">Tools</span>
          </div>

          <div ref={listRef} onScroll={onScroll} data-lenis-prevent className="max-h-[540px] overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="grid place-items-center gap-2 px-4 py-16 text-center">
                <Search className="h-6 w-6 text-neutral-400" />
                <p className="text-sm font-semibold">No civilization matches that lens.</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">Try another region, era or shorter query.</p>
                <LiquidButton size="sm" variant="quiet" onClick={() => { setQuery(''); setRegion('all'); setEra('all'); setActiveOnly(false); }}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset filters
                </LiquidButton>
              </div>
            ) : (
              <div style={{ height: filtered.length * ROW_HEIGHT, position: 'relative' }}>
                <div style={{ transform: `translateY(${rowStart * ROW_HEIGHT}px)` }}>
                  {filtered.slice(rowStart, rowEnd).map((civ) => {
                    const left = clamp(pctFor(civ.startYear, viewWindow), 0, 100);
                    const right = clamp(pctFor(civ.endYear, viewWindow), 0, 100);
                    const width = Math.max(0.45, right - left);
                    const peakPct = pctFor(civ.peakYear, viewWindow);
                    const active = selectedYear >= civ.startYear && selectedYear <= civ.endYear;
                    const focused = focus?.kind === 'civ' && focus.id === civ.id;
                    const compared = compare.includes(civ.id);
                    return (
                      <div
                        key={civ.id}
                        className="timeline-row group grid h-[38px] grid-cols-[minmax(110px,190px)_1fr_auto] items-center gap-2 border-b border-black/[.035] px-3 sm:grid-cols-[224px_1fr_128px_58px] dark:border-white/[.045]"
                        data-active={focused ? 'true' : active ? 'true' : 'false'}
                      >
                        <button
                          type="button"
                          onClick={() => focusCiv(civ)}
                          className="flex min-w-0 items-center gap-2 text-left"
                          title={localize(civ.name, lang)}
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full transition-shadow ${active ? 'shadow-[0_0_10px_currentColor]' : 'opacity-70'}`} style={{ backgroundColor: civ.color, color: civ.color }} />
                          <span className="truncate text-[11.5px] font-semibold text-neutral-800 group-hover:text-[#0a84ff] dark:text-slate-200 dark:group-hover:text-[#8ec5ff]">
                            {localize(civ.name, lang)}
                          </span>
                          {compared ? <Check className="h-3 w-3 shrink-0 text-[#0a84ff]" /> : null}
                        </button>

                        <button
                          type="button"
                          onClick={() => focusCiv(civ)}
                          className="relative h-4 min-w-0 cursor-pointer overflow-hidden rounded-full border border-black/[.05] bg-black/[.055] dark:border-white/[.06] dark:bg-white/[.06]"
                          aria-label={`${localize(civ.name, lang)}: ${rangeLabel(civ.startYear, civ.endYear)}`}
                        >
                          <span
                            className={`absolute inset-y-0 rounded-full transition-opacity ${active ? 'opacity-100' : 'opacity-65 group-hover:opacity-90'}`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              background: `linear-gradient(90deg, ${civ.color}, ${civ.color}cc 65%, ${civ.color}66)`,
                              boxShadow: active ? `0 0 14px ${civ.color}66` : undefined,
                            }}
                          />
                          {peakPct >= 0 && peakPct <= 100 ? (
                            <span className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] bg-white/90 shadow-[0_0_6px_rgba(0,0,0,.25)]" style={{ left: `${peakPct}%` }} />
                          ) : null}
                          {active ? (
                            <span className="absolute inset-y-0 w-px bg-white/80 shadow-[0_0_6px_rgba(255,255,255,.8)]" style={{ left: `${clamp(pctFor(selectedYear, viewWindow), 0, 100)}%` }} />
                          ) : null}
                        </button>

                        <div className="hidden whitespace-nowrap text-right font-mono-tabular text-[9.5px] tabular-nums text-neutral-500 sm:block dark:text-slate-400">
                          {rangeLabel(civ.startYear, civ.endYear)}
                        </div>

                        <div className="flex items-center justify-end gap-0.5">
                          <LiquidTooltip label={compared ? 'Remove from comparison' : 'Add to comparison'}>
                            <button
                              type="button"
                              onClick={() => toggleCompare(civ.id)}
                              aria-label={compared ? 'Remove from comparison' : 'Add to comparison'}
                              aria-pressed={compared}
                              className={`grid h-6 w-6 place-items-center rounded-full transition ${compared ? 'bg-[#0a84ff] text-white' : 'text-neutral-500 hover:bg-black/10 dark:text-slate-400 dark:hover:bg-white/10'}`}
                            >
                              <GitCompareArrows className="h-3 w-3" />
                            </button>
                          </LiquidTooltip>
                          <LiquidTooltip label="Inspect on globe">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedYear(clamp(selectedYear, civ.startYear, civ.endYear));
                                useAtlasStore.getState().setFlyToCoords(civ.capital.coords);
                                useAtlasStore.getState().setInspector({ type: 'civilization', id: civ.id, coords: civ.capital.coords });
                                useAtlasStore.getState().setView('explore');
                              }}
                              aria-label="Inspect on globe"
                              className="hidden h-6 w-6 place-items-center rounded-full text-neutral-500 transition hover:bg-black/10 sm:grid dark:text-slate-400 dark:hover:bg-white/10"
                            >
                              <Globe2 className="h-3 w-3" />
                            </button>
                          </LiquidTooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[.05] px-3 py-2 text-[10px] text-neutral-500 dark:border-white/[.07] dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3 w-3" /> Click a row for the dossier. Diamonds mark each civilization’s peak.
            </span>
            <span className="font-mono-tabular">{rowStart + 1}–{Math.min(rowEnd, filtered.length)} / {filtered.length}</span>
          </div>
        </div>
      </LiquidPanel>

      {/* Compare tray */}
      <AnimatePresence>
        {compare.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 bottom-3 z-[64] mx-auto flex w-auto max-w-3xl flex-wrap items-center gap-2 rounded-[20px] border border-white/35 bg-white/60 p-2 shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 dark:border-white/15 dark:bg-neutral-950/75"
          >
            <span className="ms-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600 dark:text-slate-300">
              <GitCompareArrows className="h-3.5 w-3.5" /> Compare
            </span>
            {compareCivs.map((civ) => (
              <span key={civ.id} className="liquid-chip h-7 gap-1.5 px-2 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: civ.color }} />
                {localize(civ.name, lang)}
                <button type="button" onClick={() => toggleCompare(civ.id)} aria-label={`Remove ${localize(civ.name, lang)}`} className="grid h-3.5 w-3.5 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/15">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <div className="ms-auto flex items-center gap-1.5">
              <LiquidButton size="xs" variant="quiet" onClick={() => setCompare([])}>Clear</LiquidButton>
              <LiquidButton size="xs" variant="primary" onClick={() => setCompareOpen(true)} disabled={compare.length < 2}>
                Compare {compare.length}
              </LiquidButton>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Drawers */}
      <AnimatePresence>
        {focusCivData ? (
          <CivilizationDrawer
            key={`civ-${focusCivData.id}`}
            civ={focusCivData}
            onClose={() => setFocus(null)}
            onCompare={() => toggleCompare(focusCivData.id)}
            compareActive={compare.includes(focusCivData.id)}
          />
        ) : focusEvent ? (
          <EventDrawer key={`event-${focusEvent.id}`} event={focusEvent} onClose={() => setFocus(null)} />
        ) : focusWar ? (
          <WarDrawer key={`war-${focusWar.id}`} war={focusWar} onClose={() => setFocus(null)} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {compareOpen ? (
          <CompareOverlay
            civs={compareCivs}
            onClose={() => setCompareOpen(false)}
            onRemove={(id) => {
              toggleCompare(id);
              if (compare.length <= 2) setCompareOpen(false);
            }}
          />
        ) : null}
      </AnimatePresence>

    </div>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
      <path d="M8 1.5 14.5 5 8 8.5 1.5 5 8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="m2.2 8.4 5.8 3.1 5.8-3.1M2.2 11.4l5.8 3.1 5.8-3.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
