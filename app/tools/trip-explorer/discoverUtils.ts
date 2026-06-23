import type { WikiPlace } from './MapView';

export const DISCOVER_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  ts: number;
  places?: WikiPlace[];
  groups?: { sectionId: string; places: WikiPlace[] }[];
}

const cache = new Map<string, CacheEntry>();

export function discoverCacheKey(
  lat: number,
  lon: number,
  rad: number,
  catId: string,
  zonePoly?: string,
): string {
  return `${catId}|${lat.toFixed(3)}|${lon.toFixed(3)}|${rad}|${zonePoly?.length ?? 0}`;
}

export function getDiscoverCache(key: string): CacheEntry | null {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.ts > DISCOVER_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit;
}

export function setDiscoverCache(
  key: string,
  data: { places?: WikiPlace[]; groups?: { sectionId: string; places: WikiPlace[] }[] },
): void {
  cache.set(key, { ts: Date.now(), ...data });
}

const DENSE_CATS = new Set([
  'restaurants', 'cafes', 'nightlife', 'shopping', 'health', 'entertainment',
]);

/** Cap radius for dense POI types so Overpass doesn't scan entire metros */
export function effectiveRadius(catId: string, radius: number): number {
  if (catId === 'all') return Math.min(radius, 10_000);
  if (DENSE_CATS.has(catId)) return Math.min(radius, 6_000);
  return radius;
}

export function applyAroundOrPoly(
  template: string,
  lat: number,
  lon: number,
  radius: number,
  zonePoly?: string,
): string {
  if (zonePoly) return template.replace(/\(around:RADIUS,LAT,LON\)/g, `(poly:"${zonePoly}")`);
  return template
    .replace(/RADIUS/g, String(radius))
    .replace(/LAT/g, String(lat))
    .replace(/LON/g, String(lon));
}

/** One combined Overpass union — replaces 10 separate round-trips for "All" */
export function buildCombinedOsmQuery(
  templates: string[],
  lat: number,
  lon: number,
  radius: number,
  zonePoly?: string,
): string {
  const inner = templates
    .map(t => applyAroundOrPoly(t, lat, lon, radius, zonePoly))
    .join('');
  return `[out:json][timeout:18][maxsize:800000];(${inner});out tags center 50;`;
}

export function classifyOsmCategory(tags: Record<string, string>): string | null {
  const tourism = tags.tourism ?? '';
  const amenity = tags.amenity ?? '';
  const leisure = tags.leisure ?? '';
  const historic = tags.historic ?? '';
  const shop = tags.shop ?? '';
  const natural = tags.natural ?? '';

  if (/^(attraction|viewpoint|artwork|zoo|aquarium|theme_park)$/.test(tourism)) return 'landmarks';
  if (/^(monument|memorial|castle|ruins|landmark|building|statue|city_gate|fort|archaeological_site|tomb|wayside_cross|wayside_shrine)$/.test(historic)) return 'landmarks';
  if (/^(place_of_worship|arts_centre)$/.test(amenity)) return 'landmarks';

  if (amenity === 'restaurant') return 'restaurants';
  if (/^(cafe|coffee_shop)$/.test(amenity)) return 'cafes';
  if (/^(hotel|hostel|guest_house|motel)$/.test(tourism)) return 'hotels';
  if (/^(park|nature_reserve|garden)$/.test(leisure)) return 'parks';
  if (/^(museum|gallery)$/.test(tourism)) return 'culture';
  if (/^(cinema|theatre|arts_centre)$/.test(amenity)) return 'entertainment';
  if (/^(amusement_arcade|water_park|escape_game)$/.test(leisure)) return 'entertainment';
  if (natural === 'beach' || leisure === 'beach_resort') return 'beach';
  if (/^(bar|pub|nightclub)$/.test(amenity)) return 'nightlife';
  if (/^(mall|department_store|marketplace|supermarket)$/.test(shop) || amenity === 'marketplace') return 'shopping';
  if (/^(hospital|pharmacy|clinic|doctors)$/.test(amenity)) return 'health';

  return null;
}

export interface OsmElementLike {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function bucketOsmElements(
  elements: OsmElementLike[],
  originLat: number,
  originLon: number,
  catMeta: { id: string; color: string }[],
  haversineM: (a1: number, o1: number, a2: number, o2: number) => number,
  perCatLimit = 15,
): Map<string, WikiPlace[]> {
  const colorById = Object.fromEntries(catMeta.map(c => [c.id, c.color]));
  const buckets = new Map<string, WikiPlace[]>(catMeta.map(c => [c.id, []]));

  for (const e of elements) {
    const eLat = e.lat ?? e.center?.lat;
    const eLon = e.lon ?? e.center?.lon;
    if (eLat == null || eLon == null || !e.tags?.name) continue;
    const catId = classifyOsmCategory(e.tags);
    if (!catId || !buckets.has(catId)) continue;
    buckets.get(catId)!.push({
      uid: `osm:${e.id}`,
      pageid: e.id,
      title: e.tags.name,
      lat: eLat,
      lon: eLon,
      dist: haversineM(originLat, originLon, eLat, eLon),
      source: 'osm',
      category: catId,
      color: colorById[catId],
      osmTags: e.tags,
    });
  }

  for (const [id, list] of buckets) {
    buckets.set(id, list.sort((a, b) => a.dist - b.dist).slice(0, perCatLimit));
  }
  return buckets;
}
