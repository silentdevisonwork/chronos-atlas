import { parseFigureRows } from './figureRow';

/**
 * Late additions that keep the figure total at exactly 1000 after deduplication.
 */
const ROWS = `
cassius-dio|Cassius Dio|Cassius Dio|155|235|artist|Roman historian and senator|Romalı tarihçi ve senatör|41.9|12.5|Roman Empire||Wrote a Greek history of Rome from its founding to the third century.|Roma'nın kuruluşundan üçüncü yüzyıla uzanan Yunanca tarihini yazdı.|Roman History in eighty books;Consular and senatorial career
pope-sylvester-ii|Pope Sylvester II|Papa II. Sylvester|946|1003|scientist|Scholar, mathematician and pope|Bilgin, matematikçi ve papa|44.93|2.44|Kingdom of France||Gerbert of Aurillac reintroduced Hindu-Arabic numerals and the abacus to Latin Europe.|Aurillac'lı Gerbert, Hint-Arap rakamlarını ve abaküsü Latin Avrupa'ya yeniden tanıttı.|Promoted Hindu-Arabic numerals;Teaching of the quadrivium
nicolaus-cusanus|Nicolaus Cusanus|Nikolaus von Kues|1401|1464|philosopher|Cardinal, philosopher and astronomer|Kardinal, filozof ve astronom|49.9|6.9|Holy Roman Empire||Argued for learned ignorance and the infinity of the universe, anticipating later cosmology.|Öğrenilmiş cehaleti ve evrenin sonsuzluğunu savunarak sonraki kozmolojiyi önceledi.|De docta ignorantia;Early infinite-universe cosmology
`.trim();

export const FIGURES_500F = parseFigureRows(ROWS);
