import { HoverBorderGradient } from '../components/ui/VendoredUI';
import {
  ArrowRight,
  Clock3,
  Compass,
  Film,
  Play,
  Globe2,
  GraduationCap,
  History,
  Layers,
  Sparkles,
  Swords,
  TrendingUp,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import { Tabs } from '@base-ui/react/tabs';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { DocumentaryVideoPlayer } from '../components/DocumentaryVideoPlayer';
import { InternetVideoTheater } from '../components/InternetVideoTheater';
import { GlassOrb } from '../components/liquid/GlassOrb';
import { Monument3DStudio } from '../components/Monument3DStudio';
import {
  AnimatedNumber,
  BlurReveal,
  BorderBeamFrame,
  MagneticButton,
} from '../components/ui/DesignPrimitives';
import {
  ArchivalMediaLightbox,
  KineticArchiveStrip,
  PerspectiveCardDeck3D,
  SpatialTiltCard,
} from '../components/ui/HardcorePrimitives';
import { CIVILIZATIONS } from '../data/civilizations';
import { COUNTRY_CHRONICLES } from '../data/countries';
import { HISTORICAL_FIGURES } from '../data/figures';
import { INTERNET_VIDEOS } from '../data/internetVideos';
import {
  EXHIBITION_PLATES,
  type ExhibitionPlate,
  type MonumentPresetId,
} from '../data/media';
import { SOLAR_SYSTEM_BODIES } from '../data/solarSystem';
import { TIMELINE_EVENTS } from '../data/timeline';
import { MAJOR_WARS_AND_BATTLES, EXPANDED_TRADE_NETWORKS } from '../data/warsAndTrade';
import { formatHistoricalYear, localize, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import { getWorldCountries } from '../utils/worldGeo';

const EASE = [0.23, 1, 0.32, 1] as const;

/* Magic UI "Marquee": infinite, pauses on hover */
function Marquee({ children }: { children: ReactNode }) {
  const track = 'flex shrink-0 items-center gap-14 pe-14 animate-[marquee_45s_linear_infinite] group-hover:[animation-play-state:paused]';
  return (
    <div className="group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
      <div className={track}>{children}</div>
      <div aria-hidden="true" className={track}>{children}</div>
    </div>
  );
}

/* Centered chapter heading: one idea per band, Apple product-page rhythm */
function Chapter({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center space-y-3">
      <h2 className="font-display text-4xl sm:text-6xl font-extrabold tracking-[-0.04em] text-neutral-950 dark:text-slate-50">{title}</h2>
      {sub && <p className="text-base sm:text-lg text-neutral-600 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function HomeDiscoverView({ mode }: { mode: 'home' | 'discover' }) {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const setView = useAtlasStore((s) => s.setView);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setSelectedPlanetId = useAtlasStore((s) => s.setSelectedPlanetId);
  const setSearchOpen = useAtlasStore((s) => s.setSearchOpen);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const setPlaying = useAtlasStore((s) => s.setTimelinePlaying);

  const [activePlate, setActivePlate] = useState<ExhibitionPlate | null>(null);
  const [studioPreset, setStudioPreset] = useState<MonumentPresetId>('dome-basilica');
  const [tab, setTab] = useState('theater');

  const worldCountryCount = getWorldCountries().length;

  const jumpToPlateOnGlobe = (plate: ExhibitionPlate) => {
    setSelectedYear(plate.year);
    setFlyToCoords(plate.coords);
    if (plate.inspectorTarget) setInspector({ ...plate.inspectorTarget, coords: plate.coords });
    setView('explore');
  };

  const featuredDossier = EXHIBITION_PLATES.find((p) => p.monumentPreset === studioPreset) ?? EXHIBITION_PLATES[0];

  /* Chronicle of the day — deterministic per calendar day, so it feels curated. */
  const dayIndex = Math.floor(
    (Date.now() - Date.UTC(2026, 0, 1)) / 86_400_000
  );
  const dailyEvent = TIMELINE_EVENTS[Math.abs(dayIndex) % TIMELINE_EVENTS.length];
  const dailyFigure = HISTORICAL_FIGURES[Math.abs(dayIndex * 7 + 3) % HISTORICAL_FIGURES.length];


  const STATS: Array<[number, string, string]> = [
    [worldCountryCount, '+', 'Countries & GDP'],
    [CIVILIZATIONS.length, '', 'Civilizations'],
    [TIMELINE_EVENTS.length, '', 'Verified Moments'],
    [HISTORICAL_FIGURES.length, '', 'Key Figures'],
    [MAJOR_WARS_AND_BATTLES.length, '', 'Wars & Battles'],
    [EXPANDED_TRADE_NETWORKS.length, '', 'Trade Routes'],
    [INTERNET_VIDEOS.length, '', 'Videos'],
  ];

  /* Asymmetric bento: spans on a 6-column grid */
  const PORTALS: Array<{ icon: LucideIcon; title: string; text: string; span: string; onClick: () => void }> = [
    { icon: History, title: 'Constantinople · 1453 CE', text: 'Jump the 3D Globe directly to the Bosphorus at the dawn of Ottoman Istanbul.', span: 'md:col-span-4 md:row-span-2 min-h-[300px]',
      onClick: () => { setSelectedYear(1453); setFlyToCoords({ lat: 41.0082, lng: 28.9784 }); setInspector({ type: 'site', id: 'site-istanbul' }); setView('explore'); } },
    { icon: TrendingUp, title: `All ${worldCountryCount}+ Countries & World GDP`, text: 'Compare nominal GDP, GDP/capita, population, exports, and ancestor empires across every sovereign nation.', span: 'md:col-span-2', onClick: () => setView('countries') },
    { icon: Swords, title: 'Liquid Timeline · 17,000 Years', text: `Zoom through ${CIVILIZATIONS.length} lifespans, compare empires side by side, and replay ${MAJOR_WARS_AND_BATTLES.length} wars across ${EXPANDED_TRADE_NETWORKS.length} trade arteries.`, span: 'md:col-span-2', onClick: () => setView('timeline') },
    { icon: Compass, title: `Giza Plateau · ${formatHistoricalYear(-2560, lang)}`, text: 'Examine Old Kingdom Nile engineering and early solar calendars.', span: 'md:col-span-2',
      onClick: () => { setSelectedYear(-2560); setFlyToCoords({ lat: 29.9792, lng: 31.1342 }); setInspector({ type: 'site', id: 'site-giza' }); setView('explore'); } },
    { icon: Sparkles, title: `Solar System (${SOLAR_SYSTEM_BODIES.length} Bodies)`, text: 'Tour Saturn’s 3D ice rings, orbiting 3D probe, and planetary science.', span: 'md:col-span-2', onClick: () => { setSelectedPlanetId('saturn'); setView('solar-system'); } },
    { icon: GraduationCap, title: 'Interactive Academy', text: 'Test your mastery of world history and astronomy and unlock scholar badges.', span: 'md:col-span-2', onClick: () => setView('learning') },
  ];

  const TABS: Array<[string, string, LucideIcon]> = [['theater', 'Theater', Tv], ['monuments', 'Monuments', Layers], ['reels', 'Reels', Film]];

  const EPOCHS: Array<{ label: string; span: string; year: number; color: string; blurb: string }> = [
    { label: 'Prehistory', span: '15,000 – 3,300 BCE', year: -6500, color: '#d97706', blurb: 'First temples, cities and writing.' },
    { label: 'Ancient', span: '3,300 – 800 BCE', year: -1274, color: '#ea580c', blurb: 'Empires of bronze and iron.' },
    { label: 'Classical', span: '800 BCE – 500 CE', year: 117, color: '#0d9488', blurb: 'Silk Roads and classical worlds.' },
    { label: 'Medieval', span: '500 – 1450 CE', year: 1000, color: '#4f46e5', blurb: 'Caliphates, dynasties, cathedrals.' },
    { label: 'Early Modern', span: '1450 – 1800 CE', year: 1600, color: '#9333ea', blurb: 'Oceans crossed, empires remade.' },
    { label: 'Modern', span: '1800 – 2026 CE', year: 1969, color: '#0284c7', blurb: 'Industry, world war, the Moon.' },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 pb-28">
        {/* 1 · Hero: refracted glass orb + editorial statement */}
        <section className="relative pt-10 sm:pt-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] liquid-mesh opacity-70 blur-3xl dark:opacity-50" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
            <div className="relative z-10 text-start">
              <BlurReveal>
                <div className="spatial-glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-wide text-neutral-700 dark:text-slate-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0a84ff] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0a84ff]" />
                  </span>
                  {mode === 'home' ? '3D observatory · 2026 edition' : 'Curated exhibitions & discoveries'}
                </div>
              </BlurReveal>
              <BlurReveal delay={0.05}>
                <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(2.8rem,6.6vw,5.7rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-neutral-950 dark:text-slate-50">
                  Every civilization.
                  <br />
                  <span className="text-iridescent">Every century.</span>
                  <br />
                  One liquid surface.
                </h1>
              </BlurReveal>
              <BlurReveal delay={0.1}>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-slate-300">
                  {CIVILIZATIONS.length} civilizational lifespans, {HISTORICAL_FIGURES.length} historical figures and seventeen millennia of evidence, rendered as a single zoomable, glass object. Inspect GDP, trade arteries, wars, monuments and the Solar System without ever leaving the surface.
                </p>
              </BlurReveal>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <HoverBorderGradient onClick={() => setView('explore')}><Globe2 className="h-4 w-4" />Launch 3D Globe</HoverBorderGradient>
                <MagneticButton variant="glass" size="lg" onClick={() => setView('timeline')}><Play className="h-4 w-4" />Enter Liquid Timeline</MagneticButton>
                <MagneticButton variant="ghost" size="lg" onClick={() => setSearchOpen(true)}>Search 20 Languages</MagneticButton>
                <MagneticButton
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    const f = HISTORICAL_FIGURES[Math.floor(Math.random() * HISTORICAL_FIGURES.length)];
                    setSelectedYear(f.bornYear);
                    setView('timeline');
                  }}
                >
                  <Sparkles className="h-4 w-4" />Surprise me
                </MagneticButton>
              </div>
              <div className="relative mx-auto mt-4 h-[240px] w-[240px] pointer-parallax-soft lg:hidden">
                <GlassOrb className="absolute inset-0" intensity={0.95} />
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                {[
                  [`${CIVILIZATIONS.length}`, 'civilizations'],
                  [`${TIMELINE_EVENTS.length}`, 'verified moments'],
                  ['17,000', 'years of depth'],
                  ['20', 'languages'],
                ].map(([value, label]) => (
                  <div key={label} className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold tracking-tight text-neutral-950 dark:text-white">{value}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500 dark:text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden min-h-[520px] pointer-parallax-soft lg:block">
              <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(10,132,255,0.18),transparent_64%)] blur-2xl" />
              <div className="orbit-ring inset-[4%]" />
              <div className="orbit-ring orbit-ring--slow inset-[12%]" />
              <div className="orbit-ring inset-[22%] opacity-70" />
              <GlassOrb className="absolute inset-0" intensity={1.02} />
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
                className="glass-surface absolute inset-x-6 bottom-2 flex items-center gap-3 rounded-2xl p-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(true);
                    setView('timeline');
                  }}
                  aria-label="Open the timeline and play time"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0a84ff] text-white shadow-[0_10px_24px_-10px_rgba(10,132,255,.9)] transition hover:scale-105 active:scale-95"
                >
                  <Play className="h-4 w-4 translate-x-[1px] fill-current" />
                </button>
                <div className="min-w-0 flex-1 leading-none">
                  <div className="font-mono-tabular text-lg font-bold tracking-tight text-neutral-950 dark:text-white">
                    {formatHistoricalYear(selectedYear, lang)}
                  </div>
                  <div className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-slate-400">
                    Chronos playhead · open timeline
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView('timeline')}
                  className="liquid-button h-8 shrink-0 px-3 text-[11px] font-semibold"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </button>
              </motion.div>
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <span className="rounded-full border border-white/40 bg-white/25 px-3 py-1 font-mono-tabular text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/[.05] dark:text-slate-300">
                  WebGL · real-time refraction
                </span>
              </div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.25, ease: EASE }} className="mx-auto mt-14 max-w-5xl text-start sm:mt-20">
            <BorderBeamFrame>
              <div className="p-2 sm:p-3">
                <PerspectiveCardDeck3D plates={EXHIBITION_PLATES} onInspectPlate={(p) => setActivePlate(p)} onJumpToPlate={jumpToPlateOnGlobe} />
              </div>
            </BorderBeamFrame>
          </motion.div>
        </section>

        {/* 2 · Stats ticker */}
        <section aria-label="Atlas at a glance" className="mt-20 border-y border-neutral-200/70 py-7 dark:border-white/10">
          <Marquee>
            {STATS.map(([n, suffix, label]) => (
              <div key={label} className="flex items-baseline gap-3 whitespace-nowrap">
                <span className="font-display text-4xl font-bold tracking-tight text-neutral-950 dark:text-white"><AnimatedNumber value={n} suffix={suffix} /></span>
                <span className="text-sm text-neutral-500 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </Marquee>
        </section>

        {/* 2a · Chronicle of the day + figure spotlight */}
        <section className="mt-20 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <div className="rise-in relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0a1224] via-[#0c1830] to-[#101a3a] p-7 text-slate-100 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#0a84ff]/25 blur-3xl" />
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
              <Clock3 className="h-3 w-3" /> Chronicle of the day
            </div>
            <div className="mt-4 font-mono-tabular text-sm text-sky-200/80">
              {formatHistoricalYear(dailyEvent.year, lang)} · {dailyEvent.locationName}
            </div>
            <h3 className="mt-2 max-w-[26ch] font-display text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              {localize(dailyEvent.title, lang)}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {localize(dailyEvent.summary, lang)}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => { setSelectedYear(dailyEvent.year); setView('timeline'); }}
                className="liquid-button h-10 px-5 text-xs font-semibold"
              >
                Open in the timeline <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] text-slate-400">{dailyEvent.verifiedFact}</span>
            </div>
          </div>

          <div className="rise-in rise-in-2 relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 text-slate-100 backdrop-blur-xl">
            <div className="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">Figure of the day</div>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">{localize(dailyFigure.name, lang)}</h3>
            <div className="mt-1 font-mono-tabular text-xs text-slate-400">
              {formatHistoricalYear(dailyFigure.bornYear, lang)} – {formatHistoricalYear(dailyFigure.diedYear, lang)}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{localize(dailyFigure.role, lang)}</p>
            <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-400">{localize(dailyFigure.summary, lang)}</p>
            <button
              type="button"
              onClick={() => { setSelectedYear(dailyFigure.bornYear); setView('timeline'); }}
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-sky-300 transition hover:text-sky-200"
            >
              Travel to their century <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* 2b · Deep time rail */}
        <section className="mt-16 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-slate-400">
                <Clock3 className="h-3 w-3" /> Choose an epoch
              </div>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Enter at any horizon</h2>
            </div>
            <button type="button" onClick={() => setView('timeline')} className="liquid-button h-9 px-4 text-xs font-semibold">
              Open full timeline <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {EPOCHS.map((epoch, index) => (
              <motion.button
                key={epoch.label}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: index * 0.04, duration: 0.45, ease: EASE }}
                whileHover={{ y: -4 }}
                onClick={() => { setSelectedYear(epoch.year); setView('timeline'); }}
                className="liquid-card group relative overflow-hidden rounded-2xl p-4 text-start"
              >
                <span className="absolute inset-x-0 top-0 h-0.5 opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${epoch.color}, transparent)` }} />
                <span className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50" style={{ backgroundColor: epoch.color }} />
                <div className="font-mono-tabular text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-slate-400">{epoch.span}</div>
                <div className="mt-2 font-display text-lg font-bold tracking-tight" style={{ color: epoch.color }}>{epoch.label}</div>
                <div className="mt-1 text-[10.5px] leading-relaxed text-neutral-600 dark:text-slate-400">{epoch.blurb}</div>
                <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-neutral-500 transition-colors group-hover:text-neutral-900 dark:text-slate-400 dark:group-hover:text-white">
                  Jump in <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* 3 · Bento portals */}
        <section className="mt-28 space-y-10">
          <Chapter title="Start anywhere in time" sub="Direct portals into the globe, the economy, and the cosmos." />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            {PORTALS.map(({ icon: Icon, title, text, span, onClick }, i) => (
              <div key={title} className={span}>
                <SpatialTiltCard className="h-full p-6" onClick={onClick}>
                  <div className={`flex h-full flex-col justify-between gap-8 ${i === 0 ? 'md:gap-24' : ''}`}>
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400"><Icon className="h-5 w-5" /></div>
                    <div className="space-y-2">
                      <div className={`font-display font-bold tracking-tight text-neutral-950 dark:text-slate-50 ${i === 0 ? 'text-3xl sm:text-4xl' : 'text-lg'}`}>{title}</div>
                      <p className={`leading-relaxed text-neutral-600 dark:text-slate-400 ${i === 0 ? 'max-w-md text-base' : 'text-sm'}`}>{text}</p>
                    </div>
                  </div>
                </SpatialTiltCard>
              </div>
            ))}
          </div>
        </section>

        {/* 4 · Tabbed studio (Base UI): one heavy surface mounted at a time */}
        <section className="mt-28 space-y-10">
          <Chapter title="Watch. Rotate. Inspect." sub="Documentary streams, a 3D monument chamber, and synchronized reels." />
          <Tabs.Root value={tab} onValueChange={(v) => setTab(String(v))}>
            <Tabs.List className="spatial-glass mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full p-1">
              {TABS.map(([v, label, Icon]) => (
                <Tabs.Tab key={v} value={v} className={`relative flex h-10 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${tab === v ? 'text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-slate-300 dark:hover:text-white'}`}>
                  {tab === v && <motion.span layoutId="studio-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-blue-600 shadow-[0_8px_20px_-8px_rgba(150,150,158,.9)]" />}
                  <span className="relative flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="theater" className="mt-8 outline-none"><InternetVideoTheater /></Tabs.Panel>
            <Tabs.Panel value="monuments" className="mt-8 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <BorderBeamFrame className="h-full">
                <div className="p-1.5 h-full">
                  <Monument3DStudio
                    preset={studioPreset}
                    onPresetChange={setStudioPreset}
                    onInspectPlate={(plate) => setActivePlate(plate)}
                    heightClass="h-[480px]"
                  />
                </div>
              </BorderBeamFrame>
            </div>

            {/* Adjacent Architectural & Historical Dossier */}
            <div className="lg:col-span-4 flex flex-col justify-between spatial-card rounded-2xl p-5 space-y-4">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setActivePlate(featuredDossier)}
                  className="group relative block w-full overflow-hidden rounded-xl border border-neutral-200/80 dark:border-slate-800/80 cursor-pointer text-left"
                >
                  <img
                    src={featuredDossier.src}
                    alt={featuredDossier.title}
                    referrerPolicy="no-referrer"
                    className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono-tabular text-blue-300">
                    <span>{featuredDossier.accessionId}</span>
                    <span>Click to zoom</span>
                  </div>
                </button>

                <div>
                  <div className="text-[11px] font-mono-tabular text-blue-700 dark:text-blue-400">
                    {featuredDossier.yearLabel} · {featuredDossier.region}
                  </div>
                  <h3 className="font-display text-xl font-bold text-neutral-950 dark:text-slate-50 mt-0.5">
                    {featuredDossier.title}
                  </h3>
                </div>

                <p className="text-xs text-neutral-600 dark:text-slate-300 leading-relaxed">
                  {featuredDossier.summary}
                </p>

                <dl className="space-y-2 border-t border-neutral-200/80 dark:border-slate-800/80 pt-3 text-xs">
                  <div>
                    <dt className="text-neutral-500 dark:text-slate-400">Structural Dimensions</dt>
                    <dd className="font-mono-tabular font-medium text-neutral-900 dark:text-slate-100">
                      {featuredDossier.dimensions}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-slate-400">Primary Historical Evidence</dt>
                    <dd className="font-medium text-neutral-900 dark:text-slate-100">
                      {featuredDossier.primarySource}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                type="button"
                onClick={() => jumpToPlateOnGlobe(featuredDossier)}
                className="tactile-press w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Fly 3D Globe to {featuredDossier.year < 0 ? `${Math.abs(featuredDossier.year)} BCE` : `${featuredDossier.year} CE`}
              </button>
            </div>
          </div>
            </Tabs.Panel>
            <Tabs.Panel value="reels" className="mt-8 outline-none">
              <DocumentaryVideoPlayer
                onSyncChapterTo3D={(ch) => {
                  setSelectedYear(ch.year);
                  setFlyToCoords(ch.coords);
                  setStudioPreset(ch.monumentPreset);
                  setView('explore');
                }}
              />
            </Tabs.Panel>
          </Tabs.Root>
        </section>

        {/* 5 · Archive ribbon */}
        <section className="mt-28 space-y-10">
          <Chapter title="The Archival Vault" sub="Hover to tilt, click to inspect." />
          <KineticArchiveStrip plates={EXHIBITION_PLATES} onSelectPlate={(plate) => setActivePlate(plate)} />
        </section>

        {/* 6 · Featured countries: one lead story + two supporting */}
        <section className="mt-28 space-y-10">
          <Chapter title="Featured Civilizational Crossroads" sub="Territorial succession, ancient capitals, and verified primary evidence." />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-2">
            {COUNTRY_CHRONICLES.slice(0, 3).map((country, i) => (
              <div key={country.id} className={i === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}>
                <SpatialTiltCard className="h-full"
                  onClick={() => { setInspector({ type: 'country', id: country.id, coords: country.coords }); setFlyToCoords(country.coords); setView('countries'); }}>
                  <div className="flex h-full flex-col overflow-hidden">
                    <img src={country.image} alt={localize(country.name, lang)} referrerPolicy="no-referrer" className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${i === 0 ? 'h-72 sm:h-[420px]' : 'h-40'}`} />
                    <div className="space-y-2.5 p-6">
                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-slate-400"><span>{country.region}</span><span aria-hidden="true">·</span><span className="font-mono-tabular">Formed {country.modernFormationYear}</span></div>
                      <h3 className={`font-display font-bold tracking-tight text-neutral-950 dark:text-slate-50 ${i === 0 ? 'text-4xl' : 'text-xl'}`}>{localize(country.name, lang)}</h3>
                      <p className={`leading-relaxed text-neutral-600 dark:text-slate-300 ${i === 0 ? 'line-clamp-4 text-base' : 'line-clamp-2 text-sm'}`}>{localize(country.summary, lang)}</p>
                      <div className="flex items-center gap-1 pt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">Explore {country.empiresAndKingdoms.length} Historical Strata<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></div>
                    </div>
                  </div>
                </SpatialTiltCard>
              </div>
            ))}
          </div>
          <div className="text-center">
            <MagneticButton variant="glass" onClick={() => setView('civilizations')}>All {CIVILIZATIONS.length} Civilizations<ArrowRight className="h-4 w-4" /></MagneticButton>
          </div>
        </section>
      </div>

      <ArchivalMediaLightbox plate={activePlate} onClose={() => setActivePlate(null)} onOpenIn3DGlobe={jumpToPlateOnGlobe} onSelectMonumentPreset={(p) => setStudioPreset(p.monumentPreset)} />
    </div>
  );
}
