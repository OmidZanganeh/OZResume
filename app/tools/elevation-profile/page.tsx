'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

const ElevationMap = dynamic(() => import('./ElevationMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

/* ── Geometry helpers — mirrors profile_automation.py ── */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function haversineFt(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineKm(lat1, lon1, lat2, lon2) * 3280.84;
}

/**
 * Sample points every `intervalFt` feet along a polyline.
 * Mirrors _fetch_usgs_profile_waypoints in profile_automation.py.
 */
function sampleByInterval(
  pts: [number, number][],
  intervalFt: number,
  maxPts = 500,
): [number, number][] {
  if (pts.length < 2) return pts;

  const result: [number, number][] = [];

  for (let seg = 0; seg < pts.length - 1; seg++) {
    const s = pts[seg], e = pts[seg + 1];
    const segFt = haversineFt(s[0], s[1], e[0], e[1]);

    let d = 0;
    while (d <= segFt && result.length < maxPts - 1) {
      const t = segFt > 0 ? d / segFt : 0;
      result.push([s[0] + t * (e[0] - s[0]), s[1] + t * (e[1] - s[1])]);
      d += intervalFt;
    }
  }

  // Always include the final endpoint
  result.push([...pts[pts.length - 1]]);
  return result.slice(0, maxPts);
}

function totalPathFt(pts: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++)
    d += haversineFt(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1]);
  return d;
}

function estimatePoints(pts: [number, number][], intervalFt: number): number {
  if (pts.length < 2) return 0;
  return Math.min(500, Math.ceil(totalPathFt(pts) / intervalFt) + 1);
}

/* ── Null interpolation: fill noData gaps from valid neighbours ── */
interface ElevPoint {
  lat: number; lon: number;
  distKm: number; distFt: number;
  elevM: number; elevFt: number;
  noData: boolean;
}

function interpolateNulls(data: ElevPoint[]): ElevPoint[] {
  const out = [...data];
  for (let i = 0; i < out.length; i++) {
    if (!out[i].noData) continue;
    let prev = i - 1;
    while (prev >= 0 && out[prev].noData) prev--;
    let next = i + 1;
    while (next < out.length && out[next].noData) next++;

    if (prev >= 0 && next < out.length) {
      const t = (i - prev) / (next - prev);
      out[i] = {
        ...out[i],
        elevFt: out[prev].elevFt + t * (out[next].elevFt - out[prev].elevFt),
        elevM:  out[prev].elevM  + t * (out[next].elevM  - out[prev].elevM),
        noData: false,
      };
    } else if (prev >= 0) {
      out[i] = { ...out[i], elevFt: out[prev].elevFt, elevM: out[prev].elevM, noData: false };
    } else if (next < out.length) {
      out[i] = { ...out[i], elevFt: out[next].elevFt, elevM: out[next].elevM, noData: false };
    }
  }
  return out;
}

/* ── SVG chart ── */
const VB_W = 920, VB_H = 240;
const PAD  = { t: 16, r: 20, b: 44, l: 72 };
const PLOT = { x0: PAD.l, x1: VB_W - PAD.r, y0: PAD.t, y1: VB_H - PAD.b };

function ElevChart({ data, unit }: { data: ElevPoint[]; unit: 'ft' | 'm' }) {
  const elevs  = data.map(p => unit === 'ft' ? p.elevFt : p.elevM);
  const dists  = data.map(p => unit === 'ft' ? p.distFt / 5280 : p.distKm);
  const dLabel = unit === 'ft' ? 'mi' : 'km';

  const rawMin = Math.min(...elevs), rawMax = Math.max(...elevs);
  const pad    = (rawMax - rawMin) * 0.12 || 5;
  const minE   = rawMin - pad, maxE = rawMax + pad;
  const maxD   = dists[dists.length - 1] || 1;

  const xS = (d: number) => PLOT.x0 + (d / maxD) * (PLOT.x1 - PLOT.x0);
  const yS = (e: number) => PLOT.y1 - ((e - minE) / (maxE - minE)) * (PLOT.y1 - PLOT.y0);

  const pts     = data.map((_, i) => `${xS(dists[i]).toFixed(1)},${yS(elevs[i]).toFixed(1)}`).join(' ');
  const areaPts = `${xS(0).toFixed(1)},${PLOT.y1} ${pts} ${xS(maxD).toFixed(1)},${PLOT.y1}`;
  const yTicks  = Array.from({ length: 5 }, (_, i) => minE + (i / 4) * (maxE - minE));
  const xTicks  = Array.from({ length: 5 }, (_, i) => (i / 4) * maxD);

  return (
    <svg id="elevation-chart-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} className={styles.chart} preserveAspectRatio="none">
      <defs>
        <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
        </linearGradient>
      </defs>

      {yTicks.map((e, i) => (
        <g key={i}>
          <line x1={PLOT.x0} y1={yS(e)} x2={PLOT.x1} y2={yS(e)}
            stroke="var(--border-light)" strokeWidth={1} strokeDasharray="4 4" />
          <text x={PLOT.x0 - 6} y={yS(e) + 4} textAnchor="end" fontSize={10} fill="var(--text-muted)">
            {Math.round(e)}
          </text>
        </g>
      ))}

      <polygon points={areaPts} fill="url(#elevGrad)" />
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

      {xTicks.map((d, i) => (
        <g key={i}>
          <line x1={xS(d)} y1={PLOT.y1} x2={xS(d)} y2={PLOT.y1 + 4} stroke="var(--border-dark)" strokeWidth={1} />
          <text x={xS(d)} y={PLOT.y1 + 16} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
            {d.toFixed(2)} {dLabel}
          </text>
        </g>
      ))}

      <text x={PLOT.x0 - 48} y={(PLOT.y0 + PLOT.y1) / 2} textAnchor="middle" fontSize={10}
        fill="var(--text-muted)" transform={`rotate(-90,${PLOT.x0 - 48},${(PLOT.y0 + PLOT.y1) / 2})`}>
        Elevation ({unit})
      </text>
      <text x={(PLOT.x0 + PLOT.x1) / 2} y={VB_H - 4} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
        Distance ({dLabel})
      </text>
    </svg>
  );
}

/* ── Intervals ── */
const INTERVALS = [
  { label: '5 ft',  ft: 5   },
  { label: '10 ft', ft: 10  },
  { label: '25 ft', ft: 25  },
  { label: '50 ft', ft: 50  },
  { label: '100 ft',ft: 100 },
];

/* ── Main page ── */
export default function ElevationProfilePage() {
  const [waypoints,    setWaypoints]    = useState<[number, number][]>([]);
  const [elevData,     setElevData]     = useState<ElevPoint[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [status,       setStatus]       = useState('');
  const [error,        setError]        = useState<string | null>(null);
  const [locked,       setLocked]       = useState(false);
  const [unit,         setUnit]         = useState<'ft' | 'm'>('ft');
  const [intervalFt,   setIntervalFt]   = useState(10);
  const [resolutionM,  setResolutionM]  = useState<number | null>(null);
  const [interpolated, setInterpolated] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const addPoint = useCallback((lat: number, lon: number) => {
    setWaypoints(prev => [...prev, [lat, lon]]);
    setElevData([]);
    setError(null);
  }, []);

  const clear = () => {
    abortRef.current?.abort();
    setWaypoints([]);
    setElevData([]);
    setError(null);
    setLocked(false);
    setLoading(false);
    setStatus('');
    setResolutionM(null);
    setInterpolated(0);
  };

  const getElevation = async () => {
    if (waypoints.length < 2) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    setLocked(true);
    setError(null);
    setElevData([]);
    setInterpolated(0);

    try {
      const samples = sampleByInterval(waypoints, intervalFt);
      setStatus(`Sampling path… ${samples.length} points at ${intervalFt} ft intervals`);

      /* Cumulative distances */
      const cumKm: number[] = [0], cumFt: number[] = [0];
      for (let i = 1; i < samples.length; i++) {
        const km = haversineKm(samples[i-1][0], samples[i-1][1], samples[i][0], samples[i][1]);
        cumKm.push(cumKm[i-1] + km);
        cumFt.push(cumFt[i-1] + km * 3280.84);
      }

      setStatus(`Connecting to USGS 3DEP…`);

      const res = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: samples.map(p => ({ lat: p[0], lon: p[1] })) }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);

      /* Read SSE stream */
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      let   finalResults: { elevFt: number | null; elevM: number | null; noData: boolean }[] | null = null;
      let   finalResM: number | null = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const line = event.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          try {
            const msg = JSON.parse(line.slice(6)) as {
              type: string;
              current?: number;
              total?: number;
              results?: { elevFt: number | null; elevM: number | null; noData: boolean }[];
              resolutionM?: number | null;
              message?: string;
            };

            if (msg.type === 'progress') {
              setStatus(
                `Querying USGS 3DEP… ${msg.current}/${msg.total} points` +
                (msg.current && msg.total ? ` (${Math.round(msg.current / msg.total * 100)}%)` : ''),
              );
            } else if (msg.type === 'done') {
              finalResults = msg.results ?? null;
              finalResM    = msg.resolutionM ?? null;
              break outer;
            } else if (msg.type === 'error') {
              throw new Error(msg.message ?? 'API error');
            }
          } catch { /* ignore parse errors */ }
        }
      }

      if (!finalResults) throw new Error('No data received from USGS');

      setStatus('Processing results…');
      setResolutionM(finalResM);

      /* Build ElevPoint array */
      let raw: ElevPoint[] = samples.map((pt, i) => ({
        lat:    pt[0], lon:    pt[1],
        distKm: cumKm[i], distFt: cumFt[i],
        elevFt: finalResults![i]?.elevFt ?? 0,
        elevM:  finalResults![i]?.elevM  ?? 0,
        noData: finalResults![i]?.noData ?? false,
      }));

      /* Interpolate null points (water, outside coverage) */
      const nullCount = raw.filter(p => p.noData).length;
      if (nullCount > 0) {
        setStatus(`Interpolating ${nullCount} no-data point${nullCount > 1 ? 's' : ''} (water / outside coverage)…`);
        raw = interpolateNulls(raw);
        setInterpolated(nullCount);
      }

      setElevData(raw);
      setStatus(`✓ Complete — ${raw.length} points, ${nullCount > 0 ? `${nullCount} interpolated` : 'all valid'}`);
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') {
        setStatus('Cancelled');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to fetch elevation data');
        setLocked(false);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Stats ── */
  const isM        = unit === 'm';
  const vals       = elevData.map(p => isM ? p.elevM : p.elevFt);
  const totalDist  = elevData.length
    ? (isM ? elevData[elevData.length-1].distKm : elevData[elevData.length-1].distFt / 5280)
    : 0;
  const dUnit      = isM ? 'km' : 'mi';
  const minElev    = vals.length ? Math.min(...vals) : 0;
  const maxElev    = vals.length ? Math.max(...vals) : 0;
  let gain = 0, loss = 0;
  for (let i = 1; i < vals.length; i++) {
    const d = vals[i] - vals[i-1];
    if (d > 0) gain += d; else loss += Math.abs(d);
  }

  const ptPreview  = waypoints.length >= 2 ? estimatePoints(waypoints, intervalFt) : 0;

  /* ── Downloads ── */
  const downloadCSV = () => {
    const header = 'index,latitude,longitude,distance_ft,distance_km,elevation_ft,elevation_m,interpolated';
    const rows   = elevData.map((p, i) =>
      `${i},${p.lat.toFixed(6)},${p.lon.toFixed(6)},${p.distFt.toFixed(2)},${p.distKm.toFixed(4)},${p.elevFt.toFixed(2)},${p.elevM.toFixed(3)},${p.noData}`,
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a    = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'elevation-profile.csv',
    });
    a.click();
  };

  const downloadSVG = () => {
    const el = document.getElementById('elevation-chart-svg');
    if (!el) return;
    const blob = new Blob([new XMLSerializer().serializeToString(el)], { type: 'image/svg+xml' });
    const a    = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'elevation-profile.svg',
    });
    a.click();
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>📈 Elevation Profile Tool</h1>
          <p className={styles.subtitle}>
            Draw a path, choose a point interval, and generate a real elevation profile from{' '}
            <strong>USGS 3DEP</strong> — the same 1-meter dataset used by US engineers and surveyors.
          </p>
        </header>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {/* Interval selector */}
            <div className={styles.intervalGroup}>
              <span className={styles.toolbarLabel}>Interval</span>
              <div className={styles.chipRow}>
                {INTERVALS.map(iv => (
                  <button
                    key={iv.ft}
                    className={`${styles.chip} ${intervalFt === iv.ft ? styles.chipActive : ''}`}
                    onClick={() => setIntervalFt(iv.ft)}
                    disabled={loading}
                  >
                    {iv.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ft / m toggle */}
            <div className={styles.unitToggle}>
              <button className={`${styles.unitBtn} ${unit === 'ft' ? styles.unitBtnActive : ''}`}
                onClick={() => setUnit('ft')}>ft</button>
              <button className={`${styles.unitBtn} ${unit === 'm'  ? styles.unitBtnActive : ''}`}
                onClick={() => setUnit('m')}>m</button>
            </div>
          </div>

          <div className={styles.toolbarRight}>
            {ptPreview > 0 && !loading && (
              <span className={styles.ptPreview}>~{ptPreview} pts</span>
            )}
            {waypoints.length > 0 && !loading && (
              <button className={styles.clearBtn} onClick={clear}>✕ Clear</button>
            )}
            {loading && (
              <button className={styles.cancelBtn} onClick={() => abortRef.current?.abort()}>
                ✕ Cancel
              </button>
            )}
            <button
              className={styles.getBtn}
              onClick={getElevation}
              disabled={waypoints.length < 2 || loading}
            >
              {loading ? '⏳ Fetching…' : '📈 Get Elevation Profile'}
            </button>
          </div>
        </div>

        {/* ── Status bar ── */}
        {(loading || status) && (
          <div className={`${styles.statusBar} ${loading ? styles.statusBarActive : ''}`}>
            {loading && <span className={styles.spinner} />}
            <span className={styles.statusText}>{status || 'Working…'}</span>
          </div>
        )}

        <div className={styles.mapWrap}>
          <ElevationMap waypoints={waypoints} onAddPoint={addPoint} locked={locked} />
          {waypoints.length === 0 && (
            <p className={styles.mapHint}>👆 Click on the map to add waypoints — at least 2 to generate a profile</p>
          )}
        </div>

        {error && <p className={styles.error}>⚠ {error}</p>}

        {/* ── Results ── */}
        {elevData.length > 0 && (
          <div className={styles.results}>
            <div className={styles.sourceBadge}>
              <span>🛰</span>
              <span>
                <strong>USGS 3DEP</strong>
                {resolutionM != null && ` · ${resolutionM.toFixed(1)} m resolution`}
                {' · '}National Elevation Dataset
              </span>
              {interpolated > 0 && (
                <span className={styles.interpNote}>
                  ↝ {interpolated} point{interpolated > 1 ? 's' : ''} interpolated (water / no-data)
                </span>
              )}
            </div>

            <div className={styles.chartWrap}>
              <ElevChart data={elevData} unit={unit} />
            </div>

            <div className={styles.statsRow}>
              {[
                { val: `${totalDist.toFixed(3)} ${dUnit}`, label: 'Total Distance' },
                { val: `${Math.round(minElev)} ${unit}`,   label: 'Min Elevation' },
                { val: `${Math.round(maxElev)} ${unit}`,   label: 'Max Elevation' },
                { val: `+${Math.round(gain)} ${unit}`,     label: 'Gain', color: '#10b981' },
                { val: `−${Math.round(loss)} ${unit}`,     label: 'Loss', color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className={styles.stat}>
                  <span className={styles.statVal} style={s.color ? { color: s.color } : undefined}>{s.val}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.downloadRow}>
              <button className={styles.dlBtn} onClick={downloadCSV}>↓ Download CSV</button>
              <button className={styles.dlBtn} onClick={downloadSVG}>↓ Download SVG Chart</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
