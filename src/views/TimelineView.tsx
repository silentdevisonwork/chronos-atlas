import { HeroTitle } from '../components/ui/VendoredUI';
import {
  Clock3,
  Film,
  Globe2,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EconomicsGdpAtlas } from '../components/EconomicsGdpAtlas';
import { InternetVideoTheater } from '../components/InternetVideoTheater';
import { LiquidTimeline } from '../components/liquid/LiquidTimeline';
import { LiquidButton, LiquidChip, LiquidInput, LiquidPanel } from '../components/liquid/LiquidUI';
import {
  SegmentedControl,
  SpatialTabContent,
  SpatialTabs,
  SpotlightCard,
} from '../components/ui/DesignPrimitives';
import { CIVILIZATIONS } from '../data/civilizations';
import { TIMELINE_EVENTS } from '../data/timeline';
import { EXPANDED_TRADE_NETWORKS, MAJOR_WARS_AND_BATTLES } from '../data/warsAndTrade';
import { formatHistoricalYear, localize } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import type { TimelineEvent } from '../types';

function ActiveYearPill() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  return (
    <div className="glass-surface flex items-center gap-3 rounded-2xl px-4 py-2.5">
      <span className="relative grid h-8 w-8 place-items-center">
        <span className="absolute inset-0 rounded-full border border-[#0a84ff]/35 animate-pulse-soft" />
        <Clock3 className="h-4 w-4 text-[#0a84ff]" />
      </span>
      <div className="leading-none">
        <div className="font-mono-tabular text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
          {formatHistoricalYear(selectedYear, lang)}
        </div>
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-slate-400">
          Active timeline lens
        </div>
      </div>
    </div>
  );
}

export function TimelineView() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setView = useAtlasStore((s) => s.setView);
  const setPlaying = useAtlasStore((s) => s.setTimelinePlaying);

  const [sectionTab, setSectionTab] = useState('timeline');

  useEffect(() => {
    if (sectionTab !== 'timeline') setPlaying(false);
  }, [sectionTab, setPlaying]);

  const [eraFilter, setEraFilter] = useState<'all' | TimelineEvent['era']>('all');
  const [catFilter, setCatFilter] = useState<'all' | TimelineEvent['category']>('all');
  const [momentQuery, setMomentQuery] = useState('');
  const [warQuery, setWarQuery] = useState('');

  const filteredEvents = useMemo(() => {
    const q = momentQuery.trim().toLowerCase();
    return TIMELINE_EVENTS.filter((ev) => {
      if (eraFilter !== 'all' && ev.era !== eraFilter) return false;
      if (catFilter !== 'all' && ev.category !== catFilter) return false;
      if (!q) return true;
      return (
        localize(ev.title, lang).toLowerCase().includes(q) ||
        localize(ev.summary, lang).toLowerCase().includes(q) ||
        ev.locationName.toLowerCase().includes(q) ||
        ev.aliases.some((alias) => alias.toLowerCase().includes(q))
      );
    }).sort((a, b) => a.year - b.year);
  }, [eraFilter, catFilter, momentQuery, lang]);

  const filteredWars = useMemo(() => {
    const q = warQuery.trim().toLowerCase();
    return MAJOR_WARS_AND_BATTLES.filter((w) => {
      if (eraFilter !== 'all' && w.era !== eraFilter) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.locationName.toLowerCase().includes(q) ||
        w.belligerents.some((b) => b.toLowerCase().includes(q)) ||
        w.commanders.some((c) => c.toLowerCase().includes(q)) ||
        w.outcome.toLowerCase().includes(q)
      );
    }).sort((a, b) => a.startYear - b.startYear);
  }, [eraFilter, warQuery]);

  const jumpToEvent = (ev: TimelineEvent) => {
    setSelectedYear(ev.year);
    setFlyToCoords(ev.coords);
    if (ev.countryId) setInspector({ type: 'country', id: ev.countryId, coords: ev.coords });
    else if (ev.civilizationId) setInspector({ type: 'civilization', id: ev.civilizationId, coords: ev.coords });
    setView('explore');
  };

  return (
    <div className="relative mx-auto max-w-[1320px] px-3 pb-28 pt-10 sm:px-6 sm:pt-14">
      <header className="relative mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/35 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/[.05] dark:text-slate-300">
            <Sparkles className="h-3 w-3 text-[#0a84ff]" />
            Chronos engine · v2
          </div>
          <HeroTitle>Time Machine, Wars, Trade Networks & Global GDP</HeroTitle>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-slate-400">
            One continuous, zoomable object across 17,000 years: {CIVILIZATIONS.length} civilizational lifespans, {TIMELINE_EVENTS.length} verified moments, {MAJOR_WARS_AND_BATTLES.length} major wars, {EXPANDED_TRADE_NETWORKS.length} trade arteries and global GDP trajectories.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ActiveYearPill />
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-slate-400">
            <kbd className="liquid-kbd inline-grid h-5 min-w-5 place-items-center rounded-[5px] px-1 font-mono-tabular">Space</kbd>
            play
            <span className="opacity-40">·</span>
            <kbd className="liquid-kbd inline-grid h-5 min-w-5 place-items-center rounded-[5px] px-1 font-mono-tabular">F</kbd>
            fit
            <span className="opacity-40">·</span>
            <kbd className="liquid-kbd inline-grid h-5 min-w-5 place-items-center rounded-[5px] px-1 font-mono-tabular">⌘</kbd>
            + scroll to zoom
          </div>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ['Lifespans', CIVILIZATIONS.length, '#0a84ff'],
          ['Verified moments', TIMELINE_EVENTS.length, '#8b7dff'],
          ['Wars & battles', MAJOR_WARS_AND_BATTLES.length, '#f43f5e'],
          ['Trade arteries', EXPANDED_TRADE_NETWORKS.length, '#0d9488'],
        ].map(([label, value, color]) => (
          <LiquidPanel key={String(label)} className="rounded-2xl px-4 py-3.5">
            <div className="font-display text-2xl font-extrabold tracking-tight" style={{ color: String(color) }}>
              {value}
            </div>
            <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-slate-400">{label}</div>
          </LiquidPanel>
        ))}
      </section>

      <SpatialTabs
        value={sectionTab}
        onValueChange={setSectionTab}
        tabs={[
          { id: 'timeline', label: `Liquid Timeline (${CIVILIZATIONS.length})` },
          { id: 'moments', label: `Moments (${TIMELINE_EVENTS.length})` },
          { id: 'wars', label: `Wars & Battles (${MAJOR_WARS_AND_BATTLES.length})` },
          { id: 'trade-gdp', label: 'Trade Routes & Global GDP' },
          { id: 'videos', label: 'Internet Videos' },
        ]}
      >
        <SpatialTabContent value="timeline" className="pt-2 focus:outline-none">
          <LiquidTimeline />
        </SpatialTabContent>

        <SpatialTabContent value="moments" className="pt-6 space-y-7 focus:outline-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="overflow-x-auto max-w-full">
              <SegmentedControl
                size="xs"
                value={eraFilter}
                onChange={setEraFilter}
                options={[
                  { value: 'all', label: 'All Eras' },
                  { value: 'prehistory', label: 'Prehistory' },
                  { value: 'ancient', label: 'Ancient' },
                  { value: 'classical', label: 'Classical' },
                  { value: 'medieval', label: 'Medieval' },
                  { value: 'early-modern', label: 'Early Modern' },
                  { value: 'modern', label: 'Modern' },
                ]}
              />
            </div>
            <div className="overflow-x-auto max-w-full">
              <SegmentedControl
                size="xs"
                value={catFilter}
                onChange={setCatFilter}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'civilization', label: 'Civilizations' },
                  { value: 'war', label: 'Wars & Treaties' },
                  { value: 'discovery', label: 'Discoveries' },
                  { value: 'monument', label: 'Monuments' },
                  { value: 'astronomy', label: 'Astronomy' },
                ]}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LiquidInput
              value={momentQuery}
              onChange={(event) => setMomentQuery(event.target.value)}
              placeholder="Search moments, places, rulers…"
              leading={<Search className="h-3.5 w-3.5" />}
              className="sm:w-72"
            />
            <div className="flex flex-wrap gap-1.5">
              {['all', 'war', 'discovery', 'monument', 'astronomy'].map((category) => (
                <LiquidChip key={category} active={catFilter === category} onClick={() => setCatFilter(category as typeof catFilter)}>
                  {category === 'all' ? 'Every record' : category}
                </LiquidChip>
              ))}
            </div>
            <span className="ms-auto font-mono-tabular text-[10px] text-neutral-500 dark:text-slate-400">{filteredEvents.length} records</span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredEvents.map((ev) => (
              <SpotlightCard key={ev.id} className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono-tabular font-semibold text-[#0a84ff]">
                      {formatHistoricalYear(ev.year, lang)}
                    </span>
                    <span className="text-neutral-500 dark:text-slate-400">
                      {ev.locationName} · <span className="capitalize">{ev.category}</span>
                    </span>
                  </div>

                  <h3 className="font-display text-2xl font-bold text-neutral-950 dark:text-slate-50">
                    {localize(ev.title, lang)}
                  </h3>

                  {ev.rulerOrKeyFigure && (
                    <div className="text-xs font-medium text-neutral-700 dark:text-slate-300">
                      Key Figure: {ev.rulerOrKeyFigure}
                    </div>
                  )}

                  <p className="text-sm leading-relaxed text-neutral-600 dark:text-slate-300">
                    {localize(ev.summary, lang)}
                  </p>

                  <div className="flex items-start gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[.045] p-3 text-xs text-neutral-600 dark:text-slate-400">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{ev.verifiedFact}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <LiquidButton size="sm" variant="primary" onClick={() => jumpToEvent(ev)}>
                      <Globe2 className="h-3.5 w-3.5" />
                      Travel to {formatHistoricalYear(ev.year, lang)}
                    </LiquidButton>
                    <LiquidButton size="sm" variant="quiet" onClick={() => { setSelectedYear(ev.year); setSectionTab('timeline'); }}>
                      <Clock3 className="h-3.5 w-3.5" />
                      Open in timeline
                    </LiquidButton>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </SpatialTabContent>

        <SpatialTabContent value="wars" className="pt-6 space-y-6 focus:outline-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="overflow-x-auto max-w-full">
              <SegmentedControl
                size="xs"
                value={eraFilter}
                onChange={setEraFilter}
                options={[
                  { value: 'all', label: 'All Eras' },
                  { value: 'ancient', label: 'Ancient' },
                  { value: 'classical', label: 'Classical' },
                  { value: 'medieval', label: 'Medieval' },
                  { value: 'early-modern', label: 'Early Modern' },
                  { value: 'modern', label: 'Modern' },
                ]}
              />
            </div>

            <LiquidInput
              value={warQuery}
              onChange={(event) => setWarQuery(event.target.value)}
              placeholder="Search battles, commanders, treaties…"
              leading={<Search className="h-3.5 w-3.5" />}
              className="sm:w-80"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredWars.map((war) => (
              <SpotlightCard key={war.id} className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-rose-600 dark:text-rose-300">
                      <Swords className="h-3.5 w-3.5" />
                      {formatHistoricalYear(war.startYear, lang)}
                      {war.endYear !== war.startYear ? ` – ${formatHistoricalYear(war.endYear, lang)}` : ''}
                    </span>
                    <span className="truncate text-neutral-500 dark:text-slate-400">{war.locationName}</span>
                  </div>

                  <h3 className="font-display text-2xl font-bold text-neutral-950 dark:text-slate-50">
                    {war.name}
                  </h3>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Belligerents: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{war.belligerents.join(' vs. ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Commanders: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{war.commanders.join(' · ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Scale: </span>
                      <span className="text-neutral-600 dark:text-slate-300">{war.scaleNote}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-slate-100">Outcome: </span>
                      <span className="font-medium text-[#0a84ff] dark:text-[#8ec5ff]">{war.outcome}</span>
                    </div>
                  </div>

                  <p className="border-t border-black/[.06] pt-2.5 text-xs leading-relaxed text-neutral-600 dark:border-white/10 dark:text-slate-400">
                    {war.historicalSignificance}
                  </p>

                  <LiquidButton
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setSelectedYear(war.startYear);
                      setFlyToCoords(war.coords);
                      if (war.relatedCivIds?.[0]) setInspector({ type: 'civilization', id: war.relatedCivIds[0], coords: war.coords });
                      else if (war.relatedCountryIds?.[0]) setInspector({ type: 'country', id: war.relatedCountryIds[0], coords: war.coords });
                      setView('explore');
                    }}
                  >
                    <Globe2 className="h-3.5 w-3.5" />
                    Inspect Theater on 3D Globe
                  </LiquidButton>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </SpatialTabContent>

        <SpatialTabContent value="trade-gdp" className="pt-6 space-y-10 focus:outline-none">
          <section className="space-y-4">
            <div className="flex items-center gap-2 font-mono-tabular text-xs uppercase tracking-widest text-[#0a84ff]">
              <Route className="h-3.5 w-3.5" />
              {EXPANDED_TRADE_NETWORKS.length} Intercontinental Trade Arteries (Rendered Live on 3D Globe)
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {EXPANDED_TRADE_NETWORKS.map((route) => (
                <SpotlightCard key={route.id} className="p-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 font-mono-tabular font-semibold text-[#0a84ff]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
                        {formatHistoricalYear(route.activeFrom, lang)} – {formatHistoricalYear(route.activeTo, lang)}
                      </span>
                      <span className="font-mono-tabular text-neutral-500 dark:text-slate-400">
                        {route.points.length} Waypoints
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-neutral-950 dark:text-slate-50">
                      {route.name}
                    </h3>
                    <div className="text-xs text-neutral-700 dark:text-slate-300">
                      <strong className="text-neutral-900 dark:text-slate-100">Commodities: </strong>
                      {route.commodities.join(' · ')}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-slate-400">
                      <strong className="text-neutral-900 dark:text-slate-200">Hubs: </strong>
                      {route.keyHubs.join(' → ')}
                    </div>
                    <p className="text-xs leading-relaxed text-neutral-600 dark:text-slate-400">
                      {route.economicImpact}
                    </p>
                    <LiquidButton
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        const midYear = Math.min(2025, Math.round((route.activeFrom + route.activeTo) / 2));
                        setSelectedYear(midYear);
                        setFlyToCoords(route.points[Math.floor(route.points.length / 2)]);
                        setView('explore');
                      }}
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                      Trace Corridor on 3D Globe
                    </LiquidButton>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 font-mono-tabular text-xs uppercase tracking-widest text-[#0a84ff]">
              <TrendingUp className="h-3.5 w-3.5" />
              Global & Country GDP Observatory
            </div>
            <EconomicsGdpAtlas />
          </section>
        </SpatialTabContent>

        <SpatialTabContent value="videos" className="pt-6 space-y-6 focus:outline-none">
          <div className="flex items-center gap-2 font-mono-tabular text-xs uppercase tracking-widest text-[#0a84ff]">
            <Film className="h-3.5 w-3.5" />
            Internet Documentary Streams & Built-In Archival Cinema
          </div>
          <InternetVideoTheater />
        </SpatialTabContent>
      </SpatialTabs>
    </div>
  );
}
