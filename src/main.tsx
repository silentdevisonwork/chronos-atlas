import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installAutoTranslate } from './i18n/autoTranslate';
import { initialLanguage } from './i18n/detect';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Localize every visible word into the detected (or chosen) language.
installAutoTranslate(initialLanguage());
