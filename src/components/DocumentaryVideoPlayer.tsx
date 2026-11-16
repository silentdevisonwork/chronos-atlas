import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Compass,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DOCUMENTARY_REELS, type DocumentaryChapter, type MonumentPresetId } from '../data/media';
import { useAtlasStore } from '../store/useAtlasStore';

interface DocumentaryVideoPlayerProps {
  initialReelId?: string;
  onSyncChapterTo3D?: (chapter: {
    year: number;
    coords: { lat: number; lng: number };
    monumentPreset: MonumentPresetId;
  }) => void;
  compact?: boolean;
}

export function DocumentaryVideoPlayer({
  initialReelId = 'reel-cradles',
  onSyncChapterTo3D,
  compact = false,
}: DocumentaryVideoPlayerProps) {
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  const [reelId, setReelId] = useState(initialReelId);
  const reel = useMemo(
    () => DOCUMENTARY_REELS.find((r) => r.id === reelId) ?? DOCUMENTARY_REELS[0],
    [reelId]
  );

  const [chapterIdx, setChapterIdx] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0); // 0..1 within current chapter
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5>(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const imagesCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const audioCtxRef = useRef<{
    ctx: AudioContext;
    gain: GainNode;
    oscs: OscillatorNode[];
  } | null>(null);

  const currentChapter: DocumentaryChapter = reel.chapters[chapterIdx] ?? reel.chapters[0];
  const totalDurationSec = useMemo(
    () => reel.chapters.reduce((acc, c) => acc + c.durationSec, 0),
    [reel]
  );
  const elapsedTotalSec = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < chapterIdx; i++) sum += reel.chapters[i].durationSec;
    return sum + chapterProgress * currentChapter.durationSec;
  }, [chapterIdx, chapterProgress, currentChapter.durationSec, reel.chapters]);

  // Preload all archival plates across chapters cleanly
  useEffect(() => {
    for (const r of DOCUMENTARY_REELS) {
      for (const ch of r.chapters) {
        if (!imagesCacheRef.current.has(ch.image)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = ch.image;
          imagesCacheRef.current.set(ch.image, img);
        }
      }
    }
  }, []);

  // Ambient Web Audio harmonic drone (only activated when user clicks unmute)
  const stopAudio = useCallback(() => {
    if (audioCtxRef.current) {
      const { ctx, oscs } = audioCtxRef.current;
      oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          // ignore
        }
      });
      void ctx.close();
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!audioEnabled || !playing) {
      stopAudio();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      gain.connect(ctx.destination);

      const freqs = [110, 164.81, 220]; // Warm A2-E3-A3 museum chord
      const oscs = freqs.map((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        osc.connect(gain);
        osc.start();
        return osc;
      });
      audioCtxRef.current = { ctx, gain, oscs };
    } catch {
      // AudioContext blocked or unsupported
    }
    return () => stopAudio();
  }, [audioEnabled, playing, stopAudio]);

  // Playback timer loop
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1) * speed;
      last = now;

      setChapterProgress((prev) => {
        const next = prev + dt / currentChapter.durationSec;
        if (next >= 1) {
          setChapterIdx((ci) => {
            if (ci + 1 < reel.chapters.length) return ci + 1;
            return 0;
          });
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentChapter.durationSec, playing, reel.chapters.length, speed]);

  // Draw current cinema frame (Ken Burns image motion + coordinate HUD + timeline progress)
  const drawFrame = useCallback(
    (targetCanvas: HTMLCanvasElement | null, prog: number) => {
      if (!targetCanvas) return;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const W = targetCanvas.width;
      const H = targetCanvas.height;
      ctx.fillStyle = '#040814';
      ctx.fillRect(0, 0, W, H);

      const img = imagesCacheRef.current.get(currentChapter.image);
      const tEase = prog < 0.5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2;
      const kb = currentChapter.kenBurns;
      const scale = reducedMotion ? 1.02 : kb.startScale + (kb.endScale - kb.startScale) * tEase;
      const panX = reducedMotion ? 0 : kb.panX * tEase;
      const panY = reducedMotion ? 0 : kb.panY * tEase;

      if (img && img.complete && img.naturalWidth > 0) {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = W / H;
        let drawW = W * scale;
        let drawH = H * scale;
        if (imgAspect > canvasAspect) {
          drawW = drawH * imgAspect;
        } else {
          drawH = drawW / imgAspect;
        }
        const dx = (W - drawW) / 2 + panX;
        const dy = (H - drawH) / 2 + panY;

        ctx.save();
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#09142b');
        grad.addColorStop(1, '#030712');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // Crossfade veil near chapter edges
      const fadeIn = Math.min(1, prog * 9);
      const fadeOut = Math.min(1, (1 - prog) * 9);
      const vis = Math.min(fadeIn, fadeOut);
      if (vis < 1) {
        ctx.fillStyle = `rgba(4, 8, 20, ${(1 - vis) * 0.85})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Contrast scrim for museum cinema readability
      const scrim = ctx.createLinearGradient(0, 0, 0, H);
      scrim.addColorStop(0, 'rgba(3, 7, 18, 0.58)');
      scrim.addColorStop(0.4, 'rgba(3, 7, 18, 0.08)');
      scrim.addColorStop(0.72, 'rgba(3, 7, 18, 0.45)');
      scrim.addColorStop(1, 'rgba(3, 7, 18, 0.92)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, W, H);

      // Subtle architectural coordinate reticle in corner
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(28, 48);
      ctx.lineTo(28, 28);
      ctx.lineTo(48, 28);
      ctx.moveTo(W - 48, 28);
      ctx.lineTo(W - 28, 28);
      ctx.lineTo(W - 28, 48);
      ctx.stroke();

      // Top telemetry stamp
      ctx.fillStyle = 'rgba(147, 197, 253, 0.95)';
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillText(`${currentChapter.yearLabel}  ·  ${currentChapter.region}`, 42, 46);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(203, 213, 225, 0.82)';
      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillText(currentChapter.telemetryNote, W - 42, 46);
      ctx.textAlign = 'left';

      // Title overlay
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 28px "Manrope", sans-serif';
      ctx.fillText(currentChapter.title, 42, H - (showCaptions ? 88 : 40));

      if (showCaptions) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
        ctx.font = '400 15px "Plus Jakarta Sans", sans-serif';
        const maxWidth = W - 84;
        const words = currentChapter.narration.split(' ');
        let line = '';
        let y = H - 58;
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          if (ctx.measureText(testLine).width > maxWidth && i > 0) {
            ctx.fillText(line.trim(), 42, y);
            line = words[i] + ' ';
            y += 21;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), 42, y);
      }
    },
    [currentChapter, reducedMotion, showCaptions]
  );

  useEffect(() => {
    drawFrame(canvasRef.current, chapterProgress);
    if (fullscreenOpen) {
      drawFrame(modalCanvasRef.current, chapterProgress);
    }
  }, [chapterProgress, drawFrame, fullscreenOpen, currentChapter]);

  // Redraw when cached image finishes loading
  useEffect(() => {
    const img = imagesCacheRef.current.get(currentChapter.image);
    if (img && !img.complete) {
      const onLoad = () => {
        drawFrame(canvasRef.current, chapterProgress);
        if (fullscreenOpen) drawFrame(modalCanvasRef.current, chapterProgress);
      };
      img.addEventListener('load', onLoad, { once: true });
      return () => img.removeEventListener('load', onLoad);
    }
  }, [chapterProgress, currentChapter.image, drawFrame, fullscreenOpen]);

  const selectReel = (id: string) => {
    setReelId(id);
    setChapterIdx(0);
    setChapterProgress(0);
  };

  const renderControls = (isModal: boolean) => (
    <div className="space-y-2.5 bg-[#060c1a]/95 border-t border-slate-800/80 px-4 py-3 text-slate-100">
      {/* Chapter Timeline Scrub Bar */}
      <div className="flex items-center gap-1.5">
        {reel.chapters.map((ch, idx) => {
          const filledPct = idx < chapterIdx ? 100 : idx === chapterIdx ? chapterProgress * 100 : 0;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setChapterIdx(idx);
                setChapterProgress(ratio);
              }}
              title={`${ch.title} (${ch.yearLabel})`}
              className="group relative h-2 flex-1 overflow-hidden rounded-full bg-slate-800 hover:h-2.5 transition-all cursor-pointer"
            >
              <div
                style={{ width: `${filledPct}%` }}
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
              />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setChapterIdx((i) => (i - 1 + reel.chapters.length) % reel.chapters.length);
              setChapterProgress(0);
            }}
            aria-label="Previous documentary chapter"
            className="tactile-press rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause documentary' : 'Play documentary'}
            className="tactile-press flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{playing ? 'Pause' : 'Play Reel'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChapterIdx((i) => (i + 1) % reel.chapters.length);
              setChapterProgress(0);
            }}
            aria-label="Next documentary chapter"
            className="tactile-press rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          <span className="ml-1 font-mono-tabular text-[11px] text-slate-400 whitespace-nowrap">
            {Math.floor(elapsedTotalSec)}s / {totalDurationSec}s
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 1.5 : 1))}
            className="rounded-lg border border-slate-700/80 px-2 py-1 font-mono-tabular text-[11px] text-slate-300 hover:border-blue-500 cursor-pointer whitespace-nowrap"
          >
            {speed}x
          </button>
          <button
            type="button"
            onClick={() => setShowCaptions((c) => !c)}
            aria-label="Toggle archival narration captions"
            className={`rounded-lg border px-2 py-1 text-[11px] cursor-pointer ${
              showCaptions
                ? 'border-blue-500/70 bg-blue-600/20 text-blue-300'
                : 'border-slate-700/80 text-slate-400'
            }`}
          >
            <Subtitles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAudioEnabled((a) => !a)}
            aria-label="Toggle ambient museum score"
            className={`rounded-lg border px-2 py-1 text-[11px] cursor-pointer ${
              audioEnabled
                ? 'border-blue-500/70 bg-blue-600/20 text-blue-300'
                : 'border-slate-700/80 text-slate-400'
            }`}
          >
            {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {onSyncChapterTo3D && (
            <button
              type="button"
              onClick={() =>
                onSyncChapterTo3D({
                  year: currentChapter.year,
                  coords: currentChapter.coords,
                  monumentPreset: currentChapter.monumentPreset,
                })
              }
              className="tactile-press flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-blue-700 px-2.5 py-1 text-[11px] font-medium text-slate-100 cursor-pointer whitespace-nowrap"
            >
              <Compass className="h-3 w-3 text-blue-400" />
              <span>Sync 3D View</span>
            </button>
          )}

          {!isModal && (
            <button
              type="button"
              onClick={() => setFullscreenOpen(true)}
              aria-label="Open cinema theater modal"
              className="rounded-lg border border-slate-700/80 p-1.5 text-slate-300 hover:text-white hover:border-blue-500 cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Reel Switcher */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {DOCUMENTARY_REELS.map((r) => {
              const active = r.id === reel.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectReel(r.id)}
                  className={`tactile-press rounded-xl px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-blue-800 dark:bg-blue-700 text-white shadow-sm'
                      : 'spatial-card text-neutral-700 dark:text-slate-300 hover:border-blue-500/60'
                  }`}
                >
                  {r.title}
                </button>
              );
            })}
          </div>
          <span className="text-xs font-mono-tabular text-neutral-500 dark:text-slate-400">
            {reel.totalLabel}
          </span>
        </div>
      )}

      {/* Cinema Frame */}
      <div className="overflow-hidden rounded-2xl border border-neutral-300/75 dark:border-slate-800/90 bg-[#040814] shadow-[0_24px_60px_-15px_rgba(2,6,23,0.75)]">
        <div className="relative aspect-video w-full cursor-pointer" onClick={() => setPlaying((p) => !p)}>
          <canvas ref={canvasRef} width={960} height={540} className="h-full w-full block" />
          {!playing && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-700/90 text-white shadow-[0_0_40px_rgba(128,128,128,0.65)] border border-blue-300/40">
                <Play className="h-7 w-7 translate-x-0.5 fill-current" />
              </div>
            </div>
          )}
        </div>

        {renderControls(false)}

        {/* Chapter Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-800/80 bg-[#040915]">
          {reel.chapters.map((ch, idx) => {
            const active = idx === chapterIdx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setChapterIdx(idx);
                  setChapterProgress(0);
                  setPlaying(true);
                }}
                className={`p-3 text-left transition-colors border-r last:border-r-0 border-slate-800/70 cursor-pointer ${
                  active ? 'bg-blue-950/60' : 'hover:bg-slate-900/70'
                }`}
              >
                <div className="text-[10px] font-mono-tabular text-blue-400">{ch.yearLabel}</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-100 truncate">{ch.title}</div>
                <div className="mt-0.5 text-[11px] text-slate-400 truncate">{ch.region}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Cinema Modal */}
      <DialogPrimitive.Root open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#02050d]/92 backdrop-blur-md" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(1180px,96vw)] overflow-hidden rounded-2xl border border-slate-700/80 bg-[#040814] shadow-2xl focus:outline-none">
            <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-3 text-slate-100">
              <div>
                <DialogPrimitive.Title className="font-display text-lg font-bold">
                  {reel.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-slate-400">
                  {currentChapter.title} · {currentChapter.telemetryNote}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label="Close theater view"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="relative aspect-video w-full">
              <canvas ref={modalCanvasRef} width={1280} height={720} className="h-full w-full block" />
            </div>
            {renderControls(true)}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
