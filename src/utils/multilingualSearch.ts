import { CIVILIZATIONS } from '../data/civilizations';
import { COUNTRY_CHRONICLES } from '../data/countries';
import { HISTORICAL_FIGURES } from '../data/figures';
import { INTERNET_VIDEOS } from '../data/internetVideos';
import { SOLAR_SYSTEM_BODIES } from '../data/solarSystem';
import { HISTORICAL_SITES, TIMELINE_EVENTS } from '../data/timeline';
import { EXPANDED_TRADE_NETWORKS, MAJOR_WARS_AND_BATTLES } from '../data/warsAndTrade';
import { findCountryEconomics } from '../data/worldEconomics';
import { formatHistoricalYear, localize } from '../i18n/languages';
import type { LanguageCode, SearchResultItem } from '../types';
import { formatGdpBillions } from './liveEncyclopedia';
import { getWorldCountries } from './worldGeo';

function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(prev, dp[j - 1], dp[j]) + 1;
      }
      prev = temp;
    }
  }
  return dp[b.length];
}

export function buildSearchIndex(lang: LanguageCode): SearchResultItem[] {
  const items: SearchResultItem[] = [];
  const chronicleIsos = new Set(COUNTRY_CHRONICLES.map((c) => c.isoNumeric));

  for (const country of COUNTRY_CHRONICLES) {
    const econ = findCountryEconomics(country.isoNumeric, country.name.en);
    items.push({
      id: `country-${country.id}`,
      entityType: 'country',
      title: localize(country.name, lang),
      subtitle: `${country.region} · ${localize(country.capital, lang)}${econ ? ` · GDP ${formatGdpBillions(econ.gdpNominalBillionUSD)}` : ''}`,
      targetView: 'countries',
      targetId: country.id,
      coords: country.coords,
      keywords: [
        ...Object.values(country.name),
        ...country.aliases,
        ...country.ancestorCivilizations,
        ...country.historicalLeaders,
        ...(econ?.primaryExports ?? []),
      ],
    });
  }

  for (const wc of getWorldCountries()) {
    if (wc.isoNumeric !== '000' && chronicleIsos.has(wc.isoNumeric)) continue;
    const econ = findCountryEconomics(wc.isoNumeric, wc.name);
    items.push({
      id: `dyn-country-${wc.isoNumeric}-${wc.name}`,
      entityType: 'country',
      title: wc.name,
      subtitle: econ
        ? `${econ.region} · ${econ.capital} · GDP ${formatGdpBillions(econ.gdpNominalBillionUSD)}`
        : `Global Territory · ISO #${wc.isoNumeric}`,
      targetView: 'explore',
      targetId: `dyn:${wc.isoNumeric}:${wc.name}`,
      coords: wc.centroid,
      keywords: [
        wc.name,
        econ?.capital ?? '',
        econ?.region ?? '',
        econ?.isoAlpha2 ?? '',
        econ?.isoAlpha3 ?? '',
        ...(econ?.primaryExports ?? []),
        econ?.historicalLineage ?? '',
      ],
    });
  }

  for (const civ of CIVILIZATIONS) {
    items.push({
      id: `civ-${civ.id}`,
      entityType: 'civilization',
      title: localize(civ.name, lang),
      subtitle: `${formatHistoricalYear(civ.startYear, lang)} – ${formatHistoricalYear(civ.endYear, lang)} · ${localize(civ.capital.name, lang)}`,
      targetView: 'civilizations',
      targetId: civ.id,
      targetYear: civ.peakYear,
      coords: civ.capital.coords,
      keywords: [
        ...Object.values(civ.name),
        ...civ.aliases,
        ...Object.values(civ.capital.name),
        ...civ.capital.aliases,
        ...civ.rulers,
        ...civ.modernCountries,
        ...(civ.tradeCommodities ?? []),
      ],
    });
  }

  for (const fig of HISTORICAL_FIGURES) {
    items.push({
      id: `fig-${fig.id}`,
      entityType: 'figure',
      title: localize(fig.name, lang),
      subtitle: `${localize(fig.role, lang)} (${formatHistoricalYear(fig.bornYear, lang)} – ${formatHistoricalYear(fig.diedYear, lang)})`,
      targetView: 'figures',
      targetId: fig.id,
      targetYear: fig.bornYear + 30,
      coords: fig.coords,
      keywords: [...Object.values(fig.name), ...fig.aliases, fig.civilizationOrState],
    });
  }

  for (const war of MAJOR_WARS_AND_BATTLES) {
    items.push({
      id: `war-${war.id}`,
      entityType: 'war',
      title: war.name,
      subtitle: `${formatHistoricalYear(war.startYear, lang)} – ${formatHistoricalYear(war.endYear, lang)} · ${war.locationName}`,
      targetView: 'timeline',
      targetId: war.id,
      targetYear: war.startYear,
      coords: war.coords,
      keywords: [war.name, ...war.aliases, ...war.belligerents, ...war.commanders, war.locationName],
    });
  }

  for (const trade of EXPANDED_TRADE_NETWORKS) {
    items.push({
      id: `trade-${trade.id}`,
      entityType: 'trade',
      title: trade.name,
      subtitle: `${formatHistoricalYear(trade.activeFrom, lang)} – ${formatHistoricalYear(trade.activeTo, lang)} · ${trade.commodities.slice(0, 3).join(', ')}`,
      targetView: 'timeline',
      targetId: trade.id,
      targetYear: Math.round((trade.activeFrom + trade.activeTo) / 2),
      coords: trade.points[0],
      keywords: [trade.name, ...trade.aliases, ...trade.commodities, ...trade.keyHubs],
    });
  }

  for (const vid of INTERNET_VIDEOS) {
    items.push({
      id: `video-${vid.id}`,
      entityType: 'video',
      title: vid.title,
      subtitle: `${vid.channel} · ${vid.yearLabel} · ${vid.duration}`,
      targetView: 'timeline',
      targetId: vid.id,
      targetYear: vid.targetYear,
      coords: vid.coords,
      keywords: [vid.title, vid.channel, vid.topic, ...vid.keywords],
    });
  }

  for (const site of HISTORICAL_SITES) {
    items.push({
      id: `site-${site.id}`,
      entityType: 'site',
      title: localize(site.name, lang),
      subtitle: `${formatHistoricalYear(site.foundedYear, lang)} · ${site.category}`,
      targetView: 'explore',
      targetId: site.id,
      targetYear: Math.max(site.foundedYear, -3500),
      coords: site.coords,
      keywords: [...Object.values(site.name), ...site.aliases],
    });
  }

  for (const ev of TIMELINE_EVENTS) {
    items.push({
      id: `event-${ev.id}`,
      entityType: 'event',
      title: localize(ev.title, lang),
      subtitle: `${formatHistoricalYear(ev.year, lang)} · ${ev.locationName}`,
      targetView: 'timeline',
      targetId: ev.id,
      targetYear: ev.year,
      coords: ev.coords,
      keywords: [...Object.values(ev.title), ...ev.aliases, ev.locationName, ev.rulerOrKeyFigure ?? ''],
    });
  }

  for (const body of SOLAR_SYSTEM_BODIES) {
    items.push({
      id: `planet-${body.id}`,
      entityType: 'planet',
      title: localize(body.name, lang),
      subtitle: `${body.type} · ${body.orbitDistanceAU} AU · ${body.spaceMissions.map((m) => m.name).join(', ')}`,
      targetView: 'solar-system',
      targetId: body.id,
      keywords: [
        ...Object.values(body.name),
        ...body.aliases,
        ...body.astronomers,
        ...body.spaceMissions.map((m) => m.name),
      ],
    });
  }

  return items;
}

export function searchMultilingual(
  query: string,
  lang: LanguageCode,
  limit = 16
): SearchResultItem[] {
  const index = buildSearchIndex(lang);
  const rawTrimmed = query.trim();
  if (!rawTrimmed) return index.slice(0, limit);

  const normQuery = normalizeSearchText(rawTrimmed);
  const scored: Array<{ item: SearchResultItem; score: number }> = [];

  for (const item of index) {
    const normTitle = normalizeSearchText(item.title);
    let bestScore = 0;
    let matchedAlias: string | undefined;

    if (normTitle === normQuery) bestScore = 100;
    else if (normTitle.startsWith(normQuery)) bestScore = 88;
    else if (normTitle.includes(normQuery)) bestScore = 72;

    for (const kw of item.keywords) {
      if (!kw) continue;
      const normKw = normalizeSearchText(kw);
      if (kw.toLowerCase().includes(rawTrimmed.toLowerCase()) || normKw === normQuery) {
        if (95 > bestScore) {
          bestScore = 95;
          matchedAlias = kw;
        }
      } else if (normKw.startsWith(normQuery)) {
        if (82 > bestScore) {
          bestScore = 82;
          matchedAlias = kw;
        }
      } else if (normKw.includes(normQuery)) {
        if (68 > bestScore) {
          bestScore = 68;
          matchedAlias = kw;
        }
      } else if (normQuery.length >= 4) {
        const tokens = normKw.split(/\s+/);
        for (const tok of tokens) {
          if (Math.abs(tok.length - normQuery.length) <= 2) {
            const dist = levenshtein(normQuery, tok);
            if (dist <= 2) {
              const fuzzyScore = dist === 1 ? 58 : 42;
              if (fuzzyScore > bestScore) {
                bestScore = fuzzyScore;
                matchedAlias = kw;
              }
            }
          }
        }
      }
    }

    if (bestScore > 0) {
      scored.push({
        item: matchedAlias && matchedAlias !== item.title ? { ...item, matchedAlias } : item,
        score: bestScore,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}

export const POPULAR_SEARCH_TERMS = [
  'Istanbul',
  'Constantinople',
  'القسطنطينية',
  'Türkiye',
  'United States',
  'Silk Road',
  'Kadesh',
  'World War II',
  'Atatürk',
  'Saturn',
];
