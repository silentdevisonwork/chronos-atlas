import type { LanguageCode } from '../../types';

/*
 * Phrasebook
 * ----------
 * English source strings are the keys, so a missing translation degrades to
 * readable English instead of a raw key. Each locale lives in its own file and
 * is generated/filled independently, which keeps translation work parallel.
 *
 * Usage:  tp(lang, 'Search figures, discoveries, eras…')
 *         tp(lang, '{count} stories', { count: 12 })
 */

type Table = Record<string, string>;

/* eslint-disable @typescript-eslint/no-explicit-any */
const TABLES: Partial<Record<LanguageCode, Table>> = {};

/** Register a locale table (called from the locale files themselves). */
export function registerPhrases(code: LanguageCode, table: Table) {
  TABLES[code] = table;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name])
  );
}

/**
 * Translate an English source phrase into the active language.
 * Lookup order: exact phrase → case-insensitive phrase → English source.
 */
export function tp(
  lang: LanguageCode,
  english: string,
  vars?: Record<string, string | number>
): string {
  const table = TABLES[lang];
  let out = table?.[english];
  if (!out) {
    if (table) {
      const lower = english.toLowerCase();
      for (const key of Object.keys(table)) {
        if (key.toLowerCase() === lower) {
          out = table[key];
          break;
        }
      }
    }
  }
  return interpolate(out ?? english, vars);
}

/** Number formatting that follows the active language, not the OS locale. */
export function num(lang: LanguageCode, value: number, opts?: Intl.NumberFormatOptions) {
  try {
    return new Intl.NumberFormat(lang, opts).format(value);
  } catch {
    return String(value);
  }
}

/** Join a list with the active language's list separator. */
export function list(lang: LanguageCode, items: string[]) {
  try {
    return new Intl.ListFormat(lang, { type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
}

export function hasPhrases(lang: LanguageCode) {
  return Boolean(TABLES[lang]);
}
