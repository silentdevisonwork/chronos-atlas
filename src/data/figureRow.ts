import type { FigureCategory, HistoricalFigure } from '../types';

/**
 * Compact pipe-delimited figure rows.
 *
 * Field order:
 *   id | nameEn | nameTr | born | died | category | roleEn | roleTr | lat | lng |
 *   civilizationOrState | civilizationId | summaryEn | summaryTr | achievements (";"-separated)
 *
 * Negative years are BCE. Empty civilizationId is allowed. Fields must not contain "|".
 */
export function parseFigureRows(rows: string): HistoricalFigure[] {
  return rows
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, en, tr, born, died, cat, roleEn, roleTr, lat, lng, state, civId, sumEn, sumTr, ach] = line.split('|');
      const achievements = (ach ?? '').split(';').map((s) => s.trim()).filter(Boolean);
      return {
        id,
        name: { en, tr },
        aliases: [en, tr],
        bornYear: Number(born),
        diedYear: Number(died),
        category: cat as FigureCategory,
        role: { en: roleEn, tr: roleTr },
        civilizationOrState: state,
        coords: { lat: Number(lat), lng: Number(lng) },
        summary: { en: sumEn, tr: sumTr },
        achievements,
        verifiedFacts: [achievements[0] ? `${en}: ${achievements[0]}.` : sumEn],
        historiographicalNote:
          'Dates and details follow standard reference works; for ancient figures some traditional accounts rest on later sources.',
        ...(civId ? { civilizationId: civId } : {}),
      } satisfies HistoricalFigure;
    });
}
