import { HeroTitle } from '../components/ui/VendoredUI';
import { Award, CheckCircle2, Globe2, GraduationCap, Moon, RotateCcw, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AppleSwitch,
  SegmentedControl,
  SpotlightCard,
} from '../components/ui/DesignPrimitives';
import { CIVILIZATIONS } from '../data/civilizations';
import { COUNTRY_CHRONICLES } from '../data/countries';
import { ACHIEVEMENTS, LEARNING_LESSONS, QUIZ_QUESTIONS } from '../data/education';
import { HISTORICAL_FIGURES } from '../data/figures';
import { SOLAR_SYSTEM_BODIES } from '../data/solarSystem';
import { SUPPORTED_LANGUAGES, formatHistoricalYear, localize, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import type { GraphicsQuality } from '../types';

export function LearningView() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const completedLessons = useAtlasStore((s) => s.progress.completedLessons);
  const achievements = useAtlasStore((s) => s.progress.achievements);
  const quizScores = useAtlasStore((s) => s.progress.quizScores);
  const recordLessonComplete = useAtlasStore((s) => s.recordLessonComplete);
  const recordQuizScore = useAtlasStore((s) => s.recordQuizScore);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setView = useAtlasStore((s) => s.setView);

  const [activeLessonId, setActiveLessonId] = useState(LEARNING_LESSONS[0].id);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const activeLesson = LEARNING_LESSONS.find((l) => l.id === activeLessonId) ?? LEARNING_LESSONS[0];
  const currentQ = QUIZ_QUESTIONS[quizIndex];

  const handleAnswer = (idx: number) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    if (idx === currentQ.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 >= QUIZ_QUESTIONS.length) {
      const pct = Math.round((correctCount / QUIZ_QUESTIONS.length) * 100);
      recordQuizScore('world-history-core', pct);
      setQuizFinished(true);
      toast.success(`Quiz Complete: ${pct}%`);
    } else {
      setQuizIndex((i) => i + 1);
      setSelectedOpt(null);
    }
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setSelectedOpt(null);
    setCorrectCount(0);
    setQuizFinished(false);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 space-y-14">
      <div className="pt-4 pb-2">
        <HeroTitle>
          {t(lang, 'navLearning')} · Interactive Academy
        </HeroTitle>
        <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-slate-400">
          Structured lessons distinguishing verified facts from scholarly interpretation, plus interactive quizzes and achievements.
        </p>
      </div>

      {/* Lessons Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
            Guided Modules
          </h2>
          {LEARNING_LESSONS.map((lesson) => {
            const done = completedLessons.includes(lesson.id);
            const active = lesson.id === activeLesson.id;
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setActiveLessonId(lesson.id)}
                className={`w-full text-left rounded-2xl p-4 space-y-1 cursor-pointer transition-all ${
                  active
                    ? 'spatial-card border-blue-600/80 ring-1 ring-blue-500/40'
                    : 'spatial-card hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono-tabular text-blue-700 dark:text-blue-400">
                  <span>{lesson.era} · {lesson.durationMinutes} min</span>
                  {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
                <div className="font-semibold text-sm text-neutral-900 dark:text-slate-100">
                  {localize(lesson.title, lang)}
                </div>
              </button>
            );
          })}
        </div>

        <SpotlightCard className="lg:col-span-8 p-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono-tabular text-blue-700 dark:text-blue-400">
                  {activeLesson.era}
                </div>
                <h3 className="font-display text-3xl font-bold mt-1">
                  {localize(activeLesson.title, lang)}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {activeLesson.targetYear !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear(activeLesson.targetYear!);
                      setView('explore');
                    }}
                    className="tactile-press rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3 py-2 text-xs font-medium cursor-pointer flex items-center gap-1.5 hover:border-blue-500/60"
                  >
                    <Globe2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                    Open in 3D Globe
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => recordLessonComplete(activeLesson.id)}
                  className="tactile-press rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  {completedLessons.includes(activeLesson.id)
                    ? t(lang, 'lessonCompleted')
                    : t(lang, 'completeLesson')}
                </button>
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
              {localize(activeLesson.summary, lang)}
            </p>

            <div className="space-y-4">
              {activeLesson.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm text-neutral-900 dark:text-slate-100">
                      {sec.heading}
                    </h4>
                    <span className="text-[11px] font-mono-tabular uppercase text-neutral-500 dark:text-slate-400">
                      {sec.factType === 'verified' ? 'Verified Evidence' : 'Scholarly Synthesis'}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">{sec.body}</p>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      </section>

      {/* Interactive Quiz & Achievements */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <SpotlightCard className="lg:col-span-7 p-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                <h2 className="font-display text-2xl font-bold">Knowledge Challenge</h2>
              </div>
              <span className="font-mono-tabular text-xs text-neutral-500 dark:text-slate-400">
                Best Score: {quizScores['world-history-core'] ?? 0}%
              </span>
            </div>

            {/* Smooth Animated Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-slate-800 overflow-hidden">
              <motion.div
                animate={{
                  width: `${((quizFinished ? QUIZ_QUESTIONS.length : quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-full bg-gradient-to-r from-blue-900 via-blue-700 to-blue-400"
              />
            </div>

            {quizFinished ? (
              <div className="space-y-4 py-4">
                <div className="font-display text-3xl font-bold text-blue-700 dark:text-blue-400">
                  Score: {Math.round((correctCount / QUIZ_QUESTIONS.length) * 100)}% ({correctCount}/
                  {QUIZ_QUESTIONS.length})
                </div>
                <p className="text-sm text-neutral-600 dark:text-slate-300">
                  Your result has been saved to your scholar profile.
                </p>
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="tactile-press rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Retake Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-mono-tabular text-neutral-500 dark:text-slate-400">
                  Question {quizIndex + 1} / {QUIZ_QUESTIONS.length} · {currentQ.difficulty}
                </div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-slate-100 leading-snug">
                  {localize(currentQ.question, lang)}
                </h3>
                <div className="space-y-2">
                  {currentQ.options.map((opt, idx) => {
                    const chosen = selectedOpt === idx;
                    const isCorrect = idx === currentQ.correctIndex;
                    let style = 'border-neutral-200/80 dark:border-slate-800/80 hover:border-blue-500/60';
                    if (selectedOpt !== null) {
                      if (isCorrect) style = 'border-emerald-500 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
                      else if (chosen) style = 'border-rose-500 bg-rose-500/12 text-rose-700 dark:text-rose-300';
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAnswer(idx)}
                        className={`tactile-press w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors cursor-pointer ${style}`}
                      >
                        {localize(opt, lang)}
                      </button>
                    );
                  })}
                </div>

                {selectedOpt !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-4 text-xs space-y-2"
                  >
                    <p className="text-neutral-700 dark:text-slate-300 leading-relaxed">
                      {localize(currentQ.explanation, lang)}
                    </p>
                    <div className="text-neutral-500 dark:text-slate-400">Source: {currentQ.verifiedSource}</div>
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="tactile-press rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      {quizIndex + 1 >= QUIZ_QUESTIONS.length ? 'Finish Quiz' : 'Next Question'}
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </SpotlightCard>

        <SpotlightCard className="lg:col-span-5 p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h2 className="font-display text-2xl font-bold">Achievements</h2>
            </div>
            <div className="space-y-3">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl border p-4 flex items-start justify-between gap-3 ${
                      unlocked
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-neutral-200/80 dark:border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-neutral-900 dark:text-slate-100">
                        {localize(ach.title, lang)}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-slate-400 mt-0.5">
                        {localize(ach.description, lang)}
                      </p>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-blue-700 dark:text-blue-400 shrink-0">
                      {unlocked ? 'Unlocked' : ach.thresholdLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </SpotlightCard>
      </section>
    </div>
  );
}

export function FavoritesView() {
  const progress = useAtlasStore((s) => s.progress);
  const lang = progress.preferences.language;
  const setView = useAtlasStore((s) => s.setView);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setSelectedPlanetId = useAtlasStore((s) => s.setSelectedPlanetId);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 space-y-12">
      <div className="pt-4 pb-2">
        <HeroTitle>{t(lang, 'navFavorites')}</HeroTitle>
        <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-slate-400">
          Your bookmarked countries, civilizations, historical figures, celestial bodies, and saved epochs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SpotlightCard className="p-5">
          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-neutral-500 dark:text-slate-400">
              Countries ({progress.favoriteCountries.length})
            </h2>
            {progress.favoriteCountries.map((id) => {
              const c = COUNTRY_CHRONICLES.find((x) => x.id === id);
              if (!c) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setInspector({ type: 'country', id: c.id });
                    setView('countries');
                  }}
                  className="block w-full text-left rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 hover:border-blue-500 cursor-pointer"
                >
                  <div className="font-semibold text-sm">{localize(c.name, lang)}</div>
                  <div className="text-xs text-neutral-500">{c.region}</div>
                </button>
              );
            })}
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-neutral-500 dark:text-slate-400">
              Civilizations ({progress.favoriteCivilizations.length})
            </h2>
            {progress.favoriteCivilizations.map((id) => {
              const c = CIVILIZATIONS.find((x) => x.id === id);
              if (!c) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setInspector({ type: 'civilization', id: c.id });
                    setView('civilizations');
                  }}
                  className="block w-full text-left rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 hover:border-blue-500 cursor-pointer"
                >
                  <div className="font-semibold text-sm">{localize(c.name, lang)}</div>
                  <div className="text-xs text-neutral-500">{localize(c.capital.name, lang)}</div>
                </button>
              );
            })}
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-neutral-500 dark:text-slate-400">
              Solar System & Saved Years
            </h2>
            {progress.favoritePlanets.map((id) => {
              const p = SOLAR_SYSTEM_BODIES.find((x) => x.id === id);
              if (!p) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedPlanetId(p.id);
                    setView('solar-system');
                  }}
                  className="block w-full text-left rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 hover:border-blue-500 cursor-pointer"
                >
                  <div className="font-semibold text-sm">{localize(p.name, lang)}</div>
                  <div className="text-xs text-neutral-500">{p.orbitDistanceAU} AU</div>
                </button>
              );
            })}
            <div className="flex flex-wrap gap-2 pt-2">
              {progress.savedPeriods.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setSelectedYear(yr);
                    setView('explore');
                  }}
                  className="rounded-lg border border-blue-500/40 px-2.5 py-1 font-mono-tabular text-xs text-blue-700 dark:text-blue-400 cursor-pointer hover:border-blue-500"
                >
                  {formatHistoricalYear(yr, lang)}
                </button>
              ))}
            </div>
            {progress.favoriteFigures.length > 0 && (
              <div className="pt-2 space-y-2">
                {progress.favoriteFigures.map((fid) => {
                  const fig = HISTORICAL_FIGURES.find((f) => f.id === fid);
                  if (!fig) return null;
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => setView('figures')}
                      className="block w-full text-left rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 hover:border-blue-500 cursor-pointer"
                    >
                      <div className="font-semibold text-sm">{localize(fig.name, lang)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}

export function ProfileView() {
  const user = useAtlasStore((s) => s.user);
  const progress = useAtlasStore((s) => s.progress);
  const lang = progress.preferences.language;
  const setAuthModalOpen = useAtlasStore((s) => s.setAuthModalOpen);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/90 dark:border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'Profile'}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full object-cover border border-blue-500/50"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-800 dark:bg-blue-700 text-white font-display text-2xl font-bold">
              {(user?.displayName ?? 'G').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold">
              {user?.displayName || t(lang, 'guestMode')}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-slate-400">
              {user?.email || 'Local device session — sign in with Google to sync across devices.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="tactile-press rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          {user ? 'Manage Google Account' : t(lang, 'signInGoogle')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SpotlightCard className="p-4">
          <div className="font-mono-tabular text-2xl font-semibold">{progress.exploredLocations.length}</div>
          <div className="text-xs text-neutral-500 dark:text-slate-400">Locations Explored</div>
        </SpotlightCard>
        <SpotlightCard className="p-4">
          <div className="font-mono-tabular text-2xl font-semibold">{progress.completedLessons.length}</div>
          <div className="text-xs text-neutral-500 dark:text-slate-400">Lessons Completed</div>
        </SpotlightCard>
        <SpotlightCard className="p-4">
          <div className="font-mono-tabular text-2xl font-semibold">{progress.achievements.length}</div>
          <div className="text-xs text-neutral-500 dark:text-slate-400">Badges Earned</div>
        </SpotlightCard>
        <SpotlightCard className="p-4">
          <div className="font-mono-tabular text-2xl font-semibold">
            {progress.quizScores['world-history-core'] ?? 0}%
          </div>
          <div className="text-xs text-neutral-500 dark:text-slate-400">Best Quiz Score</div>
        </SpotlightCard>
      </div>
    </div>
  );
}

export function SettingsView() {
  const prefs = useAtlasStore((s) => s.progress.preferences);
  const setLanguage = useAtlasStore((s) => s.setLanguage);
  const setTheme = useAtlasStore((s) => s.setTheme);
  const setGraphicsQuality = useAtlasStore((s) => s.setGraphicsQuality);
  const setReducedMotion = useAtlasStore((s) => s.setReducedMotion);
  const setCustomCursor = useAtlasStore((s) => s.setCustomCursor);
  const reopenOnboarding = useAtlasStore((s) => s.reopenOnboarding);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-12">
      <div className="pt-4 pb-2">
        <HeroTitle>{t(prefs.language, 'navSettings')}</HeroTitle>
        <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-slate-400">
          Customize language (including RTL), light/dark theme, 3D graphics fidelity, and accessibility.
        </p>
      </div>

      {/* Language Grid (20 Languages) */}
      <SpotlightCard className="p-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-base">{t(prefs.language, 'language')} (20 Languages)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLanguage(l.code);
                  toast.success(`Language switched to ${l.nativeName}`);
                }}
                className={`tactile-press rounded-xl border px-3 py-2 text-left text-xs cursor-pointer transition-colors ${
                  prefs.language === l.code
                    ? 'bg-blue-800 dark:bg-blue-700 text-white border-blue-600 font-semibold'
                    : 'border-neutral-200/80 dark:border-slate-800/80 hover:border-blue-500/60'
                }`}
              >
                <div>{l.nativeName}</div>
                <div className="text-[10px] opacity-75">
                  {l.englishName} {l.dir === 'rtl' ? '· RTL' : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      </SpotlightCard>

      {/* Theme, Graphics & Apple Switches */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SpotlightCard className="p-6">
          <div className="space-y-4">
            <h2 className="font-semibold text-base">Appearance & Theme</h2>
            <SegmentedControl
              value={prefs.theme}
              onChange={(val) => setTheme(val)}
              className="w-full"
              options={[
                {
                  value: 'light',
                  label: t(prefs.language, 'themeLight'),
                  icon: <Sun className="h-3.5 w-3.5" />,
                },
                {
                  value: 'dark',
                  label: t(prefs.language, 'themeDark'),
                  icon: <Moon className="h-3.5 w-3.5" />,
                },
              ]}
            />

            <div className="pt-2 space-y-2">
              <div className="text-xs font-medium">{t(prefs.language, 'graphicsQuality')}</div>
              <SegmentedControl<GraphicsQuality>
                value={prefs.graphicsQuality}
                onChange={(q) => setGraphicsQuality(q)}
                className="w-full"
                options={[
                  { value: 'high', label: 'High' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'low', label: 'Low' },
                ]}
              />
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6">
          <div className="space-y-5">
            <h2 className="font-semibold text-base">Accessibility & Experience</h2>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>{t(prefs.language, 'reducedMotion')}</span>
              <AppleSwitch
                ariaLabel={t(prefs.language, 'reducedMotion')}
                checked={prefs.reducedMotion}
                onCheckedChange={setReducedMotion}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>{t(prefs.language, 'customCursor')}</span>
              <AppleSwitch
                ariaLabel={t(prefs.language, 'customCursor')}
                checked={prefs.customCursor}
                onCheckedChange={setCustomCursor}
              />
            </div>

            <div className="pt-3 border-t border-neutral-200/80 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => reopenOnboarding()}
                className="tactile-press flex items-center gap-2 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-4 py-2 text-xs font-medium cursor-pointer hover:border-blue-500/60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Replay Introduction Tour
              </button>
            </div>
          </div>
        </SpotlightCard>
      </section>
    </div>
  );
}
