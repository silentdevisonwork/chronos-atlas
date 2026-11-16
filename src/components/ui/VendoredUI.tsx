/**
 * Components vendored copy-in style (the way shadcn/ui, Aceternity UI, Magic UI and React Bits ship).
 * Rewritten for this codebase's tokens so there is one coherent design system.
 */
import { motion } from 'motion/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

const EASE = [0.23, 1, 0.32, 1] as const;

/** Aceternity "Spotlight": a soft beam of light that eases in behind a hero */
export function Spotlight({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -top-44 -left-10 h-[70vh] w-[90vw] max-w-5xl opacity-0 blur-2xl',
        'animate-[spot-in_1.6s_var(--ease-out)_.3s_forwards] [mask-image:linear-gradient(to_bottom,#000,transparent)]',
        'bg-[radial-gradient(ellipse_at_30%_0%,rgba(150,150,158,.32),transparent_60%)]',
        className
      )}
    />
  );
}

/** Page title: spotlight + React Bits style blur-in. Used by every view. */
export function HeroTitle({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <Spotlight />
      <motion.h1
        initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative text-balance font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-extrabold leading-[1.03] tracking-[-0.045em] text-neutral-950 dark:text-slate-50"
      >
        {children}
      </motion.h1>
    </div>
  );
}

/** Aceternity "Hover Border Gradient": a conic light that orbits the button edge */
export function HoverBorderGradient({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={cn('tactile-press group relative inline-flex cursor-pointer overflow-hidden rounded-full p-[1.5px]', className)}>
      <span aria-hidden="true" className="absolute -inset-full animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_68%,#8e8e93_84%,#d1d1d6_94%,transparent)]" />
      <span className="relative inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-neutral-900">{children}</span>
    </button>
  );
}
