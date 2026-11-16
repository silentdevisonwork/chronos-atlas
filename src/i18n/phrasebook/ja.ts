import { registerPhrases } from './index';

/** Japanese phrasebook. Keys are the English source strings. */
export const JA_PHRASES: Record<string, string> = {};

registerPhrases('ja', JA_PHRASES);
