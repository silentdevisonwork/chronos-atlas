/**
 * Phrase translation entry point. Importing this module registers every locale
 * phrasebook as a side effect, so `tp(lang, 'literal')` just works.
 */
import './phrasebook/ar';
import './phrasebook/de';
import './phrasebook/fr';
import './phrasebook/es';
import './phrasebook/it';
import './phrasebook/pt';
import './phrasebook/ru';
import './phrasebook/zh';
import './phrasebook/ja';
import './phrasebook/ko';
import './phrasebook/hi';
import './phrasebook/ur';
import './phrasebook/fa';
import './phrasebook/el';
import './phrasebook/nl';
import './phrasebook/pl';
import './phrasebook/id';
import './phrasebook/sw';

export { tp, num, list, hasPhrases } from './phrasebook';
