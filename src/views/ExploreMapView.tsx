import { Compass, Maximize2, Minimize2, PanelRightOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ExplorerInspector } from '../components/ExplorerInspector';
import { Globe3D } from '../components/Globe3D';
import { HistoricalMap2D } from '../components/HistoricalMap2D';
import { getEraClassification } from '../components/PrecisionTimelineSlider';
import { TimeMachineDock } from '../components/TimeMachineDock';
import { TooltipHint } from '../components/ui/DesignPrimitives';
import { getActiveCivilizationsForYear } from '../data/civilizations';
import { formatHistoricalYear, localize } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';

export function ExploreMapView({ force2D = false }: { force2D?: boolean }) {
  const mapMode = useAtlasStore((s) => s.mapMode);
  const setMapMode = useAtlasStore((s) => s.setMapMode);
  const inspector = useAtlasStore((s) => s.inspector);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (force2D && mapMode !== '2d') {
      setMapMode('2d');
    }
  }, [force2D, mapMode, setMapMode]);

  const show2D = force2D || mapMode === '2d';
  const activeCivs = getActiveCivilizationsForYear(selectedYear).slice(0, 4);
  const eraName = getEraClassification(selectedYear);

  return (
    <div
      className={`relative w-full overflow-hidden ${
        fullscreen ? 'fixed inset-0 z-50 bg-[#050505]' : 'h-[calc(100vh-3.5rem)]'
      }`}
    >
      {/* Full-Bleed 3D Globe / 2D Atlas Canvas */}
      <div className="absolute inset-0">
        {show2D ? <HistoricalMap2D /> : <Globe3D />}
      </div>

      {/* Top-Left Floating Epoch + Quick-Jump Active Empires */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col items-start gap-2 max-w-[calc(100vw-8rem)]">
        <div className="pointer-events-auto rounded-2xl webgl-hud-surface px-4 py-2.5 flex items-center gap-4">
          <div>
            <div className="text-[10px] font-medium tracking-wider text-neutral-500 dark:text-slate-400">
              {eraName} · {activeCivs.length} Active Powers
            </div>
            <div className="font-mono-tabular text-lg font-bold text-neutral-950 dark:text-slate-50">
              {formatHistoricalYear(selectedYear, lang)}
            </div>
          </div>

          {activeCivs.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 border-l border-neutral-300/60 dark:border-slate-700/70 pl-3">
              {activeCivs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setFlyToCoords(c.capital.coords);
                    setInspector({ type: 'civilization', id: c.id, coords: c.capital.coords });
                  }}
                  className="tactile-press flex items-center gap-1.5 rounded-lg border border-neutral-300/60 dark:border-slate-700/70 px-2.5 py-1 text-[11px] font-medium text-neutral-800 dark:text-slate-200 hover:border-blue-500/70 cursor-pointer whitespace-nowrap"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span>{localize(c.name, lang).split('(')[0].trim()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-Right Controls */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {!inspector && (
          <button
            type="button"
            onClick={() => setInspector({ type: 'country', id: 'turkiye' })}
            className="tactile-press rounded-xl webgl-hud-surface px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 hover:border-blue-500/60 cursor-pointer"
          >
            <PanelRightOpen className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
            Open Inspector
          </button>
        )}
        <TooltipHint label="Focus Anatolia / Constantinople">
          <button
            type="button"
            onClick={() => {
              setFlyToCoords({ lat: 39.9334, lng: 32.8597 });
              setInspector({ type: 'country', id: 'turkiye', coords: { lat: 39.9334, lng: 32.8597 } });
            }}
            aria-label="Center on Türkiye"
            className="tactile-press rounded-xl webgl-hud-surface p-2 text-neutral-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          >
            <Compass className="h-4 w-4" />
          </button>
        </TooltipHint>
        <TooltipHint label={fullscreen ? 'Exit fullscreen' : 'Fullscreen 3D'}>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="tactile-press rounded-xl webgl-hud-surface p-2 text-neutral-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </TooltipHint>
      </div>

      {/* Floating VisionOS Inspector */}
      <ExplorerInspector />

      {/* Bottom Time Machine Dock */}
      <TimeMachineDock />
    </div>
  );
}
