import { ChevronLeft, ChevronRight, Magnet, Maximize2, RotateCcw } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getActiveCivilizationsForYear } from '../data/civilizations';
import { formatHistoricalYear } from '../i18n/languages';
import type { LanguageCode } from '../types';

export const TIMELINE_MIN_YEAR = -9600;
export const TIMELINE_MAX_YEAR = 2026;
const MIN_WINDOW_SPAN = 30;

export interface EraMarker {
  id: string;
  year: number;
  shortLabel: string;
  eraLabel: string;
  milestone: string;
  major?: boolean;
}

export const ERA_MARKERS: EraMarker[] = [
  { id: 'prehistory', year: -9600, shortLabel: '9600 BCE', eraLabel: 'Prehistory', milestone: 'Göbekli Tepe Sanctuaries', major: true },
  { id: 'sumer', year: -3200, shortLabel: '3200 BCE', eraLabel: 'Early Bronze', milestone: 'Cuneiform at Uruk', major: true },
  { id: 'giza', year: -2560, shortLabel: '2560 BCE', eraLabel: 'Old Kingdom', milestone: 'Great Pyramid of Giza' },
  { id: 'kadesh', year: -1259, shortLabel: '1259 BCE', eraLabel: 'Late Bronze', milestone: 'Treaty of Kadesh', major: true },
  { id: 'classical', year: -500, shortLabel: '500 BCE', eraLabel: 'Classical', milestone: 'Classical Antiquity Dawn', major: true },
  { id: 'qin', year: -221, shortLabel: '221 BCE', eraLabel: 'Imperial East', milestone: 'Qin Unification of China' },
  { id: 'constantinople', year: 330, shortLabel: '330 CE', eraLabel: 'Late Antiquity', milestone: 'Constantinople Dedicated', major: true },
  { id: 'golden-age', year: 820, shortLabel: '820 CE', eraLabel: 'Medieval', milestone: 'House of Wisdom · Baghdad', major: true },
  { id: 'manzikert', year: 1071, shortLabel: '1071 CE', eraLabel: 'High Medieval', milestone: 'Battle of Manzikert' },
  { id: 'istanbul', year: 1453, shortLabel: '1453 CE', eraLabel: 'Early Modern', milestone: 'Ottoman Istanbul', major: true },
  { id: 'galileo', year: 1610, shortLabel: '1610 CE', eraLabel: 'Scientific Rev.', milestone: 'Galileo’s Telescope' },
  { id: 'republic', year: 1923, shortLabel: '1923 CE', eraLabel: 'Modern Era', milestone: 'Republic of Türkiye', major: true },
  { id: 'apollo', year: 1969, shortLabel: '1969 CE', eraLabel: 'Space Age', milestone: 'Apollo 11 Moon Landing' },
  { id: 'present', year: 2026, shortLabel: '2026 CE', eraLabel: 'Contemporary', milestone: 'Present Observatory', major: true },
];

export function getEraClassification(year: number): string {
  if (year < -3500) return 'Prehistory';
  if (year < -500) return 'Ancient World';
  if (year < 500) return 'Classical Era';
  if (year < 1450) return 'Medieval Era';
  if (year < 1800) return 'Early Modern';
  return 'Modern Era';
}

function clampYear(y: number, min = TIMELINE_MIN_YEAR, max = TIMELINE_MAX_YEAR) {
  return Math.max(min, Math.min(max, Math.round(y)));
}

function chooseTickStep(span: number): { major: number; minor: number } {
  if (span > 7000) return { major: 2000, minor: 500 };
  if (span > 3500) return { major: 1000, minor: 250 };
  if (span > 1600) return { major: 500, minor: 100 };
  if (span > 700) return { major: 200, minor: 50 };
  if (span > 300) return { major: 100, minor: 20 };
  if (span > 120) return { major: 50, minor: 10 };
  if (span > 45) return { major: 10, minor: 2 };
  return { major: 5, minor: 1 };
}

interface PrecisionTimelineSliderProps {
  year: number;
  onChange: (nextYear: number) => void;
  lang: LanguageCode;
}

export function PrecisionTimelineSlider({ year, onChange, lang }: PrecisionTimelineSliderProps) {
  const [windowStart, setWindowStart] = useState(TIMELINE_MIN_YEAR);
  const [windowEnd, setWindowEnd] = useState(TIMELINE_MAX_YEAR);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [draggingTarget, setDraggingTarget] = useState<'playhead' | 'winStart' | 'winEnd' | 'winPan' | null>(null);
  const [snappedMarker, setSnappedMarker] = useState<EraMarker | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ year: number; xPct: number; marker?: EraMarker } | null>(null);

  const rulerRef = useRef<HTMLDivElement>(null);
  const macroRef = useRef<HTMLDivElement>(null);
  const panOriginRef = useRef<{ clientX: number; start: number; end: number }>({
    clientX: 0,
    start: TIMELINE_MIN_YEAR,
    end: TIMELINE_MAX_YEAR,
  });

  const windowSpan = Math.max(MIN_WINDOW_SPAN, windowEnd - windowStart);
  const isZoomed = windowStart > TIMELINE_MIN_YEAR || windowEnd < TIMELINE_MAX_YEAR;

  // Keep zoomed window containing the active year when jumping externally (e.g. from presets or playhead)
  useEffect(() => {
    if (draggingTarget) return;
    if (year < windowStart) {
      const span = windowEnd - windowStart;
      const nextStart = clampYear(year - span * 0.1);
      setWindowStart(nextStart);
      setWindowEnd(clampYear(nextStart + span));
    } else if (year > windowEnd) {
      const span = windowEnd - windowStart;
      const nextEnd = clampYear(year + span * 0.1);
      setWindowEnd(nextEnd);
      setWindowStart(clampYear(nextEnd - span));
    }
  }, [year, windowStart, windowEnd, draggingTarget]);

  const toRulerPct = useCallback(
    (y: number) => {
      const raw = ((y - windowStart) / windowSpan) * 100;
      return Math.max(0, Math.min(100, raw));
    },
    [windowStart, windowSpan]
  );

  const toMacroPct = useCallback((y: number) => {
    const raw = ((y - TIMELINE_MIN_YEAR) / (TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR)) * 100;
    return Math.max(0, Math.min(100, raw));
  }, []);

  const resolveRulerYear = useCallback(
    (clientX: number, bypassSnap: boolean): { nextYear: number; marker: EraMarker | null } => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return { nextYear: year, marker: null };
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawYear = windowStart + ratio * windowSpan;

      if (snapEnabled && !bypassSnap) {
        const snapPxThreshold = 11;
        let closest: EraMarker | null = null;
        let closestDistPx = Infinity;
        for (const m of ERA_MARKERS) {
          if (m.year < windowStart || m.year > windowEnd) continue;
          const mRatio = (m.year - windowStart) / windowSpan;
          const distPx = Math.abs(mRatio - ratio) * rect.width;
          if (distPx <= snapPxThreshold && distPx < closestDistPx) {
            closest = m;
            closestDistPx = distPx;
          }
        }
        if (closest) {
          return { nextYear: closest.year, marker: closest };
        }
      }
      return { nextYear: clampYear(rawYear, windowStart, windowEnd), marker: null };
    },
    [snapEnabled, windowEnd, windowSpan, windowStart, year]
  );

  // Primary Ruler Pointer Interaction (with pointer capture for 60fps real-time scrubbing)
  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-era-marker]')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingTarget('playhead');
    const { nextYear, marker } = resolveRulerYear(e.clientX, e.altKey);
    setSnappedMarker(marker);
    onChange(nextYear);
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;

    if (draggingTarget === 'playhead') {
      const { nextYear, marker } = resolveRulerYear(e.clientX, e.altKey);
      setSnappedMarker(marker);
      onChange(nextYear);
      return;
    }

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoveredYr = clampYear(windowStart + ratio * windowSpan, windowStart, windowEnd);
    const nearbyMarker = ERA_MARKERS.find((m) => {
      if (m.year < windowStart || m.year > windowEnd) return false;
      const mRatio = (m.year - windowStart) / windowSpan;
      return Math.abs(mRatio - ratio) * rect.width < 11;
    });
    setHoverInfo({
      year: nearbyMarker ? nearbyMarker.year : hoveredYr,
      xPct: ratio * 100,
      marker: nearbyMarker,
    });
  };

  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTarget === 'playhead') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      setDraggingTarget(null);
      setSnappedMarker(null);
    }
  };

  // Wheel zoom / fine scrub on ruler (non-passive so wheel zoom never scrolls underlying page)
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        const deltaYears = Math.sign(e.deltaY || e.deltaX) * Math.max(1, Math.round(windowSpan / 220));
        onChange(clampYear(year + deltaYears));
        return;
      }

      const rect = el.getBoundingClientRect();
      const anchorRatio = rect.width > 0 ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0.5;
      const anchorYear = windowStart + anchorRatio * windowSpan;
      const zoomFactor = e.deltaY > 0 ? 1.18 : 0.84;
      const nextSpan = Math.max(
        MIN_WINDOW_SPAN,
        Math.min(TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR, Math.round(windowSpan * zoomFactor))
      );
      let nextStart = Math.round(anchorYear - anchorRatio * nextSpan);
      let nextEnd = nextStart + nextSpan;
      if (nextStart < TIMELINE_MIN_YEAR) {
        nextStart = TIMELINE_MIN_YEAR;
        nextEnd = Math.min(TIMELINE_MAX_YEAR, nextStart + nextSpan);
      }
      if (nextEnd > TIMELINE_MAX_YEAR) {
        nextEnd = TIMELINE_MAX_YEAR;
        nextStart = Math.max(TIMELINE_MIN_YEAR, nextEnd - nextSpan);
      }
      setWindowStart(nextStart);
      setWindowEnd(nextEnd);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onChange, windowSpan, windowStart, year]);

  // Macro Window Range Handle Dragging
  const resolveMacroYear = (clientX: number) => {
    const rect = macroRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return TIMELINE_MIN_YEAR;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return clampYear(TIMELINE_MIN_YEAR + ratio * (TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR));
  };

  const handleMacroPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingTarget || draggingTarget === 'playhead') return;
    if (draggingTarget === 'winStart') {
      const candidate = resolveMacroYear(e.clientX);
      setWindowStart(Math.min(candidate, windowEnd - MIN_WINDOW_SPAN));
    } else if (draggingTarget === 'winEnd') {
      const candidate = resolveMacroYear(e.clientX);
      setWindowEnd(Math.max(candidate, windowStart + MIN_WINDOW_SPAN));
    } else if (draggingTarget === 'winPan') {
      const rect = macroRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const dxRatio = (e.clientX - panOriginRef.current.clientX) / rect.width;
      const totalSpan = TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR;
      const winLen = panOriginRef.current.end - panOriginRef.current.start;
      let nextStart = Math.round(panOriginRef.current.start + dxRatio * totalSpan);
      nextStart = Math.max(TIMELINE_MIN_YEAR, Math.min(TIMELINE_MAX_YEAR - winLen, nextStart));
      setWindowStart(nextStart);
      setWindowEnd(nextStart + winLen);
    }
  };

  const handleMacroPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTarget && draggingTarget !== 'playhead') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingTarget(null);
    }
  };

  // Dynamic calibrated ticks inside [windowStart .. windowEnd]
  const rulerTicks = useMemo(() => {
    const { major, minor } = chooseTickStep(windowSpan);
    const ticks: Array<{ yr: number; pct: number; isMajor: boolean }> = [];
    const firstTick = Math.ceil(windowStart / minor) * minor;
    for (let yr = firstTick; yr <= windowEnd; yr += minor) {
      const pct = ((yr - windowStart) / windowSpan) * 100;
      const isMajor = Math.abs(yr % major) < 0.001 || yr === 0;
      ticks.push({ yr, pct, isMajor });
    }
    return ticks;
  }, [windowEnd, windowSpan, windowStart]);

  const visibleEraMarkers = useMemo(
    () => ERA_MARKERS.filter((m) => m.year >= windowStart && m.year <= windowEnd),
    [windowEnd, windowStart]
  );

  const playheadPct = toRulerPct(year);
  const activeCivCount = getActiveCivilizationsForYear(year).length;
  const activeMarkerExact = snappedMarker ?? ERA_MARKERS.find((m) => Math.abs(m.year - year) <= 2) ?? null;

  const jumpRelativeEra = (dir: -1 | 1) => {
    const sorted = [...ERA_MARKERS].sort((a, b) => a.year - b.year);
    if (dir === -1) {
      const prev = [...sorted].reverse().find((m) => m.year < year - 2);
      if (prev) onChange(prev.year);
    } else {
      const next = sorted.find((m) => m.year > year + 2);
      if (next) onChange(next.year);
    }
  };

  return (
    <div className="space-y-2.5 select-none">
      {/* Precision Header Strip: Zoom Window Controls + Snap Magnet + Quick Step */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => jumpRelativeEra(-1)}
            title="Jump to previous Era Marker"
            className="tactile-press flex items-center gap-0.5 rounded-lg border border-neutral-300/75 dark:border-slate-700/80 px-2 py-1 font-medium text-neutral-700 dark:text-slate-300 hover:border-blue-500/70 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>Prev Era</span>
          </button>
          <button
            type="button"
            onClick={() => jumpRelativeEra(1)}
            title="Jump to next Era Marker"
            className="tactile-press flex items-center gap-0.5 rounded-lg border border-neutral-300/75 dark:border-slate-700/80 px-2 py-1 font-medium text-neutral-700 dark:text-slate-300 hover:border-blue-500/70 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Next Era</span>
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="hidden sm:flex items-center gap-0.5 ml-1">
            {[-50, -1, 1, 50].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => onChange(clampYear(year + delta))}
                className="tactile-press rounded-md px-1.5 py-1 font-mono-tabular text-[11px] text-neutral-600 dark:text-slate-400 hover:bg-neutral-200/70 dark:hover:bg-slate-800/80 hover:text-neutral-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
              >
                {delta > 0 ? `+${delta}y` : `${delta}y`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSnapEnabled((s) => !s)}
            aria-pressed={snapEnabled}
            title="Toggle magnetic snap-to-era markers (Hold Alt while dragging to bypass)"
            className={`tactile-press flex items-center gap-1 rounded-lg border px-2 py-1 font-medium cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              snapEnabled
                ? 'border-blue-600/70 bg-blue-700/15 text-blue-800 dark:border-blue-500/60 dark:bg-blue-600/20 dark:text-blue-300'
                : 'border-neutral-300/75 dark:border-slate-700/80 text-neutral-600 dark:text-slate-400'
            }`}
          >
            <Magnet className="h-3 w-3" />
            <span>Snap to Eras</span>
          </button>

          {isZoomed ? (
            <button
              type="button"
              onClick={() => {
                setWindowStart(TIMELINE_MIN_YEAR);
                setWindowEnd(TIMELINE_MAX_YEAR);
              }}
              className="tactile-press flex items-center gap-1 rounded-lg border border-neutral-300/75 dark:border-slate-700/80 px-2 py-1 font-medium text-neutral-700 dark:text-slate-300 hover:border-blue-500/70 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Full Span</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const half = 300;
                const nextS = clampYear(year - half);
                const nextE = clampYear(year + half);
                setWindowStart(nextS);
                setWindowEnd(Math.max(nextS + MIN_WINDOW_SPAN, nextE));
              }}
              title="Zoom ruler to ±300 years around current year"
              className="tactile-press flex items-center gap-1 rounded-lg border border-neutral-300/75 dark:border-slate-700/80 px-2 py-1 font-medium text-neutral-700 dark:text-slate-300 hover:border-blue-500/70 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Maximize2 className="h-3 w-3" />
              <span>Focus ±300y</span>
            </button>
          )}
        </div>
      </div>

      {/* Macro Span Overview Track with 2 Draggable Focus Bracket Handles */}
      <div
        ref={macroRef}
        onPointerMove={handleMacroPointerMove}
        onPointerUp={handleMacroPointerUp}
        onPointerCancel={handleMacroPointerUp}
        className="relative h-5 w-full rounded-lg border border-neutral-300/65 dark:border-slate-700/70 bg-neutral-200/55 dark:bg-slate-900/75 overflow-visible"
      >
        {/* Era milestone pips on macro overview */}
        {ERA_MARKERS.map((m) => (
          <div
            key={m.id}
            style={{ left: `${toMacroPct(m.year)}%` }}
            className="pointer-events-none absolute top-1 bottom-1 w-px bg-neutral-400/50 dark:bg-slate-600/70"
          />
        ))}

        {/* Current year indicator tick in macro track */}
        <div
          style={{ left: `${toMacroPct(year)}%` }}
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-blue-600 dark:bg-blue-400 z-10"
        />

        {/* Active Focus Bracket Window (draggable pan) */}
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            macroRef.current?.setPointerCapture(e.pointerId);
            panOriginRef.current = { clientX: e.clientX, start: windowStart, end: windowEnd };
            setDraggingTarget('winPan');
          }}
          style={{
            left: `${toMacroPct(windowStart)}%`,
            width: `${Math.max(2, toMacroPct(windowEnd) - toMacroPct(windowStart))}%`,
          }}
          title="Drag to pan focused historical window"
          className="absolute inset-y-0 rounded-md bg-blue-700/18 dark:bg-blue-500/22 border border-blue-700/45 dark:border-blue-400/45 cursor-grab active:cursor-grabbing"
        />

        {/* Left Draggable Window Handle */}
        <button
          type="button"
          aria-label="Timeline focus window start handle"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            macroRef.current?.setPointerCapture(e.pointerId);
            setDraggingTarget('winStart');
          }}
          style={{ left: `${toMacroPct(windowStart)}%` }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-6 w-3 items-center justify-center rounded-sm border border-white/80 dark:border-slate-900 bg-blue-800 dark:bg-blue-500 shadow cursor-ew-resize hover:scale-110 transition-transform"
        >
          <span className="h-2.5 w-0.5 rounded-full bg-white/90" />
        </button>

        {/* Right Draggable Window Handle */}
        <button
          type="button"
          aria-label="Timeline focus window end handle"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            macroRef.current?.setPointerCapture(e.pointerId);
            setDraggingTarget('winEnd');
          }}
          style={{ left: `${toMacroPct(windowEnd)}%` }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-6 w-3 items-center justify-center rounded-sm border border-white/80 dark:border-slate-900 bg-blue-800 dark:bg-blue-500 shadow cursor-ew-resize hover:scale-110 transition-transform"
        >
          <span className="h-2.5 w-0.5 rounded-full bg-white/90" />
        </button>

        <div className="pointer-events-none absolute inset-x-2 inset-y-0 flex items-center justify-between text-[9px] font-mono-tabular text-neutral-500 dark:text-slate-400">
          <span>{formatHistoricalYear(windowStart, lang)}</span>
          <span className="hidden sm:inline">
            Span: {windowSpan.toLocaleString()} yrs · Scroll to Zoom
          </span>
          <span>{formatHistoricalYear(windowEnd, lang)}</span>
        </div>
      </div>

      {/* Main Precision Scrubbing Ruler with Snap-to-Era Markers & Primary Playhead Handle */}
      <div
        ref={rulerRef}
        role="slider"
        tabIndex={0}
        aria-label="High-precision historical timeline"
        aria-valuemin={TIMELINE_MIN_YEAR}
        aria-valuemax={TIMELINE_MAX_YEAR}
        aria-valuenow={year}
        aria-valuetext={`${formatHistoricalYear(year, lang)} — ${getEraClassification(year)}`}
        onPointerDown={handleRulerPointerDown}
        onPointerMove={handleRulerPointerMove}
        onPointerUp={handleRulerPointerUp}
        onPointerCancel={handleRulerPointerUp}
        onPointerLeave={() => {
          if (!draggingTarget) setHoverInfo(null);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 25 : 1;
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (e.altKey) jumpRelativeEra(-1);
            else onChange(clampYear(year - step));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (e.altKey) jumpRelativeEra(1);
            else onChange(clampYear(year + step));
          }
        }}
        className="relative h-14 w-full rounded-xl border border-neutral-300/80 dark:border-slate-700/80 bg-neutral-100/80 dark:bg-[#080f1f]/90 cursor-ew-resize touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {/* Progressed gradient fill from left edge to playhead */}
        <div
          style={{ width: `${playheadPct}%` }}
          className="pointer-events-none absolute inset-y-0 left-0 rounded-l-xl bg-gradient-to-r from-blue-950/12 via-blue-700/18 to-blue-500/28 dark:from-blue-950/40 dark:via-blue-800/35 dark:to-blue-600/35"
        />

        {/* Calibrated Dynamic Ruler Ticks */}
        {rulerTicks.map((t) => (
          <div
            key={t.yr}
            style={{ left: `${t.pct}%` }}
            className="pointer-events-none absolute bottom-0 flex flex-col items-center -translate-x-1/2"
          >
            {t.isMajor && (
              <span className="mb-1 text-[9px] font-mono-tabular text-neutral-500 dark:text-slate-400 whitespace-nowrap">
                {t.yr < 0 ? `${Math.abs(t.yr)} BCE` : `${t.yr}`}
              </span>
            )}
            <div
              className={
                t.isMajor
                  ? 'h-3 w-px bg-neutral-400/80 dark:bg-slate-500/80'
                  : 'h-1.5 w-px bg-neutral-300/80 dark:bg-slate-700/80'
              }
            />
          </div>
        ))}

        {/* Snap-to-Era Interactive Markers */}
        {visibleEraMarkers.map((m) => {
          const pct = toRulerPct(m.year);
          const isSnapped = activeMarkerExact?.id === m.id;
          return (
            <button
              key={m.id}
              data-era-marker="true"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(m.year);
              }}
              title={`${m.shortLabel} — ${m.milestone}`}
              style={{ left: `${pct}%` }}
              className={`group absolute top-1.5 -translate-x-1/2 z-10 flex flex-col items-center cursor-pointer focus:outline-none`}
            >
              <span
                className={`h-2.5 w-2.5 rotate-45 rounded-[2px] border transition-transform ${
                  isSnapped
                    ? 'scale-125 bg-blue-600 border-white shadow-[0_0_12px_rgba(59,130,246,0.9)]'
                    : m.major
                      ? 'bg-blue-800/85 dark:bg-blue-500/80 border-white/80 dark:border-slate-900 group-hover:scale-125 group-hover:bg-blue-500'
                      : 'bg-neutral-400/80 dark:bg-slate-500/80 border-white/70 dark:border-slate-900 group-hover:scale-125 group-hover:bg-blue-500'
                }`}
              />
              {m.major && pct > 5 && pct < 95 && (
                <span className="mt-0.5 hidden md:block text-[9px] font-mono-tabular font-medium text-neutral-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 whitespace-nowrap">
                  {m.eraLabel}
                </span>
              )}
            </button>
          );
        })}

        {/* Hover Ghost Hairline & Readout */}
        {hoverInfo && !draggingTarget && (
          <div
            style={{ left: `${hoverInfo.xPct}%` }}
            className="pointer-events-none absolute inset-y-0 z-10 -translate-x-1/2 flex flex-col items-center"
          >
            <div className=" -translate-y-full -mt-1.5 rounded-lg border border-neutral-300/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 px-2 py-0.5 text-[10px] font-mono-tabular text-neutral-900 dark:text-slate-100 shadow-md whitespace-nowrap">
              {formatHistoricalYear(hoverInfo.year, lang)}
              {hoverInfo.marker ? ` · ${hoverInfo.marker.milestone}` : ''}
            </div>
            <div className="h-full w-px border-l border-dashed border-blue-500/60" />
          </div>
        )}

        {/* Primary Draggable Playhead Handle + Live Dynamic Callout */}
        <div
          style={{ left: `${playheadPct}%` }}
          className="pointer-events-none absolute inset-y-0 z-20 -translate-x-1/2 flex flex-col items-center"
        >
          {/* Floating Live Year Callout while dragging or snapped */}
          {(draggingTarget === 'playhead' || snappedMarker) && (
            <div className="absolute -top-10 rounded-xl bg-blue-900 dark:bg-blue-700 border border-blue-400/50 px-2.5 py-1 text-[11px] font-mono-tabular font-semibold text-white shadow-xl whitespace-nowrap flex items-center gap-1.5">
              <span>{formatHistoricalYear(year, lang)}</span>
              <span className="opacity-70">·</span>
              <span className="font-sans font-medium">
                {activeMarkerExact ? activeMarkerExact.milestone : `${activeCivCount} active civs`}
              </span>
            </div>
          )}

          {/* Tactile Top Grip Thumb (>= 44px touch target width) */}
          <div
            className={`-mt-1.5 flex h-5 w-7 items-center justify-center rounded-md border-2 border-white dark:border-slate-950 shadow-[0_2px_10px_rgba(128,128,128,0.65)] transition-transform ${
              draggingTarget === 'playhead'
                ? 'scale-110 bg-blue-600'
                : 'bg-blue-800 dark:bg-blue-600'
            }`}
          >
            <span className="h-2.5 w-0.5 rounded-full bg-white/90 mx-px" />
            <span className="h-2.5 w-0.5 rounded-full bg-white/90 mx-px" />
          </div>

          {/* Optical Needle */}
          <div className="w-0.5 flex-1 bg-blue-700 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.75)]" />
        </div>
      </div>

      {/* Quick Era Snap Strip */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {ERA_MARKERS.filter((m) => m.major).map((m) => {
          const isCurrent = Math.abs(year - m.year) <= 8;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.year)}
              className={`tactile-press rounded-lg px-2 py-1 text-[11px] font-mono-tabular whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isCurrent
                  ? 'bg-blue-800 dark:bg-blue-700 text-white font-semibold shadow-sm'
                  : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-200/70 dark:hover:bg-slate-800/80 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {m.shortLabel} <span className="opacity-75 font-sans">· {m.eraLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
