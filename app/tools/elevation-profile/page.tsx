'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

const ElevationMap = dynamic(() => import('./ElevationMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

/* ── Geometry helpers (mirror of profile_automation.py) ── */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function haversineFt(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineKm(lat1, lon1, lat2, lon2) * 3280.84;
}

/** Interpolate N evenly-spaced points along a multi-segment polyline. */
function samplePolyline(pts: [number, number][], n = 100): [number, number][] {
  if (pts.length < 2) return pts;
  if (pts.length >= n) return pts.slice(0, n);

  const cumDist: number[] = [0];
  for (let i = 1; i < pts.length; i++)
    cumDist.push(cumDist[i - 1] + haversineKm(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  const total = cumDist[cumDist.length - 1];

  const result: [number, number][] = [];
  for (let s = 0; s < n; s++) {
    const target = (s / (n - 1)) * total;
    let seg = 0;
    while (seg < pts.length - 2 && cumDist[seg + 1] < target) seg++;
    const span = cumDist[seg + 1] - cumDist[seg];
    const t    = span === 0 ? 0 : (target - cumDist[seg]) / span;
    result.push([
      pts[seg][0] + t * (pts[seg + 1][0] - pts[seg][0]),
      pts[seg][1] + t * (pts[seg + 1][1] - pts[seg][1]),
    ]);
  }
  return result;
}

interface ElevPoint {
  lat: number; lon: number;
  distKm: number; distFt: number;
  elevM: number; elevFt: number;
  noData: boolean;
}

/* ── SVG chart ── */
const VB_W = 920, VB_H = 240;
const PAD  = { t: 16, r: 20, b: 44, l: 72 };
const PLOT = { x0: PAD.l, x1: VB_W - PAD.r, y0: PAD.t, y1: VB_H - PAD.b };

function ElevChart({ data, unit }: { data: ElevPoint[]; unit: 'ft' | 'm' }) {
  const elevs  = data.map(p => unit === 'ft' ? p.elevFt : p.elevM);
  const dists  = data.map(p => unit === 'ft' ? p.distFt / 5280 : p.distKm); // miles or km
  const distLabel = unit === 'ft' ? 'mi' : 'km';

  const rawMin = Math.min(...elevs);
  const rawMax = Math.max(...elevs);
  const pad    = (rawMax - rawMin) * 0.1 || 5;
  const minE   = rawMin - pad;
  const maxE   = rawMax + pad;
  const maxD   = dists[dists.length - 1];

  const xS = (d: number) => PLOT.x0 + (d / maxD) * (PLOT.x1 - PLOT.x0);
  const yS = (e: number) => PLOT.y1 - ((e - minE) / (maxE - minE)) * (PLOT.y1 - PLOT.y0);

  const pts     = data.map((_, i) => `${xS(dists[i]).toFixed(1)},${yS(elevs[i]).toFixed(1)}`).join(' ');
  const areaPts = `${xS(0).toFixed(1)},${PLOT.y1} ${pts} ${xS(maxD).toFixed(1)},${PLOT.y1}`;

  const yTicks = Array.from({ length: 5 }, (_, i) => minE + (i / 4) * (maxE - minE));
  const xTicks = Array.from({ length: 5 }, (_, i) => (i / 4) * maxD);

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
          <line x1={xS(d)} y1={PLOT.y1} x2={xS(d)} y2={PLOT.y1 + 4}
            stroke="var(--border-dark)" strokeWidth={1} />
          <text x={xS(d)} y={PLOT.y1 + 16} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
            {d.toFixed(2)} {distLabel}
          </text>
        </g>
      ))}

      <text x={PLOT.x0 - 48} y={(PLOT.y0 + PLOT.y1) / 2} textAnchor="middle" fontSize={10}
        fill="var(--text-muted)" transform={`rotate(-90,${PLOT.x0 - 48},${(PLOT.y0 + PLOT.y1) / 2})`}>
        Elevation ({unit})
      </text>
      <text x={(PLOT.x0 + PLOT.x1) / 2} y={VB_H - 4} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
        Distance ({distLabel})
      </text>
    </svg>
  );
}

/* ── Main page ── */
export default function ElevationProfilePage() {
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [elevData,  setElevData]  = useState<ElevPoint[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [locked,    setLocked]    = useState(false);
  const [unit,      setUnit]      = useState<'ft' | 'm'>('ft');
  const [resolutionM, setResolutionM] = useState<number | null>(null);
  const [hasNoData, setHasNoData] = useState(false);

  const addPoint = useCallback((lat: number, lon: number) => {
    setWaypoints(prev => [...prev, [lat, lon]]);
    setElevData([]);
    setError(null);
  }, []);

  const clear = () => {
    setWaypoints([]);
    setElevData([]);
    setError(null);
    setLocked(false);
    setResolutionM(null);
    setHasNoData(false);
  };

  const getElevation = async () => {
    if (waypoints.length < 2) return;
    setLoading(true);
    setError(null);
    setLocked(true);
    try {
      const samples = samplePolyline(waypoints, 100);

      /* Cumulative distances */
      const cumDistKm: number[] = [0];
      const cumDistFt: number[] = [0];
      for (let i = 1; i < samples.length; i++) {
        const km = haversineKm(samples[i-1][0], samples[i-1][1], samples[i][0], samples[i][1]);
        const ft = haversineFt(samples[i-1][0], samples[i-1][1], samples[i][0], samples[i][1]);
        cumDistKm.push(cumDistKm[i-1] + km);
        cumDistFt.push(cumDistFt[i-1] + ft);
      }

      /* Call USGS EPQS proxy — same API as profile_automation.py */
      const res = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: samples.map(p => ({ lat: p[0], lon: p[1] })) }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const json = await res.json() as {
        results: { lat: number; lon: number; elevFt: number | null; elevM: number | null; noData: boolean }[];
        resolutionM: number | null;
      };

      setResolutionM(json.resolutionM);
      setHasNoData(json.results.some(r => r.noData));

      setElevData(
        samples.map((pt, i) => ({
          lat:    pt[0],
          lon:    pt[1],
          distKm: cumDistKm[i],
          distFt: cumDistFt[i],
          elevM:  json.results[i]?.elevM  ?? 0,
          elevFt: json.results[i]?.elevFt ?? 0,
          noData: json.results[i]?.noData ?? false,
        })),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch elevation data');
      setLocked(false);
    } finally {
      setLoading(false);
    }
  };

  /* ── Stats ── */
  const vals       = elevData.map(p => unit === 'ft' ? p.elevFt : p.elevM);
  const totalDist  = elevData.length ? (unit === 'ft' ? elevData[elevData.length-1].distFt / 5280 : elevData[elevData.length-1].distKm) : 0;
  const distUnit   = unit === 'ft' ? 'mi' : 'km';
  const minElev    = vals.length ? Math.min(...vals) : 0;
  const maxElev    = vals.length ? Math.max(...vals) : 0;
  let gain = 0, loss = 0;
  for (let i = 1; i < vals.length; i++) {
    const d = vals[i] - vals[i-1];
    if (d > 0) gain += d; else loss += Math.abs(d);
  }

  /* ── Downloads ── */
  const downloadCSV = () => {
    const header = 'index,latitude,longitude,distance_ft,distance_km,elevation_ft,elevation_m';
    const rows   = elevData.map((p, i) =>
      `${i},${p.lat.toFixed(6)},${p.lon.toFixed(6)},${p.distFt.toFixed(2)},${p.distKm.toFixed(4)},${p.elevFt.toFixed(2)},${p.elevM.toFixed(2)}`,
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'elevation-profile.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSVG = () => {
    const svgEl = document.getElementById('elevation-chart-svg');
    if (!svgEl) return;
    const str  = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([str], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'elevation-profile.svg' });
    a.click();
    URL.revokeObjectURL(url);
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
            Draw a path on the map, then generate a real elevation profile from{' '}
            <strong>USGS 3DEP</strong> — the same 1-meter resolution dataset used by US engineers and surveyors.
            Download as CSV or SVG.
          </p>
        </header>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.waypointCount}>
              {waypoints.length === 0
                ? 'Click the map to add waypoints'
                : `${waypoints.length} waypoint${waypoints.length > 1 ? 's' : ''} — click to add more`}
            </span>
          </div>
          <div className={styles.toolbarRight}>
            {/* ft / m toggle */}
            <div className={styles.unitToggle}>
              <button
                className={`${styles.unitBtn} ${unit === 'ft' ? styles.unitBtnActive : ''}`}
                onClick={() => setUnit('ft')}
              >ft</button>
              <button
                className={`${styles.unitBtn} ${unit === 'm' ? styles.unitBtnActive : ''}`}
                onClick={() => setUnit('m')}
              >m</button>
            </div>
            {waypoints.length > 0 && (
              <button className={styles.clearBtn} onClick={clear}>✕ Clear</button>
            )}
            <button
              className={styles.getBtn}
              onClick={getElevation}
              disabled={waypoints.length < 2 || loading}
            >
              {loading ? '⏳ Querying USGS…' : '📈 Get Elevation Profile'}
            </button>
          </div>
        </div>

        <div className={styles.mapWrap}>
          <ElevationMap waypoints={waypoints} onAddPoint={addPoint} locked={locked} />
        </div>

        {error && <p className={styles.error}>⚠ {error}</p>}

        {/* Chart + Stats */}
        {elevData.length > 0 && (
          <div className={styles.results}>

            {/* Source badge */}
            <div className={styles.sourceBadge}>
              <span className={styles.sourceIcon}>🛰</span>
              <span>
                <strong>USGS 3DEP</strong>
                {resolutionM != null && ` · ${resolutionM.toFixed(1)} m resolution`}
                {' · '}National Elevation Dataset
              </span>
              {hasNoData && (
                <span className={styles.noDataWarn}>
                  ⚠ Some points outside US coverage (shown as 0)
                </span>
              )}
            </div>

            <div className={styles.chartWrap}>
              <ElevChart data={elevData} unit={unit} />
            </div>

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statVal}>{totalDist.toFixed(3)} {distUnit}</span>
                <span className={styles.statLabel}>Total Distance</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal}>{Math.round(minElev)} {unit}</span>
                <span className={styles.statLabel}>Min Elevation</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal}>{Math.round(maxElev)} {unit}</span>
                <span className={styles.statLabel}>Max Elevation</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal} style={{ color: '#10b981' }}>+{Math.round(gain)} {unit}</span>
                <span className={styles.statLabel}>Elevation Gain</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal} style={{ color: '#ef4444' }}>−{Math.round(loss)} {unit}</span>
                <span className={styles.statLabel}>Elevation Loss</span>
              </div>
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
