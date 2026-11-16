import { HeroTitle } from '../components/ui/VendoredUI';
import {
  ArrowLeftRight,
  Bookmark,
  ExternalLink,
  Globe2,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { EconomicsGdpAtlas } from '../components/EconomicsGdpAtlas';
import { HistorianAssistant } from '../components/HistorianAssistant';
import { InternetVideoTheater } from '../components/InternetVideoTheater';
import {
  SafeArchivalImage,
  SegmentedControl,
  SpatialTabContent,
  SpatialTabs,
  SpotlightCard,
} from '../components/ui/DesignPrimitives';
import { CIVILIZATIONS } from '../data/civilizations';
import { COUNTRY_CHRONICLES } from '../data/countries';
import { HISTORICAL_FIGURES } from '../data/figures';
import { INTERNET_VIDEOS } from '../data/internetVideos';
import { findCountryEconomics, synthesizeFallbackEconomics } from '../data/worldEconomics';
import { formatHistoricalYear, localize, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import type { FigureCategory } from '../types';
import {
  fetchLiveWikiSummary,
  formatGdpBillions,
  formatPopulationMillions,
  formatUsdInteger,
  matchVideoIdsForSubject,
  type LiveWikiSummary,
} from '../utils/liveEncyclopedia';

export function CivilizationsView() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const inspector = useAtlasStore((s) => s.inspector);
  const favCivs = useAtlasStore((s) => s.progress.favoriteCivilizations);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setView = useAtlasStore((s) => s.setView);
  const setInspector = useAtlasStore((s) => s.setInspector);

  const initialId =
    inspector?.type === 'civilization' && CIVILIZATIONS.some((c) => c.id === inspector.id)
      ? inspector.id
      : CIVILIZATIONS[0].id;

  const [selectedId, setSelectedId] = useState(initialId);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('evidence');
  const [civSearch, setCivSearch] = useState('');

  const filteredCivs = useMemo(() => {
    const q = civSearch.trim().toLowerCase();
    if (!q) return CIVILIZATIONS;
    return CIVILIZATIONS.filter(
      (c) =>
        localize(c.name, lang).toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q)) ||
        c.modernCountries.some((m) => m.toLowerCase().includes(q))
    );
  }, [civSearch, lang]);

  const civ = CIVILIZATIONS.find((c) => c.id === selectedId) ?? filteredCivs[0] ?? CIVILIZATIONS[0];
  const compareCiv = compareId ? CIVILIZATIONS.find((c) => c.id === compareId) ?? null : null;

  const relatedVideoIds = matchVideoIdsForSubject(
    civ.id,
    [civ.name.en, ...civ.aliases],
    INTERNET_VIDEOS
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-2">
        <div>
          <HeroTitle>
            {t(lang, 'navCivilizations')} ({CIVILIZATIONS.length})
          </HeroTitle>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-slate-400">
            Inspect empires, peak territories, population & historical GDP share, inventions, wars, and documentary videos—or compare two side by side.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={civSearch}
              onChange={(e) => setCivSearch(e.target.value)}
              placeholder="Filter 24 civilizations..."
              className="rounded-xl spatial-card pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
          <ArrowLeftRight className="h-4 w-4 text-blue-700 dark:text-blue-400" />
          <select
            aria-label="Compare with civilization"
            value={compareId ?? ''}
            onChange={(e) => setCompareId(e.target.value || null)}
            className="rounded-xl spatial-card px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Compare with...</option>
            {CIVILIZATIONS.filter((c) => c.id !== civ.id).map((c) => (
              <option key={c.id} value={c.id}>
                {localize(c.name, lang)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Horizontal Selector with layoutId spring highlight */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {filteredCivs.map((c) => {
          const active = c.id === civ.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`relative px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                active
                  ? 'text-white'
                  : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-200/70 dark:hover:bg-slate-800/70'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="civ-selector-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-blue-800 dark:bg-blue-700 shadow-sm"
                />
              )}
              <span className="relative z-10">{localize(c.name, lang)}</span>
            </button>
          );
        })}
      </div>

      {compareCiv ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[civ, compareCiv].map((item) => (
            <SpotlightCard key={item.id} className="p-6">
              <div className="space-y-4">
                <SafeArchivalImage
                  src={item.image}
                  wikiTopic={item.name.en}
                  alt={localize(item.name, lang)}
                  caption={localize(item.capital.name, lang)}
                  className="w-full h-48 object-cover"
                />
                <div>
                  <div className="font-mono-tabular text-xs text-blue-700 dark:text-blue-400">
                    {formatHistoricalYear(item.startYear, lang)} – {formatHistoricalYear(item.endYear, lang)}
                    {item.gdpSharePct ? ` · ~${item.gdpSharePct}% World GDP` : ''}
                  </div>
                  <h2 className="font-display text-3xl font-bold mt-1">{localize(item.name, lang)}</h2>
                </div>
                <p className="text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
                  {localize(item.summary, lang)}
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-neutral-200/80 dark:border-slate-800/80">
                  <div>
                    <dt className="font-semibold text-neutral-900 dark:text-slate-100">Capital</dt>
                    <dd className="text-neutral-600 dark:text-slate-400">{localize(item.capital.name, lang)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900 dark:text-slate-100">Scale & Population</dt>
                    <dd className="text-neutral-600 dark:text-slate-400">
                      {item.peakPopulation ?? 'Regional'} · {item.peakAreaKm2 ? `${(item.peakAreaKm2 / 1e6).toFixed(2)}M km²` : 'Territorial'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900 dark:text-slate-100">Inventions</dt>
                    <dd className="text-neutral-600 dark:text-slate-400">{item.inventions.join(' · ')}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900 dark:text-slate-100">Major Wars</dt>
                    <dd className="text-neutral-600 dark:text-slate-400">{item.majorWars.join(' · ')}</dd>
                  </div>
                </dl>
              </div>
            </SpotlightCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <SafeArchivalImage
              src={civ.image}
              wikiTopic={civ.name.en}
              alt={localize(civ.name, lang)}
              caption={`${localize(civ.eraLabel, lang)} · Capital: ${localize(civ.capital.name, lang)}`}
              attribution={civ.imageAttribution}
              className="w-full h-72 object-cover"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono-tabular text-xs text-blue-700 dark:text-blue-400">
                  {formatHistoricalYear(civ.startYear, lang)} – {formatHistoricalYear(civ.endYear, lang)} · Peak{' '}
                  {formatHistoricalYear(civ.peakYear, lang)}
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-950 dark:text-slate-50">
                  {localize(civ.name, lang)}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite('favoriteCivilizations', civ.id)}
                  className="tactile-press flex items-center gap-1.5 rounded-xl spatial-card px-3 py-2 text-xs font-medium cursor-pointer"
                >
                  <Bookmark
                    className={`h-3.5 w-3.5 ${
                      favCivs.includes(civ.id)
                        ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400'
                        : ''
                    }`}
                  />
                  {favCivs.includes(civ.id) ? t(lang, 'savedFavorite') : t(lang, 'saveFavorite')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(civ.peakYear);
                    setFlyToCoords(civ.capital.coords);
                    setInspector({ type: 'civilization', id: civ.id, coords: civ.capital.coords });
                    setView('explore');
                  }}
                  className="tactile-press flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Locate on 3D Globe
                </button>
              </div>
            </div>

            {(civ.peakPopulation || civ.peakAreaKm2 || civ.gdpSharePct) && (
              <div className="grid grid-cols-3 gap-3 rounded-2xl spatial-card p-4">
                <div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Peak Population</div>
                  <div className="font-mono-tabular text-lg font-bold text-neutral-950 dark:text-slate-50">
                    {civ.peakPopulation ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Peak Territory</div>
                  <div className="font-mono-tabular text-lg font-bold text-neutral-950 dark:text-slate-50">
                    {civ.peakAreaKm2 ? `${(civ.peakAreaKm2 / 1e6).toFixed(2)}M km²` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Est. World GDP Share</div>
                  <div className="font-mono-tabular text-lg font-bold text-blue-700 dark:text-blue-400">
                    {civ.gdpSharePct ? `~${civ.gdpSharePct}%` : '—'}
                  </div>
                </div>
              </div>
            )}

            <p className="text-base text-neutral-700 dark:text-slate-300 leading-relaxed">
              {localize(civ.summary, lang)}
            </p>
            <p className="text-sm text-neutral-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-neutral-900 dark:text-slate-100">Origins: </strong>
              {localize(civ.origins, lang)}
            </p>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200/80 dark:border-slate-800/80 text-sm">
              <div>
                <dt className="font-semibold text-neutral-900 dark:text-slate-100 mb-1">Rulers & Leaders</dt>
                <dd className="text-neutral-600 dark:text-slate-400">{civ.rulers.join(' · ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-900 dark:text-slate-100 mb-1">Languages</dt>
                <dd className="text-neutral-600 dark:text-slate-400">{civ.languages.join(' · ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-900 dark:text-slate-100 mb-1">Major Wars & Campaigns</dt>
                <dd className="text-neutral-600 dark:text-slate-400">{civ.majorWars.join(' · ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-900 dark:text-slate-100 mb-1">Architecture</dt>
                <dd className="text-neutral-600 dark:text-slate-400">{civ.architecture.join(' · ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-900 dark:text-slate-100 mb-1">Inventions</dt>
                <dd className="text-neutral-600 dark:text-slate-400">{civ.inventions.join(' · ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-900 dark:text-slate-100 mb-1">Trade & Succession</dt>
                <dd className="text-neutral-600 dark:text-slate-400">
                  {civ.tradeCommodities ? `${civ.tradeCommodities.join(', ')} · ` : ''}
                  {civ.predecessors.join(', ')} → {civ.successors.join(', ')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-5">
            <SpotlightCard className="p-5">
              <SpatialTabs
                value={detailTab}
                onValueChange={setDetailTab}
                tabs={[
                  { id: 'evidence', label: 'Verified & Scholarly' },
                  { id: 'video', label: 'Internet Video' },
                  { id: 'assistant', label: 'Ask Historian' },
                ]}
              >
                <SpatialTabContent value="evidence" className="pt-4 space-y-5 focus:outline-none">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      <ShieldCheck className="h-4 w-4" />
                      {t(lang, 'verifiedFacts')}
                    </div>
                    <ul className="space-y-2 text-sm text-neutral-700 dark:text-slate-300">
                      {civ.verifiedFacts.map((f, i) => (
                        <li key={i} className="leading-relaxed">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-neutral-200/80 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      <Scale className="h-4 w-4" />
                      {t(lang, 'scholarlyInterpretations')}
                    </div>
                    <ul className="space-y-2 text-sm text-neutral-700 dark:text-slate-300">
                      {civ.interpretations.map((f, i) => (
                        <li key={i} className="leading-relaxed">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </SpatialTabContent>

                <SpatialTabContent value="video" className="pt-4 focus:outline-none">
                  <InternetVideoTheater
                    compact={true}
                    filterVideoIds={relatedVideoIds}
                    strictSubjectMatch={true}
                    subjectName={localize(civ.name, lang)}
                  />
                </SpatialTabContent>

                <SpatialTabContent value="assistant" className="pt-4 focus:outline-none">
                  <HistorianAssistant contextName={localize(civ.name, lang)} contextType="civilization" />
                </SpatialTabContent>
              </SpatialTabs>
            </SpotlightCard>
          </div>
        </div>
      )}
    </div>
  );
}

export function CountriesView() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const inspector = useAtlasStore((s) => s.inspector);
  const favCountries = useAtlasStore((s) => s.progress.favoriteCountries);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setView = useAtlasStore((s) => s.setView);

  const initialId =
    inspector?.type === 'country' && COUNTRY_CHRONICLES.some((c) => c.id === inspector.id)
      ? inspector.id
      : 'turkiye';
  const [viewMode, setViewMode] = useState<'chronicles' | 'all-world'>('chronicles');
  const [selectedId, setSelectedId] = useState(initialId);
  const [sideTab, setSideTab] = useState('details');
  const [wikiBio, setWikiBio] = useState<Record<string, LiveWikiSummary | null>>({});
  const [loadingWiki, setLoadingWiki] = useState(false);

  const country = COUNTRY_CHRONICLES.find((c) => c.id === selectedId) ?? COUNTRY_CHRONICLES[0];
  const econ = findCountryEconomics(country.isoNumeric, country.name.en) ?? synthesizeFallbackEconomics(country.isoNumeric, country.name.en);
  const countryVideoIds = matchVideoIdsForSubject(
    country.id,
    [country.name.en, country.name.en === 'Türkiye' ? 'Turkey' : undefined, ...country.aliases],
    INTERNET_VIDEOS
  );

  const loadLiveWiki = async (name: string, id: string) => {
    setLoadingWiki(true);
    const data = await fetchLiveWikiSummary(name === 'Türkiye' ? 'Turkey' : name);
    setWikiBio((prev) => ({ ...prev, [id]: data }));
    setLoadingWiki(false);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-2">
        <div>
          <HeroTitle>
            {t(lang, 'navCountries')} · Complete World & GDP Directory
          </HeroTitle>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-slate-400">
            Explore {COUNTRY_CHRONICLES.length} deep historical chronicles or browse all 177+ territories with GDP, per-capita income, exports, and ancestor lineages.
          </p>
        </div>

        <SegmentedControl
          size="xs"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'chronicles', label: `Flagship Chronicles (${COUNTRY_CHRONICLES.length})` },
            { value: 'all-world', label: 'All 177+ Countries & GDP' },
          ]}
        />
      </div>

      {viewMode === 'all-world' ? (
        <EconomicsGdpAtlas />
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            {COUNTRY_CHRONICLES.map((c) => {
              const active = c.id === country.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-200/70 dark:hover:bg-slate-800/70'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="country-selector-pill"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-blue-800 dark:bg-blue-700 shadow-sm"
                    />
                  )}
                  <span className="relative z-10">{localize(c.name, lang)}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <SafeArchivalImage
                src={country.image}
                wikiTopic={`${localize(country.capital, 'en')} ${country.name.en === 'Türkiye' ? 'Istanbul' : country.name.en}`}
                alt={localize(country.name, lang)}
                caption={`${country.region} · Capital: ${localize(country.capital, lang)}`}
                attribution={country.imageAttribution}
                className="w-full h-72 object-cover"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono-tabular text-blue-700 dark:text-blue-400">
                    {country.region} · Modern Formation {country.modernFormationYear}
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold">{localize(country.name, lang)}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite('favoriteCountries', country.id)}
                    className="tactile-press flex items-center gap-1.5 rounded-xl spatial-card px-3 py-2 text-xs font-medium cursor-pointer"
                  >
                    <Bookmark
                      className={`h-3.5 w-3.5 ${
                        favCountries.includes(country.id)
                          ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400'
                          : ''
                      }`}
                    />
                    {favCountries.includes(country.id) ? t(lang, 'savedFavorite') : t(lang, 'saveFavorite')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlyToCoords(country.coords);
                      setInspector({ type: 'country', id: country.id, coords: country.coords });
                      setView('explore');
                    }}
                    className="tactile-press flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Globe2 className="h-3.5 w-3.5" />
                    View on 3D Globe
                  </button>
                </div>
              </div>

              {/* Economic & Demographic Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl spatial-card p-4">
                <div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Nominal GDP</div>
                  <div className="font-mono-tabular text-lg font-bold text-blue-700 dark:text-blue-400">
                    {formatGdpBillions(econ.gdpNominalBillionUSD)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">GDP Per Capita</div>
                  <div className="font-mono-tabular text-lg font-bold text-neutral-950 dark:text-slate-50">
                    {formatUsdInteger(econ.gdpPerCapitaUSD)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Population</div>
                  <div className="font-mono-tabular text-lg font-bold text-neutral-950 dark:text-slate-50">
                    {formatPopulationMillions(econ.populationMillions)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Key Exports</div>
                  <div className="text-xs font-medium text-neutral-800 dark:text-slate-200 truncate mt-0.5">
                    {econ.primaryExports.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>

              <p className="text-base text-neutral-700 dark:text-slate-300 leading-relaxed">
                {localize(country.summary, lang)}
              </p>

              <SpotlightCard className="p-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                    {t(lang, 'continuityNote')}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
                    {localize(country.continuityDistinction, lang)}
                  </p>
                </div>
              </SpotlightCard>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                  {t(lang, 'ancestorsTitle')}
                </h3>
                <div className="space-y-2.5">
                  {country.empiresAndKingdoms.map((emp) => (
                    <div key={emp.name} className="rounded-xl spatial-card p-4 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-slate-100">{emp.name}</span>
                        <span className="font-mono-tabular text-xs text-blue-700 dark:text-blue-400">
                          {emp.period} · {emp.continuityType}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-slate-400">{emp.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <SpotlightCard className="p-5">
                <SpatialTabs
                  value={sideTab}
                  onValueChange={setSideTab}
                  tabs={[
                    { id: 'details', label: 'Culture & Turning Points' },
                    { id: 'live', label: 'Live Encyclopedia' },
                    { id: 'assistant', label: 'Ask Historian' },
                  ]}
                >
                  <SpatialTabContent value="details" className="pt-4 space-y-3 text-sm focus:outline-none">
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Origins: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{localize(country.origins, lang)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Ancient Inhabitants: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{country.ancientInhabitants.join(' · ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Historical Leaders: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{country.historicalLeaders.join(' · ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Wars & Turning Points: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{country.warsAndTurningPoints.join(' · ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Independence & Modern State: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{localize(country.independenceNote, lang)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Languages Across Eras: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{country.languagesHistory.join(' → ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Belief Systems: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{country.beliefSystemsHistory.join(' · ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Architecture: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{country.architectureHighlights.join(' · ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Inventions & Contributions: </span>
                      <span className="text-neutral-600 dark:text-slate-300">
                        {country.inventionsAndContributions.join(' · ')}
                      </span>
                    </div>
                  </SpatialTabContent>

                  <SpatialTabContent value="live" className="pt-4 space-y-4 focus:outline-none">
                    <button
                      type="button"
                      disabled={loadingWiki}
                      onClick={() => loadLiveWiki(country.name.en.split('(')[0].trim(), country.id)}
                      className="tactile-press inline-flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {loadingWiki ? 'Fetching Wikipedia...' : 'Fetch Live Wikipedia Summary'}
                    </button>

                    {wikiBio[country.id] ? (
                      <div className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3.5 space-y-2 text-xs">
                        <div className="font-semibold text-neutral-950 dark:text-slate-50">
                          {wikiBio[country.id]?.title}
                        </div>
                        {wikiBio[country.id]?.imageUrl && (
                          <img
                            src={wikiBio[country.id]!.imageUrl!}
                            alt={wikiBio[country.id]!.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-36 rounded-lg object-cover border border-neutral-200/70 dark:border-slate-800/70"
                          />
                        )}
                        <p className="text-neutral-600 dark:text-slate-300 leading-relaxed">
                          {wikiBio[country.id]?.extract}
                        </p>
                        <a
                          href={wikiBio[country.id]?.wikiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold hover:underline"
                        >
                          Read full article on Wikipedia <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 dark:text-slate-400">
                        Click above to pull live Wikipedia overview and verify contemporary context alongside archived strata.
                      </p>
                    )}

                    <InternetVideoTheater
                      compact={true}
                      filterVideoIds={countryVideoIds}
                      strictSubjectMatch={true}
                      subjectName={localize(country.name, lang)}
                    />
                  </SpatialTabContent>

                  <SpatialTabContent value="assistant" className="pt-4 focus:outline-none">
                    <HistorianAssistant contextName={localize(country.name, lang)} contextType="country" />
                  </SpatialTabContent>
                </SpatialTabs>
              </SpotlightCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function FiguresView() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const favFigures = useAtlasStore((s) => s.progress.favoriteFigures);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setView = useAtlasStore((s) => s.setView);

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<'all' | FigureCategory>('all');
  const [liveBios, setLiveBios] = useState<Record<string, LiveWikiSummary>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HISTORICAL_FIGURES.filter((f) => {
      if (cat !== 'all' && f.category !== cat) return false;
      if (!q) return true;
      return (
        localize(f.name, lang).toLowerCase().includes(q) ||
        f.aliases.some((a) => a.toLowerCase().includes(q)) ||
        f.civilizationOrState.toLowerCase().includes(q) ||
        f.achievements.some((ac) => ac.toLowerCase().includes(q))
      );
    }).sort((a, b) => a.bornYear - b.bornYear);
  }, [query, cat, lang]);

  const loadFigureWiki = async (figId: string, englishName: string) => {
    setLoadingId(figId);
    const data = await fetchLiveWikiSummary(englishName.split('(')[0].trim());
    if (data) {
      setLiveBios((prev) => ({ ...prev, [figId]: data }));
    }
    setLoadingId(null);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-2">
        <div>
          <HeroTitle>
            {t(lang, 'navFigures')} ({HISTORICAL_FIGURES.length})
          </HeroTitle>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-slate-400">
            Rulers, mathematicians, astronomers, philosophers, explorers, and strategists across 4,000 years.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search figures, discoveries, eras..."
            className="rounded-xl spatial-card pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 sm:w-72"
          />
        </div>
      </div>

      <div className="overflow-x-auto max-w-full">
        <SegmentedControl
          size="xs"
          value={cat}
          onChange={setCat}
          options={[
            { value: 'all', label: `All (${HISTORICAL_FIGURES.length})` },
            { value: 'ruler', label: 'Rulers' },
            { value: 'scientist', label: 'Scientists & Math' },
            { value: 'philosopher', label: 'Philosophers' },
            { value: 'strategist', label: 'Strategists' },
            { value: 'explorer', label: 'Explorers' },
            { value: 'artist', label: 'Architects & Artists' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((fig) => {
          const isFav = favFigures.includes(fig.id);
          const bio = liveBios[fig.id];
          return (
            <SpotlightCard key={fig.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono-tabular text-xs text-blue-700 dark:text-blue-400">
                      {formatHistoricalYear(fig.bornYear, lang)} – {formatHistoricalYear(fig.diedYear, lang)} ·{' '}
                      {fig.civilizationOrState}
                    </div>
                    <h2 className="font-display text-2xl font-bold text-neutral-950 dark:text-slate-50 mt-1">
                      {localize(fig.name, lang)}
                    </h2>
                    <div className="text-xs font-medium text-neutral-500 dark:text-slate-400">
                      {localize(fig.role, lang)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFavorite('favoriteFigures', fig.id)}
                    aria-label="Bookmark historical figure"
                    className="tactile-press rounded-xl border border-neutral-300/80 dark:border-slate-700/80 p-2 cursor-pointer"
                  >
                    <Bookmark
                      className={`h-4 w-4 ${isFav ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''}`}
                    />
                  </button>
                </div>

                <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                  {localize(fig.summary, lang)}
                </p>

                <ul className="space-y-1 text-xs text-neutral-600 dark:text-slate-400">
                  {fig.achievements.map((a, idx) => (
                    <li key={idx}>• {a}</li>
                  ))}
                </ul>

                <div className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 text-xs text-neutral-600 dark:text-slate-400">
                  <strong className="text-neutral-900 dark:text-slate-200">Historiography: </strong>
                  {fig.historiographicalNote}
                </div>

                {bio && (
                  <div className="rounded-xl border border-blue-600/40 bg-blue-950/10 p-3 text-xs space-y-2">
                    <div className="flex items-start gap-3">
                      {bio.imageUrl && (
                        <img
                          src={bio.imageUrl}
                          alt={bio.title}
                          referrerPolicy="no-referrer"
                          className="h-20 w-20 rounded-lg object-cover shrink-0 border border-blue-500/30"
                        />
                      )}
                      <div className="space-y-1.5 min-w-0">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                          Wikipedia Archive: {bio.title}
                        </div>
                        <p className="text-neutral-700 dark:text-slate-300 leading-relaxed">{bio.extract}</p>
                      </div>
                    </div>
                    <a
                      href={bio.wikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Open Wikipedia <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear(Math.min(2026, fig.bornYear + 30));
                      setFlyToCoords(fig.coords);
                      setView('explore');
                    }}
                    className="tactile-press inline-flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Globe2 className="h-3.5 w-3.5" />
                    Visit on 3D Globe
                  </button>

                  <button
                    type="button"
                    disabled={loadingId === fig.id}
                    onClick={() => loadFigureWiki(fig.id, fig.name.en)}
                    className="tactile-press inline-flex items-center gap-1.5 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3 py-2 text-xs font-medium hover:border-blue-500/60 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    {loadingId === fig.id ? 'Loading...' : 'Live Wikipedia Bio'}
                  </button>
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </div>
  );
}
