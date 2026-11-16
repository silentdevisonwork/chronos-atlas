import { registerPhrases } from './index';

/** Russian phrasebook. Keys are the English source strings. */
export const RU_PHRASES: Record<string, string> = {};

registerPhrases('ru', RU_PHRASES);
