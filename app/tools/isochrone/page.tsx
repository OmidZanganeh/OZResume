'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';
import type { POI } from './IsochroneMap';

/* Must live here (not in IsochroneMap) to avoid a static import of leaflet
   during SSR, which crashes with "window is not defined". */
const RING_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'];

const IsochroneMap = dynamic(() => import('./IsochroneMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

type Costing = 'auto' | 'pedestrian' | 'bicycle';

const MODES: { value: Costing; label: string; icon: string }[] = [
  { value: 'auto',       label: 'Driving', icon: '🚗' },
  { value: 'pedestrian', label: 'Walking', icon: '🚶' },
  { value: 'bicycle',    label: 'Cycling', icon: '🚲' },
];

const ALL_TIMES = [10, 15, 20, 30, 45, 60];

/* ── POI categories (OpenStreetMap tags) ── */
interface PoiCat { id: string; icon: string; label: string; key: string; val: string }
const POI_CATS: PoiCat[] = [
  { id: 'restaurant',   icon: '🍽️', label: 'Restaurants',    key: 'amenity', val: 'restaurant'       },
  { id: 'cafe',         icon: '☕',  label: 'Cafes',           key: 'amenity', val: 'cafe'             },
  { id: 'fuel',         icon: '⛽',  label: 'Gas Stations',    key: 'amenity', val: 'fuel'             },
  { id: 'supermarket',  icon: '🛒',  label: 'Supermarkets',    key: 'shop',    val: 'supermarket'      },
  { id: 'pharmacy',     icon: '💊',  label: 'Pharmacies',      key: 'amenity', val: 'pharmacy'         },
  { id: 'hospital',     icon: '🏥',  label: 'Hospitals',       key: 'amenity', val: 'hospital'         },
  { id: 'bank',         icon: '🏦',  label: 'Banks / ATMs',    key: 'amenity', val: 'bank'             },
  { id: 'park',         icon: '🌳',  label: 'Parks',           key: 'leisure', val: 'park'             },
  { id: 'hotel',        icon: '🏨',  label: 'Hotels',          key: 'tourism', val: 'hotel'            },
  { id: 'school',       icon: '🏫',  label: 'Schools',         key: 'amenity', val: 'school'           },
  { id: 'charging',     icon: '⚡',  label: 'EV Chargers',     key: 'amenity', val: 'charging_station' },
  { id: 'library',      icon: '📚',  label: 'Libraries',       key: 'amenity', val: 'library'          },
  { id: 'gym',          icon: '🏋️', label: 'Gyms',             key: 'leisure', val: 'fitness_centre'   },
  { id: 'parking',      icon: '🅿️', label: 'Parking',          key: 'amenity', val: 'parking'          },
  { id: 'fast_food',    icon: '🍔',  label: 'Fast Food',        key: 'amenity', val: 'fast_food'        },
];

/* ── Helpers ── */
interface GeoJSONFeature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown[] };
}

/** Extract polygon coordinate string from geojson for Overpass poly filter.
 *  Simplifies to ≤ 120 pts to keep query size reasonable. */
function extractPolyString(
  geojson: Record<string, unknown>,
  ringMinutes: number,
  maxPts = 120,
): string | null {
  const features = geojson.features as GeoJSONFeature[];
  const feat = features.find(f => f.properties?.contour === ringMinutes);
  if (!feat) return null;

  let coords: [number, number][] = [];
  const geom = feat.geometry;
  if (geom.type === 'Polygon') {
    coords = geom.coordinates[0] as [number, number][];
  } else if (geom.type === 'MultiPolygon') {
    coords = (geom.coordinates[0] as [number, number][][])[0];
  }
  if (!coords.length) return null;

  // Subsample to keep query lean
  const step = Math.max(1, Math.ceil(coords.length / maxPts));
  const simple = coords.filter((_, i) => i % step === 0);

  // GeoJSON is [lon, lat]; Overpass poly wants "lat lon ..."
  return simple.map(([lon, lat]) => `${lat.toFixed(5)} ${lon.toFixed(5)}`).join(' ');
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function processOverpassResult(elements: OverpassElement[], cat: PoiCat): POI[] {
  return elements
    .map(e => {
      const lat = e.type === 'node' ? e.lat : e.center?.lat;
      const lon = e.type === 'node' ? e.lon : e.center?.lon;
      if (lat == null || lon == null) return null;
      return {
        id:   e.id,
        lat, lon,
        name: e.tags?.name ?? 'Unnamed',
        tags: e.tags ?? {},
        icon: cat.icon,
      };
    })
    .filter((p): p is POI => p !== null)
    .slice(0, 80); // cap at 80 per query
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'],
    tags['addr:city'],
  ].filter(Boolean);
  return parts.join(', ');
}

/* ── Main page ── */
export default function IsochronePage() {
  const [origin,    setOrigin]    = useState<[number, number] | null>(null);
  const [costing,   setCosting]   = useState<Costing>('auto');
  const [times,     setTimes]     = useState<number[]>([15, 30, 45]);
  const [geojson,   setGeojson]   = useState<Record<string, unknown> | null>(null);
  const [geoJsonKey,setGeoJsonKey]= useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // POI state
  const [selectedCat, setSelectedCat] = useState<string>('restaurant');
  const [poiRing,     setPoiRing]     = useState<number | null>(null); // null = use smallest
  const [pois,        setPois]        = useState<POI[]>([]);
  const [activePoi,   setActivePoi]   = useState<number | null>(null);
  const [poiLoading,  setPoiLoading]  = useState(false);
  const [poiError,    setPoiError]    = useState<string | null>(null);

  const handleMapClick = useCallback((lat: number, lon: number) => {
    setOrigin([lat, lon]);
    setGeojson(null);
    setPois([]);
    setError(null);
    setPoiError(null);
  }, []);

  const toggleTime = (t: number) =>
    setTimes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort((a, b) => a - b),
    );

  const generate = async () => {
    if (!origin || times.length === 0) return;
    setLoading(true);
    setError(null);
    setPois([]);
    try {
      const sortedTimes = [...times].sort((a, b) => a - b);
      const res = await fetch('/api/isochrone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [{ lat: origin[0], lon: origin[1] }],
          costing,
          contours: sortedTimes.map(t => ({ time: t })),
          polygons: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      const data = await res.json() as { features: unknown[] };
      const processed = {
        ...data,
        features: (data.features as Record<string, unknown>[]).map((f, i) => ({
          ...f,
          properties: {
            ...(f.properties as object),
            _colorIdx: data.features.length - 1 - i,
          },
        })),
      };
      setGeojson(processed);
      setGeoJsonKey(k => k + 1);
      setPoiRing(null); // reset ring selection when new isochrone is generated
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const findPOIs = async () => {
    if (!geojson) return;
    const cat = POI_CATS.find(c => c.id === selectedCat);
    if (!cat) return;

    const sortedTimes = [...times].sort((a, b) => a - b);
    const ringTime = poiRing ?? sortedTimes[0]; // default to smallest ring

    const polyStr = extractPolyString(geojson, ringTime);
    if (!polyStr) {
      setPoiError(`Could not find the ${ringTime}-min ring polygon. Try regenerating the isochrone.`);
      return;
    }

    const query = `[out:json][timeout:25];(node["${cat.key}"="${cat.val}"](poly:"${polyStr}");way["${cat.key}"="${cat.val}"](poly:"${polyStr}"););out center tags;`;

    setPoiLoading(true);
    setPoiError(null);
    setPois([]);
    setActivePoi(null);

    try {
      const res = await fetch('/api/overpass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? `API error ${res.status}`);
      }
      const data = await res.json() as { elements: OverpassElement[] };
      const result = processOverpassResult(data.elements ?? [], cat);
      setPois(result);
      if (result.length === 0) setPoiError('No results found in this area. Try a larger ring or different category.');
    } catch (e: unknown) {
      setPoiError(e instanceof Error ? e.message : 'Failed to fetch POIs');
    } finally {
      setPoiLoading(false);
    }
  };

  const downloadGeoJSON = () => {
    if (!geojson) return;
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'isochrone.geojson' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedTimes = [...times].sort((a, b) => a - b);
  const modeLabel   = MODES.find(m => m.value === costing)?.label.toLowerCase() ?? 'travel';
  const activeCat   = POI_CATS.find(c => c.id === selectedCat);
  const ringTime    = poiRing ?? (sortedTimes[0] ?? null);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>🗺 Isochrone Mapper</h1>
          <p className={styles.subtitle}>
            Click the map to set an origin, generate travel-time zones, then search for
            restaurants, gas stations, parks, and more within any ring.
          </p>
        </header>

        <div className={styles.mainGrid}>
          {/* ── Controls sidebar ── */}
          <aside className={styles.controls}>

            <div className={styles.controlBlock}>
              <p className={styles.controlLabel}>Travel Mode</p>
              <div className={styles.modeRow}>
                {MODES.map(m => (
                  <button
                    key={m.value}
                    className={`${styles.modeBtn} ${costing === m.value ? styles.modeBtnActive : ''}`}
                    onClick={() => setCosting(m.value)}
                  >
                    <span>{m.icon}</span><span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlBlock}>
              <p className={styles.controlLabel}>Time Rings</p>
              <div className={styles.timeGrid}>
                {ALL_TIMES.map(t => (
                  <button
                    key={t}
                    className={`${styles.timeChip} ${times.includes(t) ? styles.timeChipActive : ''}`}
                    onClick={() => toggleTime(t)}
                  >
                    {t} min
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlBlock}>
              <p className={styles.controlLabel}>Origin</p>
              <p className={styles.originVal}>
                {origin
                  ? `${origin[0].toFixed(4)}, ${origin[1].toFixed(4)}`
                  : <span className={styles.originHint}>Click the map to set</span>}
              </p>
            </div>

            <button
              className={styles.generateBtn}
              onClick={generate}
              disabled={!origin || times.length === 0 || loading}
            >
              {loading ? '⏳ Generating…' : '⚡ Generate Isochrone'}
            </button>

            {error && <p className={styles.error}>⚠ {error}</p>}

            {geojson && !loading && (
              <>
                <div className={styles.legend}>
                  <p className={styles.controlLabel}>Legend</p>
                  {sortedTimes.map((t, i) => (
                    <div key={t} className={styles.legendRow}>
                      <span className={styles.legendSwatch} style={{ background: RING_COLORS[i % RING_COLORS.length] }} />
                      <span className={styles.legendText}>{t} min {modeLabel}</span>
                    </div>
                  ))}
                </div>
                <button className={styles.downloadBtn} onClick={downloadGeoJSON}>
                  ↓ Download GeoJSON
                </button>
              </>
            )}
          </aside>

          {/* ── Map ── */}
          <div className={styles.mapCol}>
            <IsochroneMap
              origin={origin}
              geojson={geojson as never}
              geoJsonKey={geoJsonKey}
              onMapClick={handleMapClick}
              pois={pois}
              activePoi={activePoi}
            />
            {!origin && (
              <p className={styles.mapHint}>👆 Click anywhere on the map to place an origin pin</p>
            )}
          </div>
        </div>

        {/* ── POI Finder — appears after isochrone is generated ── */}
        {geojson && (
          <section className={styles.poiSection}>
            <div className={styles.poiHeader}>
              <h2 className={styles.poiTitle}>📍 Find Places Nearby</h2>
              <p className={styles.poiSubtitle}>
                Search for places within a travel-time ring using OpenStreetMap data.
              </p>
            </div>

            {/* Category picker */}
            <div className={styles.poiControls}>
              <div className={styles.poiControlRow}>
                <span className={styles.poiLabel}>Category</span>
                <div className={styles.catGrid}>
                  {POI_CATS.map(cat => (
                    <button
                      key={cat.id}
                      className={`${styles.catChip} ${selectedCat === cat.id ? styles.catChipActive : ''}`}
                      onClick={() => setSelectedCat(cat.id)}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.poiControlRow}>
                <span className={styles.poiLabel}>Search within</span>
                <div className={styles.ringPicker}>
                  {sortedTimes.map(t => (
                    <button
                      key={t}
                      className={`${styles.ringChip} ${ringTime === t ? styles.ringChipActive : ''}`}
                      onClick={() => setPoiRing(t)}
                    >
                      {t} min
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={styles.findBtn}
                onClick={findPOIs}
                disabled={poiLoading}
              >
                {poiLoading
                  ? '⏳ Searching…'
                  : `🔍 Find ${activeCat?.label ?? 'Places'} within ${ringTime} min`}
              </button>
            </div>

            {poiError && <p className={styles.poiError}>⚠ {poiError}</p>}

            {/* Results */}
            {pois.length > 0 && (
              <div className={styles.poiResults}>
                <p className={styles.poiCount}>
                  {pois.length} {activeCat?.label} found within {ringTime} min {modeLabel}
                  {pois.length === 80 && ' (showing first 80)'}
                </p>
                <div className={styles.poiGrid}>
                  {pois.map(poi => {
                    const addr    = formatAddress(poi.tags);
                    const cuisine = poi.tags.cuisine;
                    const phone   = poi.tags.phone ?? poi.tags['contact:phone'];
                    const website = poi.tags.website ?? poi.tags['contact:website'];
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`;
                    return (
                      <div
                        key={poi.id}
                        className={`${styles.poiCard} ${activePoi === poi.id ? styles.poiCardActive : ''}`}
                        onMouseEnter={() => setActivePoi(poi.id)}
                        onMouseLeave={() => setActivePoi(null)}
                      >
                        <div className={styles.poiCardHead}>
                          <span className={styles.poiIcon}>{poi.icon}</span>
                          <span className={styles.poiName}>{poi.name}</span>
                        </div>
                        {cuisine && (
                          <span className={styles.poiTag}>{cuisine.replace(/_/g, ' ')}</span>
                        )}
                        {addr && <p className={styles.poiAddr}>📌 {addr}</p>}
                        {phone && <p className={styles.poiPhone}>📞 {phone}</p>}
                        <div className={styles.poiLinks}>
                          <a href={mapsUrl} target="_blank" rel="noreferrer" className={styles.poiLink}>
                            Open in Maps
                          </a>
                          {website && (
                            <a href={website} target="_blank" rel="noreferrer" className={styles.poiLink}>
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
