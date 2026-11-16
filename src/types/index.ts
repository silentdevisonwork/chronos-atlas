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

export type ThemeMode = 'dark' | 'light';
export type GraphicsQuality = 'high' | 'balanced' | 'low';

export type AppView =
  | 'home'
  | 'explore'
  | 'map'
  | 'timeline'
  | 'civilizations'
  | 'countries'
  | 'figures'
  | 'discover'
  | 'monitor'
  | 'solar-system'
  | 'learning'
  | 'favorites'
  | 'profile'
  | 'settings';

export type LocalizedStringMap = Partial<Record<LanguageCode, string>> & { en: string; tr?: string };

export interface LanguageMeta {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
}

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface Civilization {
  id: string;
  name: LocalizedStringMap;
  aliases: string[];
  eraLabel: LocalizedStringMap;
  startYear: number; // negative = BCE
  endYear: number;
  peakYear: number;
  capital: {
    name: LocalizedStringMap;
    aliases: string[];
    coords: GeoCoord;
  };
  territoryRegions: Array<{
    center: GeoCoord;
    radiusDeg: number;
  }>;
  color: string;
  summary: LocalizedStringMap;
  origins: LocalizedStringMap;
  rulers: string[];
  languages: string[];
  beliefSystems: string[];
  architecture: string[];
  inventions: string[];
  majorWars: string[];
  predecessors: string[];
  successors: string[];
  modernCountries: string[];
  verifiedFacts: string[];
  interpretations: string[];
  image: string;
  imageAttribution: string;
  peakPopulation?: string;
  peakAreaKm2?: number;
  gdpSharePct?: number;
  tradeCommodities?: string[];
  /** Broad geographic/cultural grouping used by the timeline filters. */
  region?: string;
  /** Optional freeform tags for discovery and comparison tools. */
  tags?: string[];
}

export interface CountryChronicle {
  id: string;
  isoNumeric: string; // matches world-atlas countries-110m.json id
  isoAlpha2: string;
  name: LocalizedStringMap;
  aliases: string[];
  capital: LocalizedStringMap;
  coords: GeoCoord;
  region: string;
  modernFormationYear: number;
  summary: LocalizedStringMap;
  origins: LocalizedStringMap;
  ancientInhabitants: string[];
  ancestorCivilizations: string[]; // civilization ids or names
  empiresAndKingdoms: Array<{
    name: string;
    period: string;
    continuityType: 'territorial' | 'cultural' | 'political';
    summary: string;
  }>;
  historicalLeaders: string[];
  warsAndTurningPoints: string[];
  independenceNote: LocalizedStringMap;
  languagesHistory: string[];
  beliefSystemsHistory: string[];
  architectureHighlights: string[];
  inventionsAndContributions: string[];
  continuityDistinction: LocalizedStringMap;
  image: string;
  imageAttribution: string;
}

export interface HistoricalSite {
  id: string;
  name: LocalizedStringMap;
  aliases: string[];
  countryId: string;
  civilizationId?: string;
  foundedYear: number;
  coords: GeoCoord;
  category: 'ancient-city' | 'monument' | 'archaeological' | 'observatory';
  summary: LocalizedStringMap;
  verifiedFact: string;
  image?: string;
}

export interface TimelineEvent {
  id: string;
  year: number;
  endYear?: number;
  era: 'prehistory' | 'ancient' | 'classical' | 'medieval' | 'early-modern' | 'modern';
  category: 'civilization' | 'war' | 'discovery' | 'dynasty' | 'monument' | 'astronomy';
  title: LocalizedStringMap;
  aliases: string[];
  locationName: string;
  coords: GeoCoord;
  summary: LocalizedStringMap;
  rulerOrKeyFigure?: string;
  verifiedFact: string;
  disputedNote?: string;
  civilizationId?: string;
  countryId?: string;
}

export type FigureCategory =
  | 'ruler'
  | 'scientist'
  | 'philosopher'
  | 'explorer'
  | 'strategist'
  | 'artist';

export interface HistoricalFigure {
  id: string;
  name: LocalizedStringMap;
  aliases: string[];
  bornYear: number;
  diedYear: number;
  category?: FigureCategory;
  role: LocalizedStringMap;
  civilizationOrState: string;
  coords: GeoCoord;
  summary: LocalizedStringMap;
  achievements: string[];
  verifiedFacts: string[];
  historiographicalNote: string;
  countryId?: string;
  civilizationId?: string;
}

export interface WarConflictRecord {
  id: string;
  name: string;
  aliases: string[];
  startYear: number;
  endYear: number;
  era: TimelineEvent['era'];
  belligerents: string[];
  commanders: string[];
  locationName: string;
  coords: GeoCoord;
  scaleNote: string;
  outcome: string;
  historicalSignificance: string;
  relatedCountryIds?: string[];
  relatedCivIds?: string[];
}

export interface TradeNetworkRecord {
  id: string;
  name: string;
  aliases: string[];
  activeFrom: number;
  activeTo: number;
  color: string;
  commodities: string[];
  keyHubs: string[];
  economicImpact: string;
  points: GeoCoord[];
}

export interface CountryEconomicRecord {
  isoNumeric: string;
  isoAlpha2?: string;
  isoAlpha3?: string;
  name: string;
  region: string;
  capital: string;
  gdpNominalBillionUSD: number;
  gdpPerCapitaUSD: number;
  populationMillions: number;
  formationYear: number;
  historicalSharePeakPct?: number;
  primaryExports: string[];
  historicalLineage: string;
}

export interface InternetVideoEntry {
  id: string;
  title: string;
  topic: 'civilizations' | 'countries' | 'figures' | 'wars' | 'trade-gdp' | 'cosmos';
  youtubeId: string;
  channel: string;
  duration: string;
  yearLabel: string;
  summary: string;
  keywords: string[];
  relatedId?: string;
  coords?: GeoCoord;
  targetYear?: number;
}

export interface CelestialBody {
  id: string;
  name: LocalizedStringMap;
  aliases: string[];
  type: 'star' | 'planet' | 'dwarf-planet' | 'moon' | 'comet';
  parentId?: string;
  orbitDistanceAU: number;
  visualOrbitRadius: number;
  visualSize: number;
  orbitSpeed: number;
  axialTiltDeg: number;
  colorHex: string;
  accentHex: string;
  hasRings?: boolean;
  diameterKm: number;
  orbitalPeriodDays: number;
  rotationPeriodHours: number;
  meanTempC: number;
  gravityMs2: number;
  moonsCount: number;
  atmosphere: string;
  summary: LocalizedStringMap;
  historicalDiscoveries: string;
  astronomers: string[];
  spaceMissions: Array<{
    name: string;
    year: number;
    agency: string;
    milestone: string;
  }>;
}

export interface QuizQuestion {
  id: string;
  topicId: string;
  difficulty: 'foundational' | 'scholar' | 'archivist';
  question: LocalizedStringMap;
  options: LocalizedStringMap[];
  correctIndex: number;
  explanation: LocalizedStringMap;
  verifiedSource: string;
}

export interface LessonModule {
  id: string;
  title: LocalizedStringMap;
  era: string;
  durationMinutes: number;
  summary: LocalizedStringMap;
  sections: Array<{
    heading: string;
    body: string;
    factType: 'verified' | 'interpretation';
  }>;
  relatedCivId?: string;
  relatedCountryId?: string;
  targetYear?: number;
}

export interface AchievementDef {
  id: string;
  title: LocalizedStringMap;
  description: LocalizedStringMap;
  thresholdLabel: string;
}

export interface UserPreferences {
  language: LanguageCode;
  theme: ThemeMode;
  graphicsQuality: GraphicsQuality;
  reducedMotion: boolean;
  customCursor: boolean;
}

export interface UserProgressState {
  favoriteCountries: string[];
  favoriteCivilizations: string[];
  favoriteFigures: string[];
  favoritePlanets: string[];
  savedPeriods: number[];
  exploredLocations: string[];
  completedLessons: string[];
  achievements: string[];
  recentSearches: string[];
  quizScores: Record<string, number>;
  preferences: UserPreferences;
  onboardingCompleted: boolean;
}

export interface SearchResultItem {
  id: string;
  entityType:
    | 'country'
    | 'civilization'
    | 'figure'
    | 'event'
    | 'site'
    | 'planet'
    | 'period'
    | 'war'
    | 'trade'
    | 'video';
  title: string;
  subtitle: string;
  matchedAlias?: string;
  targetView: AppView;
  targetId?: string;
  targetYear?: number;
  coords?: GeoCoord;
  keywords: string[];
}
