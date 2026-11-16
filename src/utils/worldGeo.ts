import { feature } from 'topojson-client';
import countriesTopo from 'world-atlas/countries-110m.json';
import { CIVILIZATIONS } from '../data/civilizations';
import { COUNTRY_BY_ISO } from '../data/countries';
import type { GeoCoord } from '../types';

export interface WorldCountryFeature {
  isoNumeric: string;
  name: string;
  rings: number[][][]; // array of polygon exterior/interior rings ([lng, lat][])
  centroid: GeoCoord;
  bbox: [number, number, number, number]; // minLng, minLat, maxLng, maxLat
}

let cachedFeatures: WorldCountryFeature[] | null = null;

function computeRingCentroidAndBbox(ring: number[][]): {
  centroid: GeoCoord;
  bbox: [number, number, number, number];
} {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let sumLng = 0;
  let sumLat = 0;

  for (const pt of ring) {
    const lng = pt[0];
    const lat = pt[1];
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    sumLng += lng;
    sumLat += lat;
  }

  const count = Math.max(1, ring.length);
  return {
    centroid: { lat: sumLat / count, lng: sumLng / count },
    bbox: [minLng, minLat, maxLng, maxLat],
  };
}

export function getWorldCountries(): WorldCountryFeature[] {
  if (cachedFeatures) return cachedFeatures;

  const topo = countriesTopo as unknown as Parameters<typeof feature>[0];
  const obj = (countriesTopo as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects
    .countries;
  const geo = feature(topo, obj) as unknown as {
    features: Array<{
      id?: string | number;
      properties?: { name?: string };
      geometry: { type: string; coordinates: unknown };
    }>;
  };

  const results: WorldCountryFeature[] = [];
  for (const f of geo.features) {
    if (!f.geometry) continue;
    const isoNumeric = String(f.id ?? '').padStart(3, '0');
    const name = f.properties?.name ?? `Territory ${isoNumeric}`;
    const rings: number[][][] = [];

    if (f.geometry.type === 'Polygon') {
      const coords = f.geometry.coordinates as number[][][];
      if (coords[0]) rings.push(coords[0]);
    } else if (f.geometry.type === 'MultiPolygon') {
      const polys = f.geometry.coordinates as number[][][][];
      for (const poly of polys) {
        if (poly[0]) rings.push(poly[0]);
      }
    }

    if (rings.length === 0) continue;

    // Pick largest ring for centroid
    let largestRing = rings[0];
    for (const r of rings) {
      if (r.length > largestRing.length) largestRing = r;
    }
    const { centroid, bbox } = computeRingCentroidAndBbox(largestRing);

    results.push({
      isoNumeric,
      name,
      rings,
      centroid,
      bbox,
    });
  }

  cachedFeatures = results;
  return results;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    // Guard anti-meridian wrap edges
    if (Math.abs(xi - xj) > 180) continue;

    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findCountryAtCoords(lat: number, lng: number): WorldCountryFeature | null {
  const countries = getWorldCountries();
  for (const country of countries) {
    for (const ring of country.rings) {
      if (pointInRing(lng, lat, ring)) {
        return country;
      }
    }
  }
  return null;
}

export function getRegionalHistoricalContext(
  country: WorldCountryFeature,
  year: number
): {
  chronicle: (typeof COUNTRY_BY_ISO)[string] | null;
  nearbyCivilizations: typeof CIVILIZATIONS;
} {
  const chronicle = COUNTRY_BY_ISO[country.isoNumeric] ?? null;
  const nearbyCivilizations = CIVILIZATIONS.filter((civ) => {
    const active = year >= civ.startYear && year <= civ.endYear;
    const nearRegion = civ.territoryRegions.some((r) => {
      const dLat = r.center.lat - country.centroid.lat;
      const dLng = r.center.lng - country.centroid.lng;
      return Math.sqrt(dLat * dLat + dLng * dLng) <= r.radiusDeg + 9;
    });
    return active && nearRegion;
  });

  return { chronicle, nearbyCivilizations };
}
