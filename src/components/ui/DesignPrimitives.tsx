import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Tabs } from '@base-ui/react/tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'motion/react';
import React, { useEffect, useId, useRef, useState } from 'react';
import { useAtlasStore } from '../../store/useAtlasStore';
import { fetchLiveSubjectPhoto } from '../../utils/liveEncyclopedia';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function MagneticButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  onClick,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.12;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.12;
    setOffset({ x: dx, y: dy });
  };

  const resetOffset = () => setOffset({ x: 0, y: 0 });

  const sizeStyles =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs min-h-[36px]'
      : size === 'lg'
        ? 'px-6 py-3 text-sm min-h-[44px]'
        : 'px-4 py-2 text-sm min-h-[40px]';

  const variantStyles =
    variant === 'primary'
      ? 'shine relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white border border-white/20 shadow-[0_8px_24px_-6px_rgba(128,128,128,0.55)]'
      : variant === 'glass'
        ? 'spatial-glass text-neutral-900 dark:text-slate-100 hover:bg-neutral-200/60 dark:hover:bg-slate-800/70'
        : variant === 'ghost'
          ? 'bg-transparent hover:bg-neutral-200/60 dark:hover:bg-slate-800/60 text-neutral-700 dark:text-slate-300 border border-transparent'
          : 'spatial-card hover:border-blue-600/45 text-neutral-900 dark:text-slate-100';

  return (
    <motion.button
      ref={ref}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetOffset}
      onClick={onClick}
      className={`tactile-press inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${sizeStyles} ${variantStyles} ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}

/** Cursor-tracking Neutral & Dark Blue Spotlight Card */
export function SpotlightCard({
  children,
  className = '',
  onClick,
  asButton = false,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  asButton?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, opacity: 0 });
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const handleLeave = () => {
    setPos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      role={asButton || onClick ? 'button' : undefined}
      tabIndex={asButton || onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`group relative overflow-hidden rounded-2xl spatial-card transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-blue-600/45 hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
        style={{
          opacity: pos.opacity,
          background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(128,128,128, 0.14), transparent 65%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/** Deep Blue Specular Border Beam */
export function BorderBeamFrame({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  return (
    <div className={`relative overflow-hidden rounded-2xl p-[1px] ${className}`}>
      {!reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-120%] border-beam-ring opacity-60"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(128,128,128, 0.85) 315deg, rgba(96, 165, 250, 0.55) 345deg, transparent 360deg)',
          }}
        />
      )}
      <div className="relative h-full w-full rounded-[15px] bg-[#f5f5f5] dark:bg-[#080e1c]">
        {children}
      </div>
    </div>
  );
}

/** Spring layoutId Segmented Control in Neutral & Dark Blue */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
}: {
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T;
  onChange: (val: T) => void;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const groupId = useId();
  return (
    <div
      className={`inline-flex items-center rounded-xl border border-neutral-300/75 dark:border-slate-700/80 bg-neutral-200/60 dark:bg-slate-900/80 p-0.5 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              size === 'xs' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            } ${
              active
                ? 'text-white'
                : 'text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-pill-${groupId}`}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-blue-800 dark:bg-blue-700 shadow-sm"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Base UI Tabs + Motion layoutId pill in a glass capsule (drives every tab strip in the app) */
export function SpatialTabs({
  tabs,
  value,
  onValueChange,
  children,
}: {
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
}) {
  const tabsId = useId();
  return (
    <Tabs.Root value={value} onValueChange={(v) => onValueChange(String(v))} className="w-full">
      <Tabs.List className="spatial-glass mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-sm:[mask-image:linear-gradient(90deg,#000_90%,transparent)]">
        {tabs.map((tab) => {
          const active = value === tab.id;
          return (
            <Tabs.Tab
              key={tab.id}
              value={tab.id}
              className={`relative shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active ? 'text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`tab-bg-${tabsId}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  className="absolute inset-0 rounded-full bg-blue-600 shadow-[0_8px_20px_-8px_rgba(150,150,158,.9)]"
                />
              )}
              <span className="relative">{tab.label}</span>
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
}

export function SpatialTabContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  return (
    <Tabs.Panel value={value} className={className}>
      {children}
    </Tabs.Panel>
  );
}

/** Radix UI Slider in Neutral & Dark Blue */
export function SpatialSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  ariaLabel,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <SliderPrimitive.Root
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
      className="relative flex w-full touch-none select-none items-center py-2 cursor-pointer"
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-300/80 dark:bg-slate-800">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-900 via-blue-700 to-blue-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 bg-blue-600 shadow-[0_0_0_3px_rgba(128,128,128,0.28)] transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
    </SliderPrimitive.Root>
  );
}

/** Radix UI Apple-style Switch */
export function AppleSwitch({
  checked,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <SwitchPrimitive.Root
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-neutral-300 dark:bg-slate-700 transition-colors data-[state=checked]:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}

/** Radix UI Tooltip helper */
export function TooltipHint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={220}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 rounded-lg spatial-glass px-2.5 py-1 text-[11px] font-medium text-neutral-900 dark:text-slate-100 shadow-lg"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function BlurReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }
    const start = currentRef.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 420;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const nextVal = Math.round(start + diff * eased);
      currentRef.current = nextVal;
      setDisplay(nextVal);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reducedMotion]);

  return (
    <span className="font-mono-tabular">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export function GlassPanel({
  children,
  className = '',
  overWebGL = false,
}: {
  children: React.ReactNode;
  className?: string;
  overWebGL?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl transition-colors ${
        overWebGL ? 'webgl-hud-surface' : 'spatial-glass'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SafeArchivalImage({
  src,
  alt,
  caption,
  attribution,
  wikiTopic,
  className = 'w-full h-56 object-cover',
}: {
  src?: string;
  alt: string;
  caption?: string;
  attribution?: string;
  wikiTopic?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [liveSrc, setLiveSrc] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLiveSrc(null);
  }, [src, wikiTopic]);

  useEffect(() => {
    if ((src && !failed) || !wikiTopic) return;
    let cancelled = false;
    setLoadingLive(true);
    fetchLiveSubjectPhoto(wikiTopic).then((res) => {
      if (!cancelled) {
        if (res?.imageUrl) setLiveSrc(res.imageUrl);
        setLoadingLive(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [src, failed, wikiTopic]);

  const activeSrc = !failed && src ? src : liveSrc;

  return (
    <figure className="overflow-hidden rounded-xl border border-neutral-200/80 dark:border-slate-800/80 bg-neutral-100 dark:bg-slate-900">
      {!activeSrc ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-neutral-200 via-slate-100 to-blue-50 dark:from-slate-900 dark:via-[#080d1a] dark:to-blue-950/40 min-h-[180px]">
          <span className="font-display text-lg font-semibold text-neutral-800 dark:text-slate-200">
            {alt}
          </span>
          <span className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
            {loadingLive ? 'Loading exact photograph...' : 'Archival Plate'}
          </span>
        </div>
      ) : (
        <img
          src={activeSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => {
            if (!failed && src) setFailed(true);
            else setLiveSrc(null);
          }}
          className={className}
        />
      )}
      {(caption || attribution) && (
        <figcaption className="px-3.5 py-2 text-xs text-neutral-600 dark:text-slate-400 border-t border-neutral-200/70 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <span className="italic truncate">{caption}</span>
          {attribution && (
            <span className="font-mono-tabular text-[11px] opacity-75 shrink-0">{attribution}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
