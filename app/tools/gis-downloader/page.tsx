'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';
import type { Bbox } from './MapPanel';

// ─── Dynamic Leaflet import (avoids SSR window issues) ─────────────────────
const MapPanel = dynamic(() => import('./MapPanel'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

// ─── Types ──────────────────────────────────────────────────────────────────
type Status = 'idle' | 'loading' | 'done' | 'error';
type Format = 'geojson' | 'csv' | 'kml';

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

interface GeoFeature {
  type: 'Feature';
  geometry: Record<string, unknown>;
  properties: Record<string, string | number | boolean | null>;
}
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[]; }

// ─── Layer definitions ───────────────────────────────────────────────────────
const OSM_LAYERS = [
  { id: 'buildings', label: 'Buildings',            emoji: '🏘', desc: 'Building footprints' },
  { id: 'roads',     label: 'Roads & Streets',      emoji: '🛣', desc: 'All highway types' },
  { id: 'pois',      label: 'Points of Interest',   emoji: '📍', desc: 'Amenities, shops, tourism' },
  { id: 'parks',     label: 'Parks & Green Spaces', emoji: '🌿', desc: 'Parks, gardens, reserves' },
  { id: 'water',     label: 'Water Bodies',         emoji: '💧', desc: 'Lakes, rivers, waterways' },
  { id: 'landuse',   label: 'Land Use',             emoji: '🗺', desc: 'Residential, commercial, farmland' },
  { id: 'railways',  label: 'Railways & Transit',   emoji: '🚂', desc: 'Rail lines, stations' },
];

const OTHER_LAYERS = [
  { id: 'earthquakes', label: 'Earthquakes (Past Year)', emoji: '🌊', desc: 'USGS seismic events ≥ M2.0' },
  { id: 'species',     label: 'Species Observations',    emoji: '🦁', desc: 'GBIF biodiversity records' },
];

const ALL_LAYERS = [...OSM_LAYERS, ...OTHER_LAYERS];

// ─── Overpass queries ────────────────────────────────────────────────────────
function buildOverpassQuery(id: string, b: Bbox): string {
  const bb  = `${b.s.toFixed(6)},${b.w.toFixed(6)},${b.n.toFixed(6)},${b.e.toFixed(6)}`;
  const hd  = `[out:json][timeout:30];`;
  const map: Record<string, string> = {
    buildings:  `${hd}(way["building"](${bb});relation["building"](${bb}););out body;>;out skel qt;`,
    roads:      `${hd}way["highway"](${bb});out body;>;out skel qt;`,
    pois:       `${hd}(node["amenity"](${bb});node["shop"](${bb});node["tourism"](${bb}););out body;`,
    parks:      `${hd}(way["leisure"~"park|garden|nature_reserve"](${bb}););out body;>;out skel qt;`,
    water:      `${hd}(way["natural"="water"](${bb});way["waterway"](${bb});relation["natural"="water"](${bb}););out body;>;out skel qt;`,
    landuse:    `${hd}way["landuse"](${bb});out body;>;out skel qt;`,
    railways:   `${hd}way["railway"](${bb});out body;>;out skel qt;`,
  };
  return map[id] ?? '';
}

// ─── OSM → GeoJSON ──────────────────────────────────────────────────────────
function osmToGeoJSON(data: { elements: OsmElement[] }): GeoFC {
  const nodeCoords = new Map<number, [number, number]>();
  for (const el of data.elements) {
    if (el.type === 'node') nodeCoords.set(el.id, [el.lon!, el.lat!]);
  }

  const features: GeoFeature[] = [];
  for (const el of data.elements) {
    if (!el.tags || !Object.keys(el.tags).length) continue;

    if (el.type === 'node') {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [el.lon!, el.lat!] },
        properties: { osm_id: el.id, osm_type: 'node', ...el.tags },
      });
    } else if (el.type === 'way' && el.nodes) {
      const coords = el.nodes.map(id => nodeCoords.get(id)).filter((c): c is [number, number] => !!c);
      if (coords.length < 2) continue;
      const closed = el.nodes[0] === el.nodes[el.nodes.length - 1] && coords.length >= 4;
      features.push({
        type: 'Feature',
        geometry: closed
          ? { type: 'Polygon',    coordinates: [coords] }
          : { type: 'LineString', coordinates: coords },
        properties: { osm_id: el.id, osm_type: 'way', ...el.tags },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// ─── Format converters ───────────────────────────────────────────────────────
function centroid(f: GeoFeature): [number, number] {
  const g = f.geometry as { type: string; coordinates: unknown };
  if (g.type === 'Point')      return g.coordinates as [number, number];
  if (g.type === 'LineString') { const c = g.coordinates as [number,number][]; return c[Math.floor(c.length/2)]; }
  if (g.type === 'Polygon')    { const c = (g.coordinates as [number,number][][])[0]; return [c.reduce((s,p)=>s+p[0],0)/c.length, c.reduce((s,p)=>s+p[1],0)/c.length]; }
  return [0, 0];
}

function toCSV(fc: GeoFC): string {
  if (!fc.features.length) return 'No features found.';
  const keys = Array.from(new Set(fc.features.flatMap(f => Object.keys(f.properties ?? {}))));
  const header = ['longitude', 'latitude', ...keys].join(',');
  const rows = fc.features.map(f => {
    const [lon, lat] = centroid(f);
    return [lon, lat, ...keys.map(k => `"${String(f.properties?.[k] ?? '').replace(/"/g, '""')}"`)] .join(',');
  });
  return [header, ...rows].join('\n');
}

function toKML(fc: GeoFC, name: string): string {
  const marks = fc.features.map(f => {
    const p = f.properties ?? {};
    const lbl = p.name ?? p.osm_id ?? 'Feature';
    const desc = Object.entries(p).map(([k,v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('');
    const g = f.geometry as { type: string; coordinates: unknown };
    let geo = '';
    if (g.type === 'Point') {
      const [x,y] = g.coordinates as [number,number]; geo = `<Point><coordinates>${x},${y},0</coordinates></Point>`;
    } else if (g.type === 'LineString') {
      const cc = (g.coordinates as [number,number][]).map(c=>`${c[0]},${c[1]},0`).join(' ');
      geo = `<LineString><coordinates>${cc}</coordinates></LineString>`;
    } else if (g.type === 'Polygon') {
      const cc = ((g.coordinates as [number,number][][])[0]).map(c=>`${c[0]},${c[1]},0`).join(' ');
      geo = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${cc}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    }
    return `  <Placemark><name><![CDATA[${lbl}]]></name><description><![CDATA[<table>${desc}</table>]]></description>${geo}</Placemark>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>${name}</name>\n${marks}\n</Document>\n</kml>`;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GISDownloaderPage() {
  const [bbox,     setBbox]     = useState<Bbox | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(['buildings', 'roads', 'pois']));
  const [format,   setFormat]   = useState<Format>('geojson');
  const [status,   setStatus]   = useState<Record<string, Status>>({});
  const [counts,   setCounts]   = useState<Record<string, number>>({});
  const [search,   setSearch]   = useState('');
  const [searching, setSearching] = useState(false);
  const flyToRef = useRef<((lat: number, lon: number, zoom?: number) => void) | null>(null);

  const area      = bbox ? Math.abs((bbox.n - bbox.s) * (bbox.e - bbox.w)) : 0;
  const tooBig    = area > 0.5;
  const midLat    = bbox ? (bbox.n + bbox.s) / 2 : 0;
  const kmW       = bbox ? ((bbox.n - bbox.s) * 111).toFixed(0) : '—';
  const kmH       = bbox ? ((bbox.e - bbox.w) * 111 * Math.cos(midLat * Math.PI / 180)).toFixed(0) : '—';

  const toggleLayer = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const setLS = (id: string, s: Status) => setStatus(p => ({ ...p, [id]: s }));
  const setLC = (id: string, n: number) => setCounts(p => ({ ...p, [id]: n }));

  const handleFlyToReady = useCallback((fn: (lat: number, lon: number, z?: number) => void) => {
    flyToRef.current = fn;
  }, []);

  const searchLocation = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json() as { lat: string; lon: string }[];
      if (data[0] && flyToRef.current) flyToRef.current(+data[0].lat, +data[0].lon, 13);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  };

  const downloadLayer = useCallback(async (layerId: string) => {
    if (!bbox || tooBig) return;
    setLS(layerId, 'loading');
    try {
      let fc: GeoFC;

      if (layerId === 'earthquakes') {
        const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
        const url   = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${bbox.s}&maxlatitude=${bbox.n}&minlongitude=${bbox.w}&maxlongitude=${bbox.e}&starttime=${since}&minmagnitude=2`;
        const data  = await (await fetch(url)).json() as { features: GeoFeature[] };
        fc = { type: 'FeatureCollection', features: data.features ?? [] };

      } else if (layerId === 'species') {
        const poly = `${bbox.w} ${bbox.s},${bbox.e} ${bbox.s},${bbox.e} ${bbox.n},${bbox.w} ${bbox.n},${bbox.w} ${bbox.s}`;
        const url  = `https://api.gbif.org/v1/occurrence/search?geometry=POLYGON((${poly}))&hasCoordinate=true&limit=300`;
        const data = await (await fetch(url)).json() as { results?: Record<string, unknown>[] };
        fc = {
          type: 'FeatureCollection',
          features: (data.results ?? []).map(r => ({
            type: 'Feature' as const,
            geometry: { type: 'Point', coordinates: [r.decimalLongitude as number, r.decimalLatitude as number] },
            properties: {
              species:         String(r.species         ?? ''),
              scientific_name: String(r.scientificName  ?? ''),
              date:            String(r.eventDate       ?? ''),
              kingdom:         String(r.kingdom         ?? ''),
              family:          String(r.family          ?? ''),
              country:         String(r.country         ?? ''),
            },
          })),
        };

      } else {
        const query = buildOverpassQuery(layerId, bbox);
        const res   = await fetch('/api/overpass', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ query }),
        });
        fc = osmToGeoJSON(await res.json() as { elements: OsmElement[] });
      }

      setLC(layerId, fc.features.length);
      if (!fc.features.length) { setLS(layerId, 'done'); return; }

      const layer = ALL_LAYERS.find(l => l.id === layerId);
      const name  = `gis_${layerId}_${new Date().toISOString().slice(0, 10)}`;
      if (format === 'csv') {
        downloadBlob(toCSV(fc), `${name}.csv`, 'text/csv');
      } else if (format === 'kml') {
        downloadBlob(toKML(fc, layer?.label ?? layerId), `${name}.kml`, 'application/vnd.google-earth.kml+xml');
      } else {
        downloadBlob(JSON.stringify(fc, null, 2), `${name}.geojson`, 'application/geo+json');
      }
      setLS(layerId, 'done');
    } catch {
      setLS(layerId, 'error');
    }
  }, [bbox, format, tooBig]);

  const activeSelected = ALL_LAYERS.filter(l => selected.has(l.id));

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/tools" className={styles.back}>← Back to Tools</Link>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarScroll}>

            <h1 className={styles.title}>📥 GIS Data Downloader</h1>
            <p className={styles.subtitle}>
              Pan &amp; zoom the map to your area, choose layers, and download free geodata.
            </p>

            {/* Search */}
            <div className={styles.searchBox}>
              <input
                className={styles.searchInput}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchLocation()}
                placeholder="Search city or place…"
              />
              <button className={styles.searchBtn} onClick={searchLocation} disabled={searching}>
                {searching ? '…' : '🔍'}
              </button>
            </div>

            {/* Bbox info */}
            {bbox && (
              <div className={`${styles.bboxInfo} ${tooBig ? styles.bboxWarn : ''}`}>
                {tooBig
                  ? '⚠️ Area is too large — zoom in for best results (max ~50 × 50 km).'
                  : `📐 ~${kmW} km × ${kmH} km  ·  bbox ready`}
              </div>
            )}
            {!bbox && (
              <div className={styles.bboxHint}>Pan or zoom the map to set the download area.</div>
            )}

            {/* OSM layers */}
            <div className={styles.layerGroup}>
              <p className={styles.groupHeader}>
                <span>OpenStreetMap</span>
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>© contributors</a>
              </p>
              {OSM_LAYERS.map(l => (
                <label key={l.id} className={`${styles.layerRow} ${selected.has(l.id) ? styles.layerOn : ''}`}>
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleLayer(l.id)} />
                  <span className={styles.lEmoji}>{l.emoji}</span>
                  <div className={styles.lInfo}>
                    <span className={styles.lLabel}>{l.label}</span>
                    <span className={styles.lDesc}>{l.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Other layers */}
            <div className={styles.layerGroup}>
              <p className={styles.groupHeader}>
                <span>USGS · GBIF</span>
                <span className={styles.sourceHint}>No API key required</span>
              </p>
              {OTHER_LAYERS.map(l => (
                <label key={l.id} className={`${styles.layerRow} ${selected.has(l.id) ? styles.layerOn : ''}`}>
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleLayer(l.id)} />
                  <span className={styles.lEmoji}>{l.emoji}</span>
                  <div className={styles.lInfo}>
                    <span className={styles.lLabel}>{l.label}</span>
                    <span className={styles.lDesc}>{l.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Format */}
            <div className={styles.fmtSection}>
              <p className={styles.fmtLabel}>Output Format</p>
              <div className={styles.fmtBtns}>
                {(['geojson', 'csv', 'kml'] as Format[]).map(f => (
                  <button key={f} className={`${styles.fmtBtn} ${format === f ? styles.fmtActive : ''}`} onClick={() => setFormat(f)}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className={styles.fmtHint}>
                {format === 'geojson' && 'GeoJSON — works in QGIS, ArcGIS, Mapbox, and most GIS tools.'}
                {format === 'csv'     && 'CSV — centroid coordinates + all attributes. Great for Excel / Python.'}
                {format === 'kml'     && 'KML — opens directly in Google Earth and Google Maps.'}
              </p>
            </div>

            {/* Download buttons */}
            <div className={styles.dlSection}>
              <p className={styles.dlLabel}>Download Layers</p>
              {activeSelected.length === 0 && (
                <p className={styles.emptyMsg}>Select at least one layer above.</p>
              )}
              {activeSelected.map(l => {
                const s = status[l.id] ?? 'idle';
                const n = counts[l.id];
                return (
                  <button
                    key={l.id}
                    className={`${styles.dlBtn} ${s === 'loading' ? styles.dlLoading : s === 'done' ? styles.dlDone : s === 'error' ? styles.dlError : ''}`}
                    onClick={() => downloadLayer(l.id)}
                    disabled={!bbox || tooBig || s === 'loading'}
                  >
                    <span>{l.emoji} {l.label}</span>
                    <span className={styles.dlStatus}>
                      {s === 'loading' ? '⏳' : s === 'done' ? (n === 0 ? '0 found' : `✓ ${n.toLocaleString()}`) : s === 'error' ? '✗ Error' : '↓'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Attribution */}
            <div className={styles.attrib}>
              Data: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors ·{' '}
              <a href="https://earthquake.usgs.gov" target="_blank" rel="noopener noreferrer">USGS</a> ·{' '}
              <a href="https://www.gbif.org" target="_blank" rel="noopener noreferrer">GBIF</a>
            </div>
          </div>
        </aside>

        {/* ── Map ── */}
        <div className={styles.mapWrap}>
          <MapPanel onBoundsChange={setBbox} onFlyToReady={handleFlyToReady} />
          <div className={styles.mapHint}>The blue rectangle = your download area. Pan and zoom to adjust.</div>
        </div>
      </div>
    </div>
  );
}
