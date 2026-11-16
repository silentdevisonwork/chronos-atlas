import { ArrowUpRight, Clock3, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { formatHistoricalYear } from '../../i18n/languages';
import { useAtlasStore } from '../../store/useAtlasStore';

/**
 * A persistent, minimal time HUD for every view that does not already own a
 * transport. Keeps the playhead visible without competing with the timeline.
 */
export function ChronosHUD() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const isPlaying = useAtlasStore((s) => s.isTimelinePlaying);
  const setPlaying = useAtlasStore((s) => s.setTimelinePlaying);
  const setView = useAtlasStore((s) => s.setView);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="liquid-dock fixed bottom-3 end-3 z-30 hidden items-center gap-1.5 rounded-full p-1.5 sm:flex"
      aria-label="Chronos time HUD"
    >
      <button
        type="button"
        onClick={() => {
          setView('timeline');
          setPlaying(true);
        }}
        aria-label="Open the timeline and play"
        className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(180deg,#55abff,#0a84ff_55%,#0466d6)] text-white shadow-[0_8px_18px_-8px_rgba(10,132,255,.9)] transition hover:scale-105 active:scale-95"
      >
        <Play className="h-3.5 w-3.5 translate-x-[0.5px] fill-current" />
      </button>
      <button
        type="button"
        onClick={() => setView('timeline')}
        className="flex items-center gap-2 rounded-full pe-2 ps-1 text-start"
        aria-label="Open timeline"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-black/[.05] dark:bg-white/[.08]">
          <Clock3 className="h-3.5 w-3.5 text-neutral-600 dark:text-slate-300" />
        </span>
        <span className="leading-none">
          <span className="block font-mono-tabular text-[11px] font-bold tracking-tight text-neutral-950 dark:text-white">
            {formatHistoricalYear(selectedYear, lang)}
          </span>
          <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-slate-400">
            {isPlaying ? 'time flowing' : 'chronos hud'}
          </span>
        </span>
      </button>
      {isPlaying ? (
        <span className="flex h-5 items-end gap-[2px] pe-1" aria-hidden="true">
          {[0, 1, 2].map((bar) => (
            <motion.span
              key={bar}
              className="w-[2px] rounded-full bg-[#0a84ff]"
              animate={{ height: ['25%', '100%', '50%'] }}
              transition={{ duration: 0.7 + bar * 0.18, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
          ))}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setView('timeline')}
        className="grid h-7 w-7 place-items-center rounded-full text-neutral-500 transition hover:bg-black/[.06] hover:text-neutral-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Open full timeline"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
