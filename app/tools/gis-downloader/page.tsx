'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import osmtogeojson from 'osmtogeojson';
import styles from './page.module.css';
import type { Bbox } from './MapPanel';

const MapPanel = dynamic(() => import('./MapPanel'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

// ─── Types ──────────────────────────────────────────────────────────────────
type DlStatus = 'idle' | 'loading' | 'done' | 'error';
type Format   = 'geojson' | 'csv' | 'kml' | 'shapefile';
type Stage    = 'no-area' | 'has-area' | 'scanning' | 'scanned';
type ScanVal  = 'scanning' | 'error' | number;

interface Layer { id: string; label: string; emoji: string; desc: string; usaOnly?: boolean; }

interface GeoFeature {
  type: 'Feature';
  geometry: Record<string, unknown>;
  properties: Record<string, string | number | boolean | null>;
}
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[]; }

// ─── Layer catalogue ─────────────────────────────────────────────────────────
const OSM_LAYERS: Layer[] = [
  { id: 'buildings',     label: 'Buildings',            emoji: '🏘', desc: 'Building footprints' },
  { id: 'roads',         label: 'Roads & Streets',      emoji: '🛣', desc: 'All highway types' },
  { id: 'railways',      label: 'Railways & Transit',   emoji: '🚂', desc: 'Rail lines & stations' },
  { id: 'power',         label: 'Power Infrastructure', emoji: '⚡', desc: 'Lines, substations, power plants' },
  { id: 'cycling',       label: 'Cycling Network',      emoji: '🚲', desc: 'Bike lanes & dedicated paths' },
  { id: 'pois',          label: 'Points of Interest',   emoji: '📍', desc: 'Amenities, shops, tourism' },
  { id: 'healthcare',    label: 'Healthcare',           emoji: '🏥', desc: 'Hospitals, clinics, pharmacies' },
  { id: 'historic',      label: 'Historic Sites',       emoji: '🏛', desc: 'Monuments, ruins, castles' },
  { id: 'admin-bounds',  label: 'Admin Boundaries',     emoji: '🔲', desc: 'States, provinces, districts' },
  { id: 'parks',         label: 'Parks & Green Spaces', emoji: '🌿', desc: 'Parks, gardens, reserves' },
  { id: 'water',         label: 'Water Bodies',         emoji: '💧', desc: 'Lakes, rivers, waterways' },
  { id: 'landuse',       label: 'Land Use',             emoji: '🗂', desc: 'Residential, commercial, farmland' },
  { id: 'natural-areas', label: 'Natural Areas',        emoji: '🌲', desc: 'Forests, grassland, beaches, wetlands' },
  { id: 'military',      label: 'Military Areas',       emoji: '🎖', desc: 'Bases & restricted zones' },
  { id: 'cemeteries',    label: 'Cemeteries',           emoji: '🪦', desc: 'Cemeteries & grave yards' },
  { id: 'transit',       label: 'Public Transit',       emoji: '🚌', desc: 'Bus stops, metro & tram stations, platforms' },
  { id: 'airports',      label: 'Airports & Airstrips', emoji: '✈️', desc: 'Aerodromes, runways, helipads' },
  { id: 'education',     label: 'Education',            emoji: '🎓', desc: 'Schools, universities, kindergartens' },
  { id: 'emergency',     label: 'Emergency Services',   emoji: '🚒', desc: 'Fire stations & police stations' },
  { id: 'sports',        label: 'Sports & Recreation',  emoji: '🏋', desc: 'Stadiums, pitches, sports centres, golf courses' },
  { id: 'fuel',          label: 'Fuel & EV Charging',   emoji: '⛽', desc: 'Gas stations & EV charging points' },
  { id: 'parking',       label: 'Parking',              emoji: '🅿', desc: 'Surface lots & parking structures' },
  { id: 'food',          label: 'Food & Dining',        emoji: '🍽', desc: 'Restaurants, cafes & bars' },
  { id: 'pipelines',     label: 'Pipelines',            emoji: '🔧', desc: 'Oil, gas & utility pipelines' },
  { id: 'bridges',       label: 'Bridges',              emoji: '🌉', desc: 'Bridge structures' },
];

const HAZARD_LAYERS: Layer[] = [
  { id: 'earthquakes', label: 'Earthquakes (Past Year)', emoji: '🌋', desc: 'USGS seismic events ≥ M2.0 (may be 0 in low-seismicity regions)' },
  { id: 'flood-zones', label: 'FEMA Flood Zones',        emoji: '🌊', desc: '100-yr flood hazard areas (USA only)', usaOnly: true },
];

const ECOLOGY_LAYERS: Layer[] = [
  { id: 'species',       label: 'Species Observations', emoji: '🦁', desc: 'GBIF biodiversity records' },
  { id: 'stream-gauges', label: 'Stream Gauges',        emoji: '📏', desc: 'Active USGS water monitoring stations' },
];

const KNOWLEDGE_LAYERS: Layer[] = [
  { id: 'wikipedia', label: 'Wikipedia Places', emoji: '📖', desc: 'Geotagged Wikipedia articles' },
];

const CENSUS_LAYERS: Layer[] = [
  { id: 'census-counties', label: 'Counties',               emoji: '🏛', desc: 'US county boundaries',               usaOnly: true },
  { id: 'census-tracts',   label: 'Census Tracts',          emoji: '📊', desc: 'Census tract boundaries',            usaOnly: true },
  { id: 'census-zip',      label: 'ZIP Code Areas',         emoji: '📮', desc: 'Zip code tabulation areas (ZCTAs)',  usaOnly: true },
  { id: 'census-schools',  label: 'School Districts',       emoji: '🏫', desc: 'Unified school district boundaries', usaOnly: true },
  { id: 'census-congress', label: 'Congressional Districts',emoji: '🗳', desc: '119th US congressional districts',   usaOnly: true },
];

const LAYER_GROUPS = [
  { key: 'osm',    label: 'OpenStreetMap', linkHref: 'https://www.openstreetmap.org/copyright', linkLabel: '© contributors', layers: OSM_LAYERS      },
  { key: 'hazard', label: 'Hazards',       badge: 'USGS · FEMA',  layers: HAZARD_LAYERS  },
  { key: 'eco',    label: 'Ecology & Hydrology', badge: 'GBIF · USGS', layers: ECOLOGY_LAYERS },
  { key: 'know',   label: 'Knowledge',     badge: 'Wikipedia',    layers: KNOWLEDGE_LAYERS },
  { key: 'census', label: 'US Census / TIGER', badge: '🇺🇸 USA only', layers: CENSUS_LAYERS  },
];

const ALL_LAYERS: Layer[] = [...OSM_LAYERS, ...HAZARD_LAYERS, ...ECOLOGY_LAYERS, ...KNOWLEDGE_LAYERS, ...CENSUS_LAYERS];

// Sets for dispatch routing
const OSM_IDS    = new Set(OSM_LAYERS.map(l => l.id));
const TIGER_URLS: Record<string, string> = {
  'census-counties': 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query',
  'census-tracts':   'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/2/query',
  'census-zip':      'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query',
  'census-schools':  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/School/MapServer/0/query',
  'census-congress': 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query',
};
const FEMA_URL  = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';
const GAUGES_URL = 'https://api.waterdata.usgs.gov/ogc/v0/collections/monitoring-location/items';

// ─── Shared proxy fetch (for ArcGIS REST services that lack CORS) ────────────
async function proxyFetch(url: string): Promise<unknown> {
  const res = await fetch('/api/gis-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

// ─── Direct Overpass fetch — runs in the BROWSER using the user's own IP ─────
// Overpass-api.de supports CORS, so no proxy is needed. Using the user's IP
// avoids the shared Vercel server IP being rate-limited across all users.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fetchOverpass(query: string): Promise<Record<string, unknown>> {
  let lastErr: Error = new Error('Overpass: no endpoints available');
  for (const url of OVERPASS_ENDPOINTS) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429) { lastErr = new Error('Overpass returned 429'); continue; }
      if (!res.ok)            { lastErr = new Error(`Overpass returned ${res.status}`); continue; }
      const text = await res.text();
      try { return JSON.parse(text) as Record<string, unknown>; }
      catch { lastErr = new Error(`Overpass non-JSON: ${text.slice(0, 120)}`); continue; }
    } catch (err) {
      clearTimeout(timer);
      lastErr = err instanceof Error ? err : new Error(String(err));
      // AbortError = timeout; try next endpoint
    }
  }
  throw lastErr;
}

// ─── Count queries (fast — scan only) ────────────────────────────────────────
async function countOSM(layerId: string, b: Bbox): Promise<number> {
  const bb = `${b.s.toFixed(6)},${b.w.toFixed(6)},${b.n.toFixed(6)},${b.e.toFixed(6)}`;
  const q: Record<string, string> = {
    buildings:       `[out:json][timeout:15];(way["building"](${bb});relation["building"](${bb}););out count;`,
    roads:           `[out:json][timeout:15];way["highway"](${bb});out count;`,
    pois:            `[out:json][timeout:15];(node["amenity"](${bb});node["shop"](${bb});node["tourism"](${bb}););out count;`,
    parks:           `[out:json][timeout:15];(way["leisure"~"park|garden|nature_reserve"](${bb}););out count;`,
    water:           `[out:json][timeout:15];(way["natural"="water"](${bb});way["waterway"](${bb}););out count;`,
    landuse:         `[out:json][timeout:15];way["landuse"](${bb});out count;`,
    railways:        `[out:json][timeout:15];way["railway"](${bb});out count;`,
    // is_in: finds admin areas that *contain* the center point (bbox query misses them since they span beyond any city viewport)
    'admin-bounds':  `[out:json][timeout:15];is_in(${((b.n+b.s)/2).toFixed(6)},${((b.e+b.w)/2).toFixed(6)})->.a;relation(pivot.a)["boundary"="administrative"]["admin_level"~"^[2-8]$"];out count;`,
    power:           `[out:json][timeout:15];(way["power"~"line|minor_line|cable"](${bb});node["power"~"plant|substation|tower"](${bb}););out count;`,
    'natural-areas': `[out:json][timeout:15];(way["natural"~"wood|forest|grassland|heath|scrub|beach|cliff|wetland"](${bb}););out count;`,
    historic:        `[out:json][timeout:15];(node["historic"](${bb});way["historic"](${bb}););out count;`,
    healthcare:      `[out:json][timeout:15];(node["amenity"~"hospital|clinic|pharmacy|dentist|doctors|veterinary"](${bb}););out count;`,
    cycling:         `[out:json][timeout:15];(way["highway"="cycleway"](${bb});way["cycleway"~"lane|track"](${bb}););out count;`,
    military:        `[out:json][timeout:15];(way["landuse"="military"](${bb});relation["landuse"="military"](${bb}););out count;`,
    cemeteries:      `[out:json][timeout:15];(way["landuse"="cemetery"](${bb});way["amenity"="grave_yard"](${bb});relation["landuse"="cemetery"](${bb}););out count;`,
    transit:         `[out:json][timeout:15];(node["highway"="bus_stop"](${bb});node["public_transport"~"stop_position|platform"](${bb});node["railway"~"station|halt|tram_stop|subway_entrance"](${bb}););out count;`,
    airports:        `[out:json][timeout:15];(node["aeroway"~"aerodrome|helipad|airstrip"](${bb});way["aeroway"~"aerodrome|runway|taxiway|helipad"](${bb}););out count;`,
    education:       `[out:json][timeout:15];(node["amenity"~"school|university|college|kindergarten"](${bb});way["amenity"~"school|university|college|kindergarten"](${bb}););out count;`,
    emergency:       `[out:json][timeout:15];(node["amenity"~"fire_station|police"](${bb});way["amenity"~"fire_station|police"](${bb}););out count;`,
    sports:          `[out:json][timeout:15];(way["leisure"~"sports_centre|stadium|pitch|golf_course|track"](${bb});node["leisure"~"sports_centre|stadium"](${bb}););out count;`,
    fuel:            `[out:json][timeout:15];(node["amenity"="fuel"](${bb});node["amenity"="charging_station"](${bb}););out count;`,
    parking:         `[out:json][timeout:15];(node["amenity"="parking"](${bb});way["amenity"="parking"](${bb}););out count;`,
    food:            `[out:json][timeout:15];(node["amenity"~"restaurant|cafe|bar|fast_food|food_court|pub|biergarten"](${bb}););out count;`,
    pipelines:       `[out:json][timeout:15];way["man_made"="pipeline"](${bb});out count;`,
    bridges:         `[out:json][timeout:15];(way["bridge"="yes"](${bb});way["man_made"="bridge"](${bb}););out count;`,
  };
  const data = await fetchOverpass(q[layerId]);
  if (data.error) throw new Error(String(data.error));
  const elements = data.elements as { tags?: { total?: string } }[] | undefined;
  return parseInt(elements?.[0]?.tags?.total ?? '0', 10);
}

async function countEarthquakes(b: Bbox): Promise<number> {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const data  = await (await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${b.s}&maxlatitude=${b.n}&minlongitude=${b.w}&maxlongitude=${b.e}&starttime=${since}&minmagnitude=2&limit=0`)).json() as { metadata?: { count?: number } };
  return data.metadata?.count ?? 0;
}

async function countSpecies(b: Bbox): Promise<number> {
  const poly = `${b.w} ${b.s},${b.e} ${b.s},${b.e} ${b.n},${b.w} ${b.n},${b.w} ${b.s}`;
  const data = await (await fetch(`https://api.gbif.org/v1/occurrence/search?geometry=POLYGON((${poly}))&hasCoordinate=true&limit=0`)).json() as { count?: number };
  return data.count ?? 0;
}

async function countFEMA(b: Bbox): Promise<number> {
  const url  = `${FEMA_URL}?geometry=${b.w},${b.s},${b.e},${b.n}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json`;
  const data = await proxyFetch(url) as { count?: number };
  return data.count ?? 0;
}

async function countWaterGauges(b: Bbox): Promise<number> {
  const data = await (await fetch(`${GAUGES_URL}?bbox=${b.w},${b.s},${b.e},${b.n}&f=json&limit=1`)).json() as { numberMatched?: number };
  return data.numberMatched ?? 0;
}

async function countWikipedia(b: Bbox): Promise<number> {
  const p = new URLSearchParams({ action: 'query', list: 'geosearch', gsbbox: `${b.n}|${b.w}|${b.s}|${b.e}`, gslimit: '500', format: 'json', origin: '*' });
  const d = await (await fetch(`https://en.wikipedia.org/w/api.php?${p}`)).json() as { query?: { geosearch?: unknown[] }; error?: unknown };
  if (d.error) throw new Error(`Wikipedia API error: ${JSON.stringify(d.error)}`);
  return d.query?.geosearch?.length ?? 0;
}

async function countTIGER(layerUrl: string, b: Bbox): Promise<number> {
  const url  = `${layerUrl}?geometry=${b.w},${b.s},${b.e},${b.n}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json`;
  const data = await proxyFetch(url) as { count?: number };
  return data.count ?? 0;
}

// ─── Full feature fetch (download) ───────────────────────────────────────────
function buildOverpassQuery(id: string, b: Bbox): string {
  const bb = `${b.s.toFixed(6)},${b.w.toFixed(6)},${b.n.toFixed(6)},${b.e.toFixed(6)}`;
  const hd = '[out:json][timeout:30];';
  const m: Record<string, string> = {
    buildings:       `${hd}(way["building"](${bb});relation["building"](${bb}););out body;>;out skel qt;`,
    roads:           `${hd}way["highway"](${bb});out body;>;out skel qt;`,
    pois:            `${hd}(node["amenity"](${bb});node["shop"](${bb});node["tourism"](${bb}););out body;`,
    parks:           `${hd}(way["leisure"~"park|garden|nature_reserve"](${bb}););out body;>;out skel qt;`,
    water:           `${hd}(way["natural"="water"](${bb});way["waterway"](${bb});relation["natural"="water"](${bb}););out body;>;out skel qt;`,
    landuse:         `${hd}way["landuse"](${bb});out body;>;out skel qt;`,
    railways:        `${hd}way["railway"](${bb});out body;>;out skel qt;`,
    // [bbox] clips geometry to viewport (avoids downloading 100k+ nodes for state boundaries).
    // out geom; embeds coordinates inline — osmtogeojson assembles polygons correctly.
    'admin-bounds':  `[out:json][timeout:30][bbox:${bb}][maxsize:32000000];is_in(${((b.n+b.s)/2).toFixed(6)},${((b.e+b.w)/2).toFixed(6)})->.a;relation(pivot.a)["boundary"="administrative"]["admin_level"~"^[2-8]$"];out geom;`,
    power:           `${hd}(way["power"~"line|minor_line|cable"](${bb});node["power"~"plant|substation|tower"](${bb});way["power"="plant"](${bb}););out body;>;out skel qt;`,
    'natural-areas': `${hd}(way["natural"~"wood|forest|grassland|heath|scrub|beach|cliff|wetland"](${bb});relation["natural"~"wood|forest|grassland"](${bb}););out body;>;out skel qt;`,
    historic:        `${hd}(node["historic"](${bb});way["historic"](${bb});relation["historic"](${bb}););out body;>;out skel qt;`,
    healthcare:      `${hd}(node["amenity"~"hospital|clinic|pharmacy|dentist|doctors|veterinary"](${bb});way["amenity"~"hospital|clinic"](${bb}););out body;>;out skel qt;`,
    cycling:         `${hd}(way["highway"="cycleway"](${bb});way["cycleway"~"lane|track"](${bb}););out body;>;out skel qt;`,
    military:        `${hd}(way["landuse"="military"](${bb});relation["landuse"="military"](${bb});node["military"](${bb}););out body;>;out skel qt;`,
    cemeteries:      `${hd}(way["landuse"="cemetery"](${bb});way["amenity"="grave_yard"](${bb});relation["landuse"="cemetery"](${bb}););out body;>;out skel qt;`,
    transit:         `${hd}(node["highway"="bus_stop"](${bb});node["public_transport"~"stop_position|platform"](${bb});node["railway"~"station|halt|tram_stop|subway_entrance"](${bb});way["public_transport"="platform"](${bb}););out body;>;out skel qt;`,
    airports:        `${hd}(node["aeroway"~"aerodrome|helipad|airstrip"](${bb});way["aeroway"~"aerodrome|runway|taxiway|helipad|apron|terminal"](${bb});relation["aeroway"="aerodrome"](${bb}););out body;>;out skel qt;`,
    education:       `${hd}(node["amenity"~"school|university|college|kindergarten"](${bb});way["amenity"~"school|university|college|kindergarten"](${bb});relation["amenity"~"school|university|college"](${bb}););out body;>;out skel qt;`,
    emergency:       `${hd}(node["amenity"~"fire_station|police"](${bb});way["amenity"~"fire_station|police"](${bb}););out body;>;out skel qt;`,
    sports:          `${hd}(way["leisure"~"sports_centre|stadium|pitch|golf_course|track|swimming_pool"](${bb});node["leisure"~"sports_centre|stadium|pitch"](${bb});relation["leisure"~"sports_centre|stadium|golf_course"](${bb}););out body;>;out skel qt;`,
    fuel:            `${hd}(node["amenity"="fuel"](${bb});node["amenity"="charging_station"](${bb});way["amenity"="fuel"](${bb}););out body;>;out skel qt;`,
    parking:         `${hd}(node["amenity"="parking"](${bb});way["amenity"="parking"](${bb});relation["amenity"="parking"](${bb}););out body;>;out skel qt;`,
    food:            `${hd}(node["amenity"~"restaurant|cafe|bar|fast_food|food_court|pub|biergarten"](${bb});way["amenity"~"restaurant|cafe|bar|fast_food"](${bb}););out body;>;out skel qt;`,
    pipelines:       `${hd}way["man_made"="pipeline"](${bb});out body;>;out skel qt;`,
    bridges:         `${hd}(way["bridge"="yes"](${bb});way["man_made"="bridge"](${bb}););out body;>;out skel qt;`,
  };
  return m[id] ?? '';
}

// Normalize all features in a collection to share the same property schema.
// Every key that appears in any feature is present in all features; missing
// values are filled with null so every row has the same columns.
function normalizeSchema(fc: GeoFC): GeoFC {
  const allKeys = new Set<string>();
  for (const f of fc.features) {
    for (const k of Object.keys(f.properties ?? {})) allKeys.add(k);
  }
  if (allKeys.size === 0) return fc;
  const keys = Array.from(allKeys);
  const features = fc.features.map(f => ({
    ...f,
    properties: Object.fromEntries(
      keys.map(k => [k, (f.properties ?? {})[k] ?? null])
    ) as GeoFeature['properties'],
  }));
  return { type: 'FeatureCollection', features };
}

function overpassToGeoJSON(raw: Record<string, unknown>): GeoFC {
  if (raw.error) throw new Error(String(raw.error));
  const fc = osmtogeojson(raw);
  // Filter features with null geometry (incomplete OSM data)
  const features = fc.features
    .filter(f => f.geometry !== null)
    .map(f => ({
      type: 'Feature' as const,
      geometry: f.geometry as unknown as GeoFeature['geometry'],
      properties: (f.properties ?? {}) as GeoFeature['properties'],
    }));
  return { type: 'FeatureCollection', features };
}

async function fetchFEMA(b: Bbox): Promise<GeoFC> {
  const url  = `${FEMA_URL}?geometry=${b.w},${b.s},${b.e},${b.n}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,SFHA_TF,ZONE_SUBTY,DFIRM_ID&returnGeometry=true&f=geojson&outSR=4326`;
  const data = await proxyFetch(url) as { features?: GeoFeature[] };
  return { type: 'FeatureCollection', features: data.features ?? [] };
}

async function fetchWaterGauges(b: Bbox): Promise<GeoFC> {
  const data = await (await fetch(`${GAUGES_URL}?bbox=${b.w},${b.s},${b.e},${b.n}&f=json&limit=500`)).json() as { features?: GeoFeature[] };
  return { type: 'FeatureCollection', features: data.features ?? [] };
}

async function fetchWikipedia(b: Bbox): Promise<GeoFC> {
  const p = new URLSearchParams({ action: 'query', list: 'geosearch', gsbbox: `${b.n}|${b.w}|${b.s}|${b.e}`, gslimit: '500', format: 'json', origin: '*' });
  const d = await (await fetch(`https://en.wikipedia.org/w/api.php?${p}`)).json() as { query?: { geosearch?: { pageid: number; title: string; lat: number; lon: number }[] } };
  return {
    type: 'FeatureCollection',
    features: (d.query?.geosearch ?? []).map(r => ({
      type: 'Feature' as const,
      geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
      properties: { title: r.title, pageid: r.pageid, url: `https://en.wikipedia.org/?curid=${r.pageid}` },
    })),
  };
}

async function fetchTIGER(layerUrl: string, b: Bbox): Promise<GeoFC> {
  const url  = `${layerUrl}?geometry=${b.w},${b.s},${b.e},${b.n}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=geojson&outSR=4326`;
  const data = await proxyFetch(url) as { features?: GeoFeature[] };
  return { type: 'FeatureCollection', features: data.features ?? [] };
}

// ─── Unified dispatchers ─────────────────────────────────────────────────────
async function getCount(id: string, b: Bbox): Promise<number> {
  if (OSM_IDS.has(id))        return countOSM(id, b);
  if (id === 'earthquakes')   return countEarthquakes(b);
  if (id === 'species')       return countSpecies(b);
  if (id === 'flood-zones')   return countFEMA(b);
  if (id === 'stream-gauges') return countWaterGauges(b);
  if (id === 'wikipedia')     return countWikipedia(b);
  if (TIGER_URLS[id])         return countTIGER(TIGER_URLS[id], b);
  return 0;
}

async function getFeatures(id: string, b: Bbox): Promise<GeoFC> {
  let fc: GeoFC;
  if (OSM_IDS.has(id)) {
    const raw = await fetchOverpass(buildOverpassQuery(id, b));
    fc = overpassToGeoJSON(raw);
  } else if (id === 'earthquakes') {
    const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const data  = await (await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${b.s}&maxlatitude=${b.n}&minlongitude=${b.w}&maxlongitude=${b.e}&starttime=${since}&minmagnitude=2`)).json() as { features: GeoFeature[] };
    fc = { type: 'FeatureCollection', features: data.features ?? [] };
  } else if (id === 'species') {
    const poly   = `${b.w} ${b.s},${b.e} ${b.s},${b.e} ${b.n},${b.w} ${b.n},${b.w} ${b.s}`;
    const base   = `https://api.gbif.org/v1/occurrence/search?geometry=POLYGON((${poly}))&hasCoordinate=true&limit=300`;
    const page1  = await (await fetch(base + '&offset=0')).json() as { results?: Record<string, unknown>[]; count?: number };
    const total  = Math.min(page1.count ?? 0, 600);
    let results  = page1.results ?? [];
    if (total > 300) {
      const page2 = await (await fetch(base + '&offset=300')).json() as { results?: Record<string, unknown>[] };
      results = results.concat(page2.results ?? []);
    }
    fc = {
      type: 'FeatureCollection',
      features: results
        .filter(r => r.decimalLongitude != null && r.decimalLatitude != null)
        .map(r => ({
          type: 'Feature' as const,
          geometry: { type: 'Point', coordinates: [r.decimalLongitude as number, r.decimalLatitude as number] },
          properties: { species: String(r.species??''), scientific_name: String(r.scientificName??''), date: String(r.eventDate??''), kingdom: String(r.kingdom??''), family: String(r.family??''), country: String(r.country??'') },
        })),
    };
  } else if (id === 'flood-zones')   { fc = await fetchFEMA(b);
  } else if (id === 'stream-gauges') { fc = await fetchWaterGauges(b);
  } else if (id === 'wikipedia')     { fc = await fetchWikipedia(b);
  } else if (TIGER_URLS[id])         { fc = await fetchTIGER(TIGER_URLS[id], b);
  } else { return { type: 'FeatureCollection', features: [] }; }

  return fc;
  // normalizeSchema is applied by callers that need a consistent column schema
  // (GeoJSON, CSV). Shapefile skips it because the DBF builds its own schema
  // from each feature's actual keys, and padding 100+ null columns onto every
  // feature inflates file size dramatically and freezes the browser.
}

// ─── Format converters ───────────────────────────────────────────────────────
function centroid(f: GeoFeature): [number, number] {
  const g = f.geometry as { type: string; coordinates: unknown };
  if (g.type === 'Point')           return g.coordinates as [number, number];
  if (g.type === 'LineString')      { const c = g.coordinates as [number,number][]; return c[Math.floor(c.length/2)]; }
  if (g.type === 'MultiLineString') { const c = (g.coordinates as [number,number][][])[0]; return c[Math.floor(c.length/2)]; }
  if (g.type === 'Polygon')         { const c = (g.coordinates as [number,number][][])[0]; return [c.reduce((s,p)=>s+p[0],0)/c.length, c.reduce((s,p)=>s+p[1],0)/c.length]; }
  if (g.type === 'MultiPolygon')    { const c = (g.coordinates as [number,number][][][])[0][0]; return [c.reduce((s,p)=>s+p[0],0)/c.length, c.reduce((s,p)=>s+p[1],0)/c.length]; }
  return [0, 0];
}

function toCSV(fc: GeoFC): string {
  if (!fc.features.length) return 'No features found.';
  const keys   = Array.from(new Set(fc.features.flatMap(f => Object.keys(f.properties ?? {}))));
  const header = ['longitude', 'latitude', ...keys].join(',');
  const rows   = fc.features.map(f => { const [lon,lat] = centroid(f); return [lon, lat, ...keys.map(k => `"${String(f.properties?.[k]??'').replace(/"/g,'""')}"`)] .join(','); });
  return [header, ...rows].join('\n');
}

function ringToKML(ring: [number,number][]): string {
  return `<LinearRing><coordinates>${ring.map(c=>`${c[0]},${c[1]},0`).join(' ')}</coordinates></LinearRing>`;
}
function polygonToKML(rings: [number,number][][]): string {
  const outer = `<outerBoundaryIs>${ringToKML(rings[0])}</outerBoundaryIs>`;
  const inner = rings.slice(1).map(r=>`<innerBoundaryIs>${ringToKML(r)}</innerBoundaryIs>`).join('');
  return `<Polygon>${outer}${inner}</Polygon>`;
}
// Escape the five XML special characters for use outside CDATA sections.
const xmlEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function toKML(fc: GeoFC, name: string): string {
  const marks = fc.features.map(f => {
    const p   = f.properties ?? {};
    const lbl = String(p.name ?? p.title ?? p.osm_id ?? 'Feature');
    // Property table goes inside CDATA so values need no escaping,
    // but keys are safe OSM tag names (alphanumeric + colon/underscore).
    const dsc = Object.entries(p)
      .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v ?? ''}</td></tr>`)
      .join('');
    const g = f.geometry as { type: string; coordinates: unknown };
    let geo = '';
    if (g.type === 'Point') {
      const [x, y] = g.coordinates as [number, number];
      geo = `<Point><coordinates>${x},${y},0</coordinates></Point>`;
    } else if (g.type === 'LineString') {
      const cc = (g.coordinates as [number, number][]).map(c => `${c[0]},${c[1]},0`).join(' ');
      geo = `<LineString><coordinates>${cc}</coordinates></LineString>`;
    } else if (g.type === 'MultiLineString') {
      // KML requires <MultiGeometry> when a Placemark has more than one geometry.
      const parts = (g.coordinates as [number, number][][]).map(ls => {
        const cc = ls.map(c => `${c[0]},${c[1]},0`).join(' ');
        return `<LineString><coordinates>${cc}</coordinates></LineString>`;
      }).join('');
      geo = `<MultiGeometry>${parts}</MultiGeometry>`;
    } else if (g.type === 'Polygon') {
      geo = polygonToKML(g.coordinates as [number, number][][]);
    } else if (g.type === 'MultiPolygon') {
      const parts = (g.coordinates as [number, number][][][]).map(poly => polygonToKML(poly)).join('');
      geo = `<MultiGeometry>${parts}</MultiGeometry>`;
    }
    return `  <Placemark><name><![CDATA[${lbl}]]></name><description><![CDATA[<table>${dsc}</table>]]></description>${geo}</Placemark>`;
  }).join('\n');
  // xmlEsc the document name — layer labels like "Roads & Streets" contain & which
  // is an invalid XML token when placed directly in element content.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>${xmlEsc(name)}</name>\n${marks}\n</Document>\n</kml>`;
}

// ─── Custom shapefile writer ──────────────────────────────────────────────────
// Replaces @mapbox/shp-write which produces mismatched .shp/.dbf record counts
// for complex OSM geometries (MultiPolygon, degenerate rings, etc.).
// This writer processes the same features[] array for both SHP and DBF in one
// pass, making a count mismatch structurally impossible.

const WGS84_PRJ = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

function _i32le(v: DataView, o: number, n: number) { v.setInt32(o, n, true);  }
function _i32be(v: DataView, o: number, n: number) { v.setInt32(o, n, false); }
function _f64le(v: DataView, o: number, n: number) { v.setFloat64(o, n, true); }

// Null shape (shape type 0) — written when geometry is invalid so SHP and DBF
// always have the same record count.
function _nullRec(): Uint8Array { return new Uint8Array(4); }

// Point record content (20 bytes): type(4) + x(8) + y(8)
function _ptRec(coords: unknown): Uint8Array {
  const c = coords as number[];
  if (!Array.isArray(c) || c.length < 2 || !isFinite(c[0]) || !isFinite(c[1])) return _nullRec();
  const b = new ArrayBuffer(20); const v = new DataView(b);
  _i32le(v, 0, 1); _f64le(v, 4, c[0]); _f64le(v, 12, c[1]);
  return new Uint8Array(b);
}

// ESRI shapefiles require CW outer rings and CCW holes (opposite of GeoJSON).
// Compute signed area via shoelace formula (positive = CCW in geographic coords).
function _ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const j = (i + 1) % n;
    a += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
  }
  return a / 2;
}
// Enforce ESRI winding: outer ring CW (area < 0), holes CCW (area > 0).
function _esriWind(rings: number[][][]): number[][][] {
  return rings.map((r, i) => {
    const a = _ringArea(r);
    if (i === 0) return a > 0 ? [...r].reverse() : r;  // outer: must be CW
    else         return a < 0 ? [...r].reverse() : r;  // hole:  must be CCW
  });
}

// Polyline (type 3) or Polygon (type 5) record content.
// rings: for LineString = [[x,y],...]; for Polygon = [[outer...],[hole...],...]
function _polyRec(rings: number[][][], shpType: 3 | 5): Uint8Array {
  const valid = rings.filter(r => Array.isArray(r) && r.length >= (shpType === 5 ? 4 : 2));
  if (!valid.length) return _nullRec();
  const wound  = shpType === 5 ? _esriWind(valid) : valid; // apply ESRI winding to polygons
  const allPts = wound.flat() as [number, number][];
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const [x, y] of allPts) {
    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
  }
  const nP = wound.length, nPts = allPts.length;
  const b = new ArrayBuffer(4 + 32 + 4 + 4 + nP * 4 + nPts * 16);
  const v = new DataView(b); let o = 0;
  _i32le(v, o, shpType);         o += 4;
  _f64le(v, o, xmin); o += 8; _f64le(v, o, ymin); o += 8;
  _f64le(v, o, xmax); o += 8; _f64le(v, o, ymax); o += 8;
  _i32le(v, o, nP);   o += 4; _i32le(v, o, nPts); o += 4;
  let start = 0;
  for (const r of wound)  { _i32le(v, o, start); o += 4; start += r.length; }
  for (const [x, y] of allPts) { _f64le(v, o, x); o += 8; _f64le(v, o, y); o += 8; }
  return new Uint8Array(b);
}

function _geomRec(g: { type: string; coordinates: unknown }, shpType: 1 | 3 | 5): Uint8Array {
  try {
    if (shpType === 1) return _ptRec(g.coordinates);
    const rings = shpType === 3
      ? [g.coordinates as number[][]]         // LineString: wrap single ring
      : g.coordinates as number[][][];        // Polygon: outer + holes
    return _polyRec(rings, shpType);
  } catch { return _nullRec(); }
}

// Assemble SHP + SHX from pre-built record content buffers.
function _assembleShpShx(shpType: number, records: Uint8Array[]): { shp: Uint8Array; shx: Uint8Array } {
  const n = records.length;
  // Compute bbox from record contents
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const rec of records) {
    const rv = new DataView(rec.buffer, rec.byteOffset);
    const rt = rv.getInt32(0, true);
    if (rt === 1 && rec.length >= 20) {                         // Point
      const x = rv.getFloat64(4, true), y = rv.getFloat64(12, true);
      if (x < xmin) xmin = x; if (x > xmax) xmax = x;
      if (y < ymin) ymin = y; if (y > ymax) ymax = y;
    } else if (rt !== 0 && rec.length >= 36) {                  // Poly*
      const x1 = rv.getFloat64(4, true),  y1 = rv.getFloat64(12, true);
      const x2 = rv.getFloat64(20, true), y2 = rv.getFloat64(28, true);
      if (x1 < xmin) xmin = x1; if (x2 > xmax) xmax = x2;
      if (y1 < ymin) ymin = y1; if (y2 > ymax) ymax = y2;
    }
  }
  if (!isFinite(xmin)) { xmin = 0; ymin = 0; xmax = 0; ymax = 0; }

  const shpBodyLen = records.reduce((s, r) => s + 8 + r.length, 0);
  const shpBuf = new Uint8Array(100 + shpBodyLen);
  const shxBuf = new Uint8Array(100 + n * 8);
  const shpV = new DataView(shpBuf.buffer), shxV = new DataView(shxBuf.buffer);

  for (const v of [shpV, shxV]) {
    _i32be(v, 0, 9994); _i32le(v, 28, 1000); _i32le(v, 32, shpType);
    _f64le(v, 36, xmin); _f64le(v, 44, ymin); _f64le(v, 52, xmax); _f64le(v, 60, ymax);
  }
  _i32be(shpV, 24, (100 + shpBodyLen) / 2);
  _i32be(shxV, 24, (100 + n * 8) / 2);

  let shpOff = 50, shpByteOff = 100;
  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const cLen = rec.length / 2;
    _i32be(shxV, 100 + i * 8,     shpOff);
    _i32be(shxV, 100 + i * 8 + 4, cLen);
    _i32be(shpV, shpByteOff,     i + 1);
    _i32be(shpV, shpByteOff + 4, cLen);
    shpBuf.set(rec, shpByteOff + 8);
    shpOff += (8 + rec.length) / 2;
    shpByteOff += 8 + rec.length;
  }
  return { shp: shpBuf, shx: shxBuf };
}

// Build DBF file from a list of property objects (same length as SHP records).
// Uses a globally consistent field schema and dynamic field widths (not a fixed
// 254-byte width) to keep files small and avoid signed-byte interpretation issues.
function _buildDbf(propsList: GeoFeature['properties'][]): Uint8Array {
  const enc = new TextEncoder();

  // Only keep fields that have real data in ≥ 5 % of features (minimum 2 features).
  // This drops the long tail of rare OSM tags that are null for almost every feature,
  // keeping the DBF clean and readable. Hard cap at 25 columns.
  const MIN_FILL_RATE = 0.05;
  const MAX_DBF_FIELDS = 25;
  const n = propsList.length;
  const minCount = Math.max(2, Math.ceil(n * MIN_FILL_RATE));

  const keyCounts = new Map<string, number>();
  for (const props of propsList) {
    for (const k of Object.keys(props ?? {})) {
      if (props![k] != null && props![k] !== '') {
        keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
      }
    }
  }
  // Sort by frequency descending, filter by fill-rate threshold, take top MAX_DBF_FIELDS
  const topKeys = Array.from(keyCounts.entries())
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DBF_FIELDS)
    .map(([k]) => k);

  // Build global field schema: raw property key → sanitised 10-char DBF name
  const schema = new Map<string, string>();
  const used   = new Set<string>();
  for (const k of topKeys) {
    if (schema.has(k)) continue;
    let name = k.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, 'F$1').toUpperCase().slice(0, 10);
    if (!name) name = 'FIELD';
    if (used.has(name)) {
      const base = name.slice(0, 8);
      let n = 2;
      while (used.has(`${base}_${n}`)) n++;
      name = `${base}_${n}`.slice(0, 10);
    }
    used.add(name); schema.set(k, name);
  }
  const rawKeys  = Array.from(schema.keys());
  const dbfNames = rawKeys.map(k => schema.get(k)!);
  const nF       = dbfNames.length;

  // Compute the actual maximum string length for each field across all records,
  // capped at 127. Keeping lengths ≤ 127 avoids signed-byte misinterpretation
  // in parsers that incorrectly treat the field-length byte as signed.
  const fLens: number[] = new Array(nF).fill(1);
  for (const props of propsList) {
    for (let j = 0; j < nF; j++) {
      const len = String(props?.[rawKeys[j]] ?? '').length;
      if (len > fLens[j]) fLens[j] = len;
    }
  }
  for (let j = 0; j < nF; j++) fLens[j] = Math.min(fLens[j], 127);

  const hdrSize = 32 + nF * 32 + 1;
  const recSize = 1 + fLens.reduce((s, l) => s + l, 0);
  const buf = new ArrayBuffer(hdrSize + propsList.length * recSize + 1);
  const dv  = new DataView(buf);
  const u8  = new Uint8Array(buf);

  dv.setUint8(0, 3); // dBASE III
  const d = new Date();
  dv.setUint8(1, d.getFullYear() - 1900); dv.setUint8(2, d.getMonth() + 1); dv.setUint8(3, d.getDate());
  dv.setInt32(4, propsList.length, true);
  dv.setInt16(8, hdrSize, true); dv.setInt16(10, recSize, true);
  for (let i = 0; i < nF; i++) {
    const fo = 32 + i * 32;
    u8.set(enc.encode(dbfNames[i]).slice(0, 11), fo);
    dv.setUint8(fo + 11, 67); // 'C' = character field
    dv.setUint8(fo + 16, fLens[i]);
  }
  dv.setUint8(32 + nF * 32, 0x0D); // header terminator

  // Field offsets within each record (after the 1-byte deletion flag)
  const fOffsets: number[] = [];
  let off = 1;
  for (const fl of fLens) { fOffsets.push(off); off += fl; }

  for (let i = 0; i < propsList.length; i++) {
    const ro    = hdrSize + i * recSize;
    dv.setUint8(ro, 0x20); // not deleted
    const props = propsList[i] ?? {};
    for (let j = 0; j < nF; j++) {
      const fl  = fLens[j];
      const val = String(props[rawKeys[j]] ?? '').slice(0, fl);
      const raw = enc.encode(val);
      // Write bytes, then space-pad up to fl bytes
      u8.set(raw.slice(0, fl), ro + fOffsets[j]);
      for (let b = raw.length; b < fl; b++) u8[ro + fOffsets[j] + b] = 0x20;
    }
  }
  dv.setUint8(hdrSize + propsList.length * recSize, 0x1A); // EOF
  return u8;
}

async function shpZip(fc: GeoFC, _filename: string): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip   = new JSZip();
  const yield_ = () => new Promise<void>(r => setTimeout(r, 0));

  type Group = { name: string; shpType: 1|3|5; geoms: {type:string;coordinates:unknown}[]; props: GeoFeature['properties'][] };
  const groups: Group[] = [
    { name: 'POINT',    shpType: 1, geoms: [], props: [] },
    { name: 'POLYLINE', shpType: 3, geoms: [], props: [] },
    { name: 'POLYGON',  shpType: 5, geoms: [], props: [] },
  ];

  for (const f of fc.features) {
    if (!f.geometry) continue;
    const g = f.geometry as { type: string; coordinates: unknown };
    const push = (gi: number, type: string, coords: unknown) => {
      groups[gi].geoms.push({ type, coordinates: coords });
      groups[gi].props.push(f.properties);  // same index in geoms and props ← key invariant
    };
    switch (g.type) {
      case 'Point':           push(0, 'Point', g.coordinates); break;
      case 'MultiPoint':      for (const c of g.coordinates as unknown[]) push(0, 'Point', c); break;
      case 'LineString':      push(1, 'LineString', g.coordinates); break;
      case 'MultiLineString': for (const c of g.coordinates as unknown[]) push(1, 'LineString', c); break;
      case 'Polygon':         push(2, 'Polygon', g.coordinates); break;
      case 'MultiPolygon':    for (const c of g.coordinates as unknown[]) push(2, 'Polygon', c); break;
    }
  }

  for (const { name, shpType, geoms, props } of groups) {
    if (!geoms.length) continue;
    // Yield to the browser so the loading spinner stays responsive,
    // then run the CPU-heavy binary assembly steps.
    await yield_();
    const records = geoms.map(g => _geomRec(g, shpType));
    await yield_();
    const { shp, shx } = _assembleShpShx(shpType, records);
    await yield_();
    const dbf = _buildDbf(props); // props.length === records.length (guaranteed by push())
    zip.file(`${name}.shp`, shp);
    zip.file(`${name}.shx`, shx);
    zip.file(`${name}.dbf`, dbf);
    zip.file(`${name}.prj`, WGS84_PRJ);
    zip.file(`${name}.cpg`, 'UTF-8'); // tell ArcGIS to use UTF-8 for the DBF
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

function downloadBlob(content: string | Blob, filename: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GISDownloaderPage() {
  const [viewportBbox, setViewportBbox] = useState<Bbox | null>(null);
  const [customBbox,   setCustomBbox]   = useState<Bbox | null>(null);
  const [drawMode,     setDrawMode]     = useState(false);
  const [format,       setFormat]       = useState<Format>('geojson');
  const [dlStatus,     setDlStatus]     = useState<Record<string, DlStatus>>({});
  const [dlCounts,     setDlCounts]     = useState<Record<string, number>>({});
  const [dlErrors,     setDlErrors]     = useState<Record<string, string>>({});
  const [search,       setSearch]       = useState('');
  const [searching,    setSearching]    = useState(false);
  const [stage,          setStage]          = useState<Stage>('no-area');
  const [scanned,        setScanned]        = useState<Record<string, ScanVal>>({});
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [bundleStatus,   setBundleStatus]   = useState<DlStatus>('idle');
  const [bundleProgress, setBundleProgress] = useState(0);
  const flyToRef = useRef<((lat: number, lon: number, zoom?: number) => void) | null>(null);

  const bbox   = customBbox ?? viewportBbox;
  const area   = bbox ? Math.abs((bbox.n - bbox.s) * (bbox.e - bbox.w)) : 0;
  const tooBig = area > 0.5;
  const midLat = bbox ? (bbox.n + bbox.s) / 2 : 0;
  const kmW    = bbox ? ((bbox.n - bbox.s) * 111).toFixed(0) : '—';
  const kmH    = bbox ? ((bbox.e - bbox.w) * 111 * Math.cos(midLat * Math.PI / 180)).toFixed(0) : '—';

  const clearResults = (keepSelection = false) => { setScanned({}); setDlStatus({}); setDlCounts({}); setDlErrors({}); if (!keepSelection) setSelected(new Set()); setBundleStatus('idle'); setBundleProgress(0); };

  const handleViewportChange = useCallback((b: Bbox) => {
    setViewportBbox(b);
    setStage(prev => prev === 'no-area' ? 'has-area' : prev);
  }, []);

  const handleDraw = useCallback((b: Bbox) => {
    setCustomBbox(b); setDrawMode(false); setStage('has-area'); clearResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetToViewport = useCallback(() => {
    setCustomBbox(null); setStage(viewportBbox ? 'has-area' : 'no-area'); clearResults();
  }, [viewportBbox]);

  const handleFlyToReady = useCallback((fn: (lat: number, lon: number, z?: number) => void) => {
    flyToRef.current = fn;
  }, []);

  const searchLocation = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const data = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`, { headers: { 'Accept-Language': 'en' } })).json() as { lat: string; lon: string }[];
      if (data[0] && flyToRef.current) flyToRef.current(+data[0].lat, +data[0].lon, 13);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  };

  // ── Scan ──────────────────────────────────────────────────────────────────
  const scanArea = useCallback(async () => {
    if (!bbox || tooBig || selected.size === 0) return;
    setStage('scanning');
    setDlStatus({}); setDlCounts({});

    // Only scan the layers the user checked — mark them as in-progress
    const layersToScan = ALL_LAYERS.filter(l => selected.has(l.id) && scanned[l.id] === undefined);
    setScanned(p => ({ ...p, ...Object.fromEntries(layersToScan.map(l => [l.id, 'scanning'])) }));

    const scanOne = async (layer: Layer) => {
      try {
        const count = await getCount(layer.id, bbox);
        setScanned(p => ({ ...p, [layer.id]: count }));
      } catch {
        setScanned(p => ({ ...p, [layer.id]: 'error' }));
      }
    };

    const nonOsmLayers = layersToScan.filter(l => !OSM_IDS.has(l.id));
    const osmLayers    = layersToScan.filter(l =>  OSM_IDS.has(l.id));

    const nonOsmPromise = Promise.allSettled(nonOsmLayers.map(scanOne));
    for (let i = 0; i < osmLayers.length; i += 4) {
      await Promise.allSettled(osmLayers.slice(i, i + 4).map(scanOne));
    }
    await nonOsmPromise;

    setStage('scanned');
  }, [bbox, tooBig, selected, scanned]);

  const rescan = useCallback(() => { setStage('has-area'); clearResults(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleLayer = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Scan a single layer on demand (triggered by the per-row 🔍 button)
  const scanLayer = useCallback(async (layerId: string) => {
    if (!bbox || tooBig) return;
    setScanned(p => ({ ...p, [layerId]: 'scanning' }));
    setStage('scanning');
    try {
      const count = await getCount(layerId, bbox);
      setScanned(p => ({ ...p, [layerId]: count }));
    } catch {
      setScanned(p => ({ ...p, [layerId]: 'error' }));
    }
    setStage('scanned');
  }, [bbox, tooBig]);

  // ── Download ─────────────────────────────────────────────────────────────
  const downloadLayer = useCallback(async (layerId: string) => {
    if (!bbox || tooBig) return;
    setDlStatus(p => ({ ...p, [layerId]: 'loading' }));
    try {
      const fc    = await getFeatures(layerId, bbox);
      const layer = ALL_LAYERS.find(l => l.id === layerId);
      const name  = `gis_${layerId}_${new Date().toISOString().slice(0, 10)}`;
      setDlCounts(p => ({ ...p, [layerId]: fc.features.length }));
      if (!fc.features.length) { setDlStatus(p => ({ ...p, [layerId]: 'done' })); return; }

      if (format === 'csv') {
        downloadBlob(toCSV(normalizeSchema(fc)), `${name}.csv`, 'text/csv');
      } else if (format === 'kml') {
        downloadBlob(toKML(fc, layer?.label ?? layerId), `${name}.kml`, 'application/vnd.google-earth.kml+xml');
      } else if (format === 'shapefile') {
        // Shapefile binary generation is CPU-intensive. Yield to the browser
        // first so the loading spinner renders, then run the conversion.
        await new Promise<void>(r => setTimeout(r, 50));
        const blob = await shpZip(fc, name);
        downloadBlob(blob, `${name}.zip`, 'application/zip');
      } else {
        // GeoJSON: normalise schema so every feature has the same columns
        downloadBlob(JSON.stringify(normalizeSchema(fc), null, 2), `${name}.geojson`, 'application/geo+json');
      }
      setDlStatus(p => ({ ...p, [layerId]: 'done' }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setDlErrors(p => ({ ...p, [layerId]: msg }));
      setDlStatus(p => ({ ...p, [layerId]: 'error' }));
    }
  }, [bbox, format, tooBig]);

  // ── Bundle all selected layers into one ZIP ───────────────────────────────
  const bundleAll = useCallback(async () => {
    if (!bbox || tooBig || selected.size === 0) return;
    setBundleStatus('loading');
    setBundleProgress(0);
    try {
      const JSZip = (await import('jszip')).default;
      const zip   = new JSZip();
      const layers    = ALL_LAYERS.filter(l => selected.has(l.id));
      const osmLayers = layers.filter(l => OSM_IDS.has(l.id));
      const otherLayers = layers.filter(l => !OSM_IDS.has(l.id));
      let done = 0;

      const addLayer = async (layer: Layer) => {
        try {
          const fc = await getFeatures(layer.id, bbox);
          if (!fc.features.length) return;

          if (format === 'shapefile') {
            await new Promise<void>(r => setTimeout(r, 50)); // yield before heavy work
            const layerBlob = await shpZip(fc, layer.id);
            const layerZip  = await JSZip.loadAsync(layerBlob);
            layerZip.forEach((relPath, file) => {
              zip.file(`${layer.id}/${relPath}`, file.async('uint8array'));
            });
          } else if (format === 'csv') {
            zip.file(`${layer.id}.csv`, toCSV(normalizeSchema(fc)));
          } else if (format === 'kml') {
            zip.file(`${layer.id}.kml`, toKML(fc, layer.label));
          } else {
            zip.file(`${layer.id}.geojson`, JSON.stringify(normalizeSchema(fc), null, 2));
          }
        } catch { /* skip failed layers silently */ }
        done++;
        setBundleProgress(Math.round((done / layers.length) * 100));
      };

      // Non-OSM layers run in parallel (each uses a different API server)
      const otherPromise = Promise.allSettled(otherLayers.map(addLayer));
      // OSM layers now call Overpass directly from the browser — 4 at a time is fine
      for (let i = 0; i < osmLayers.length; i += 4) {
        await Promise.allSettled(osmLayers.slice(i, i + 4).map(addLayer));
      }
      await otherPromise;

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      downloadBlob(blob, `gis_bundle_${new Date().toISOString().slice(0, 10)}.zip`, 'application/zip');
      setBundleStatus('done');
    } catch {
      setBundleStatus('error');
    }
  }, [bbox, format, tooBig, selected]);

  const activeSelected     = ALL_LAYERS.filter(l => selected.has(l.id));
  const scanning           = stage === 'scanning';
  const scannedDone        = stage === 'scanned';
  const unscannedSelected  = ALL_LAYERS.filter(l => selected.has(l.id) && scanned[l.id] === undefined);
  const anyScanned         = Object.keys(scanned).length > 0;
  const selectedWithData   = ALL_LAYERS.filter(l => selected.has(l.id) && typeof scanned[l.id] === 'number' && (scanned[l.id] as number) > 0);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/tools" className={styles.back}>← Back to Tools</Link>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarScroll}>
            <h1 className={styles.title}>📥 GIS Data Downloader</h1>
            <p className={styles.subtitle}>Set an area, scan what exists, download what you need.</p>

            {/* Search */}
            <div className={styles.searchBox}>
              <input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchLocation()} placeholder="Search city or place…" />
              <button className={styles.searchBtn} onClick={searchLocation} disabled={searching}>{searching ? '…' : '🔍'}</button>
            </div>

            {/* Draw controls */}
            <div className={styles.areaControls}>
              {!drawMode && !customBbox && <button className={styles.drawBtn} onClick={() => setDrawMode(true)}>✏️ Draw Custom Area</button>}
              {drawMode  && <button className={styles.drawBtnActive} onClick={() => setDrawMode(false)}>⏹ Cancel Drawing</button>}
              {customBbox && !drawMode && (
                <div className={styles.customRow}>
                  <span className={styles.customLabel}>✏️ Custom area active</span>
                  <button className={styles.resetBtn} onClick={resetToViewport}>↺ Use Viewport</button>
                </div>
              )}
            </div>

            {/* Bbox info */}
            {bbox && <div className={`${styles.bboxInfo} ${tooBig ? styles.bboxWarn : ''} ${customBbox ? styles.bboxCustom : ''}`}>{tooBig ? '⚠️ Area too large — zoom in or draw a smaller area.' : `${customBbox?'✏️':'📐'} ~${kmW} km × ${kmH} km`}</div>}
            {!bbox && <div className={styles.bboxHint}>Pan or zoom the map to set the download area.</div>}

            {/* Idle prompt */}
            {stage === 'no-area' && <div className={styles.idlePrompt}><div className={styles.idleIcon}>🗺</div><p>Pan the map or search for a location to get started.</p></div>}

            {/* Layer list — visible as soon as an area is set */}
            {stage !== 'no-area' && !tooBig && (
              <>
                {/* ── Action bar — always above the layer list ── */}

                {/* Scan button */}
                {!scanning && unscannedSelected.length > 0 && (
                  <button className={styles.scanBtn} onClick={scanArea}>
                    🔍 Scan {unscannedSelected.length} selected layer{unscannedSelected.length !== 1 ? 's' : ''}
                  </button>
                )}

                {/* Format picker + bundle — shown once any layer has been scanned */}
                {anyScanned && (
                  <>
                    <div className={styles.fmtSection}>
                      <div className={styles.fmtBtns}>
                        {(['geojson', 'csv', 'kml', 'shapefile'] as Format[]).map(f => (
                          <button key={f} className={`${styles.fmtBtn} ${format === f ? styles.fmtActive : ''}`} onClick={() => setFormat(f)}>
                            {f === 'shapefile' ? 'SHP' : f.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bundle all */}
                    {selectedWithData.length > 1 && !scanning && (
                      <button
                        className={`${styles.bundleBtn} ${bundleStatus==='loading'?styles.bundleLoading:bundleStatus==='done'?styles.bundleDone:bundleStatus==='error'?styles.bundleError:''}`}
                        onClick={() => { setBundleStatus('idle'); bundleAll(); }}
                        disabled={!bbox || tooBig || bundleStatus === 'loading'}
                      >
                        <span>📦 Bundle {selectedWithData.length} layers → .zip</span>
                        <span className={styles.dlStatus}>
                          {bundleStatus === 'loading'
                            ? `${bundleProgress}%`
                            : bundleStatus === 'done'  ? '✓ Downloaded'
                            : bundleStatus === 'error' ? '✗ Error'
                            : '↓'}
                        </span>
                      </button>
                    )}
                  </>
                )}

                <div className={styles.layerSection}>
                  {/* Summary header */}
                  {anyScanned && (
                    <div className={styles.layerSectionHeader}>
                      <span>
                        {scanning
                          ? 'Scanning…'
                          : `${selectedWithData.length} of ${selected.size} selected have data`}
                      </span>
                      {scannedDone && <button className={styles.rescanBtn} onClick={rescan}>↺ Re-scan</button>}
                    </div>
                  )}

                  {LAYER_GROUPS.map(group => (
                    <div key={group.key} className={styles.layerGroup}>
                      <p className={styles.groupHeader}>
                        <span>{group.label}</span>
                        {group.linkHref
                          ? <a href={group.linkHref} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>{group.linkLabel}</a>
                          : <span className={styles.sourceHint}>{group.badge}</span>}
                      </p>

                      {group.layers.map(l => {
                        const sv         = scanned[l.id];
                        const isSelected = selected.has(l.id);
                        const isScanning = sv === 'scanning';
                        const hasData    = typeof sv === 'number' && sv > 0;
                        const noData     = typeof sv === 'number' && sv === 0;
                        const unscanned  = sv === undefined;
                        const s          = dlStatus[l.id] ?? 'idle';
                        return (
                          <div key={l.id}>
                            <label className={`${styles.layerRow} ${isSelected ? styles.layerOn : styles.layerOff} ${noData ? styles.layerEmpty : ''}`}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleLayer(l.id)} disabled={scanning} />
                              <span className={styles.lEmoji}>{l.emoji}</span>
                              <div className={styles.lInfo}>
                                <span className={styles.lLabel}>{l.label}</span>
                              </div>
                              {/* Scan button — shows when unscanned; replaced by count once scanned */}
                              {unscanned && (
                                <button
                                  className={styles.rowScanBtn}
                                  onClick={e => { e.preventDefault(); e.stopPropagation(); scanLayer(l.id); }}
                                  disabled={!bbox || tooBig}
                                  title="Check availability"
                                >🔍</button>
                              )}
                              {/* Count badge — shown after scanning */}
                              <span className={styles.scanCount}>
                                {isScanning && <span className={styles.spinner} />}
                                {sv === 'error' && <span className={styles.countErr}>—</span>}
                                {typeof sv === 'number' && <span className={sv > 0 ? styles.countOk : styles.countZero}>{sv > 0 ? sv.toLocaleString() : 'none'}</span>}
                              </span>
                              {/* Download button — shown once layer has data */}
                              {hasData && (
                                <button
                                  className={`${styles.rowDlBtn} ${s==='loading'?styles.rowDlLoading:s==='done'?styles.rowDlDone:s==='error'?styles.rowDlError:''}`}
                                  onClick={e => { e.preventDefault(); e.stopPropagation(); downloadLayer(l.id); }}
                                  disabled={s === 'loading' || !bbox || tooBig}
                                  title={`Download as .${format === 'shapefile' ? 'zip' : format}`}
                                >
                                  {s === 'loading' ? <span className={styles.spinnerSm} /> : s === 'done' ? '✓' : s === 'error' ? '✗' : '↓'}
                                </button>
                              )}
                            </label>
                            {s === 'error' && dlErrors[l.id] && <p className={styles.dlErrorMsg}>{dlErrors[l.id]}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

              </>
            )}

            <div className={styles.attrib}>
              © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> ·{' '}
              <a href="https://earthquake.usgs.gov" target="_blank" rel="noopener noreferrer">USGS</a> ·{' '}
              <a href="https://www.gbif.org" target="_blank" rel="noopener noreferrer">GBIF</a> ·{' '}
              <a href="https://msc.fema.gov" target="_blank" rel="noopener noreferrer">FEMA</a> ·{' '}
              <a href="https://www.census.gov" target="_blank" rel="noopener noreferrer">US Census</a> ·{' '}
              <a href="https://www.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia</a>
            </div>
          </div>
        </aside>

        {/* Map */}
        <div className={styles.mapWrap}>
          <MapPanel onBoundsChange={handleViewportChange} onFlyToReady={handleFlyToReady} drawMode={drawMode} customBbox={customBbox} onDraw={handleDraw} />
          <div className={styles.mapHint}>
            {drawMode ? '✏️ Click and drag to draw your download area' : customBbox ? '🟡 Custom area active — amber rectangle is your download area' : '🔵 Pan & zoom to set area, or use "Draw Custom Area" above'}
          </div>
        </div>
      </div>
    </div>
  );
}
