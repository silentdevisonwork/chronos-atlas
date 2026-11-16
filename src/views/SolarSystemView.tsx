import { Bookmark, Orbit, PanelRightOpen, Rocket, Telescope, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { DocumentaryVideoPlayer } from '../components/DocumentaryVideoPlayer';
import { HistorianAssistant } from '../components/HistorianAssistant';
import { Monument3DStudio } from '../components/Monument3DStudio';
import { SolarSystem3D } from '../components/SolarSystem3D';
import { SpatialTabContent, SpatialTabs } from '../components/ui/DesignPrimitives';
import { ArchivalMediaLightbox } from '../components/ui/HardcorePrimitives';
import { EXHIBITION_PLATES, type ExhibitionPlate } from '../data/media';
import { SOLAR_SYSTEM_BODIES } from '../data/solarSystem';
import { localize } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';

export function SolarSystemView() {
  const selectedPlanetId = useAtlasStore((s) => s.selectedPlanetId);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const favPlanets = useAtlasStore((s) => s.progress.favoritePlanets);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState('telemetry');
  const [lightboxPlate, setLightboxPlate] = useState<ExhibitionPlate | null>(null);

  const body =
    SOLAR_SYSTEM_BODIES.find((b) => b.id === selectedPlanetId) ?? SOLAR_SYSTEM_BODIES[3];
  const isFav = favPlanets.includes(body.id);
  const spacePlate = EXHIBITION_PLATES.find((p) => p.id === 'plate-saturn') ?? EXHIBITION_PLATES[0];

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-[#050505]">
      {/* Full-Bleed 3D Planetarium Canvas */}
      <div className="absolute inset-0">
        <SolarSystem3D />
      </div>

      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="tactile-press absolute right-4 top-16 z-20 rounded-xl webgl-hud-surface px-3.5 py-2 text-xs font-medium text-slate-100 flex items-center gap-1.5 cursor-pointer hover:border-blue-500/60"
        >
          <PanelRightOpen className="h-3.5 w-3.5 text-blue-400" />
          Telemetry Sheet
        </button>
      )}

      {/* Floating VisionOS Planetary Telemetry Sheet */}
      <AnimatePresence>
        {panelOpen && (
          <motion.aside
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="pointer-events-auto absolute right-4 top-16 bottom-28 z-20 w-[calc(100vw-2rem)] sm:w-[420px] rounded-2xl webgl-hud-surface flex flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200/70 dark:border-slate-800/70 px-5 py-4 shrink-0">
              <div>
                <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  {body.type.replace('-', ' ')} · {body.orbitDistanceAU} AU
                </div>
                <h2 className="font-display text-3xl font-bold text-neutral-950 dark:text-slate-50 leading-tight mt-0.5">
                  {localize(body.name, lang)}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFavorite('favoritePlanets', body.id)}
                  aria-label="Bookmark celestial body"
                  className="tactile-press rounded-xl border border-neutral-300/80 dark:border-slate-700/80 p-2 cursor-pointer"
                >
                  <Bookmark
                    className={`h-4 w-4 ${isFav ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close telemetry sheet"
                  className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-200/70 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <SpatialTabs
                value={tab}
                onValueChange={setTab}
                tabs={[
                  { id: 'telemetry', label: 'Telemetry' },
                  { id: 'missions', label: 'Missions' },
                  { id: 'media3d', label: '3D Probe & Reel' },
                  { id: 'assistant', label: 'Astronomer' },
                ]}
              >
                <SpatialTabContent value="telemetry" className="pt-4 space-y-4 focus:outline-none">
                  <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                    {localize(body.summary, lang)}
                  </p>

                  <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200/80 dark:border-slate-800/80 p-4 text-xs">
                    <div>
                      <dt className="text-neutral-500 dark:text-slate-400">Diameter</dt>
                      <dd className="font-mono-tabular text-sm font-semibold mt-0.5">
                        {body.diameterKm.toLocaleString()} km
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 dark:text-slate-400">Orbital Period</dt>
                      <dd className="font-mono-tabular text-sm font-semibold mt-0.5">
                        {body.orbitalPeriodDays === 0 ? 'Barycenter' : `${body.orbitalPeriodDays.toLocaleString()} d`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 dark:text-slate-400">Mean Temp</dt>
                      <dd className="font-mono-tabular text-sm font-semibold mt-0.5">{body.meanTempC} °C</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 dark:text-slate-400">Surface Gravity</dt>
                      <dd className="font-mono-tabular text-sm font-semibold mt-0.5">{body.gravityMs2} m/s²</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 dark:text-slate-400">Known Moons</dt>
                      <dd className="font-mono-tabular text-sm font-semibold mt-0.5">{body.moonsCount}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 dark:text-slate-400">Axial Tilt</dt>
                      <dd className="font-mono-tabular text-sm font-semibold mt-0.5">{body.axialTiltDeg}°</dd>
                    </div>
                  </dl>

                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-neutral-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Orbit className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Atmosphere & Composition
                    </div>
                    <p className="text-neutral-600 dark:text-slate-400 leading-relaxed">{body.atmosphere}</p>
                  </div>
                </SpatialTabContent>

                <SpatialTabContent value="missions" className="pt-4 space-y-4 focus:outline-none">
                  <div className="text-xs space-y-1.5">
                    <div className="font-semibold text-neutral-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Telescope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Historical Discoveries
                    </div>
                    <p className="text-neutral-600 dark:text-slate-400 leading-relaxed">
                      {body.historicalDiscoveries}
                    </p>
                    <p className="text-neutral-500 dark:text-slate-400">
                      Key Astronomers: {body.astronomers.join(' · ')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Rocket className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Space Exploration Missions
                    </div>
                    {body.spaceMissions.map((m) => (
                      <div
                        key={m.name}
                        className="rounded-xl border border-neutral-200/80 dark:border-slate-800/80 p-3 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-900 dark:text-slate-100">{m.name}</span>
                          <span className="font-mono-tabular text-blue-700 dark:text-blue-400">
                            {m.year} · {m.agency}
                          </span>
                        </div>
                        <p className="text-neutral-600 dark:text-slate-400">{m.milestone}</p>
                      </div>
                    ))}
                  </div>
                </SpatialTabContent>

                <SpatialTabContent value="media3d" className="pt-4 space-y-4 focus:outline-none">
                  <button
                    type="button"
                    onClick={() => setLightboxPlate(spacePlate)}
                    className="group relative block w-full overflow-hidden rounded-xl border border-neutral-200/80 dark:border-slate-800/80 cursor-pointer text-left"
                  >
                    <img
                      src={spacePlate.src}
                      alt={spacePlate.title}
                      referrerPolicy="no-referrer"
                      className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-3 right-3 text-xs text-white font-semibold">
                      {spacePlate.title} · <span className="text-blue-300 font-normal">Inspect Plate</span>
                    </div>
                  </button>

                  <Monument3DStudio
                    preset="voyager-probe"
                    compact={true}
                    heightClass="h-[235px]"
                    onInspectPlate={(p) => setLightboxPlate(p)}
                  />

                  <DocumentaryVideoPlayer initialReelId="reel-observatories" compact={true} />
                </SpatialTabContent>

                <SpatialTabContent value="assistant" className="pt-4 focus:outline-none">
                  <HistorianAssistant contextName={localize(body.name, lang)} contextType="astronomy" />
                </SpatialTabContent>
              </SpatialTabs>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <ArchivalMediaLightbox
        plate={lightboxPlate}
        onClose={() => setLightboxPlate(null)}
        onOpenIn3DGlobe={() => setLightboxPlate(null)}
      />
    </div>
  );
}
