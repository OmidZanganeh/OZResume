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

// ─── Shared proxy fetch (for ArcGIS REST services) ───────────────────────────
async function proxyFetch(url: string): Promise<unknown> {
  const res = await fetch('/api/gis-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
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
  };
  const res  = await fetch('/api/overpass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q[layerId] }) });
  const data = await res.json() as { elements?: { tags?: { total?: string } }[]; error?: string };
  if (data.error || !res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return parseInt(data.elements?.[0]?.tags?.total ?? '0', 10);
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
  };
  return m[id] ?? '';
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
  if (OSM_IDS.has(id)) {
    const res  = await fetch('/api/overpass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: buildOverpassQuery(id, b) }) });
    const raw  = await res.json() as Record<string, unknown>;
    if (!res.ok) throw new Error((raw.error as string | undefined) ?? `Overpass HTTP ${res.status}`);
    return overpassToGeoJSON(raw);
  }
  if (id === 'earthquakes') {
    const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const data  = await (await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${b.s}&maxlatitude=${b.n}&minlongitude=${b.w}&maxlongitude=${b.e}&starttime=${since}&minmagnitude=2`)).json() as { features: GeoFeature[] };
    return { type: 'FeatureCollection', features: data.features ?? [] };
  }
  if (id === 'species') {
    const poly   = `${b.w} ${b.s},${b.e} ${b.s},${b.e} ${b.n},${b.w} ${b.n},${b.w} ${b.s}`;
    const base   = `https://api.gbif.org/v1/occurrence/search?geometry=POLYGON((${poly}))&hasCoordinate=true&limit=300`;
    const page1  = await (await fetch(base + '&offset=0')).json() as { results?: Record<string, unknown>[]; count?: number };
    const total  = Math.min(page1.count ?? 0, 600);
    let results  = page1.results ?? [];
    if (total > 300) {
      const page2 = await (await fetch(base + '&offset=300')).json() as { results?: Record<string, unknown>[] };
      results = results.concat(page2.results ?? []);
    }
    return {
      type: 'FeatureCollection',
      features: results
        .filter(r => r.decimalLongitude != null && r.decimalLatitude != null)
        .map(r => ({
          type: 'Feature' as const,
          geometry: { type: 'Point', coordinates: [r.decimalLongitude as number, r.decimalLatitude as number] },
          properties: { species: String(r.species??''), scientific_name: String(r.scientificName??''), date: String(r.eventDate??''), kingdom: String(r.kingdom??''), family: String(r.family??''), country: String(r.country??'') },
        })),
    };
  }
  if (id === 'flood-zones')   return fetchFEMA(b);
  if (id === 'stream-gauges') return fetchWaterGauges(b);
  if (id === 'wikipedia')     return fetchWikipedia(b);
  if (TIGER_URLS[id])         return fetchTIGER(TIGER_URLS[id], b);
  return { type: 'FeatureCollection', features: [] };
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
function toKML(fc: GeoFC, name: string): string {
  const marks = fc.features.map(f => {
    const p   = f.properties ?? {};
    const lbl = String(p.name ?? p.title ?? p.osm_id ?? 'Feature');
    const dsc = Object.entries(p).map(([k,v])=>`<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('');
    const g   = f.geometry as { type: string; coordinates: unknown };
    let geo   = '';
    if (g.type === 'Point') {
      const [x,y] = g.coordinates as [number,number];
      geo = `<Point><coordinates>${x},${y},0</coordinates></Point>`;
    } else if (g.type === 'LineString') {
      const cc = (g.coordinates as [number,number][]).map(c=>`${c[0]},${c[1]},0`).join(' ');
      geo = `<LineString><coordinates>${cc}</coordinates></LineString>`;
    } else if (g.type === 'MultiLineString') {
      geo = (g.coordinates as [number,number][][]).map(ls=>{
        const cc = ls.map(c=>`${c[0]},${c[1]},0`).join(' ');
        return `<LineString><coordinates>${cc}</coordinates></LineString>`;
      }).join('');
    } else if (g.type === 'Polygon') {
      geo = polygonToKML(g.coordinates as [number,number][][]);
    } else if (g.type === 'MultiPolygon') {
      geo = (g.coordinates as [number,number][][][]).map(poly => polygonToKML(poly)).join('');
    }
    return `  <Placemark><name><![CDATA[${lbl}]]></name><description><![CDATA[<table>${dsc}</table>]]></description>${geo}</Placemark>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>${name}</name>\n${marks}\n</Document>\n</kml>`;
}

// ─── Shapefile helpers ────────────────────────────────────────────────────────
// DBF field names: ≤10 chars, alphanumeric + underscore, no leading digit.
function sanitizePropsForShp(props: GeoFeature['properties']): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  const used = new Set<string>();
  for (const [k, v] of Object.entries(props ?? {})) {
    let key = k.replace(/[^a-zA-Z0-9]/g, '_').replace(/^(\d)/, 'f_$1').slice(0, 10);
    if (!key) key = 'field';
    if (used.has(key)) {
      const base = key.slice(0, 8);
      let n = 2;
      while (used.has(`${base}_${n}`)) n++;
      key = `${base}_${n}`;
    }
    used.add(key);
    out[key] = (v === null || v === undefined) ? '' : (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') ? v : String(v);
  }
  return out;
}

// shp-write only supports Point, LineString, Polygon. Split and explode multi-types.
function explodeForShp(fc: GeoFC): GeoFC[] {
  const pts: GeoFeature[] = [], lns: GeoFeature[] = [], pls: GeoFeature[] = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const p = sanitizePropsForShp(f.properties);
    const g = f.geometry as { type: string; coordinates: unknown };
    const mk = (type: string, coordinates: unknown): GeoFeature =>
      ({ type: 'Feature', geometry: { type, coordinates } as GeoFeature['geometry'], properties: p });
    switch (g.type) {
      case 'Point':           pts.push(mk('Point', g.coordinates)); break;
      case 'MultiPoint':      for (const c of g.coordinates as unknown[]) pts.push(mk('Point', c)); break;
      case 'LineString':      lns.push(mk('LineString', g.coordinates)); break;
      case 'MultiLineString': for (const c of g.coordinates as unknown[]) lns.push(mk('LineString', c)); break;
      case 'Polygon':         pls.push(mk('Polygon', g.coordinates)); break;
      case 'MultiPolygon':    for (const c of g.coordinates as unknown[]) pls.push(mk('Polygon', c)); break;
    }
  }
  return [
    ...(pts.length ? [{ type: 'FeatureCollection' as const, features: pts }] : []),
    ...(lns.length ? [{ type: 'FeatureCollection' as const, features: lns }] : []),
    ...(pls.length ? [{ type: 'FeatureCollection' as const, features: pls }] : []),
  ];
}

async function shpZip(fc: GeoFC, filename: string): Promise<Blob> {
  const shpwrite = (await import('@mapbox/shp-write')).default;
  const groups   = explodeForShp(fc);
  if (!groups.length) return new Blob([], { type: 'application/zip' });

  const JSZip = (await import('jszip')).default;
  const zip   = new JSZip();
  for (const group of groups) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob    = await shpwrite.zip(group as any, { outputType: 'blob', compression: 'DEFLATE' } as any) as Blob;
    const grpZip  = await JSZip.loadAsync(blob);
    grpZip.forEach((relPath, file) => { zip.file(relPath, file.async('uint8array')); });
  }
  void filename; // name applied by caller
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

  const clearResults = () => { setScanned({}); setDlStatus({}); setDlCounts({}); setDlErrors({}); setSelected(new Set()); setBundleStatus('idle'); setBundleProgress(0); };

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
    if (!bbox || tooBig) return;
    setStage('scanning');
    setScanned(Object.fromEntries(ALL_LAYERS.map(l => [l.id, 'scanning'])));
    setSelected(new Set()); setDlStatus({}); setDlCounts({});

    const results: Record<string, number | 'error'> = {};

    const scanOne = async (layer: Layer) => {
      try {
        const count = await getCount(layer.id, bbox);
        results[layer.id] = count;
        setScanned(p => ({ ...p, [layer.id]: count }));
      } catch {
        results[layer.id] = 'error';
        setScanned(p => ({ ...p, [layer.id]: 'error' }));
      }
    };

    // Non-OSM layers use different APIs — run them all in parallel
    const nonOsmLayers = ALL_LAYERS.filter(l => !OSM_IDS.has(l.id));
    const nonOsmPromise = Promise.allSettled(nonOsmLayers.map(scanOne));

    // OSM layers all hit the same Overpass server — batch 4 at a time to avoid rate-limiting
    const osmLayers = ALL_LAYERS.filter(l => OSM_IDS.has(l.id));
    for (let i = 0; i < osmLayers.length; i += 4) {
      await Promise.allSettled(osmLayers.slice(i, i + 4).map(scanOne));
    }

    await nonOsmPromise;

    setSelected(new Set(ALL_LAYERS.filter(l => typeof results[l.id] === 'number' && (results[l.id] as number) > 0).map(l => l.id)));
    setStage('scanned');
  }, [bbox, tooBig]);

  const rescan = useCallback(() => { setStage('has-area'); clearResults(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleLayer = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

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
        downloadBlob(toCSV(fc), `${name}.csv`, 'text/csv');
      } else if (format === 'kml') {
        downloadBlob(toKML(fc, layer?.label ?? layerId), `${name}.kml`, 'application/vnd.google-earth.kml+xml');
      } else if (format === 'shapefile') {
        const blob = await shpZip(fc, name);
        downloadBlob(blob, `${name}.zip`, 'application/zip');
      } else {
        downloadBlob(JSON.stringify(fc, null, 2), `${name}.geojson`, 'application/geo+json');
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
            const layerBlob = await shpZip(fc, layer.id);
            const layerZip  = await JSZip.loadAsync(layerBlob);
            layerZip.forEach((relPath, file) => {
              zip.file(`${layer.id}/${relPath}`, file.async('uint8array'));
            });
          } else if (format === 'csv') {
            zip.file(`${layer.id}.csv`, toCSV(fc));
          } else if (format === 'kml') {
            zip.file(`${layer.id}.kml`, toKML(fc, layer.label));
          } else {
            zip.file(`${layer.id}.geojson`, JSON.stringify(fc, null, 2));
          }
        } catch { /* skip failed layers silently */ }
        done++;
        setBundleProgress(Math.round((done / layers.length) * 100));
      };

      // Non-OSM layers run in parallel (each uses a different API server)
      const otherPromise = Promise.allSettled(otherLayers.map(addLayer));
      // OSM layers batch 4 at a time to avoid overwhelming Overpass
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

  const activeSelected = ALL_LAYERS.filter(l => selected.has(l.id));
  const scanning    = stage === 'scanning';
  const scannedDone = stage === 'scanned';

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

            {/* Scan button */}
            {stage === 'has-area' && !tooBig && <button className={styles.scanBtn} onClick={scanArea}>🔍 Scan Available Data</button>}

            {/* Layer results */}
            {(scanning || scannedDone) && (
              <>
                <div className={styles.layerSection}>
                  <div className={styles.layerSectionHeader}>
                    <span>{scanning ? 'Scanning…' : `${ALL_LAYERS.filter(l => typeof scanned[l.id] === 'number' && (scanned[l.id] as number) > 0).length} of ${ALL_LAYERS.length} layers have data`}</span>
                    {scannedDone && <button className={styles.rescanBtn} onClick={rescan}>↺ Re-scan</button>}
                  </div>

                  {LAYER_GROUPS.map(group => (
                    <div key={group.key} className={styles.layerGroup}>
                      <p className={styles.groupHeader}>
                        <span>{group.label}</span>
                        {group.linkHref
                          ? <a href={group.linkHref} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>{group.linkLabel}</a>
                          : <span className={styles.sourceHint}>{group.badge}</span>}
                      </p>

                      {group.layers.map(l => {
                        const sv      = scanned[l.id];
                        const hasData = typeof sv === 'number' && sv > 0;
                        const noData  = typeof sv === 'number' && sv === 0;
                        return (
                          <label key={l.id} className={`${styles.layerRow} ${selected.has(l.id) ? styles.layerOn : ''} ${noData ? styles.layerEmpty : ''}`}>
                            {scannedDone && <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleLayer(l.id)} disabled={!hasData} />}
                            <span className={styles.lEmoji}>{l.emoji}</span>
                            <div className={styles.lInfo}>
                              <span className={styles.lLabel}>{l.label}</span>
                              <span className={styles.lDesc}>{l.desc}</span>
                            </div>
                            <span className={styles.scanCount}>
                              {sv === 'scanning' && <span className={styles.spinner} />}
                              {sv === 'error'    && <span className={styles.countErr}>—</span>}
                              {typeof sv === 'number' && <span className={sv > 0 ? styles.countOk : styles.countZero}>{sv > 0 ? sv.toLocaleString() : 'none'}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Format + download */}
                {scannedDone && (
                  <>
                    <div className={styles.fmtSection}>
                      <p className={styles.fmtLabel}>Output Format</p>
                      <div className={styles.fmtBtns}>
                        {(['geojson', 'csv', 'kml', 'shapefile'] as Format[]).map(f => (
                          <button key={f} className={`${styles.fmtBtn} ${format === f ? styles.fmtActive : ''}`} onClick={() => setFormat(f)}>
                            {f === 'shapefile' ? 'SHP' : f.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <p className={styles.fmtHint}>
                        {format === 'geojson'   && 'GeoJSON — works in QGIS, ArcGIS, Mapbox, and most GIS tools.'}
                        {format === 'csv'       && 'CSV — centroid + all attributes. Opens in Excel / Python.'}
                        {format === 'kml'       && 'KML — opens in Google Earth and Google Maps.'}
                        {format === 'shapefile' && 'Shapefile — .zip with .shp/.dbf/.shx/.prj. Opens in QGIS & ArcGIS.'}
                      </p>
                    </div>

                    <div className={styles.dlSection}>
                      <p className={styles.dlLabel}>Download Layers</p>
                      {activeSelected.length === 0 && <p className={styles.emptyMsg}>Select at least one layer above.</p>}
                      {activeSelected.map(l => {
                        const s   = dlStatus[l.id] ?? 'idle';
                        const n   = dlCounts[l.id];
                        const err = dlErrors[l.id];
                        return (
                          <div key={l.id}>
                            <button
                              className={`${styles.dlBtn} ${s==='loading'?styles.dlLoading:s==='done'?styles.dlDone:s==='error'?styles.dlError:''}`}
                              onClick={() => downloadLayer(l.id)} disabled={!bbox || tooBig || s === 'loading'}
                            >
                              <span>{l.emoji} {l.label}</span>
                              <span className={styles.dlStatus}>
                                {s==='loading' ? '⏳' : s==='done' ? (n===0?'0 found':`✓ ${n.toLocaleString()}`) : s==='error' ? '✗ Error' : `↓ .${format==='shapefile'?'zip':format}`}
                              </span>
                            </button>
                            {s === 'error' && err && <p className={styles.dlErrorMsg}>{err}</p>}
                          </div>
                        );
                      })}

                      {/* Bundle all button */}
                      {activeSelected.length > 1 && (
                        <button
                          className={`${styles.bundleBtn} ${bundleStatus==='loading'?styles.bundleLoading:bundleStatus==='done'?styles.bundleDone:bundleStatus==='error'?styles.bundleError:''}`}
                          onClick={() => { setBundleStatus('idle'); bundleAll(); }}
                          disabled={!bbox || tooBig || bundleStatus === 'loading'}
                        >
                          <span>📦 Bundle {activeSelected.length} layers → .zip</span>
                          <span className={styles.dlStatus}>
                            {bundleStatus === 'loading'
                              ? `${bundleProgress}%`
                              : bundleStatus === 'done'  ? '✓ Downloaded'
                              : bundleStatus === 'error' ? '✗ Error'
                              : '↓'}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                )}
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
