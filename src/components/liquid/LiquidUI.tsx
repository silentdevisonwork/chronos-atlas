import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

type Variant = 'glass' | 'primary' | 'ghost' | 'quiet' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  glass: 'liquid-button',
  primary: 'liquid-button liquid-button--primary',
  ghost:
    'liquid-button border-transparent bg-transparent shadow-none hover:bg-black/[.05] dark:hover:bg-white/[.08]',
  quiet:
    'liquid-button border-transparent bg-black/[.035] shadow-none hover:bg-black/[.07] dark:bg-white/[.06] dark:hover:bg-white/[.11]',
  danger:
    'liquid-button border-rose-400/40 bg-rose-500/12 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20',
};

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[11px] font-semibold gap-1.5',
  sm: 'h-9 px-3.5 text-xs font-semibold gap-1.5',
  md: 'h-11 px-5 text-sm font-semibold gap-2',
  lg: 'h-13 px-7 text-[15px] font-semibold gap-2.5',
  icon: 'h-10 w-10 p-0',
};

export interface LiquidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

export function LiquidButton({
  variant = 'glass',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: LiquidButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        VARIANTS[variant],
        SIZES[size],
        'select-none disabled:cursor-not-allowed disabled:opacity-45',
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export interface LiquidChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children?: ReactNode;
}

export function LiquidChip({ active, className, children, ...rest }: LiquidChipProps) {
  return (
    <button
      type="button"
      data-active={active ? 'true' : 'false'}
      {...rest}
      className={clsx(
        'liquid-chip h-8 shrink-0 px-3 text-[11px] font-semibold text-neutral-600 dark:text-slate-300',
        active && 'text-[#0a84ff] dark:text-[#8ec5ff]',
        className
      )}
    >
      {children}
    </button>
  );
}

export interface LiquidPanelProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
  glow?: boolean;
}

export function LiquidPanel({ strong, glow, className, children, ...rest }: LiquidPanelProps) {
  return (
    <div
      {...rest}
      className={clsx('glass-surface relative overflow-hidden', glow && 'liquid-glow', className)}
      data-strong={strong ? 'true' : undefined}
    >
      {children}
    </div>
  );
}

export function LiquidKbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="liquid-kbd inline-grid h-5 min-w-5 place-items-center rounded-[5px] px-1 font-mono-tabular text-[10px] font-semibold">
      {children}
    </kbd>
  );
}

export function LiquidTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg border border-white/15 bg-neutral-950/88 px-2.5 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-2xl backdrop-blur-xl transition duration-200 group-hover/tt:translate-y-0 group-hover/tt:opacity-100 dark:bg-white/92 dark:text-neutral-950"
      >
        {label}
      </span>
    </span>
  );
}

export interface LiquidInputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function LiquidInput({ leading, trailing, className, ...rest }: LiquidInputProps) {
  return (
    <label className="liquid-input group relative flex h-10 items-center gap-2 rounded-full px-3.5">
      {leading ? <span className="shrink-0 text-neutral-500 dark:text-slate-400">{leading}</span> : null}
      <input
        {...rest}
        className={clsx(
          'h-full w-full min-w-0 bg-transparent text-xs font-medium text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-slate-100 dark:placeholder:text-slate-400',
          className
        )}
      />
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </label>
  );
}

export function LiquidDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/12',
        className
      )}
    />
  );
}

export function Eyebrow({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-slate-400">
      {icon}
      {children}
    </div>
  );
}
