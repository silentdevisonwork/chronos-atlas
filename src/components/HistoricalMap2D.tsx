import { memo, useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getActiveCivilizationsForYear } from '../data/civilizations';
import { COUNTRY_BY_ISO } from '../data/countries';
import { HISTORICAL_SITES, TRADE_ROUTES } from '../data/timeline';
import { formatHistoricalYear, localize } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import type { GeoCoord, LanguageCode } from '../types';
import { getWorldCountries } from '../utils/worldGeo';

function project2D(lat: number, lng: number): [number, number] {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return [x, y];
}

const StaticCountriesLayer = memo(function StaticCountriesLayer({
  lang,
  zoom,
  onHover,
  onSelectCountry,
}: {
  lang: LanguageCode;
  zoom: number;
  onHover: (name: string | null) => void;
  onSelectCountry: (
    isoNumeric: string,
    name: string,
    centroid: GeoCoord
  ) => void;
}) {
  const countryPaths = useMemo(() => {
    return getWorldCountries().map((country) => {
      const chronicle = COUNTRY_BY_ISO[country.isoNumeric];
      const pathData = country.rings
        .map(
          (ring) =>
            ring
              .map(([lng, lat], idx) => {
                const [x, y] = project2D(lat, lng);
                return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ') + ' Z'
        )
        .join(' ');
      return {
        isoNumeric: country.isoNumeric,
        name: country.name,
        centroid: country.centroid,
        chronicle,
        pathData,
      };
    });
  }, []);

  return (
    <>
      {countryPaths.map((c) => {
        const displayName = c.chronicle ? localize(c.chronicle.name, lang) : c.name;
        return (
          <path
            key={c.isoNumeric}
            d={c.pathData}
            onMouseEnter={() => onHover(displayName)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelectCountry(c.isoNumeric, c.name, c.centroid)}
            className="fill-[#eef1f5] dark:fill-[#152036] stroke-slate-400/50 dark:stroke-slate-600/40 hover:fill-blue-200 dark:hover:fill-blue-900/70 transition-colors cursor-pointer"
            strokeWidth={0.5 / zoom}
          />
        );
      })}
    </>
  );
});

export function HistoricalMap2D() {
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const recordExploredLocation = useAtlasStore((s) => s.recordExploredLocation);

  const [zoom, setZoom] = useState(1.25);
  const [pan, setPan] = useState({ x: -120, y: -40 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const activeCivs = useMemo(() => getActiveCivilizationsForYear(selectedYear), [selectedYear]);
  const project = project2D;

  const handleSelectCountry = useMemo(
    () => (isoNumeric: string, name: string, centroid: GeoCoord) => {
      const chronicle = COUNTRY_BY_ISO[isoNumeric];
      if (chronicle) {
        recordExploredLocation(chronicle.id);
        setInspector({ type: 'country', id: chronicle.id, coords: chronicle.coords });
      } else {
        recordExploredLocation(`iso-${isoNumeric}`);
        setInspector({
          type: 'dynamic-country',
          id: isoNumeric,
          isoNumeric,
          title: name,
          coords: centroid,
        });
      }
    },
    [recordExploredLocation, setInspector]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dbe3ee] dark:bg-[#050b18] select-none">
      {/* Map Controls */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5 rounded-xl webgl-hud-surface p-1.5">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(4.5, z * 1.25))}
          aria-label="Zoom in map"
          className="rounded-lg p-2 hover:bg-neutral-200/70 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, z / 1.25))}
          aria-label="Zoom out map"
          className="rounded-lg p-2 hover:bg-neutral-200/70 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1.25);
            setPan({ x: -120, y: -40 });
          }}
          aria-label="Reset map view"
          className="rounded-lg p-2 hover:bg-neutral-200/70 dark:hover:bg-slate-800 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {hoveredCountry && (
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-xl webgl-hud-surface px-3.5 py-2 text-xs font-semibold">
          {hoveredCountry} · {formatHistoricalYear(selectedYear, lang)}
        </div>
      )}

      <svg
        viewBox="0 0 1000 500"
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          setDragging(true);
          setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          setPan({ x: e.clientX - dragOrigin.x, y: e.clientY - dragOrigin.y });
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <StaticCountriesLayer
            lang={lang}
            zoom={zoom}
            onHover={setHoveredCountry}
            onSelectCountry={handleSelectCountry}
          />

          {activeCivs.map((civ) =>
            civ.territoryRegions.map((reg, i) => {
              const [cx, cy] = project(reg.center.lat, reg.center.lng);
              const r = (reg.radiusDeg / 180) * 500;
              return (
                <g key={`${civ.id}-${i}`} className="pointer-events-none">
                  <circle cx={cx} cy={cy} r={r} fill={civ.color} fillOpacity={0.22} stroke={civ.color} strokeOpacity={0.5} strokeWidth={0.8 / zoom} />
                </g>
              );
            })
          )}

          {TRADE_ROUTES.filter((r) => selectedYear >= r.activeFrom && selectedYear <= r.activeTo).map((route) => {
            const d = route.points
              .map((pt, idx) => {
                const [x, y] = project(pt.lat, pt.lng);
                return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <path
                key={route.id}
                d={d}
                fill="none"
                stroke={route.color}
                strokeWidth={1.6 / zoom}
                strokeDasharray="3 2"
                strokeOpacity={0.85}
                className="pointer-events-none"
              />
            );
          })}

          {HISTORICAL_SITES.filter((s) => selectedYear >= s.foundedYear - 50).map((site) => {
            const [x, y] = project(site.coords.lat, site.coords.lng);
            return (
              <g
                key={site.id}
                transform={`translate(${x}, ${y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  recordExploredLocation(site.id);
                  setInspector({ type: 'site', id: site.id, coords: site.coords });
                }}
                className="cursor-pointer"
              >
                <circle r={4 / zoom} fill="#d1d1d6" stroke="#ffffff" strokeWidth={1 / zoom} />
                <text
                  x={6 / zoom}
                  y={2 / zoom}
                  fontSize={9 / zoom}
                  className="fill-neutral-900 dark:fill-slate-100 font-medium"
                >
                  {localize(site.name, lang).split('/')[0].trim()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
