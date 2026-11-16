import type { Civilization } from '../types';
import { ARCHIVAL_MEDIA, PLACE_PHOTOS } from './media';

/**
 * Compact civilization row parser used by the expanded 200-entry archive.
 *
 * Row format (pipe delimited, one civilization per line):
 * id|en|tr|region|start|end|peak|capital|lat|lng|radius|color|media|summaryEn|summaryTr|
 * rulers|languages|beliefs|landmark|inventions|modernCountries|verifiedFact
 *
 * List fields use ";" as separator. Years are negative for BCE.
 */
const FIELDS = 22;

const split = (value: string | undefined) =>
  (value ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

const yearLabel = (year: number, lang: 'en' | 'tr') => {
  const abs = Math.abs(year);
  if (lang === 'tr') return year < 0 ? `MÖ ${abs}` : `MS ${abs}`;
  return year < 0 ? `${abs} BCE` : `${abs} CE`;
};

export function parseCivilizationRows(rows: string): Civilization[] {
  const media = { ...ARCHIVAL_MEDIA, ...PLACE_PHOTOS } as Record<
    string,
    { src: string; attribution: string }
  >;

  return rows
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const cells = line.split('|');
      if (cells.length < FIELDS) {
        console.warn(
          `[chronos] Skipping malformed civilization row (${cells.length}/${FIELDS} fields):`,
          cells[0]
        );
        return null;
      }

      const [
        id,
        en,
        tr,
        region,
        start,
        end,
        peak,
        capital,
        lat,
        lng,
        radius,
        color,
        mediaKey,
        summaryEn,
        summaryTr,
        rulers,
        languages,
        beliefs,
        landmark,
        inventions,
        modern,
        fact,
      ] = cells;

      const startYear = Number(start);
      const endYear = Number(end);
      const peakYear = Number(peak);
      const coords = { lat: Number(lat), lng: Number(lng) };
      const source = media[mediaKey] ?? ARCHIVAL_MEDIA.alexandriaHero;

      return {
        id,
        name: { en, tr },
        aliases: [en, tr, capital, region],
        eraLabel: {
          en: `${yearLabel(startYear, 'en')} – ${yearLabel(endYear, 'en')}`,
          tr: `${yearLabel(startYear, 'tr')} – ${yearLabel(endYear, 'tr')}`,
        },
        startYear,
        endYear,
        peakYear,
        capital: {
          name: { en: capital, tr: capital },
          aliases: [capital],
          coords,
        },
        territoryRegions: [{ center: coords, radiusDeg: Number(radius) || 3 }],
        color,
        summary: { en: summaryEn, tr: summaryTr },
        origins: {
          en: `Attested around ${capital} in the ${yearLabel(startYear, 'en')} horizon and consolidated through the ${yearLabel(peakYear, 'en')} peak.`,
          tr: `${capital} çevresinde ${yearLabel(startYear, 'tr')} ufkunda belirdi ve ${yearLabel(peakYear, 'tr')} zirvesinde kurumsallaştı.`,
        },
        rulers: split(rulers),
        languages: split(languages),
        beliefSystems: split(beliefs),
        architecture: split(landmark),
        inventions: split(inventions),
        majorWars: [`Regional conflicts of the ${region} world`],
        predecessors: [],
        successors: [],
        modernCountries: split(modern),
        verifiedFacts: [fact],
        interpretations: [
          'Chronology, territorial extent and internal organisation are refined by ongoing archaeological and textual research.',
        ],
        image: source.src,
        imageAttribution: 'Representative regional image: ' + source.attribution,
        region,
      } as Civilization;
    })
    .filter((civ): civ is Civilization => civ !== null);
}
