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
type DlStatus = 'idle' | 'loading' | 'done' | 'error';
type Format   = 'geojson' | 'csv' | 'kml' | 'shapefile';
type Stage    = 'no-area' | 'has-area' | 'scanning' | 'scanned';
type ScanVal  = 'scanning' | 'error' | number;

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

// ─── Fast count queries (for scan) ───────────────────────────────────────────
async function countOSM(layerId: string, b: Bbox): Promise<number> {
  const bb = `${b.s.toFixed(6)},${b.w.toFixed(6)},${b.n.toFixed(6)},${b.e.toFixed(6)}`;
  const counts: Record<string, string> = {
    buildings:  `[out:json][timeout:15];(way["building"](${bb});relation["building"](${bb}););out count;`,
    roads:      `[out:json][timeout:15];way["highway"](${bb});out count;`,
    pois:       `[out:json][timeout:15];(node["amenity"](${bb});node["shop"](${bb});node["tourism"](${bb}););out count;`,
    parks:      `[out:json][timeout:15];(way["leisure"~"park|garden|nature_reserve"](${bb}););out count;`,
    water:      `[out:json][timeout:15];(way["natural"="water"](${bb});way["waterway"](${bb}););out count;`,
    landuse:    `[out:json][timeout:15];way["landuse"](${bb});out count;`,
    railways:   `[out:json][timeout:15];way["railway"](${bb});out count;`,
  };
  const res  = await fetch('/api/overpass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: counts[layerId] }) });
  const data = await res.json() as { elements?: { tags?: { total?: string } }[] };
  return parseInt(data.elements?.[0]?.tags?.total ?? '0', 10);
}

async function countEarthquakes(b: Bbox): Promise<number> {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const url   = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${b.s}&maxlatitude=${b.n}&minlongitude=${b.w}&maxlongitude=${b.e}&starttime=${since}&minmagnitude=2&limit=0`;
  const data  = await (await fetch(url)).json() as { metadata?: { count?: number } };
  return data.metadata?.count ?? 0;
}

async function countSpecies(b: Bbox): Promise<number> {
  const poly = `${b.w} ${b.s},${b.e} ${b.s},${b.e} ${b.n},${b.w} ${b.n},${b.w} ${b.s}`;
  const data = await (await fetch(`https://api.gbif.org/v1/occurrence/search?geometry=POLYGON((${poly}))&hasCoordinate=true&limit=0`)).json() as { count?: number };
  return data.count ?? 0;
}

// ─── Overpass download queries ────────────────────────────────────────────────
function buildOverpassQuery(id: string, b: Bbox): string {
  const bb = `${b.s.toFixed(6)},${b.w.toFixed(6)},${b.n.toFixed(6)},${b.e.toFixed(6)}`;
  const hd = '[out:json][timeout:30];';
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
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [el.lon!, el.lat!] }, properties: { osm_id: el.id, osm_type: 'node', ...el.tags } });
    } else if (el.type === 'way' && el.nodes) {
      const coords = el.nodes.map(id => nodeCoords.get(id)).filter((c): c is [number, number] => !!c);
      if (coords.length < 2) continue;
      const closed = el.nodes[0] === el.nodes[el.nodes.length - 1] && coords.length >= 4;
      features.push({ type: 'Feature', geometry: closed ? { type: 'Polygon', coordinates: [coords] } : { type: 'LineString', coordinates: coords }, properties: { osm_id: el.id, osm_type: 'way', ...el.tags } });
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
  const keys   = Array.from(new Set(fc.features.flatMap(f => Object.keys(f.properties ?? {}))));
  const header = ['longitude', 'latitude', ...keys].join(',');
  const rows   = fc.features.map(f => { const [lon,lat] = centroid(f); return [lon, lat, ...keys.map(k => `"${String(f.properties?.[k]??'').replace(/"/g,'""')}"`)] .join(','); });
  return [header, ...rows].join('\n');
}

function toKML(fc: GeoFC, name: string): string {
  const marks = fc.features.map(f => {
    const p   = f.properties ?? {};
    const lbl = p.name ?? p.osm_id ?? 'Feature';
    const dsc = Object.entries(p).map(([k,v])=>`<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('');
    const g   = f.geometry as { type: string; coordinates: unknown };
    let geo = '';
    if (g.type==='Point')      { const [x,y]=g.coordinates as [number,number]; geo=`<Point><coordinates>${x},${y},0</coordinates></Point>`; }
    else if (g.type==='LineString') { const cc=(g.coordinates as [number,number][]).map(c=>`${c[0]},${c[1]},0`).join(' '); geo=`<LineString><coordinates>${cc}</coordinates></LineString>`; }
    else if (g.type==='Polygon')    { const cc=((g.coordinates as [number,number][][])[0]).map(c=>`${c[0]},${c[1]},0`).join(' '); geo=`<Polygon><outerBoundaryIs><LinearRing><coordinates>${cc}</coordinates></LinearRing></outerBoundaryIs></Polygon>`; }
    return `  <Placemark><name><![CDATA[${lbl}]]></name><description><![CDATA[<table>${dsc}</table>]]></description>${geo}</Placemark>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>${name}</name>\n${marks}\n</Document>\n</kml>`;
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
  const [search,       setSearch]       = useState('');
  const [searching,    setSearching]    = useState(false);

  // Scan state machine
  const [stage,    setStage]    = useState<Stage>('no-area');
  const [scanned,  setScanned]  = useState<Record<string, ScanVal>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const flyToRef = useRef<((lat: number, lon: number, zoom?: number) => void) | null>(null);

  const bbox   = customBbox ?? viewportBbox;
  const area   = bbox ? Math.abs((bbox.n - bbox.s) * (bbox.e - bbox.w)) : 0;
  const tooBig = area > 0.5;
  const midLat = bbox ? (bbox.n + bbox.s) / 2 : 0;
  const kmW    = bbox ? ((bbox.n - bbox.s) * 111).toFixed(0) : '—';
  const kmH    = bbox ? ((bbox.e - bbox.w) * 111 * Math.cos(midLat * Math.PI / 180)).toFixed(0) : '—';

  // ── Area management ─────────────────────────────────────────────────────
  const handleViewportChange = useCallback((b: Bbox) => {
    setViewportBbox(b);
    setStage(prev => prev === 'no-area' ? 'has-area' : prev);
  }, []);

  const handleDraw = useCallback((b: Bbox) => {
    setCustomBbox(b);
    setDrawMode(false);
    setStage('has-area');
    setScanned({}); setDlStatus({}); setDlCounts({}); setSelected(new Set());
  }, []);

  const resetToViewport = useCallback(() => {
    setCustomBbox(null);
    setStage(viewportBbox ? 'has-area' : 'no-area');
    setScanned({}); setDlStatus({}); setDlCounts({}); setSelected(new Set());
  }, [viewportBbox]);

  const handleFlyToReady = useCallback((fn: (lat: number, lon: number, z?: number) => void) => {
    flyToRef.current = fn;
  }, []);

  // ── Location search ──────────────────────────────────────────────────────
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

  // ── Area scan ────────────────────────────────────────────────────────────
  const scanArea = useCallback(async () => {
    if (!bbox || tooBig) return;
    setStage('scanning');
    setScanned(Object.fromEntries(ALL_LAYERS.map(l => [l.id, 'scanning'])));
    setSelected(new Set());
    setDlStatus({}); setDlCounts({});

    const results: Record<string, number | 'error'> = {};

    await Promise.allSettled(ALL_LAYERS.map(async (layer) => {
      try {
        let count: number;
        if      (layer.id === 'earthquakes') count = await countEarthquakes(bbox);
        else if (layer.id === 'species')     count = await countSpecies(bbox);
        else                                 count = await countOSM(layer.id, bbox);
        results[layer.id] = count;
        setScanned(p => ({ ...p, [layer.id]: count }));
      } catch {
        results[layer.id] = 'error';
        setScanned(p => ({ ...p, [layer.id]: 'error' }));
      }
    }));

    // Auto-check all layers that have data
    setSelected(new Set(ALL_LAYERS.filter(l => typeof results[l.id] === 'number' && (results[l.id] as number) > 0).map(l => l.id)));
    setStage('scanned');
  }, [bbox, tooBig]);

  const rescan = useCallback(() => {
    setStage('has-area');
    setScanned({}); setDlStatus({}); setDlCounts({}); setSelected(new Set());
  }, []);

  const toggleLayer = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Download ─────────────────────────────────────────────────────────────
  const downloadLayer = useCallback(async (layerId: string) => {
    if (!bbox || tooBig) return;
    setDlStatus(p => ({ ...p, [layerId]: 'loading' }));
    try {
      let fc: GeoFC;

      if (layerId === 'earthquakes') {
        const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
        const data  = await (await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${bbox.s}&maxlatitude=${bbox.n}&minlongitude=${bbox.w}&maxlongitude=${bbox.e}&starttime=${since}&minmagnitude=2`)).json() as { features: GeoFeature[] };
        fc = { type: 'FeatureCollection', features: data.features ?? [] };

      } else if (layerId === 'species') {
        const poly = `${bbox.w} ${bbox.s},${bbox.e} ${bbox.s},${bbox.e} ${bbox.n},${bbox.w} ${bbox.n},${bbox.w} ${bbox.s}`;
        const data = await (await fetch(`https://api.gbif.org/v1/occurrence/search?geometry=POLYGON((${poly}))&hasCoordinate=true&limit=300`)).json() as { results?: Record<string, unknown>[] };
        fc = {
          type: 'FeatureCollection',
          features: (data.results ?? []).map(r => ({
            type: 'Feature' as const,
            geometry: { type: 'Point', coordinates: [r.decimalLongitude as number, r.decimalLatitude as number] },
            properties: { species: String(r.species??''), scientific_name: String(r.scientificName??''), date: String(r.eventDate??''), kingdom: String(r.kingdom??''), family: String(r.family??''), country: String(r.country??'') },
          })),
        };

      } else {
        const res = await fetch('/api/overpass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: buildOverpassQuery(layerId, bbox) }) });
        fc = osmToGeoJSON(await res.json() as { elements: OsmElement[] });
      }

      setDlCounts(p => ({ ...p, [layerId]: fc.features.length }));
      if (!fc.features.length) { setDlStatus(p => ({ ...p, [layerId]: 'done' })); return; }

      const layer = ALL_LAYERS.find(l => l.id === layerId);
      const name  = `gis_${layerId}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'csv') {
        downloadBlob(toCSV(fc), `${name}.csv`, 'text/csv');
      } else if (format === 'kml') {
        downloadBlob(toKML(fc, layer?.label ?? layerId), `${name}.kml`, 'application/vnd.google-earth.kml+xml');
      } else if (format === 'shapefile') {
        const shpwrite = await import('@mapbox/shp-write');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content  = await shpwrite.default.zip(fc as any, { outputType: 'blob', compression: 'DEFLATE' } as any);
        downloadBlob(content as Blob, `${name}.zip`, 'application/zip');
      } else {
        downloadBlob(JSON.stringify(fc, null, 2), `${name}.geojson`, 'application/geo+json');
      }
      setDlStatus(p => ({ ...p, [layerId]: 'done' }));
    } catch {
      setDlStatus(p => ({ ...p, [layerId]: 'error' }));
    }
  }, [bbox, format, tooBig]);

  const activeSelected = ALL_LAYERS.filter(l => selected.has(l.id));

  // ─── Render ──────────────────────────────────────────────────────────────
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
              Set an area on the map, scan what data exists, then download what you need.
            </p>

            {/* Search */}
            <div className={styles.searchBox}>
              <input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchLocation()} placeholder="Search city or place…" />
              <button className={styles.searchBtn} onClick={searchLocation} disabled={searching}>{searching ? '…' : '🔍'}</button>
            </div>

            {/* Draw controls */}
            <div className={styles.areaControls}>
              {!drawMode && !customBbox && (
                <button className={styles.drawBtn} onClick={() => setDrawMode(true)}>✏️ Draw Custom Area</button>
              )}
              {drawMode && (
                <button className={styles.drawBtnActive} onClick={() => setDrawMode(false)}>⏹ Cancel Drawing</button>
              )}
              {customBbox && !drawMode && (
                <div className={styles.customRow}>
                  <span className={styles.customLabel}>✏️ Custom area active</span>
                  <button className={styles.resetBtn} onClick={resetToViewport}>↺ Use Viewport</button>
                </div>
              )}
            </div>

            {/* Bbox info */}
            {bbox && (
              <div className={`${styles.bboxInfo} ${tooBig ? styles.bboxWarn : ''} ${customBbox ? styles.bboxCustom : ''}`}>
                {tooBig
                  ? '⚠️ Area too large — zoom in or draw a smaller area.'
                  : `${customBbox ? '✏️' : '📐'} ~${kmW} km × ${kmH} km`}
              </div>
            )}
            {!bbox && <div className={styles.bboxHint}>Pan or zoom the map to set the download area.</div>}

            {/* ── Stage: no-area ── */}
            {stage === 'no-area' && (
              <div className={styles.idlePrompt}>
                <div className={styles.idleIcon}>🗺</div>
                <p>Pan the map or search for a location to get started.</p>
              </div>
            )}

            {/* ── Stage: has-area ── */}
            {stage === 'has-area' && !tooBig && (
              <button className={styles.scanBtn} onClick={scanArea}>
                🔍 Scan Available Data
              </button>
            )}

            {/* ── Stage: scanning & scanned ── */}
            {(stage === 'scanning' || stage === 'scanned') && (
              <>
                <div className={styles.layerSection}>
                  <div className={styles.layerSectionHeader}>
                    <span>{stage === 'scanning' ? 'Scanning…' : 'Available Data'}</span>
                    {stage === 'scanned' && (
                      <button className={styles.rescanBtn} onClick={rescan}>↺ Re-scan</button>
                    )}
                  </div>

                  {/* OSM group */}
                  <p className={styles.groupHeader}>
                    <span>OpenStreetMap</span>
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>© contributors</a>
                  </p>
                  {OSM_LAYERS.map(l => {
                    const sv = scanned[l.id];
                    const hasData = typeof sv === 'number' && sv > 0;
                    const noData  = typeof sv === 'number' && sv === 0;
                    return (
                      <label key={l.id} className={`${styles.layerRow} ${selected.has(l.id) ? styles.layerOn : ''} ${noData ? styles.layerEmpty : ''}`}>
                        {stage === 'scanned' && (
                          <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleLayer(l.id)} disabled={!hasData} />
                        )}
                        <span className={styles.lEmoji}>{l.emoji}</span>
                        <div className={styles.lInfo}>
                          <span className={styles.lLabel}>{l.label}</span>
                          <span className={styles.lDesc}>{l.desc}</span>
                        </div>
                        <span className={styles.scanCount}>
                          {sv === 'scanning' && <span className={styles.spinner} />}
                          {sv === 'error'    && <span className={styles.countErr}>—</span>}
                          {typeof sv === 'number' && (
                            <span className={sv > 0 ? styles.countOk : styles.countZero}>
                              {sv > 0 ? sv.toLocaleString() : 'none'}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}

                  {/* Other sources group */}
                  <p className={styles.groupHeader} style={{ marginTop: 10 }}>
                    <span>USGS · GBIF</span>
                    <span className={styles.sourceHint}>No key required</span>
                  </p>
                  {OTHER_LAYERS.map(l => {
                    const sv = scanned[l.id];
                    const hasData = typeof sv === 'number' && sv > 0;
                    const noData  = typeof sv === 'number' && sv === 0;
                    return (
                      <label key={l.id} className={`${styles.layerRow} ${selected.has(l.id) ? styles.layerOn : ''} ${noData ? styles.layerEmpty : ''}`}>
                        {stage === 'scanned' && (
                          <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleLayer(l.id)} disabled={!hasData} />
                        )}
                        <span className={styles.lEmoji}>{l.emoji}</span>
                        <div className={styles.lInfo}>
                          <span className={styles.lLabel}>{l.label}</span>
                          <span className={styles.lDesc}>{l.desc}</span>
                        </div>
                        <span className={styles.scanCount}>
                          {sv === 'scanning' && <span className={styles.spinner} />}
                          {sv === 'error'    && <span className={styles.countErr}>—</span>}
                          {typeof sv === 'number' && (
                            <span className={sv > 0 ? styles.countOk : styles.countZero}>
                              {sv > 0 ? sv.toLocaleString() : 'none'}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Format + download — only when scanned and something selected */}
                {stage === 'scanned' && (
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
                        {format === 'csv'       && 'CSV — centroid coordinates + all attributes. Opens in Excel / Python.'}
                        {format === 'kml'       && 'KML — opens directly in Google Earth and Google Maps.'}
                        {format === 'shapefile' && 'Shapefile — downloaded as a .zip with .shp / .dbf / .shx / .prj. Opens in QGIS and ArcGIS.'}
                      </p>
                    </div>

                    <div className={styles.dlSection}>
                      <p className={styles.dlLabel}>Download Layers</p>
                      {activeSelected.length === 0 && (
                        <p className={styles.emptyMsg}>Select at least one layer above.</p>
                      )}
                      {activeSelected.map(l => {
                        const s = dlStatus[l.id] ?? 'idle';
                        const n = dlCounts[l.id];
                        return (
                          <button key={l.id}
                            className={`${styles.dlBtn} ${s==='loading'?styles.dlLoading:s==='done'?styles.dlDone:s==='error'?styles.dlError:''}`}
                            onClick={() => downloadLayer(l.id)}
                            disabled={!bbox || tooBig || s === 'loading'}
                          >
                            <span>{l.emoji} {l.label}</span>
                            <span className={styles.dlStatus}>
                              {s==='loading' ? '⏳' : s==='done' ? (n===0?'0 found':`✓ ${n.toLocaleString()}`) : s==='error' ? '✗' : `↓ ${format === 'shapefile' ? '.zip' : `.${format}`}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

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
          <MapPanel
            onBoundsChange={handleViewportChange}
            onFlyToReady={handleFlyToReady}
            drawMode={drawMode}
            customBbox={customBbox}
            onDraw={handleDraw}
          />
          <div className={styles.mapHint}>
            {drawMode
              ? '✏️ Click and drag to draw your download area'
              : customBbox
              ? '🟡 Custom area active — amber rectangle is your download area'
              : '🔵 Pan & zoom to set area, or use "Draw Custom Area" above'}
          </div>
        </div>
      </div>
    </div>
  );
}
