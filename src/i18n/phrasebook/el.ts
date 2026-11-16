import { registerPhrases } from './index';

/** Greek phrasebook. Keys are the English source strings. */
export const EL_PHRASES: Record<string, string> = {};

registerPhrases('el', EL_PHRASES);
