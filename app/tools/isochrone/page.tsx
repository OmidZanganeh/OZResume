'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';
import { RING_COLORS } from './IsochroneMap';

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

export default function IsochronePage() {
  const [origin, setOrigin]       = useState<[number, number] | null>(null);
  const [costing, setCosting]     = useState<Costing>('auto');
  const [times, setTimes]         = useState<number[]>([15, 30, 45]);
  const [geojson, setGeojson]     = useState<Record<string, unknown> | null>(null);
  const [geoJsonKey, setGeoJsonKey] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleMapClick = useCallback((lat: number, lon: number) => {
    setOrigin([lat, lon]);
    setGeojson(null);
    setError(null);
  }, []);

  const toggleTime = (t: number) =>
    setTimes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort((a, b) => a - b),
    );

  const generate = async () => {
    if (!origin || times.length === 0) return;
    setLoading(true);
    setError(null);
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
      /* Valhalla returns features from largest → smallest time.
         _colorIdx 0 = innermost (shortest), last = outermost (longest). */
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>🗺 Isochrone Mapper</h1>
          <p className={styles.subtitle}>
            Click the map to set an origin, then generate reachability zones — see exactly how far you can
            travel in a given time by car, foot, or bike.
          </p>
        </header>

        <div className={styles.mainGrid}>
          {/* ── Controls ── */}
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
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
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
                      <span
                        className={styles.legendSwatch}
                        style={{ background: RING_COLORS[i % RING_COLORS.length] }}
                      />
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
            />
            {!origin && (
              <p className={styles.mapHint}>👆 Click anywhere on the map to place an origin pin</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
