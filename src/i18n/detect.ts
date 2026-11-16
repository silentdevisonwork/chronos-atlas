import { SUPPORTED_LANGUAGES } from './languages';
import type { LanguageCode } from '../types';

const CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * Browser language detection. Runs exactly once, only when the visitor has no
 * stored preference, so an explicit choice always wins afterwards.
 */
export function detectLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  const tags = [...(navigator.languages ?? []), navigator.language].filter(Boolean) as string[];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    // Portuguese (Brazil) and Portuguese (Portugal) both map to `pt`.
    const base = lower.split('-')[0].replace('_', '-');
    const normalised = base === 'iw' ? 'he' : base === 'in' ? 'id' : base;
    if (CODES.has(normalised as LanguageCode)) return normalised as LanguageCode;
    // Chinese variants (zh-Hans, zh-Hant, zh-CN, zh-TW) all map to `zh`.
    if (normalised === 'zh') return 'zh';
  }
  return 'en';
}

/** Resolve the language used before the store exists (mirrors the inline pre-paint script). */
export function initialLanguage(): LanguageCode {
  if (typeof localStorage === 'undefined') return 'en';
  try {
    const raw = localStorage.getItem('chronos-atlas-state-v1');
    if (raw) {
      const stored = JSON.parse(raw)?.preferences?.language;
      if (stored && CODES.has(stored)) return stored as LanguageCode;
    }
  } catch {
    /* corrupt state — fall through to detection */
  }
  return detectLanguage();
}

export function isRtl(lang: LanguageCode) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.dir === 'rtl';
}
