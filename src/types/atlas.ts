export type ThemeMode = 'light' | 'dark';
export type GraphicsQuality = 'high' | 'balanced' | 'low';

export type NavSection =
  | 'home'
  | 'explore'
  | 'map'
  | 'timeline'
  | 'civilizations'
  | 'countries'
  | 'figures'
  | 'discover'
  | 'solar-system'
  | 'learning'
  | 'favorites'
  | 'settings'
  | 'profile';

export type LanguageCode =
  | 'tr'
  | 'en'
  | 'ar'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'hi'
  | 'ur'
  | 'fa'
  | 'el'
  | 'nl'
  | 'pl'
  | 'id'
  | 'sw';

export type LocalizedText = Partial<Record<LanguageCode, string>> & { en: string; tr: string };

export interface TerritoryZone {
  lat: number;
  lng: number;
  radiusDeg: number;
  label?: string;
}

export interface Civilization {
  id: string;
  name: LocalizedText;
  aliases: string[];
  eraId: string;
  startYear: number;
  endYear: number;
  capital: {
    name: string;
    historicalNames?: string[];
    lat: number;
    lng: number;
  };
  color: string;
  zones: TerritoryZone[];
  region: string;
  summary: LocalizedText;
  origins: string;
  languages: string[];
  religions: string[];
  architecture: string[];
  inventions: string[];
  rulers: string[];
  majorWars: string[];
  predecessors: string[];
  successors: string[];
  verifiedFacts: string[];
  interpretations: string[];
  image: string;
  imageCredit: string;
}

export interface AncestorStage {
  period: string;
  startYear: number;
  endYear: number;
  stateName: string;
  relationType: 'Territorial Predecessor' | 'Cultural Influence' | 'Political Continuity' | 'Modern Republic';
  civilizationId?: string;
  description: string;
}

export interface CountryProfile {
  id: string;
  isoNumeric: string;
  name: LocalizedText;
  aliases: string[];
  capital: string;
  lat: number;
  lng: number;
  region: string;
  modernFormationYear: number;
  summary: LocalizedText;
  origins: string;
  ancientInhabitants: string[];
  stages: AncestorStage[];
  languages: string[];
  beliefSystems: string[];
  architecture: string[];
  inventions: string[];
  historicalLeaders: string[];
  keyWars: string[];
  independenceNote: string;
  continuityDistinction: string;
  image: string;
  imageCredit: string;
}

export interface HistoricalEvent {
  id: string;
  year: number;
  endYear?: number;
  eraId: string;
  category: 'civilization' | 'war' | 'discovery' | 'monument' | 'dynasty' | 'empire';
  title: LocalizedText;
  aliases: string[];
  locationName: string;
  lat: number;
  lng: number;
  rulerOrLeader?: string;
  civilizationId?: string;
  summary: LocalizedText;
  verifiedFact: string;
  interpretationNote?: string;
}

export interface HistoricalFigure {
  id: string;
  name: LocalizedText;
  aliases: string[];
  bornYear: number;
  diedYear: number;
  role: LocalizedText;
  era: string;
  civilizationId?: string;
  locationName: string;
  lat: number;
  lng: number;
  biography: LocalizedText;
  achievements: string[];
  verifiedLegacy: string;
  debatedAspects: string;
}

export interface CelestialBody {
  id: string;
  type: 'star' | 'planet' | 'dwarf-planet' | 'comet' | 'asteroid-belt';
  name: LocalizedText;
  aliases: string[];
  color: string;
  secondaryColor: string;
  radiusScale: number;
  orbitRadiusScene: number;
  orbitSpeed: number;
  axialTiltDeg: number;
  hasRings?: boolean;
  stats: {
    distanceAU: string;
    orbitalPeriod: string;
    rotationPeriod: string;
    meanRadiusKm: string;
    surfaceTemp: string;
    gravity: string;
    moonsCount: number;
  };
  majorMoons: { name: string; diameterKm: string; note: string }[];
  composition: string;
  atmosphere: string;
  discoveryHistory: string;
  astronomers: string[];
  missions: { name: string; year: number; agency: string; milestone: string }[];
  summary: LocalizedText;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  difficulty: 'foundational' | 'scholar' | 'archivist';
  question: LocalizedText;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedId?: string;
}

export interface LessonModule {
  id: string;
  title: LocalizedText;
  era: string;
  durationMin: number;
  summary: LocalizedText;
  keyFacts: string[];
  distinctionNote: string;
  relatedCivId?: string;
  relatedYear?: number;
  image: string;
}

export interface AchievementDef {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  requirement: string;
  xpReward: number;
}

export interface SearchEntity {
  id: string;
  type:
    | 'country'
    | 'civilization'
    | 'empire'
    | 'figure'
    | 'event'
    | 'war'
    | 'dynasty'
    | 'city'
    | 'monument'
    | 'archaeological'
    | 'period'
    | 'planet'
    | 'moon'
    | 'mission';
  title: string;
  localizedTitle?: LocalizedText;
  subtitle: string;
  aliases: string[];
  year?: number;
  lat?: number;
  lng?: number;
  targetSection: NavSection;
  targetItemId: string;
}

export interface UserProgressState {
  favoriteIds: string[];
  exploredIds: string[];
  savedYears: number[];
  completedLessons: string[];
  achievements: string[];
  recentSearches: string[];
  quizScores: Record<string, number>;
  language: LanguageCode;
  theme: ThemeMode;
  graphicsQuality: GraphicsQuality;
  reducedMotion: boolean;
  onboardingCompleted: boolean;
  xp: number;
}
