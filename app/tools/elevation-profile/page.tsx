'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

const ElevationMap = dynamic(() => import('./ElevationMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

/* ── Geometry helpers ── */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Sample `n` evenly-spaced points along a polyline. */
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

interface ElevPoint { lat: number; lon: number; distKm: number; elevM: number; }

/* ── SVG chart ── */
const VB_W = 920, VB_H = 240;
const PAD  = { t: 16, r: 20, b: 44, l: 68 };
const PLOT = { x0: PAD.l, x1: VB_W - PAD.r, y0: PAD.t, y1: VB_H - PAD.b };

function ElevChart({ data }: { data: ElevPoint[] }) {
  const elevs = data.map(p => p.elevM);
  const rawMin = Math.min(...elevs);
  const rawMax = Math.max(...elevs);
  const pad    = (rawMax - rawMin) * 0.08 || 5;
  const minE   = rawMin - pad;
  const maxE   = rawMax + pad;
  const maxD   = data[data.length - 1].distKm;

  const xS = (d: number) => PLOT.x0 + (d / maxD)           * (PLOT.x1 - PLOT.x0);
  const yS = (e: number) => PLOT.y1 - ((e - minE) / (maxE - minE)) * (PLOT.y1 - PLOT.y0);

  const pts    = data.map(p => `${xS(p.distKm).toFixed(1)},${yS(p.elevM).toFixed(1)}`).join(' ');
  const linePts = pts;
  const areaPts = `${xS(0).toFixed(1)},${PLOT.y1} ${pts} ${xS(maxD).toFixed(1)},${PLOT.y1}`;

  /* Grid — 5 elevation levels */
  const yTicks = Array.from({ length: 5 }, (_, i) => minE + (i / 4) * (maxE - minE));
  /* X axis — 5 distance marks */
  const xTicks = Array.from({ length: 5 }, (_, i) => (i / 4) * maxD);

  return (
    <svg
      id="elevation-chart-svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={styles.chart}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yTicks.map((e, i) => (
        <g key={i}>
          <line
            x1={PLOT.x0} y1={yS(e)} x2={PLOT.x1} y2={yS(e)}
            stroke="var(--border-light)" strokeWidth={1} strokeDasharray="4 4"
          />
          <text
            x={PLOT.x0 - 6} y={yS(e) + 4}
            textAnchor="end" fontSize={10} fill="var(--text-muted)"
          >
            {Math.round(e)}
          </text>
        </g>
      ))}

      {/* Filled area */}
      <polygon points={areaPts} fill="url(#elevGrad)" />

      {/* Elevation line */}
      <polyline points={linePts} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

      {/* X axis ticks + labels */}
      {xTicks.map((d, i) => (
        <g key={i}>
          <line
            x1={xS(d)} y1={PLOT.y1} x2={xS(d)} y2={PLOT.y1 + 4}
            stroke="var(--border-dark)" strokeWidth={1}
          />
          <text
            x={xS(d)} y={PLOT.y1 + 16}
            textAnchor="middle" fontSize={10} fill="var(--text-muted)"
          >
            {d.toFixed(1)} km
          </text>
        </g>
      ))}

      {/* Axis labels */}
      <text
        x={PLOT.x0 - 44} y={(PLOT.y0 + PLOT.y1) / 2}
        textAnchor="middle" fontSize={10} fill="var(--text-muted)"
        transform={`rotate(-90, ${PLOT.x0 - 44}, ${(PLOT.y0 + PLOT.y1) / 2})`}
      >
        Elevation (m)
      </text>
      <text
        x={(PLOT.x0 + PLOT.x1) / 2} y={VB_H - 4}
        textAnchor="middle" fontSize={10} fill="var(--text-muted)"
      >
        Distance (km)
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
  };

  const getElevation = async () => {
    if (waypoints.length < 2) return;
    setLoading(true);
    setError(null);
    setLocked(true);
    try {
      const samples = samplePolyline(waypoints, 100);

      /* Build cumulative distances for the samples */
      const cumDist: number[] = [0];
      for (let i = 1; i < samples.length; i++)
        cumDist.push(
          cumDist[i - 1] + haversineKm(samples[i - 1][0], samples[i - 1][1], samples[i][0], samples[i][1]),
        );

      const lats = samples.map(p => p[0]).join(',');
      const lons = samples.map(p => p[1]).join(',');
      const res  = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`,
      );
      if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
      const json = await res.json() as { elevation: number[] };

      setElevData(
        samples.map((pt, i) => ({
          lat:    pt[0],
          lon:    pt[1],
          distKm: cumDist[i],
          elevM:  json.elevation[i] ?? 0,
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
  const totalDist = elevData.length ? elevData[elevData.length - 1].distKm : 0;
  const elevs     = elevData.map(p => p.elevM);
  const minElev   = elevs.length ? Math.min(...elevs) : 0;
  const maxElev   = elevs.length ? Math.max(...elevs) : 0;
  let gain = 0, loss = 0;
  for (let i = 1; i < elevData.length; i++) {
    const d = elevData[i].elevM - elevData[i - 1].elevM;
    if (d > 0) gain += d; else loss += Math.abs(d);
  }

  /* ── Downloads ── */
  const downloadCSV = () => {
    const header = 'index,latitude,longitude,distance_km,elevation_m';
    const rows   = elevData.map((p, i) =>
      `${i},${p.lat.toFixed(6)},${p.lon.toFixed(6)},${p.distKm.toFixed(4)},${p.elevM.toFixed(1)}`,
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
            Click the map to draw a path, then generate a real elevation profile from global terrain data.
            Download results as CSV or SVG.
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
            {waypoints.length > 0 && (
              <button className={styles.clearBtn} onClick={clear}>✕ Clear</button>
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

        {/* Map */}
        <div className={styles.mapWrap}>
          <ElevationMap waypoints={waypoints} onAddPoint={addPoint} locked={locked} />
        </div>

        {error && <p className={styles.error}>⚠ {error}</p>}

        {/* Chart + Stats */}
        {elevData.length > 0 && (
          <div className={styles.results}>
            <div className={styles.chartWrap}>
              <ElevChart data={elevData} />
            </div>

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statVal}>{totalDist.toFixed(2)} km</span>
                <span className={styles.statLabel}>Total Distance</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal}>{Math.round(minElev)} m</span>
                <span className={styles.statLabel}>Min Elevation</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal}>{Math.round(maxElev)} m</span>
                <span className={styles.statLabel}>Max Elevation</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal} style={{ color: '#10b981' }}>+{Math.round(gain)} m</span>
                <span className={styles.statLabel}>Elevation Gain</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statVal} style={{ color: '#ef4444' }}>−{Math.round(loss)} m</span>
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
