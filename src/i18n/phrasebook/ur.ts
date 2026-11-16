import { registerPhrases } from './index';

/** Urdu phrasebook. Keys are the English source strings. */
export const UR_PHRASES: Record<string, string> = {};

registerPhrases('ur', UR_PHRASES);
