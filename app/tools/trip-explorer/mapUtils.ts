import type { WikiPlace } from './MapView';

export type MapBasemap = 'dark' | 'light' | 'satellite';

export const BASEMAP_OPTIONS: { id: MapBasemap; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'satellite', label: 'Satellite' },
];

export const BASEMAP_TILES: Record<MapBasemap, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
};

export function latLonPolyString(pts: [number, number][], maxPts = 60): string {
  if (pts.length < 3) return '';
  const step = Math.max(1, Math.ceil(pts.length / maxPts));
  return pts
    .filter((_, i) => i % step === 0)
    .map(([lat, lon]) => `${lat.toFixed(5)} ${lon.toFixed(5)}`)
    .join(' ');
}

export function polygonCentroid(pts: [number, number][]): [number, number] {
  if (!pts.length) return [0, 0];
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lon = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lat, lon];
}

export interface HeatCell {
  lat: number;
  lon: number;
  count: number;
  intensity: number;
}

export function computeHeatCells(places: WikiPlace[]): HeatCell[] {
  if (places.length < 2) return [];
  const CELL = 0.007;
  const bins = new Map<string, HeatCell>();
  for (const p of places) {
    const gx = Math.floor(p.lat / CELL);
    const gy = Math.floor(p.lon / CELL);
    const key = `${gx},${gy}`;
    const hit = bins.get(key);
    if (hit) hit.count += 1;
    else {
      bins.set(key, {
        lat: (gx + 0.5) * CELL,
        lon: (gy + 0.5) * CELL,
        count: 1,
        intensity: 0,
      });
    }
  }
  const max = Math.max(1, ...[...bins.values()].map(b => b.count));
  return [...bins.values()].map(b => ({ ...b, intensity: b.count / max }));
}

export function heatColor(intensity: number): string {
  if (intensity > 0.75) return '#ef4444';
  if (intensity > 0.5) return '#f97316';
  if (intensity > 0.25) return '#eab308';
  return '#3b82f6';
}

export type ExploreSearchMode = 'radius' | 'zone' | 'draw';

export interface TripItinerary {
  days: [string[], string[], string[]];
}

export const ITIN_KEY = 'discover_itinerary_v1';

export function loadItinerary(): TripItinerary {
  try {
    const raw = JSON.parse(localStorage.getItem(ITIN_KEY) || '{}') as TripItinerary;
    if (raw?.days?.length === 3) return raw;
  } catch { /* ignore */ }
  return { days: [[], [], []] };
}

export function saveItinerary(itin: TripItinerary) {
  localStorage.setItem(ITIN_KEY, JSON.stringify(itin));
}

export function encodeTripShareUrl(
  origin: string,
  favorites: WikiPlace[],
  itinerary: TripItinerary,
): string {
  const used = new Set(itinerary.days.flat());
  const places = favorites
    .filter(f => used.has(f.uid))
    .map(p => ({
      u: p.uid,
      t: p.title,
      a: p.lat,
      o: p.lon,
      c: p.category,
      x: p.color,
      s: p.source,
      th: p.thumbnail,
    }));
  const payload = { d: itinerary.days, p: places };
  const b64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${origin}/tools/trip-explorer?trip=${b64}`;
}

export function decodeTripFromUrl(
  tripParam: string,
): { itinerary: TripItinerary; places: WikiPlace[] } | null {
  try {
    let b64 = tripParam.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const data = JSON.parse(atob(b64)) as {
      d: [string[], string[], string[]];
      p: { u: string; t: string; a: number; o: number; c: string; x: string; s: 'wiki' | 'osm'; th?: string }[];
    };
    if (!data.d || data.d.length !== 3) return null;
    const places: WikiPlace[] = (data.p ?? []).map(p => ({
      uid: p.u,
      pageid: parseInt(p.u.split(':')[1] ?? '0', 10) || 0,
      title: p.t,
      lat: p.a,
      lon: p.o,
      dist: 0,
      category: p.c,
      color: p.x,
      source: p.s,
      thumbnail: p.th,
    }));
    return { itinerary: { days: data.d }, places };
  } catch {
    return null;
  }
}
