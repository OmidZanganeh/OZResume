'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  ok: boolean;
}

const GeocoderMap = dynamic<{ points: MapPoint[] }>(() => import('./GeocoderMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

/* ─── Types ─── */
type Mode = 'forward' | 'reverse';
type Status = 'idle' | 'running' | 'done' | 'error';

interface ResultRow {
  input: string;
  lat: number | null;
  lon: number | null;
  display_name: string | null;
  confidence: number | null;
  place_rank: number | null;
  addresstype: string | null;
  osm_type: string | null;
  osm_id: number | null;
  road: string | null;
  suburb: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  population: number | null;
  website: string | null;
  wikidata: string | null;
  boundingbox: [string, string, string, string] | null;
  error?: string;
}

/* ─── CSV helpers ─── */
function parseForwardCSV(raw: string): string[] {
  return raw
    .split('\n')
    .map(l => l.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

function parseReverseCSV(raw: string): Array<{ lat: number; lon: number }> | string {
  const rows = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const result: Array<{ lat: number; lon: number }> = [];
  for (const row of rows) {
    // Accept "lat,lon" or "lat lon" or "lat\tlon"
    const parts = row.split(/[,\t ]+/);
    if (parts.length < 2) return `Could not parse row: "${row}" — expected "lat,lon"`;
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) return `Invalid numbers in row: "${row}"`;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return `Out-of-range values in row: "${row}"`;
    result.push({ lat, lon });
  }
  return result;
}

function toCSV(rows: ResultRow[], mode: Mode): string {
  const q = (s: string | null | undefined) => s ? `"${String(s).replace(/"/g, '""')}"` : '';
  if (mode === 'forward') {
    const header = 'input_address,latitude,longitude,confidence,addresstype,place_rank,road,suburb,city,county,state,postcode,country,country_code,population,website,wikidata,osm_type,osm_id,display_name,error';
    const body = rows.map(r => [
      q(r.input), r.lat ?? '', r.lon ?? '',
      r.confidence ?? '', r.addresstype ?? '', r.place_rank ?? '',
      q(r.road), q(r.suburb), q(r.city), q(r.county), q(r.state),
      q(r.postcode), q(r.country), r.country_code ?? '',
      r.population ?? '', q(r.website), q(r.wikidata),
      r.osm_type ?? '', r.osm_id ?? '',
      q(r.display_name), q(r.error),
    ].join(','));
    return [header, ...body].join('\n');
  } else {
    const header = 'input,latitude,longitude,display_name,error';
    const body = rows.map(r => [
      q(r.input), r.lat ?? '', r.lon ?? '',
      q(r.display_name), q(r.error),
    ].join(','));
    return [header, ...body].join('\n');
  }
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const FORWARD_PLACEHOLDER = `1600 Pennsylvania Ave NW, Washington, DC
Empire State Building, New York
Eiffel Tower, Paris
Sydney Opera House
10 Downing Street, London`;

const REVERSE_PLACEHOLDER = `38.8977, -77.0365
40.7484, -73.9856
48.8584, 2.2945
-33.8568, 151.2153
51.5034, -0.1276`;

/* ─── Component ─── */
export default function GeocoderPage() {
  const [mode, setMode] = useState<Mode>('forward');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ResultRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const handleModeSwitch = useCallback((m: Mode) => {
    setMode(m);
    setInput('');
    setResults([]);
    setStatus('idle');
    setErrorMsg('');
    setMapPoints([]);
  }, []);

  const handleRun = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Abort any previous run
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setResults([]);
    setMapPoints([]);
    setErrorMsg('');

    if (mode === 'forward') {
      const addresses = parseForwardCSV(trimmed);
      if (addresses.length === 0) { setErrorMsg('No addresses found.'); return; }
      if (addresses.length > 200) { setErrorMsg('Maximum 200 addresses per batch.'); return; }
      setStatus('running');
      setProgress({ done: 0, total: addresses.length });

      // Send in chunks of 20 to keep SSE-style progress visible
      const allResults: ResultRow[] = [];
      try {
        const CHUNK = 20;
        for (let i = 0; i < addresses.length; i += CHUNK) {
          if (ctrl.signal.aborted) break;
          const chunk = addresses.slice(i, i + CHUNK);
          const res = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'forward', addresses: chunk }),
            signal: ctrl.signal,
          });
          if (!res.ok) throw new Error(`Server error ${res.status}`);
          const data = await res.json() as { results: ResultRow[] };
          allResults.push(...data.results);
          setProgress({ done: allResults.length, total: addresses.length });
          setResults([...allResults]);
          setMapPoints(
            allResults
              .filter(r => r.lat !== null && r.lon !== null)
              .map(r => ({ lat: r.lat!, lon: r.lon!, label: r.display_name ?? r.input, ok: !r.error }))
          );
        }
        setStatus('done');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setErrorMsg((e as Error).message);
          setStatus('error');
        }
      }
    } else {
      const parsed = parseReverseCSV(trimmed);
      if (typeof parsed === 'string') { setErrorMsg(parsed); return; }
      if (parsed.length === 0) { setErrorMsg('No coordinates found.'); return; }
      if (parsed.length > 200) { setErrorMsg('Maximum 200 coordinates per batch.'); return; }
      setStatus('running');
      setProgress({ done: 0, total: parsed.length });

      const allResults: ResultRow[] = [];
      try {
        const CHUNK = 20;
        for (let i = 0; i < parsed.length; i += CHUNK) {
          if (ctrl.signal.aborted) break;
          const chunk = parsed.slice(i, i + CHUNK);
          const res = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'reverse', points: chunk }),
            signal: ctrl.signal,
          });
          if (!res.ok) throw new Error(`Server error ${res.status}`);
          const data = await res.json() as { results: ResultRow[] };
          allResults.push(...data.results);
          setProgress({ done: allResults.length, total: parsed.length });
          setResults([...allResults]);
          setMapPoints(
            allResults
              .filter(r => r.lat !== null && r.lon !== null)
              .map(r => ({ lat: r.lat!, lon: r.lon!, label: r.display_name ?? r.input, ok: !r.error }))
          );
        }
        setStatus('done');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setErrorMsg((e as Error).message);
          setStatus('error');
        }
      }
    }
  }, [mode, input]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setStatus('done');
  }, []);

  const successCount = results.filter(r => r.lat !== null).length;
  const failCount = results.filter(r => r.lat === null).length;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>Geocoder &amp; Reverse Geocoder</h1>
          <p className={styles.subtitle}>
            Paste a list of addresses to get coordinates, or a list of coordinates to get addresses.
            Up to 200 rows per batch. Powered by{' '}
            <a href="https://nominatim.openstreetmap.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
              OpenStreetMap Nominatim
            </a>.
          </p>
        </header>

        {/* ── Mode toggle ── */}
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === 'forward' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeSwitch('forward')}
          >
            📍 Geocode&nbsp;<span className={styles.modeSub}>address → coordinates</span>
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'reverse' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeSwitch('reverse')}
          >
            🔁 Reverse Geocode&nbsp;<span className={styles.modeSub}>coordinates → address</span>
          </button>
        </div>

        <div className={styles.mainGrid}>
          {/* ── Left: input ── */}
          <div className={styles.leftCol}>

            {/* Input area */}
            <div className={styles.inputCard}>
              <div className={styles.inputHeader}>
                <span className={styles.inputLabel}>
                  {mode === 'forward' ? 'Addresses (one per line or CSV)' : 'Coordinates (lat, lon — one per line)'}
                </span>
                <button className={styles.clearBtn} onClick={() => { setInput(''); setResults([]); setStatus('idle'); setMapPoints([]); setErrorMsg(''); }}>
                  Clear
                </button>
              </div>
              <textarea
                className={styles.textarea}
                spellCheck={false}
                rows={10}
                placeholder={mode === 'forward' ? FORWARD_PLACEHOLDER : REVERSE_PLACEHOLDER}
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <div className={styles.inputFooter}>
                <span className={styles.inputHint}>
                  {mode === 'forward'
                    ? 'One address per line. Free-text works — street, city, landmark, postcode.'
                    : 'One coordinate pair per line: "lat, lon" or "lat lon" or "lat\\tlon".'}
                </span>
                <div className={styles.actionRow}>
                  {status === 'running' ? (
                    <button className={styles.stopBtn} onClick={handleStop}>⏹ Stop</button>
                  ) : (
                    <button
                      className={styles.runBtn}
                      disabled={!input.trim()}
                      onClick={handleRun}
                    >
                      {mode === 'forward' ? '🔍 Geocode' : '🔁 Reverse Geocode'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {status === 'running' && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar} style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
                <span className={styles.progressLabel}>{progress.done} / {progress.total} processed…</span>
              </div>
            )}

            {errorMsg && <p className={styles.errorMsg}>⚠ {errorMsg}</p>}

          </div>

          {/* ── Right: map ── */}
          <div className={styles.mapCol}>
            <GeocoderMap points={mapPoints} />
            <p className={styles.mapHint}>
              {mapPoints.length > 0
                ? `${mapPoints.length} location${mapPoints.length !== 1 ? 's' : ''} plotted — click a marker for details`
                : 'Results will appear here once geocoding starts'}
            </p>
          </div>
        </div>

        {/* ── Full-width results table below ── */}
        {results.length > 0 && (
          <div className={styles.resultsRow}>
                <div className={styles.resultsHeader}>
                  <div className={styles.resultsMeta}>
                    <span className={styles.resultsBadgeOk}>{successCount} matched</span>
                    {failCount > 0 && <span className={styles.resultsBadgeFail}>{failCount} not found</span>}
                    {status === 'running' && <span className={styles.resultsBadgeRunning}>running…</span>}
                  </div>
                  <button
                    className={styles.downloadBtn}
                    onClick={() => downloadCSV(toCSV(results, mode), `${mode}-geocode-results.csv`)}
                  >
                    ↓ Download CSV
                  </button>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{mode === 'forward' ? 'Address' : 'Input'}</th>
                        {mode === 'forward' ? (
                          <>
                            <th>Lat</th>
                            <th>Lon</th>
                            <th title="Nominatim importance score 0–1">Conf.</th>
                            <th>Type</th>
                            <th>City</th>
                            <th>State</th>
                            <th>ZIP</th>
                            <th>Country</th>
                            <th>Population</th>
                          </>
                        ) : (
                          <th>Address</th>
                        )}
                        <th>{mode === 'forward' ? 'Display Name / Error' : 'Notes'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} className={r.lat === null ? styles.rowFail : styles.rowOk}>
                          <td className={styles.tdNum}>{i + 1}</td>
                          <td className={styles.tdInput}>{r.input}</td>
                          {mode === 'forward' ? (
                            <>
                              <td className={styles.tdCoord}>{r.lat?.toFixed(5) ?? '—'}</td>
                              <td className={styles.tdCoord}>{r.lon?.toFixed(5) ?? '—'}</td>
                              <td className={styles.tdCoord}>{r.confidence !== null ? `${(r.confidence * 100).toFixed(0)}%` : '—'}</td>
                              <td className={styles.tdCoord}>{r.addresstype ?? '—'}</td>
                              <td className={styles.tdAddress}>{r.city ?? '—'}</td>
                              <td className={styles.tdAddress}>{r.state ?? '—'}</td>
                              <td className={styles.tdCoord}>{r.postcode ?? '—'}</td>
                              <td className={styles.tdCoord}>{r.country_code ?? '—'}</td>
                              <td className={styles.tdCoord}>{r.population != null ? r.population.toLocaleString() : '—'}</td>
                            </>
                          ) : (
                            <td className={styles.tdAddress}>{r.display_name ?? '—'}</td>
                          )}
                          <td className={styles.tdResult}>
                            {r.error ? (
                              <span className={styles.cellFail}>{r.error}</span>
                            ) : mode === 'forward' ? (
                              <span className={styles.cellOk} title={r.display_name ?? ''}>{r.display_name ?? ''}</span>
                            ) : (
                              <span className={styles.cellOk}>✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          )}
      </div>
    </div>
  );
}
