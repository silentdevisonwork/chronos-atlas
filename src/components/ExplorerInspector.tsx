import {
  ArrowUpRight,
  Bookmark,
  Compass,
  ExternalLink,
  Globe2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { CIVILIZATIONS } from '../data/civilizations';
import { COUNTRY_BY_ISO, COUNTRY_CHRONICLES } from '../data/countries';
import { INTERNET_VIDEOS } from '../data/internetVideos';
import { EXHIBITION_PLATES, type ExhibitionPlate, type MonumentPresetId } from '../data/media';
import { HISTORICAL_SITES } from '../data/timeline';
import { EXPANDED_TRADE_NETWORKS, MAJOR_WARS_AND_BATTLES } from '../data/warsAndTrade';
import { findCountryEconomics, synthesizeFallbackEconomics } from '../data/worldEconomics';
import { formatHistoricalYear, localize, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import {
  fetchLiveWikiSummary,
  fetchLiveWorldBankMetrics,
  formatGdpBillions,
  formatPopulationMillions,
  formatUsdInteger,
  matchVideoIdsForSubject,
  type LiveWikiSummary,
  type LiveWorldBankMetrics,
} from '../utils/liveEncyclopedia';
import { getRegionalHistoricalContext, getWorldCountries } from '../utils/worldGeo';
import { HistorianAssistant } from './HistorianAssistant';
import { InternetVideoTheater } from './InternetVideoTheater';
import { Monument3DStudio } from './Monument3DStudio';
import { SafeArchivalImage, SpatialTabContent, SpatialTabs } from './ui/DesignPrimitives';
import { ArchivalMediaLightbox } from './ui/HardcorePrimitives';

function inferMonumentPreset(id: string): MonumentPresetId {
  if (id.includes('egypt') || id.includes('giza') || id.includes('inca') || id.includes('peru') || id.includes('mexico')) {
    return 'pyramid-obelisk';
  }
  if (id.includes('sumer') || id.includes('babylon') || id.includes('ur') || id.includes('iraq') || id.includes('iran')) {
    return 'ziggurat-gate';
  }
  if (id.includes('islamic') || id.includes('silk') || id.includes('alexandria') || id.includes('uzbek')) {
    return 'astrolabe-armillary';
  }
  return 'dome-basilica';
}

export function ExplorerInspector() {
  const inspector = useAtlasStore((s) => s.inspector);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setView = useAtlasStore((s) => s.setView);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const favCountries = useAtlasStore((s) => s.progress.favoriteCountries);
  const favCivs = useAtlasStore((s) => s.progress.favoriteCivilizations);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);

  const [tab, setTab] = useState('overview');
  const [lightboxPlate, setLightboxPlate] = useState<ExhibitionPlate | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [liveWiki, setLiveWiki] = useState<LiveWikiSummary | null>(null);
  const [liveWb, setLiveWb] = useState<LiveWorldBankMetrics | null>(null);

  useEffect(() => {
    setLiveWiki(null);
    setLiveWb(null);
    setSyncLoading(false);
  }, [inspector?.type, inspector?.id, inspector?.isoNumeric]);

  if (!inspector) return null;

  const country =
    inspector.type === 'country'
      ? COUNTRY_CHRONICLES.find((c) => c.id === inspector.id) ?? COUNTRY_BY_ISO[inspector.id]
      : null;

  const civ =
    inspector.type === 'civilization'
      ? CIVILIZATIONS.find((c) => c.id === inspector.id)
      : null;

  const site =
    inspector.type === 'site'
      ? HISTORICAL_SITES.find((s) => s.id === inspector.id)
      : null;

  const matchedWorldCountry =
    inspector.type === 'dynamic-country'
      ? getWorldCountries().find((w) => w.isoNumeric === inspector.isoNumeric) ?? null
      : null;

  const worldCountry =
    inspector.type === 'dynamic-country'
      ? matchedWorldCountry ?? {
          isoNumeric: inspector.isoNumeric ?? '000',
          name: inspector.title ?? inspector.id,
          centroid: inspector.coords ?? { lat: 0, lng: 0 },
        }
      : null;

  const dynamicContext = matchedWorldCountry
    ? getRegionalHistoricalContext(matchedWorldCountry, selectedYear)
    : null;

  const econRecord = country
    ? findCountryEconomics(country.isoNumeric, country.name.en)
    : worldCountry
      ? synthesizeFallbackEconomics(worldCountry.isoNumeric, worldCountry.name)
      : null;

  const title = country
    ? localize(country.name, lang)
    : civ
      ? localize(civ.name, lang)
      : site
        ? localize(site.name, lang)
        : inspector.title ?? worldCountry?.name ?? 'Region Explorer';

  const wikiTopic = country
    ? country.name.en === 'Türkiye'
      ? 'Turkey'
      : country.name.en
    : civ
      ? civ.name.en
      : site
        ? site.name.en
        : worldCountry?.name ?? title;

  const handleLiveSync = async () => {
    setSyncLoading(true);
    try {
      const isoForWb = country?.isoAlpha2 ?? econRecord?.isoAlpha3 ?? econRecord?.isoAlpha2 ?? '';
      const [wikiRes, wbRes] = await Promise.all([
        fetchLiveWikiSummary(wikiTopic),
        isoForWb ? fetchLiveWorldBankMetrics(isoForWb) : Promise.resolve(null),
      ]);
      if (wikiRes) setLiveWiki(wikiRes);
      if (wbRes) setLiveWb(wbRes);
    } finally {
      setSyncLoading(false);
    }
  };

  const relatedWars = MAJOR_WARS_AND_BATTLES.filter((w) => {
    if (country && w.relatedCountryIds?.includes(country.id)) return true;
    if (civ && w.relatedCivIds?.includes(civ.id)) return true;
    if (worldCountry) {
      const dLat = Math.abs(w.coords.lat - worldCountry.centroid.lat);
      const dLng = Math.abs(w.coords.lng - worldCountry.centroid.lng);
      return dLat < 10 && dLng < 12;
    }
    return false;
  }).slice(0, 4);

  const relatedTrades = EXPANDED_TRADE_NETWORKS.filter((tr) => {
    const searchStr = `${title} ${country?.capital.en ?? ''} ${econRecord?.capital ?? ''} ${country?.name.en ?? ''}`.toLowerCase();
    return tr.keyHubs.some((h) => searchStr.includes(h.toLowerCase().split(' ')[0])) ||
      tr.points.some((p) => {
        const ref = country?.coords ?? civ?.capital.coords ?? worldCountry?.centroid;
        return ref ? Math.hypot(p.lat - ref.lat, p.lng - ref.lng) < 9 : false;
      });
  }).slice(0, 3);

  const matchedVideoIds = matchVideoIdsForSubject(
    inspector.id,
    [
      title,
      wikiTopic,
      country?.name.en,
      ...(country?.aliases ?? []),
      civ?.name.en,
      ...(civ?.aliases ?? []),
      site?.name.en,
      ...(site?.aliases ?? []),
      worldCountry?.name,
    ],
    INTERNET_VIDEOS
  );

  const matchedPreset = inferMonumentPreset(inspector.id);
  const relatedPlates = EXHIBITION_PLATES.filter(
    (p) =>
      p.inspectorTarget?.id === inspector.id ||
      (site?.countryId && p.inspectorTarget?.id === site.countryId) ||
      (site?.civilizationId && p.inspectorTarget?.id === site.civilizationId)
  ).slice(0, 3);

  const gdpDisplay = liveWb?.gdp?.value
    ? formatGdpBillions(liveWb.gdp.value / 1e9)
    : econRecord
      ? formatGdpBillions(econRecord.gdpNominalBillionUSD)
      : '—';
  const gdpCapitaDisplay = liveWb?.gdpPerCapita?.value
    ? formatUsdInteger(liveWb.gdpPerCapita.value)
    : econRecord
      ? formatUsdInteger(econRecord.gdpPerCapitaUSD)
      : '—';
  const popDisplay = liveWb?.population?.value
    ? formatPopulationMillions(liveWb.population.value / 1e6)
    : econRecord
      ? formatPopulationMillions(econRecord.populationMillions)
      : '—';

  return (
    <>
      <AnimatePresence>
        <motion.aside
          key={`${inspector.type}-${inspector.id}`}
          initial={{ opacity: 0, x: 24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          className="pointer-events-auto absolute right-4 top-16 bottom-36 lg:top-4 lg:bottom-36 z-20 w-[calc(100vw-2rem)] sm:w-[445px] rounded-2xl webgl-hud-surface flex flex-col overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200/70 dark:border-slate-800/70 px-5 py-4 shrink-0">
            <div className="min-w-0">
              <div className="text-[11px] font-mono-tabular text-blue-800 dark:text-blue-400">
                {formatHistoricalYear(selectedYear, lang)}
                {country
                  ? ` · ${country.region}`
                  : civ
                    ? ` · ${localize(civ.eraLabel, lang)}`
                    : econRecord
                      ? ` · ${econRecord.region}`
                      : ''}
              </div>
              <h2 className="font-display text-2xl font-bold text-neutral-950 dark:text-slate-50 leading-tight truncate mt-0.5">
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setInspector(null)}
              aria-label="Close inspector"
              className="rounded-xl p-1.5 text-neutral-500 hover:bg-neutral-200/70 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <SpatialTabs
              value={tab}
              onValueChange={setTab}
              tabs={[
                { id: 'overview', label: 'Overview & GDP' },
                { id: 'strata', label: country ? 'Lineage & Wars' : 'Evidence' },
                { id: 'media3d', label: '3D & Video' },
                { id: 'assistant', label: 'Historian' },
              ]}
            >
              <SpatialTabContent value="overview" className="pt-4 space-y-4 focus:outline-none">
                {country && (
                  <>
                    <SafeArchivalImage
                      src={country.image}
                      wikiTopic={`${localize(country.capital, 'en')} ${country.name.en === 'Türkiye' ? 'Istanbul' : country.name.en}`}
                      alt={localize(country.name, lang)}
                      caption={country.region}
                      attribution={country.imageAttribution}
                      className="w-full h-40 object-cover"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorite('favoriteCountries', country.id)}
                        className="tactile-press flex items-center gap-1.5 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${
                            favCountries.includes(country.id) ? 'fill-blue-600 text-blue-600' : ''
                          }`}
                        />
                        {favCountries.includes(country.id) ? t(lang, 'savedFavorite') : t(lang, 'saveFavorite')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setView('countries')}
                        className="tactile-press flex items-center gap-1 rounded-xl bg-blue-800 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        Full Chronicle
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                      {localize(country.summary, lang)}
                    </p>
                  </>
                )}

                {worldCountry && dynamicContext && (
                  <>
                    <SafeArchivalImage
                      wikiTopic={
                        econRecord?.capital && econRecord.capital !== 'Capital City'
                          ? `${econRecord.capital}, ${worldCountry.name}`
                          : `Architecture of ${worldCountry.name}`
                      }
                      alt={title}
                      caption={`${econRecord?.region ?? 'Global Territory'}${econRecord?.capital && econRecord.capital !== 'Capital City' ? ` · Capital: ${econRecord.capital}` : ''}`}
                      attribution="Wikimedia Commons · Live Subject Archive"
                      className="w-full h-40 object-cover"
                    />
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-slate-400">
                      <Globe2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                      <span className="font-mono-tabular">
                        ISO #{worldCountry.isoNumeric} · {worldCountry.centroid.lat.toFixed(1)}°,{' '}
                        {worldCountry.centroid.lng.toFixed(1)}°
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                      {econRecord?.historicalLineage}
                    </p>
                  </>
                )}

                {econRecord && (country || worldCountry) && (
                  <div className="rounded-xl border border-blue-900/20 dark:border-blue-800/40 bg-blue-950/5 dark:bg-blue-950/25 p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-300">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Macroeconomic & Demographic Profile</span>
                      </div>
                      <button
                        type="button"
                        disabled={syncLoading}
                        onClick={handleLiveSync}
                        className="tactile-press inline-flex items-center gap-1 rounded-lg border border-blue-700/40 dark:border-blue-500/40 px-2 py-1 text-[11px] font-medium text-blue-800 dark:text-blue-300 hover:bg-blue-900/10 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncLoading ? 'animate-spin' : ''}`} />
                        {syncLoading ? 'Syncing...' : 'Live Sync'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white/60 dark:bg-slate-900/70 p-2">
                        <div className="text-[10px] text-neutral-500 dark:text-slate-400">Nominal GDP</div>
                        <div className="font-mono-tabular font-bold text-neutral-950 dark:text-slate-50">
                          {gdpDisplay}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/60 dark:bg-slate-900/70 p-2">
                        <div className="text-[10px] text-neutral-500 dark:text-slate-400">GDP / Capita</div>
                        <div className="font-mono-tabular font-bold text-neutral-950 dark:text-slate-50">
                          {gdpCapitaDisplay}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/60 dark:bg-slate-900/70 p-2">
                        <div className="text-[10px] text-neutral-500 dark:text-slate-400">Population</div>
                        <div className="font-mono-tabular font-bold text-neutral-950 dark:text-slate-50">
                          {popDisplay}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Primary Exports:</span>{' '}
                      {econRecord.primaryExports.join(' · ')}
                    </div>

                    {liveWb && (
                      <div className="text-[10px] font-mono-tabular text-emerald-700 dark:text-emerald-400">
                        Live World Bank API refreshed ({liveWb.gdp?.year ?? liveWb.population?.year ?? 'latest'})
                      </div>
                    )}
                  </div>
                )}

                {country && (
                  <div className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3.5 space-y-2 text-xs">
                    <div className="font-semibold text-neutral-900 dark:text-slate-100">
                      Architectural Landmarks & Innovations
                    </div>
                    <div className="text-neutral-600 dark:text-slate-400">
                      <span className="font-medium text-neutral-800 dark:text-slate-200">Monuments:</span>{' '}
                      {country.architectureHighlights.join(' · ')}
                    </div>
                    <div className="text-neutral-600 dark:text-slate-400">
                      <span className="font-medium text-neutral-800 dark:text-slate-200">Contributions:</span>{' '}
                      {country.inventionsAndContributions.join(' · ')}
                    </div>
                    <div className="text-neutral-600 dark:text-slate-400">
                      <span className="font-medium text-neutral-800 dark:text-slate-200">Languages:</span>{' '}
                      {country.languagesHistory.join(' · ')}
                    </div>
                  </div>
                )}

                {civ && (
                  <>
                    <SafeArchivalImage
                      src={civ.image}
                      wikiTopic={civ.name.en}
                      alt={localize(civ.name, lang)}
                      caption={localize(civ.eraLabel, lang)}
                      attribution={civ.imageAttribution}
                      className="w-full h-40 object-cover"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorite('favoriteCivilizations', civ.id)}
                        className="tactile-press flex items-center gap-1.5 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${
                            favCivs.includes(civ.id) ? 'fill-blue-600 text-blue-600' : ''
                          }`}
                        />
                        {favCivs.includes(civ.id) ? t(lang, 'savedFavorite') : t(lang, 'saveFavorite')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setView('civilizations')}
                        className="tactile-press flex items-center gap-1 rounded-xl bg-blue-800 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        Full Profile
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={syncLoading}
                        onClick={handleLiveSync}
                        className="tactile-press inline-flex items-center gap-1 rounded-xl border border-blue-700/40 px-2.5 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-300 cursor-pointer"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncLoading ? 'animate-spin' : ''}`} />
                        Live Wiki
                      </button>
                    </div>

                    {(civ.peakAreaKm2 || civ.gdpSharePct || civ.peakPopulation) && (
                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-blue-900/20 dark:border-blue-800/40 bg-blue-950/5 dark:bg-blue-950/25 p-3 text-xs">
                        <div>
                          <div className="text-[10px] text-neutral-500 dark:text-slate-400">Peak Territory</div>
                          <div className="font-mono-tabular font-bold text-neutral-950 dark:text-slate-50">
                            {civ.peakAreaKm2 ? `${(civ.peakAreaKm2 / 1e6).toFixed(2)}M km²` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-500 dark:text-slate-400">World GDP Share</div>
                          <div className="font-mono-tabular font-bold text-neutral-950 dark:text-slate-50">
                            {civ.gdpSharePct ? `~${civ.gdpSharePct}%` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-500 dark:text-slate-400">Population</div>
                          <div className="font-mono-tabular font-bold text-neutral-950 dark:text-slate-50">
                            {civ.peakPopulation ?? '—'}
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                      {localize(civ.summary, lang)}
                    </p>

                    <div className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3.5 space-y-2 text-xs">
                      <div className="font-semibold text-neutral-900 dark:text-slate-100">
                        Rulers, Inventions & Trade
                      </div>
                      <div className="text-neutral-600 dark:text-slate-400">
                        <span className="font-medium text-neutral-800 dark:text-slate-200">Notable Rulers:</span>{' '}
                        {civ.rulers.join(' · ')}
                      </div>
                      <div className="text-neutral-600 dark:text-slate-400">
                        <span className="font-medium text-neutral-800 dark:text-slate-200">Key Inventions:</span>{' '}
                        {civ.inventions.join(' · ')}
                      </div>
                      {civ.tradeCommodities && (
                        <div className="text-neutral-600 dark:text-slate-400">
                          <span className="font-medium text-neutral-800 dark:text-slate-200">Trade Exports:</span>{' '}
                          {civ.tradeCommodities.join(' · ')}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {site && (
                  <>
                    <SafeArchivalImage
                      src={site.image}
                      wikiTopic={site.name.en.split('(')[0].split('/')[0].trim()}
                      alt={localize(site.name, lang)}
                      caption={`Founded ${formatHistoricalYear(site.foundedYear, lang)}`}
                      className="w-full h-40 object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                        <span className="font-mono-tabular">
                          {site.coords.lat.toFixed(2)}°, {site.coords.lng.toFixed(2)}°
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{site.category.replace('-', ' ')}</span>
                      </div>
                      <button
                        type="button"
                        disabled={syncLoading}
                        onClick={handleLiveSync}
                        className="tactile-press inline-flex items-center gap-1 rounded-lg border border-blue-700/40 px-2 py-1 text-[11px] font-medium text-blue-800 dark:text-blue-300 cursor-pointer"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncLoading ? 'animate-spin' : ''}`} />
                        Live Wiki
                      </button>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                      {localize(site.summary, lang)}
                    </p>
                    {site.countryId && COUNTRY_CHRONICLES.some((c) => c.id === site.countryId) && (
                      <button
                        type="button"
                        onClick={() => setInspector({ type: 'country', id: site.countryId })}
                        className="tactile-press flex items-center gap-1.5 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3 py-2 text-xs font-medium cursor-pointer"
                      >
                        <Globe2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                        Explore Country Heritage
                      </button>
                    )}
                  </>
                )}

                {liveWiki && (
                  <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/5 dark:bg-emerald-950/20 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Live Wikipedia Encyclopedia · {liveWiki.title}
                      </span>
                      {liveWiki.wikiUrl && (
                        <a
                          href={liveWiki.wikiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          Article <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-neutral-700 dark:text-slate-300 leading-relaxed">{liveWiki.extract}</p>
                  </div>
                )}

                {relatedTrades.length > 0 && (
                  <div className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3.5 space-y-2 text-xs">
                    <div className="font-semibold text-neutral-900 dark:text-slate-100">
                      Connected Global Trade Corridors
                    </div>
                    {relatedTrades.map((tr) => (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => {
                          setSelectedYear(Math.round((tr.activeFrom + tr.activeTo) / 2));
                          setFlyToCoords(tr.points[0]);
                        }}
                        className="block w-full rounded-lg border border-neutral-200/70 dark:border-slate-800/70 p-2 text-left hover:border-blue-600/60 cursor-pointer"
                      >
                        <div className="font-semibold text-neutral-900 dark:text-slate-100">{tr.name}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5">
                          {tr.commodities.slice(0, 3).join(' · ')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SpatialTabContent>

              <SpatialTabContent value="strata" className="pt-4 space-y-3 focus:outline-none">
                {country && (
                  <>
                    <div className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 text-xs text-neutral-600 dark:text-slate-300 space-y-1">
                      <div className="font-semibold text-neutral-900 dark:text-slate-100">
                        {t(lang, 'continuityNote')}
                      </div>
                      <p className="leading-relaxed">{localize(country.continuityDistinction, lang)}</p>
                    </div>
                    <div className="space-y-2">
                      {country.empiresAndKingdoms.map((emp) => (
                        <div
                          key={emp.name}
                          className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-neutral-900 dark:text-slate-100">{emp.name}</span>
                            <span className="font-mono-tabular text-neutral-500 dark:text-slate-400">
                              {emp.period}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-slate-400 leading-relaxed">
                            {emp.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {civ && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{t(lang, 'verifiedFacts')}</span>
                    </div>
                    {civ.verifiedFacts.map((fact, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 text-neutral-700 dark:text-slate-300 leading-relaxed"
                      >
                        {fact}
                      </div>
                    ))}
                  </div>
                )}

                {site && (
                  <div className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3.5 text-xs text-neutral-600 dark:text-slate-300">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      Verified Archaeological Record
                    </div>
                    <p className="leading-relaxed">{site.verifiedFact}</p>
                  </div>
                )}

                {worldCountry && dynamicContext && (
                  <div className="space-y-2">
                    {dynamicContext.nearbyCivilizations.length > 0 ? (
                      dynamicContext.nearbyCivilizations.map((nc) => (
                        <button
                          key={nc.id}
                          type="button"
                          onClick={() =>
                            setInspector({ type: 'civilization', id: nc.id, coords: nc.capital.coords })
                          }
                          className="flex w-full items-center justify-between rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 text-left hover:border-blue-600/60 cursor-pointer"
                        >
                          <div>
                            <div className="text-sm font-semibold">{localize(nc.name, lang)}</div>
                            <div className="text-xs text-neutral-500 dark:text-slate-400">
                              {formatHistoricalYear(nc.startYear, lang)} – {formatHistoricalYear(nc.endYear, lang)}
                            </div>
                          </div>
                          <Compass className="h-4 w-4 text-blue-600 shrink-0" />
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-neutral-500 dark:text-slate-400">
                        Scrub the Time Machine or consult the Historian Assistant to trace earlier eras of {worldCountry.name}.
                      </p>
                    )}
                  </div>
                )}

                {relatedWars.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-neutral-200/70 dark:border-slate-800/70">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-slate-100">
                      <Swords className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Major Regional Wars & Battles</span>
                    </div>
                    {relatedWars.map((war) => (
                      <button
                        key={war.id}
                        type="button"
                        onClick={() => {
                          setSelectedYear(war.startYear);
                          setFlyToCoords(war.coords);
                        }}
                        className="block w-full rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 text-left hover:border-blue-600/60 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-neutral-900 dark:text-slate-100">{war.name}</span>
                          <span className="font-mono-tabular text-blue-700 dark:text-blue-400">
                            {formatHistoricalYear(war.startYear, lang)}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-slate-400 leading-relaxed">
                          {war.outcome}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </SpatialTabContent>

              <SpatialTabContent value="media3d" className="pt-4 space-y-4 focus:outline-none">
                <Monument3DStudio
                  preset={matchedPreset}
                  compact={true}
                  heightClass="h-[240px]"
                  onInspectPlate={(p) => setLightboxPlate(p)}
                />

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-slate-100">
                    Internet Documentary Videos & Motion Reel
                  </div>
                  <InternetVideoTheater
                    compact={true}
                    filterVideoIds={matchedVideoIds}
                    strictSubjectMatch={true}
                    subjectName={title}
                  />
                </div>

                {relatedPlates.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-slate-100">
                      Archival Plates & Structural Dossiers
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {relatedPlates.map((plate) => (
                        <button
                          key={plate.id}
                          type="button"
                          onClick={() => setLightboxPlate(plate)}
                          className="flex items-center gap-3 rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-2 text-left hover:border-blue-500/60 cursor-pointer"
                        >
                          <img
                            src={plate.src}
                            alt={plate.title}
                            referrerPolicy="no-referrer"
                            className="h-14 w-20 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono-tabular text-blue-700 dark:text-blue-400">
                              {plate.accessionId} · {plate.yearLabel}
                            </div>
                            <div className="text-xs font-semibold text-neutral-900 dark:text-slate-100 truncate">
                              {plate.title}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-slate-400 truncate">
                              {plate.dimensions}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </SpatialTabContent>

              <SpatialTabContent value="assistant" className="pt-4 focus:outline-none">
                <HistorianAssistant contextName={title} contextType={inspector.type} />
              </SpatialTabContent>
            </SpatialTabs>
          </div>
        </motion.aside>
      </AnimatePresence>

      <ArchivalMediaLightbox
        plate={lightboxPlate}
        onClose={() => setLightboxPlate(null)}
        onOpenIn3DGlobe={(p) => {
          setSelectedYear(p.year);
          setFlyToCoords(p.coords);
        }}
      />
    </>
  );
}
