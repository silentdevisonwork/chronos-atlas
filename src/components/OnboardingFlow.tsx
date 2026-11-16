import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Compass, Globe2, History, Languages, Moon, Orbit, Sparkles, Sun } from 'lucide-react';
import { ARCHIVAL_MEDIA } from '../data/media';
import { SUPPORTED_LANGUAGES, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import { MagneticButton } from './ui/DesignPrimitives';

const EASE = [0.23, 1, 0.32, 1] as const;
const STEPS = [
  { id: 'earth', icon: Globe2, title: 'Explore Earth’s Living History', subtitle: 'Rotate an interactive 3D globe, click any modern country or ancient city, and uncover millennia of human heritage.', image: ARCHIVAL_MEDIA.alexandriaHero.src },
  { id: 'time', icon: History, title: 'Travel Through Historical Years', subtitle: 'Scrub from 9600 BCE Göbekli Tepe to 2026 CE and watch empires rise, trade routes connect, and borders transform.', image: ARCHIVAL_MEDIA.babylonGate.src },
  { id: 'civilizations', icon: Compass, title: 'Countries & Ancestor Civilizations', subtitle: 'Distinguish territorial succession from political continuity—from Hittites, Byzantium, and Ottomans to Türkiye, Egypt, Rome, and China.', image: ARCHIVAL_MEDIA.constantinople.src },
  { id: 'solar', icon: Orbit, title: 'Navigate the 3D Solar System', subtitle: 'Inspect planets, dwarf worlds, moons, historical astronomers, and robotic space missions with real astronomical telemetry.', image: ARCHIVAL_MEDIA.deepSpace.src },
  { id: 'personalize', icon: Sparkles, title: 'Choose Your Language & Observatory Theme', subtitle: 'Switch seamlessly among 20 languages (including Turkish & RTL Arabic/Urdu/Persian) and light or dark surfaces.', image: ARCHIVAL_MEDIA.gizaPlateau.src },
];

// Word-by-word blur-in headline (React Bits "Blur Text")
const Words = ({ text }: { text: string }) => (
  <>{text.split(' ').map((w, i) => (
    <motion.span key={w + i} className="inline-block me-[.25em]" initial={{ opacity: 0, y: 18, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.6, delay: 0.05 * i, ease: EASE }}>{w}</motion.span>
  ))}</>
);

export function OnboardingFlow() {
  const completed = useAtlasStore((s) => s.progress.onboardingCompleted);
  const completeOnboarding = useAtlasStore((s) => s.completeOnboarding);
  const language = useAtlasStore((s) => s.progress.preferences.language);
  const theme = useAtlasStore((s) => s.progress.preferences.theme);
  const setLanguage = useAtlasStore((s) => s.setLanguage);
  const setTheme = useAtlasStore((s) => s.setTheme);
  const setAuthModalOpen = useAtlasStore((s) => s.setAuthModalOpen);
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;

  useEffect(() => {
    if (completed) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, [completed]);

  if (completed) return null;
  const step = STEPS[i];
  const Icon = step.icon;
  const pill = 'spatial-glass tactile-press flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold text-white cursor-pointer';

  return (
    <div role="dialog" aria-modal="true" aria-label="Chronos Atlas Introduction" className="dark fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <AnimatePresence>
        <motion.img key={step.id} src={step.image} alt="" referrerPolicy="no-referrer" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 0.6, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: EASE }} className="absolute inset-0 h-full w-full object-cover" />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/30" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
        <span className="font-display text-lg font-bold tracking-tight">Chronos Atlas</span>
        <div className="flex items-center gap-2">
          <label className={`${pill} relative`}>
            <Languages className="h-4 w-4" />
            <select aria-label={t(language, 'language')} value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className="max-w-[110px] cursor-pointer appearance-none bg-transparent pe-1 outline-none [&>option]:text-black">
              {SUPPORTED_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
            </select>
          </label>
          <button type="button" aria-label={theme === 'dark' ? t(language, 'themeLight') : t(language, 'themeDark')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`${pill} w-10 justify-center px-0`}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => completeOnboarding()} className={`${pill} tracking-wide`}>{t(language, 'skip')}</button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-10">
        <motion.div key={step.id} className="mb-10 space-y-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 shadow-[0_10px_30px_-8px_rgba(150,150,158,.9)]"><Icon className="h-6 w-6" /></div>
          <h2 className="max-w-4xl text-balance font-display text-[clamp(2.25rem,7vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.045em]"><Words text={step.title} /></h2>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: EASE }} className="max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">{step.subtitle}</motion.p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={i + 1}>
            {STEPS.map((s, n) => (
              <button key={s.id} type="button" aria-label={`Go to step ${n + 1}`} onClick={() => setI(n)} className="grid h-6 cursor-pointer place-items-center">
                <motion.span layout animate={{ width: n === i ? 32 : 8, opacity: n === i ? 1 : 0.35 }} transition={{ type: 'spring', stiffness: 500, damping: 36 }} className="block h-2 rounded-full bg-white" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <MagneticButton variant="glass" size="lg" disabled={i === 0} onClick={() => setI((n) => Math.max(0, n - 1))} className={i === 0 ? 'opacity-0 pointer-events-none !text-white' : '!text-white'}>
              <ArrowLeft className="h-4 w-4" />{t(language, 'back')}
            </MagneticButton>
            {last && <MagneticButton variant="glass" size="lg" className="!text-white" onClick={() => { completeOnboarding(); setAuthModalOpen(true); }}>{t(language, 'signInGoogle')}</MagneticButton>}
            {last
              ? <MagneticButton variant="primary" size="lg" onClick={() => completeOnboarding()}><Check className="h-4 w-4" />{t(language, 'getStarted')}</MagneticButton>
              : <MagneticButton variant="primary" size="lg" onClick={() => setI((n) => n + 1)}>{t(language, 'continue')}<ArrowRight className="h-4 w-4" /></MagneticButton>}
          </div>
        </div>
      </div>
    </div>
  );
}
