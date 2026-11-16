import Lenis from 'lenis';
import { useEffect } from 'react';
import { useAtlasStore } from '../../store/useAtlasStore';

/**
 * Inertial, frame-synced scrolling with the same easing curve as the rest of
 * the glass system. Nested scrollers opt out with `data-lenis-prevent`.
 */
export function SmoothScroll() {
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === 'undefined') return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.6,
      infinite: false,
    });

    const root = document.documentElement;
    let raf = 0;
    let disposed = false;

    const onScroll = () => {
      const progress = lenis.progress || 0;
      root.style.setProperty('--scroll-progress', progress.toFixed(4));
      root.style.setProperty('--scroll-y', `${Math.round(lenis.scroll)}px`);
      root.dataset.scrolled = lenis.scroll > 24 ? 'true' : 'false';
    };
    lenis.on('scroll', onScroll);

    const frame = (time: number) => {
      if (disposed) return;
      lenis.raf(time);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onAnchorClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!target) return;
      const id = target.getAttribute('href');
      if (!id || id === '#') return;
      const node = document.querySelector(id);
      if (!node) return;
      event.preventDefault();
      lenis.scrollTo(node as HTMLElement, { offset: -92, duration: 1.2 });
    };
    document.addEventListener('click', onAnchorClick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      lenis.off('scroll', onScroll);
      document.removeEventListener('click', onAnchorClick);
      lenis.destroy();
      root.style.removeProperty('--scroll-progress');
      root.style.removeProperty('--scroll-y');
      delete root.dataset.scrolled;
    };
  }, [reducedMotion]);

  return null;
}
