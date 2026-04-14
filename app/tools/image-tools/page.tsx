'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type Tab = 'csv' | 'exif';

/* ─────────────────────────────────────────
   CSV → GeoJSON Converter
───────────────────────────────────────── */
interface ParsedCSV { headers: string[]; rows: string[][]; }

function parseCSV(text: string): ParsedCSV {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('Need at least a header row and one data row.');

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  };

  return { headers: parseRow(lines[0]), rows: lines.slice(1).map(parseRow) };
}

function autoDetect(headers: string[]): { lat: number; lon: number } | null {
  const lats = ['latitude', 'lat', 'y', 'ylat', 'lat_dd', 'decimallatitude'];
  const lons = ['longitude', 'lon', 'lng', 'long', 'x', 'xlon', 'lon_dd', 'decimallongitude'];
  const h = headers.map(s => s.toLowerCase().replace(/[^a-z]/g, ''));
  const li = h.findIndex(s => lats.includes(s));
  const lo = h.findIndex(s => lons.includes(s));
  return li !== -1 && lo !== -1 ? { lat: li, lon: lo } : null;
}

function buildGeoJSON(csv: ParsedCSV, latIdx: number, lonIdx: number) {
  const features = csv.rows
    .map(row => {
      const lat = parseFloat(row[latIdx]);
      const lon = parseFloat(row[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) return null;
      const props: Record<string, string> = {};
      csv.headers.forEach((h, i) => { if (i !== latIdx && i !== lonIdx) props[h] = row[i] ?? ''; });
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props };
    })
    .filter(Boolean);
  return { type: 'FeatureCollection', features };
}

function CsvToGeoJSON() {
  const [csv, setCsv] = useState<ParsedCSV | null>(null);
  const [latIdx, setLatIdx] = useState<number>(0);
  const [lonIdx, setLonIdx] = useState<number>(1);
  const [geojson, setGeojson] = useState<string>('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => load(e.target?.result as string);
    reader.readAsText(file);
  };

  const load = (text: string) => {
    setError(''); setGeojson(''); setCount(0);
    try {
      const parsed = parseCSV(text);
      setCsv(parsed);
      const det = autoDetect(parsed.headers);
      if (det) { setLatIdx(det.lat); setLonIdx(det.lon); }
      else { setLatIdx(0); setLonIdx(1); }
    } catch (e) { setError((e as Error).message); }
  };

  const convert = () => {
    if (!csv) return;
    setError('');
    try {
      const gj = buildGeoJSON(csv, latIdx, lonIdx);
      const str = JSON.stringify(gj, null, 2);
      setGeojson(str);
      setCount((gj.features as unknown[]).length);
    } catch (e) { setError((e as Error).message); }
  };

  const download = () => {
    const blob = new Blob([geojson], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'output.geojson';
    a.click();
  };

  const copy = () => {
    navigator.clipboard.writeText(geojson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const reset = () => { setCsv(null); setGeojson(''); setError(''); setCount(0); };

  return (
    <div>
      <p className={styles.toolDesc}>
        Upload a CSV with coordinate columns — get a valid GeoJSON FeatureCollection instantly.
        Lat/lon columns are auto-detected. All processing happens in your browser.
      </p>

      {!csv && (
        <div className={styles.dropzone}
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
          onDragOver={e => e.preventDefault()}>
          <span className={styles.dropIcon}>📄</span>
          <p className={styles.dropText}>Drop a CSV file or <span className={styles.dropLink}>click to upload</span></p>
          <p className={styles.dropHint}>Must have a header row with lat/lon columns</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className={styles.hiddenInput}
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        </div>
      )}

      {error && <p className={styles.errorMsg}>❌ {error}</p>}

      {csv && !geojson && (
        <div>
          <div className={styles.previewBox}>
            <p className={styles.previewTitle}>Preview — {csv.rows.length} rows, {csv.headers.length} columns</p>
            <div className={styles.tableWrap}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>{csv.headers.map((h, i) => <th key={i} className={styles.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {csv.rows.slice(0, 5).map((row, ri) => (
                    <tr key={ri}>{csv.headers.map((_, ci) => <td key={ci} className={styles.td}>{row[ci] ?? ''}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.colSelect}>
            <div className={styles.colField}>
              <label className={styles.colLabel}>Latitude column</label>
              <select className={styles.select} value={latIdx} onChange={e => setLatIdx(+e.target.value)}>
                {csv.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
            <div className={styles.colField}>
              <label className={styles.colLabel}>Longitude column</label>
              <select className={styles.select} value={lonIdx} onChange={e => setLonIdx(+e.target.value)}>
                {csv.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button className={styles.convertBtn} onClick={convert}>⚡ Convert to GeoJSON</button>
            <button className={styles.retryBtn} onClick={reset}>Upload Different File</button>
          </div>
        </div>
      )}

      {geojson && (
        <div>
          <div className={styles.resultHeader}>
            <span className={styles.resultCount}>✓ {count} features converted</span>
            <div className={styles.resultBtns}>
              <button className={styles.copyBtn2} onClick={copy}>{copied ? '✓ Copied' : '⧉ Copy'}</button>
              <button className={styles.downloadBtn} onClick={download}>⬇ Download .geojson</button>
              <button className={styles.retryBtn} onClick={reset}>New File</button>
            </div>
          </div>
          <textarea className={styles.geojsonArea} value={geojson} readOnly rows={16} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   EXIF / Metadata Reader
───────────────────────────────────────── */
type ExifStatus = 'idle' | 'loading' | 'done' | 'error' | 'nodata';
interface ExifData { [key: string]: string | number | boolean | undefined; }

const EXIF_LABELS: Record<string, string> = {
  Make: 'Camera Make', Model: 'Camera Model', LensModel: 'Lens',
  ExposureTime: 'Exposure Time', FNumber: 'Aperture', ISO: 'ISO',
  FocalLength: 'Focal Length', Flash: 'Flash',
  DateTimeOriginal: 'Date Taken', PixelXDimension: 'Width (px)', PixelYDimension: 'Height (px)',
  GPSLatitude: 'GPS Latitude', GPSLongitude: 'GPS Longitude', GPSAltitude: 'GPS Altitude',
  Software: 'Software', Orientation: 'Orientation', ColorSpace: 'Color Space',
  WhiteBalance: 'White Balance', MeteringMode: 'Metering Mode',
};

function ExifReader() {
  const [status, setStatus] = useState<ExifStatus>('idle');
  const [meta, setMeta] = useState<ExifData>({});
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStatus('loading'); setMeta({}); setGps(null);
    try {
      const exifr = await import('exifr');
      const data = await exifr.parse(file, { pick: Object.keys(EXIF_LABELS), gps: true });
      if (!data || Object.keys(data).length === 0) { setStatus('nodata'); return; }
      const gpsData = await exifr.gps(file).catch(() => null);
      if (gpsData) setGps({ lat: gpsData.latitude, lon: gpsData.longitude });
      setMeta(data as ExifData);
      setStatus('done');
    } catch { setStatus('error'); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  const fmt = (val: string | number | boolean | undefined): string => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(4);
    return String(val);
  };

  const copyCoords = () => {
    if (!gps) return;
    navigator.clipboard.writeText(`${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const mapsUrl = gps ? `https://www.google.com/maps?q=${gps.lat},${gps.lon}&z=14` : null;

  return (
    <div>
      <p className={styles.toolDesc}>
        Upload a photo to read its embedded metadata: camera model, lens, exposure, ISO, GPS location, and more.
        Everything runs locally — no data leaves your device.
      </p>

      {(status === 'idle' || status === 'nodata' || status === 'error') && (
        <div className={styles.dropzone}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}>
          <span className={styles.dropIcon}>📷</span>
          <p className={styles.dropText}>Drop a photo or <span className={styles.dropLink}>click to upload</span></p>
          <p className={styles.dropHint}>Works best with JPEG photos from cameras and phones</p>
          <input ref={inputRef} type="file" accept="image/*" className={styles.hiddenInput}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {status === 'nodata' && <p className={styles.infoMsg}>⚠ No EXIF metadata found. Try a JPEG from a camera or smartphone.</p>}
      {status === 'error' && <p className={styles.errorMsg}>❌ Could not read metadata. Try a different file.</p>}

      {status === 'loading' && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Reading metadata…</p>
        </div>
      )}

      {status === 'done' && (
        <div>
          {gps && (
            <div className={styles.gpsCard}>
              <span className={styles.gpsIcon}>📍</span>
              <div>
                <p className={styles.gpsTitle}>GPS Location Found</p>
                <p className={styles.gpsCoords}>{gps.lat.toFixed(6)}, {gps.lon.toFixed(6)}</p>
              </div>
              <div className={styles.gpsBtns}>
                <button className={styles.gpsCopy} onClick={copyCoords}>{copied ? '✓ Copied' : 'Copy'}</button>
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.gpsMaps}>Maps ↗</a>}
              </div>
            </div>
          )}
          <div className={styles.metaTable}>
            {Object.entries(EXIF_LABELS).map(([key, label]) => {
              const val = meta[key];
              if (val === undefined) return null;
              return (
                <div key={key} className={styles.metaRow}>
                  <span className={styles.metaKey}>{label}</span>
                  <span className={styles.metaVal}>{fmt(val)}</span>
                </div>
              );
            })}
          </div>
          <button className={styles.retryBtn} style={{ marginTop: 16 }}
            onClick={() => { setStatus('idle'); setMeta({}); setGps(null); }}>
            Read Another Image
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function FileToolsPage() {
  const [tab, setTab] = useState<Tab>('csv');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>
        <header className={styles.header}>
          <h1 className={styles.title}>File Tools</h1>
          <p className={styles.subtitle}>
            Convert CSV to GeoJSON in one click, or read hidden EXIF metadata from any photo.
            Everything runs in your browser — nothing is uploaded to a server.
          </p>
        </header>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'csv' ? styles.tabActive : ''}`} onClick={() => setTab('csv')}>
            📄 CSV → GeoJSON
          </button>
          <button className={`${styles.tab} ${tab === 'exif' ? styles.tabActive : ''}`} onClick={() => setTab('exif')}>
            📷 EXIF Metadata Reader
          </button>
        </div>

        <div className={styles.toolBody}>
          {tab === 'csv' ? <CsvToGeoJSON /> : <ExifReader />}
        </div>
      </div>
    </div>
  );
}
