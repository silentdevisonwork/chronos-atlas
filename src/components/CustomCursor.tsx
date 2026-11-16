import { useEffect, useState } from 'react';
import { useAtlasStore } from '../store/useAtlasStore';

export function CustomCursor() {
  const enabled = useAtlasStore((s) => s.progress.preferences.customCursor);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [interactive, setInteractive] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || reducedMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest('button, a, input, select, [role="button"], canvas')
      );
      setInteractive(isInteractive);
    };
    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled, reducedMotion]);

  if (!enabled || reducedMotion || !visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] hidden lg:block"
    >
      <div
        style={{
          transform: `translate3d(${pos.x - (interactive ? 18 : 11)}px, ${pos.y - (interactive ? 18 : 11)}px, 0)`,
          width: interactive ? 36 : 22,
          height: interactive ? 36 : 22,
        }}
        className={`rounded-full border transition-[width,height,border-color,background-color] duration-150 ease-out ${
          interactive
            ? 'border-blue-500/80 bg-blue-500/12'
            : 'border-neutral-500/40 dark:border-slate-300/35 bg-transparent'
        }`}
      />
    </div>
  );
}
