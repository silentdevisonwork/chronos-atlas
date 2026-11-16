import { create } from 'zustand';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getLanguageMeta } from '../i18n/languages';
import { initialLanguage } from '../i18n/detect';
import type {
  AppView,
  GeoCoord,
  GraphicsQuality,
  LanguageCode,
  ThemeMode,
  UserPreferences,
  UserProgressState,
} from '../types';

const LOCAL_STORAGE_KEY = 'chronos-atlas-state-v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  // Detected once on the first visit; a stored choice always wins afterwards.
  language: initialLanguage(),
  theme: 'dark',
  graphicsQuality: 'high',
  reducedMotion:
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  customCursor: true,
};

const DEFAULT_PROGRESS: UserProgressState = {
  favoriteCountries: ['turkiye'],
  favoriteCivilizations: ['ottoman-empire', 'ancient-egypt'],
  favoriteFigures: [],
  favoritePlanets: ['earth', 'saturn'],
  savedPeriods: [1453, -1259],
  exploredLocations: ['turkiye'],
  completedLessons: [],
  achievements: [],
  recentSearches: ['Istanbul', 'Constantinople', 'القسطنطينية'],
  quizScores: {},
  preferences: DEFAULT_PREFERENCES,
  onboardingCompleted: false,
};

function loadLocalProgress(): UserProgressState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<UserProgressState>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(parsed.preferences ?? {}),
      },
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveLocalProgress(state: UserProgressState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota failures
  }
}

export function applyDocumentThemeAndLanguage(prefs: UserPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (prefs.theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  const meta = getLanguageMeta(prefs.language);
  root.setAttribute('lang', prefs.language);
  root.setAttribute('dir', meta.dir);
  root.setAttribute(
    'data-script',
    meta.dir === 'rtl'
      ? 'arabic'
      : prefs.language === 'zh'
        ? 'han'
        : prefs.language === 'ja'
          ? 'jpan'
          : prefs.language === 'ko'
            ? 'kore'
            : prefs.language === 'hi'
              ? 'deva'
              : prefs.language === 'el'
                ? 'grek'
                : 'latin'
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chronos:language', { detail: prefs.language }));
  }
}

export interface InspectorTarget {
  type: 'country' | 'civilization' | 'site' | 'figure' | 'dynamic-country';
  id: string;
  title?: string;
  isoNumeric?: string;
  coords?: GeoCoord;
}

interface AtlasStore {
  view: AppView;
  mapMode: '3d' | '2d';
  selectedYear: number;
  isTimelinePlaying: boolean;
  timelineSpeed: number;
  inspector: InspectorTarget | null;
  selectedPlanetId: string;
  flyToCoords: GeoCoord | null;
  searchOpen: boolean;
  authModalOpen: boolean;
  hudCollapsed: boolean;
  user: User | null;
  authReady: boolean;
  progress: UserProgressState;

  setView: (view: AppView) => void;
  setMapMode: (mode: '3d' | '2d') => void;
  setSelectedYear: (year: number) => void;
  setTimelinePlaying: (playing: boolean) => void;
  setTimelineSpeed: (speed: number) => void;
  setInspector: (target: InspectorTarget | null) => void;
  setSelectedPlanetId: (id: string) => void;
  setFlyToCoords: (coords: GeoCoord | null) => void;
  setSearchOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setHudCollapsed: (collapsed: boolean) => void;

  setLanguage: (lang: LanguageCode) => void;
  setTheme: (theme: ThemeMode) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setReducedMotion: (reduced: boolean) => void;
  setCustomCursor: (enabled: boolean) => void;
  completeOnboarding: () => void;
  reopenOnboarding: () => void;

  toggleFavorite: (
    bucket: 'favoriteCountries' | 'favoriteCivilizations' | 'favoriteFigures' | 'favoritePlanets',
    id: string
  ) => void;
  toggleSavedPeriod: (year: number) => void;
  recordExploredLocation: (locationId: string) => void;
  recordLessonComplete: (lessonId: string) => void;
  recordQuizScore: (topicId: string, pct: number) => void;
  recordSearchTerm: (term: string) => void;

  setAuthUser: (user: User | null) => Promise<void>;
  markAuthReady: () => void;
}

async function syncProgressToFirestore(uid: string, progress: UserProgressState) {
  const progressPath = `users/${uid}/progress/state`;
  try {
    await setDoc(
      doc(db, 'users', uid, 'progress', 'state'),
      {
        uid,
        favoriteCountries: progress.favoriteCountries.slice(0, 100),
        favoriteCivilizations: progress.favoriteCivilizations.slice(0, 100),
        favoriteFigures: progress.favoriteFigures.slice(0, 100),
        favoritePlanets: progress.favoritePlanets.slice(0, 40),
        savedPeriods: progress.savedPeriods.slice(0, 100).map(String),
        exploredLocations: progress.exploredLocations.slice(0, 200),
        completedLessons: progress.completedLessons.slice(0, 100),
        achievements: progress.achievements.slice(0, 50),
        recentSearches: progress.recentSearches.slice(0, 30),
        quizScores: progress.quizScores,
        preferences: progress.preferences,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, progressPath);
  }
}

function evaluateAchievements(progress: UserProgressState): UserProgressState {
  const next = new Set(progress.achievements);
  let unlockedNew: string | null = null;

  if (progress.exploredLocations.length >= 3 && !next.has('ach-first-epoch')) {
    next.add('ach-first-epoch');
    unlockedNew = 'Time Traveler';
  }
  if (Object.values(progress.quizScores).some((s) => s >= 80) && !next.has('ach-scholar-quiz')) {
    next.add('ach-scholar-quiz');
    unlockedNew = 'Archival Scholar';
  }
  if (progress.completedLessons.length >= 1 && !next.has('ach-polyglot')) {
    next.add('ach-polyglot');
    unlockedNew = 'Polyglot Curator';
  }
  if (progress.favoritePlanets.length >= 2 && !next.has('ach-astronomer')) {
    next.add('ach-astronomer');
    unlockedNew = 'Celestial Cartographer';
  }

  if (unlockedNew) {
    toast.success(`Achievement Unlocked: ${unlockedNew}`);
  }

  return {
    ...progress,
    achievements: Array.from(next),
  };
}

const initialProgress = loadLocalProgress();
applyDocumentThemeAndLanguage(initialProgress.preferences);

export const useAtlasStore = create<AtlasStore>((set, get) => {
  const commitProgress = (updater: (prev: UserProgressState) => UserProgressState) => {
    const prev = get().progress;
    const updated = evaluateAchievements(updater(prev));
    saveLocalProgress(updated);
    applyDocumentThemeAndLanguage(updated.preferences);
    set({ progress: updated });

    const uid = get().user?.uid;
    if (uid) {
      void syncProgressToFirestore(uid, updated).catch((e) => {
        console.warn('Background Firestore progress sync warning:', e);
      });
    }
  };

  return {
    view: 'home',
    mapMode: '3d',
    selectedYear: 1453,
    isTimelinePlaying: false,
    timelineSpeed: 1,
    inspector: { type: 'country', id: 'turkiye', coords: { lat: 39.9334, lng: 32.8597 } },
    selectedPlanetId: 'earth',
    flyToCoords: { lat: 39.5, lng: 32.8 },
    searchOpen: false,
    authModalOpen: false,
    hudCollapsed: false,
    user: null,
    authReady: false,
    progress: initialProgress,

    setView: (view) => set({ view }),
    setMapMode: (mapMode) => set({ mapMode }),
    setSelectedYear: (selectedYear) =>
      set({ selectedYear: Math.max(-10000, Math.min(2026, Math.round(selectedYear))) }),
    setTimelinePlaying: (isTimelinePlaying) => set({ isTimelinePlaying }),
    setTimelineSpeed: (timelineSpeed) => set({ timelineSpeed }),
    setInspector: (inspector) => set({ inspector }),
    setSelectedPlanetId: (selectedPlanetId) => set({ selectedPlanetId }),
    setFlyToCoords: (flyToCoords) => set({ flyToCoords }),
    setSearchOpen: (searchOpen) => set({ searchOpen }),
    setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
    setHudCollapsed: (hudCollapsed) => set({ hudCollapsed }),

    setLanguage: (language) => {
      commitProgress((p) => ({
        ...p,
        preferences: { ...p.preferences, language },
      }));
    },
    setTheme: (theme) => {
      commitProgress((p) => ({
        ...p,
        preferences: { ...p.preferences, theme },
      }));
    },
    setGraphicsQuality: (graphicsQuality) => {
      commitProgress((p) => ({
        ...p,
        preferences: { ...p.preferences, graphicsQuality },
      }));
    },
    setReducedMotion: (reducedMotion) => {
      commitProgress((p) => ({
        ...p,
        preferences: { ...p.preferences, reducedMotion },
      }));
    },
    setCustomCursor: (customCursor) => {
      commitProgress((p) => ({
        ...p,
        preferences: { ...p.preferences, customCursor },
      }));
    },
    completeOnboarding: () => {
      commitProgress((p) => ({ ...p, onboardingCompleted: true }));
    },
    reopenOnboarding: () => {
      commitProgress((p) => ({ ...p, onboardingCompleted: false }));
    },

    toggleFavorite: (bucket, id) => {
      commitProgress((p) => {
        const exists = p[bucket].includes(id);
        const nextList = exists ? p[bucket].filter((x) => x !== id) : [...p[bucket], id];
        toast.success(exists ? 'Removed from favorites' : 'Saved to favorites');
        return { ...p, [bucket]: nextList };
      });
    },

    toggleSavedPeriod: (year) => {
      commitProgress((p) => {
        const exists = p.savedPeriods.includes(year);
        const next = exists ? p.savedPeriods.filter((y) => y !== year) : [...p.savedPeriods, year];
        toast.success(exists ? 'Period removed' : 'Historical period bookmarked');
        return { ...p, savedPeriods: next };
      });
    },

    recordExploredLocation: (locationId) => {
      commitProgress((p) => {
        if (p.exploredLocations.includes(locationId)) return p;
        return { ...p, exploredLocations: [...p.exploredLocations, locationId] };
      });
    },

    recordLessonComplete: (lessonId) => {
      commitProgress((p) => {
        if (p.completedLessons.includes(lessonId)) return p;
        toast.success('Lesson completed');
        return { ...p, completedLessons: [...p.completedLessons, lessonId] };
      });
    },

    recordQuizScore: (topicId, pct) => {
      commitProgress((p) => {
        const prevBest = p.quizScores[topicId] ?? 0;
        return {
          ...p,
          quizScores: { ...p.quizScores, [topicId]: Math.max(prevBest, pct) },
        };
      });
    },

    recordSearchTerm: (term) => {
      const cleaned = term.trim();
      if (!cleaned) return;
      commitProgress((p) => ({
        ...p,
        recentSearches: [cleaned, ...p.recentSearches.filter((x) => x !== cleaned)].slice(0, 12),
      }));
    },

    markAuthReady: () => set({ authReady: true }),

    setAuthUser: async (user) => {
      set({ user, authReady: true });
      if (!user) return;

      const uid = user.uid;
      const profileRef = doc(db, 'users', uid);
      const privateRef = doc(db, 'users', uid, 'private', 'account');
      const progressRef = doc(db, 'users', uid, 'progress', 'state');

      try {
        const existingProfile = await getDoc(profileRef);
        const local = get().progress;

        if (!existingProfile.exists()) {
          await setDoc(profileRef, {
            uid,
            displayName: user.displayName || 'Scholar Explorer',
            photoURL: user.photoURL || '',
            preferredLanguage: local.preferences.language,
            preferredTheme: local.preferences.theme,
            onboardingCompleted: local.onboardingCompleted,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(
            profileRef,
            {
              displayName: user.displayName || 'Scholar Explorer',
              photoURL: user.photoURL || '',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        if (user.email) {
          await setDoc(
            privateRef,
            {
              uid,
              email: user.email,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        const remoteProgressSnap = await getDoc(progressRef);
        if (remoteProgressSnap.exists()) {
          const remote = remoteProgressSnap.data();
          const merged: UserProgressState = {
            ...local,
            favoriteCountries: Array.isArray(remote.favoriteCountries)
              ? remote.favoriteCountries
              : local.favoriteCountries,
            favoriteCivilizations: Array.isArray(remote.favoriteCivilizations)
              ? remote.favoriteCivilizations
              : local.favoriteCivilizations,
            favoriteFigures: Array.isArray(remote.favoriteFigures)
              ? remote.favoriteFigures
              : local.favoriteFigures,
            favoritePlanets: Array.isArray(remote.favoritePlanets)
              ? remote.favoritePlanets
              : local.favoritePlanets,
            savedPeriods: Array.isArray(remote.savedPeriods)
              ? remote.savedPeriods.map(Number).filter((n: number) => !Number.isNaN(n))
              : local.savedPeriods,
            exploredLocations: Array.isArray(remote.exploredLocations)
              ? remote.exploredLocations
              : local.exploredLocations,
            completedLessons: Array.isArray(remote.completedLessons)
              ? remote.completedLessons
              : local.completedLessons,
            achievements: Array.isArray(remote.achievements)
              ? remote.achievements
              : local.achievements,
            recentSearches: Array.isArray(remote.recentSearches)
              ? remote.recentSearches
              : local.recentSearches,
            quizScores:
              remote.quizScores && typeof remote.quizScores === 'object'
                ? remote.quizScores
                : local.quizScores,
            preferences: {
              ...local.preferences,
              ...(remote.preferences ?? {}),
            },
          };
          saveLocalProgress(merged);
          applyDocumentThemeAndLanguage(merged.preferences);
          set({ progress: merged });
        } else {
          await syncProgressToFirestore(uid, local);
        }
      } catch (error) {
        console.error('Firebase profile sync error:', error);
      }
    },
  };
});
