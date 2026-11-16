export interface LiveWikiSummary {
  title: string;
  description: string;
  extract: string;
  imageUrl?: string | null;
  wikiUrl: string;
}

export interface LiveSubjectPhoto {
  imageUrl: string | null;
  title: string;
  wikiUrl: string | null;
}

export interface LiveWorldBankMetrics {
  iso: string;
  gdp?: { value: number; year: string } | null;
  gdpPerCapita?: { value: number; year: string } | null;
  population?: { value: number; year: string } | null;
}

const wikiCache = new Map<string, LiveWikiSummary>();
const photoCache = new Map<string, LiveSubjectPhoto>();
const wbCache = new Map<string, LiveWorldBankMetrics>();

export async function fetchLiveWikiSummary(topicTitle: string): Promise<LiveWikiSummary | null> {
  const key = topicTitle.trim().toLowerCase();
  if (!key) return null;
  if (wikiCache.has(key)) return wikiCache.get(key)!;

  try {
    const res = await fetch(`/api/encyclopedia/summary?title=${encodeURIComponent(topicTitle)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as LiveWikiSummary;
    if (data && data.extract) {
      wikiCache.set(key, data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchLiveSubjectPhoto(topic: string): Promise<LiveSubjectPhoto | null> {
  const key = topic.trim().toLowerCase();
  if (!key) return null;
  if (photoCache.has(key)) return photoCache.get(key)!;

  try {
    const res = await fetch(`/api/encyclopedia/photo?topic=${encodeURIComponent(topic)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as LiveSubjectPhoto;
    photoCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchLiveWorldBankMetrics(isoAlpha: string): Promise<LiveWorldBankMetrics | null> {
  const key = isoAlpha.trim().toUpperCase();
  if (!key) return null;
  if (wbCache.has(key)) return wbCache.get(key)!;

  try {
    const res = await fetch(`/api/encyclopedia/worldbank?iso=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as LiveWorldBankMetrics;
    if (data && (data.gdp || data.gdpPerCapita || data.population)) {
      wbCache.set(key, data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatGdpBillions(billionsUsd: number): string {
  if (!Number.isFinite(billionsUsd) || billionsUsd <= 0) return '—';
  if (billionsUsd >= 1000) return `$${(billionsUsd / 1000).toFixed(2)}T`;
  if (billionsUsd >= 1) return `$${billionsUsd.toFixed(1)}B`;
  return `$${Math.round(billionsUsd * 1000)}M`;
}

export function formatUsdInteger(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return '—';
  return `$${Math.round(usd).toLocaleString('en-US')}`;
}

export function formatPopulationMillions(millions: number): string {
  if (!Number.isFinite(millions) || millions <= 0) return '—';
  if (millions >= 1000) return `${(millions / 1000).toFixed(2)}B`;
  if (millions >= 1) return `${millions.toFixed(1)}M`;
  return `${Math.round(millions * 1000)}K`;
}

const GENERIC_VIDEO_KEYWORDS = new Set([
  'history',
  'world',
  'empires',
  'chronology',
  'general',
  'trade',
  'money',
  'gdp',
  'economics',
  'war',
  'space',
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchVideoIdsForSubject<
  T extends { id: string; relatedId?: string; keywords: string[] },
>(subjectId: string, phrases: Array<string | undefined | null>, videos: T[]): string[] {
  const normId = subjectId.trim().toLowerCase();
  const cleanPhrases = phrases
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length >= 3);

  return videos
    .filter((v) => {
      if (v.relatedId && v.relatedId.toLowerCase() === normId) return true;
      return v.keywords.some((rawKw) => {
        const kw = rawKw.trim().toLowerCase();
        if (kw.length < 3 || GENERIC_VIDEO_KEYWORDS.has(kw)) return false;
        const kwRegex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
        return cleanPhrases.some((ph) => {
          if (kwRegex.test(ph)) return true;
          if (ph.length >= 4 && ph.toLowerCase() === kw) return true;
          return false;
        });
      });
    })
    .map((v) => v.id);
}

