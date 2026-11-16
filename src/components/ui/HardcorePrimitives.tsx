import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Expand,
  Globe2,
  Layers,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { ExhibitionPlate } from '../../data/media';
import { useAtlasStore } from '../../store/useAtlasStore';

/**
 * 3D Perspective Tilt Card with spring-damped rotateX/rotateY and cursor-tracked Fresnel sheen.
 */
export function SpatialTiltCard({
  children,
  className = '',
  onClick,
  maxTilt = 8,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);

  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const springConfig = { stiffness: 260, damping: 24, mass: 0.6 };
  const smoothX = useSpring(rawX, springConfig);
  const smoothY = useSpring(rawY, springConfig);

  const rotateX = useTransform(smoothY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(smoothX, [0, 1], [-maxTilt, maxTilt]);
  const sheenX = useTransform(smoothX, [0, 1], [0, 100]);
  const sheenY = useTransform(smoothY, [0, 1], [0, 100]);
  const sheenBackground = useMotionTemplate`radial-gradient(380px circle at ${sheenX}% ${sheenY}%, rgba(59, 130, 246, 0.22), rgba(128,128,128, 0.08) 40%, transparent 72%)`;

  const [hovered, setHovered] = useState(false);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    rawX.set(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    rawY.set(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)));
  };

  const handleLeave = () => {
    setHovered(false);
    rawX.set(0.5);
    rawY.set(0.5);
  };

  return (
    <div style={{ perspective: '1100px' }} className="h-full">
      <motion.div
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
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
        onPointerEnter={() => setHovered(true)}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={
          reducedMotion
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }
        }
        className={`group relative h-full overflow-hidden rounded-2xl spatial-card transition-colors duration-200 ${
          onClick ? 'cursor-pointer hover:border-blue-500/60' : ''
        } ${className}`}
      >
        <motion.div
          aria-hidden="true"
          animate={{ opacity: hovered && !reducedMotion ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ background: sheenBackground }}
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        />
        <div
          className="relative z-20 h-full"
          style={reducedMotion ? undefined : { transform: 'translateZ(14px)' }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Interactive 3D Stacked Archival Card Deck with drag/click cycling & epoch portal jump.
 */
export function PerspectiveCardDeck3D({
  plates,
  onInspectPlate,
  onJumpToPlate,
}: {
  plates: ExhibitionPlate[];
  onInspectPlate: (plate: ExhibitionPlate) => void;
  onJumpToPlate: (plate: ExhibitionPlate) => void;
}) {
  const [index, setIndex] = useState(0);
  const total = plates.length;

  const step = (dir: -1 | 1) => {
    setIndex((prev) => (prev + dir + total) % total);
  };

  const ordered = [0, 1, 2, 3].map((offset) => ({
    offset,
    plate: plates[(index + offset) % total],
  }));

  const current = plates[index];

  return (
    <div className="space-y-4">
      <div className="relative h-[370px] sm:h-[410px] w-full select-none" style={{ perspective: '1200px' }}>
        <AnimatePresence initial={false} mode="popLayout">
          {ordered
            .slice()
            .reverse()
            .map(({ offset, plate }) => {
              const isFront = offset === 0;
              return (
                <motion.div
                  key={plate.id}
                  style={{
                    zIndex: 30 - offset * 5,
                    transformOrigin: 'bottom center',
                  }}
                  initial={{ scale: 0.9, y: 26, opacity: 0 }}
                  animate={{
                    scale: 1 - offset * 0.045,
                    y: offset * 14,
                    rotateX: offset * -2,
                    opacity: isFront ? 1 : Math.max(0.35, 1 - offset * 0.24),
                  }}
                  exit={{ x: -240, opacity: 0, rotateZ: -6 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  drag={isFront ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.45}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.x) > 60) {
                      step(info.offset.x < 0 ? 1 : -1);
                    }
                  }}
                  className={`absolute inset-x-0 top-0 h-[335px] sm:h-[375px] overflow-hidden rounded-2xl border border-neutral-300/75 dark:border-slate-700/80 bg-[#070d1d] shadow-[0_24px_60px_-15px_rgba(2,6,23,0.75)] ${
                    isFront ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
                  }`}
                >
                  <img
                    src={plate.src}
                    alt={plate.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/45 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 space-y-2.5 text-white">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular text-blue-300">
                      <span>
                        {plate.accessionId} · {plate.yearLabel}
                      </span>
                      <span className="truncate">{plate.region}</span>
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold leading-tight text-white">
                      {plate.title}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {plate.summary}
                    </p>
                    {isFront && (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectPlate(plate);
                          }}
                          className="tactile-press inline-flex items-center gap-1.5 rounded-xl bg-white/14 hover:bg-white/24 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
                        >
                          <Expand className="h-3.5 w-3.5" />
                          Inspect Plate & Dossier
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToPlate(plate);
                          }}
                          className="tactile-press inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Globe2 className="h-3.5 w-3.5" />
                          3D Globe · {plate.year < 0 ? `${Math.abs(plate.year)} BCE` : `${plate.year} CE`}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Deck Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs font-mono-tabular text-neutral-500 dark:text-slate-400">
          <span>
            Plate {index + 1} / {total}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate max-w-[200px] sm:max-w-[280px] text-neutral-800 dark:text-slate-200 font-sans font-medium">
            {current.subtitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous archival plate"
            className="tactile-press rounded-xl border border-neutral-300/80 dark:border-slate-700/80 p-2 text-neutral-700 dark:text-slate-200 hover:border-blue-500/70 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next archival plate"
            className="tactile-press rounded-xl border border-neutral-300/80 dark:border-slate-700/80 p-2 text-neutral-700 dark:text-slate-200 hover:border-blue-500/70 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Dual-Row Kinetic Archival Marquee Ribbon with pause-on-hover and SpatialTilt cards.
 */
export function KineticArchiveStrip({
  plates,
  onSelectPlate,
}: {
  plates: ExhibitionPlate[];
  onSelectPlate: (plate: ExhibitionPlate) => void;
}) {
  const [paused, setPaused] = useState(false);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  const doubled = [...plates, ...plates];

  if (reducedMotion) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plates.slice(0, 4).map((p) => (
          <SpatialTiltCard key={p.id} onClick={() => onSelectPlate(p)}>
            <div className="h-40 overflow-hidden">
              <img
                src={p.src}
                alt={p.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-4 space-y-1">
              <div className="text-[11px] font-mono-tabular text-blue-700 dark:text-blue-400">
                {p.accessionId} · {p.yearLabel}
              </div>
              <div className="font-semibold text-sm text-neutral-950 dark:text-slate-100 truncate">
                {p.title}
              </div>
            </div>
          </SpatialTiltCard>
        ))}
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
    >
      <motion.div
        animate={paused ? undefined : { x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 36, ease: 'linear' }}
        className="flex gap-4 w-max"
      >
        {doubled.map((plate, i) => (
          <div key={`${plate.id}-${i}`} className="w-[300px] sm:w-[330px] shrink-0">
            <SpatialTiltCard onClick={() => onSelectPlate(plate)}>
              <div className="h-44 overflow-hidden">
                <img
                  src={plate.src}
                  alt={plate.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-blue-700 dark:text-blue-400">
                  <span>{plate.accessionId}</span>
                  <span>{plate.yearLabel}</span>
                </div>
                <div className="font-display text-base font-bold text-neutral-950 dark:text-slate-100 truncate">
                  {plate.title}
                </div>
                <div className="text-xs text-neutral-500 dark:text-slate-400 truncate">
                  {plate.dimensions}
                </div>
              </div>
            </SpatialTiltCard>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Full-Screen Radix Dialog + Zoomable Archival Media Lightbox with Deep Scholarly Metadata.
 */
export function ArchivalMediaLightbox({
  plate,
  onClose,
  onOpenIn3DGlobe,
  onSelectMonumentPreset,
}: {
  plate: ExhibitionPlate | null;
  onClose: () => void;
  onOpenIn3DGlobe: (plate: ExhibitionPlate) => void;
  onSelectMonumentPreset?: (plate: ExhibitionPlate) => void;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <DialogPrimitive.Root
      open={Boolean(plate)}
      onOpenChange={(open) => {
        if (!open) {
          setZoom(1);
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#02050d]/85 backdrop-blur-md" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(1120px,95vw)] max-h-[90vh] overflow-hidden rounded-2xl spatial-glass focus:outline-none flex flex-col lg:flex-row">
          {plate && (
            <>
              {/* High-Res Interactive Image Viewer */}
              <div className="relative flex-1 bg-[#040814] min-h-[280px] lg:min-h-[540px] overflow-hidden flex items-center justify-center">
                <motion.img
                  src={plate.src}
                  alt={plate.title}
                  referrerPolicy="no-referrer"
                  animate={{ scale: zoom }}
                  transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                  drag={zoom > 1}
                  dragConstraints={{ left: -180, right: 180, top: -140, bottom: 140 }}
                  className={`max-h-[580px] w-full h-full object-cover ${
                    zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-200">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                    aria-label="Zoom out image"
                    className="p-1 hover:text-blue-400 cursor-pointer"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono-tabular px-1">{zoom.toFixed(1)}x</span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.5).toFixed(1))))}
                    aria-label="Zoom in image"
                    className="p-1 hover:text-blue-400 cursor-pointer"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Museum Accession Dossier */}
              <div className="w-full lg:w-[410px] overflow-y-auto p-6 space-y-5 border-t lg:border-t-0 lg:border-l border-neutral-200/75 dark:border-slate-800/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      {plate.accessionId} · {plate.yearLabel}
                    </div>
                    <DialogPrimitive.Title className="font-display text-2xl font-bold text-neutral-950 dark:text-slate-50 mt-1">
                      {plate.title}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
                      {plate.subtitle}
                    </DialogPrimitive.Description>
                  </div>
                  <DialogPrimitive.Close
                    aria-label="Close exhibition lightbox"
                    className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-200/70 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </div>

                <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                  {plate.summary}
                </p>

                <dl className="grid grid-cols-1 gap-3 border-y border-neutral-200/75 dark:border-slate-800/80 py-4 text-xs">
                  <div>
                    <dt className="text-neutral-500 dark:text-slate-400">Region & Coordinates</dt>
                    <dd className="font-mono-tabular font-medium text-neutral-900 dark:text-slate-100 mt-0.5">
                      {plate.region} ({plate.coords.lat.toFixed(2)}°, {plate.coords.lng.toFixed(2)}°)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-slate-400">Medium & Engineering</dt>
                    <dd className="font-medium text-neutral-900 dark:text-slate-100 mt-0.5">{plate.medium}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-slate-400">Measured Dimensions</dt>
                    <dd className="font-mono-tabular font-medium text-neutral-900 dark:text-slate-100 mt-0.5">
                      {plate.dimensions}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-slate-400">Primary Historical Evidence</dt>
                    <dd className="font-medium text-neutral-900 dark:text-slate-100 mt-0.5">
                      {plate.primarySource}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenIn3DGlobe(plate);
                      onClose();
                    }}
                    className="tactile-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Inspect on 3D Globe
                  </button>
                  {onSelectMonumentPreset && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMonumentPreset(plate);
                        onClose();
                      }}
                      className="tactile-press inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3.5 py-2.5 text-xs font-medium text-neutral-800 dark:text-slate-200 hover:border-blue-500/70 cursor-pointer whitespace-nowrap"
                    >
                      <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Load 3D Model
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
