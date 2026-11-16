import { ArrowUpDown, Globe2, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { COUNTRY_BY_ISO } from '../data/countries';
import { GLOBAL_HISTORICAL_GDP_TIMELINE } from '../data/warsAndTrade';
import { findCountryEconomics, synthesizeFallbackEconomics } from '../data/worldEconomics';
import { useAtlasStore } from '../store/useAtlasStore';
import {
  fetchLiveWorldBankMetrics,
  formatGdpBillions,
  formatPopulationMillions,
  formatUsdInteger,
  type LiveWorldBankMetrics,
} from '../utils/liveEncyclopedia';
import { getWorldCountries } from '../utils/worldGeo';
import { SpotlightCard } from './ui/DesignPrimitives';

type SortKey = 'gdp' | 'perCapita' | 'population' | 'formation' | 'name';

const SHARE_SEGMENTS = [
  { key: 'china' as const, label: 'China', color: '#2563EB' },
  { key: 'india' as const, label: 'India / South Asia', color: '#0EA5E9' },
  { key: 'westernEurope' as const, label: 'Western Europe', color: '#1E40AF' },
  { key: 'westAsiaNorthAfrica' as const, label: 'West Asia & N. Africa', color: '#6366F1' },
  { key: 'northAmerica' as const, label: 'North America', color: '#38BDF8' },
  { key: 'restOfWorld' as const, label: 'Rest of World', color: '#475569' },
];

export function EconomicsGdpAtlas() {
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setView = useAtlasStore((s) => s.setView);

  const [selectedEpochIdx, setSelectedEpochIdx] = useState(GLOBAL_HISTORICAL_GDP_TIMELINE.length - 1);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('gdp');
  const [liveOverrides, setLiveOverrides] = useState<Record<string, LiveWorldBankMetrics>>({});
  const [syncingIso, setSyncingIso] = useState<string | null>(null);

  const activeMilestone = GLOBAL_HISTORICAL_GDP_TIMELINE[selectedEpochIdx];

  const allCountryRows = useMemo(() => {
    const features = getWorldCountries();
    return features.map((f) => {
      const econ = findCountryEconomics(f.isoNumeric, f.name) ?? synthesizeFallbackEconomics(f.isoNumeric, f.name);
      const live = econ.isoAlpha2 ? liveOverrides[econ.isoAlpha2] : undefined;
      const gdpB = live?.gdp?.value ? live.gdp.value / 1e9 : econ.gdpNominalBillionUSD;
      const gdpPc = live?.gdpPerCapita?.value ?? econ.gdpPerCapitaUSD;
      const popM = live?.population?.value ? live.population.value / 1e6 : econ.populationMillions;
      const chronicle = COUNTRY_BY_ISO[f.isoNumeric];
      return {
        feature: f,
        econ,
        gdpB,
        gdpPc,
        popM,
        isLive: Boolean(live),
        chronicle,
      };
    });
  }, [liveOverrides]);

  const regions = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const row of allCountryRows) set.add(row.econ.region);
    return Array.from(set);
  }, [allCountryRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allCountryRows.filter((row) => {
      if (regionFilter !== 'All' && row.econ.region !== regionFilter) return false;
      if (q) {
        return (
          row.feature.name.toLowerCase().includes(q) ||
          row.econ.capital.toLowerCase().includes(q) ||
          row.econ.region.toLowerCase().includes(q) ||
          row.econ.primaryExports.some((e) => e.toLowerCase().includes(q)) ||
          row.econ.historicalLineage.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'gdp') return b.gdpB - a.gdpB;
      if (sortBy === 'perCapita') return b.gdpPc - a.gdpPc;
      if (sortBy === 'population') return b.popM - a.popM;
      if (sortBy === 'formation') return a.econ.formationYear - b.econ.formationYear;
      return a.feature.name.localeCompare(b.feature.name);
    });
  }, [allCountryRows, regionFilter, search, sortBy]);

  const totalWorldGdpB = useMemo(
    () => allCountryRows.reduce((sum, r) => sum + Math.max(0, r.gdpB), 0),
    [allCountryRows]
  );

  const handleSyncWorldBank = async (isoAlpha?: string) => {
    if (!isoAlpha) return;
    setSyncingIso(isoAlpha);
    const data = await fetchLiveWorldBankMetrics(isoAlpha);
    if (data) {
      setLiveOverrides((prev) => ({ ...prev, [isoAlpha]: data }));
    }
    setSyncingIso(null);
  };

  return (
    <div className="space-y-8">
      {/* Macro Historical GDP Share Visualizer (1 CE -> 2025 CE) */}
      <SpotlightCard className="p-5 sm:p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono-tabular uppercase tracking-widest text-blue-700 dark:text-blue-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Maddison Historical GDP Trajectory (1 CE – 2025 CE)
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-950 dark:text-slate-50 mt-1">
                Global Economic Output Across Two Millennia
              </h2>
            </div>

            <div className="text-right font-mono-tabular">
              <div className="text-xs text-neutral-500 dark:text-slate-400">Tracked Country Economies</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {allCountryRows.length} Territories · ${(totalWorldGdpB / 1000).toFixed(1)}T Combined
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {GLOBAL_HISTORICAL_GDP_TIMELINE.map((m, idx) => (
              <button
                key={m.year}
                type="button"
                onClick={() => setSelectedEpochIdx(idx)}
                className={`rounded-xl px-3 py-1.5 font-mono-tabular text-xs font-semibold transition-colors cursor-pointer ${
                  idx === selectedEpochIdx
                    ? 'bg-blue-800 text-white dark:bg-blue-600'
                    : 'border border-neutral-300/70 dark:border-slate-700/80 text-neutral-700 dark:text-slate-300 hover:border-blue-500/60'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Interactive Stacked SVG Distribution Bar + Timeline Trend */}
          <div className="space-y-3">
            <div className="h-7 w-full overflow-hidden rounded-xl border border-neutral-200/80 dark:border-slate-800 flex">
              {SHARE_SEGMENTS.map((seg) => {
                const pct = activeMilestone.sharesPct[seg.key];
                return (
                  <div
                    key={seg.key}
                    style={{ width: `${pct}%`, backgroundColor: seg.color }}
                    title={`${seg.label}: ${pct}%`}
                    className="h-full flex items-center justify-center text-[10px] font-mono-tabular font-semibold text-white transition-all duration-300 overflow-hidden"
                  >
                    {pct >= 9 ? `${pct}%` : ''}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {SHARE_SEGMENTS.map((seg) => (
                <div key={seg.key} className="rounded-xl border border-neutral-200/70 dark:border-slate-800/80 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-neutral-600 dark:text-slate-300 truncate">{seg.label}</span>
                  </div>
                  <div className="font-mono-tabular text-base font-bold text-neutral-950 dark:text-white mt-0.5">
                    {activeMilestone.sharesPct[seg.key]}%
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-100/80 dark:bg-slate-900/60 px-4 py-3 text-xs">
              <span className="text-neutral-700 dark:text-slate-300 leading-relaxed">{activeMilestone.note}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedYear(activeMilestone.year);
                  setView('explore');
                }}
                className="tactile-press inline-flex items-center gap-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 px-3 py-1.5 font-semibold text-white shrink-0 cursor-pointer"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Inspect {activeMilestone.label} World
              </button>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* Complete World Country GDP, Population & Historical Lineage Directory */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter all 177+ countries, exports, ancestors..."
                className="rounded-xl spatial-card pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 sm:w-80"
              />
            </div>

            <select
              aria-label="Filter by region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="rounded-xl spatial-card px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-neutral-500 dark:text-slate-400">Sort by:</span>
            <select
              aria-label="Sort countries"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-xl spatial-card px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gdp">Nominal GDP (Highest)</option>
              <option value="perCapita">GDP Per Capita (Highest)</option>
              <option value="population">Population (Largest)</option>
              <option value="formation">Formation Year (Oldest)</option>
              <option value="name">Country Name (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl spatial-card">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200/80 dark:border-slate-800/80 text-neutral-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">Country / Territory</th>
                <th className="py-3 px-3">Region & Capital</th>
                <th className="py-3 px-3 text-right">GDP (Nominal)</th>
                <th className="py-3 px-3 text-right">GDP / Capita</th>
                <th className="py-3 px-3 text-right">Population</th>
                <th className="py-3 px-3">Key Exports & Historical Lineage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-slate-800/60">
              {filteredRows.map(({ feature, econ, gdpB, gdpPc, popM, isLive, chronicle }) => (
                <tr
                  key={`${feature.isoNumeric}-${feature.name}`}
                  className="hover:bg-blue-950/5 dark:hover:bg-blue-950/30 transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-neutral-950 dark:text-slate-100 whitespace-nowrap">
                    <div>{feature.name}</div>
                    <div className="text-[10px] font-mono-tabular font-normal text-neutral-500 dark:text-slate-400">
                      ISO #{feature.isoNumeric} · Formed {econ.formationYear}
                      {isLive ? ' · Live World Bank' : ''}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-neutral-600 dark:text-slate-300">
                    <div>{econ.region}</div>
                    <div className="text-[11px] text-neutral-500 dark:text-slate-400">{econ.capital}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono-tabular font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {formatGdpBillions(gdpB)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-tabular text-neutral-800 dark:text-slate-200 whitespace-nowrap">
                    {formatUsdInteger(gdpPc)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-tabular text-neutral-700 dark:text-slate-300 whitespace-nowrap">
                    {formatPopulationMillions(popM)}
                  </td>
                  <td className="py-3 px-3 max-w-sm">
                    <div className="text-neutral-800 dark:text-slate-200 font-medium truncate">
                      {econ.primaryExports.join(' · ')}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-slate-400 line-clamp-1">
                      {econ.historicalLineage}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                    {econ.isoAlpha2 && (
                      <button
                        type="button"
                        onClick={() => handleSyncWorldBank(econ.isoAlpha2)}
                        disabled={syncingIso === econ.isoAlpha2}
                        title="Fetch live World Bank GDP"
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-300/80 dark:border-slate-700/80 px-2 py-1 text-[11px] font-medium hover:border-blue-500/60 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${syncingIso === econ.isoAlpha2 ? 'animate-spin' : ''}`}
                        />
                        Live
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFlyToCoords(feature.centroid);
                        if (chronicle) {
                          setInspector({ type: 'country', id: chronicle.id, coords: feature.centroid });
                        } else {
                          setInspector({
                            type: 'dynamic-country',
                            id: `world-${feature.isoNumeric}-${feature.name}`,
                            isoNumeric: feature.isoNumeric,
                            title: feature.name,
                            coords: feature.centroid,
                          });
                        }
                        setView('explore');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-800 hover:bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                    >
                      <Globe2 className="h-3 w-3" />
                      3D Globe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
