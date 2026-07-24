'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './LiveGeocodeDemo.module.css';

type Pin = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  x: number;
  y: number;
};

const PINS: Pin[] = [
  { id: 'lincoln', label: 'Lincoln, NE', lat: 40.8136, lon: -96.7026, x: 42, y: 48 },
  { id: 'omaha', label: 'Omaha, NE', lat: 41.2565, lon: -95.9345, x: 58, y: 38 },
  { id: 'denver', label: 'Denver, CO', lat: 39.7392, lon: -104.9903, x: 22, y: 55 },
];

type ReverseResult = {
  display_name: string | null;
  error?: string;
};

export default function LiveGeocodeDemo() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [result, setResult] = useState<ReverseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runReverse = async (pin: Pin) => {
    setActiveId(pin.id);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'reverse',
          points: [{ lat: pin.lat, lon: pin.lon }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = (await res.json()) as { results?: ReverseResult[] };
      setResult(data.results?.[0] ?? { display_name: null, error: 'No result' });
    } catch {
      setResult({ display_name: null, error: 'Could not reach geocoder — try again.' });
    } finally {
      setLoading(false);
    }
  };

  const active = PINS.find((p) => p.id === activeId);

  return (
    <section className={styles.section} id="build" aria-labelledby="live-geo-heading">
      <div className={styles.copy}>
        <h2 id="live-geo-heading" className={styles.title}>
          Try a live GIS bite
        </h2>
        <p className={styles.lead}>
          Tap a pin — reverse geocode runs through the same API powering the full geocoder tool.
        </p>
        <Link href="/tools/geocoder" className={styles.toolLink}>
          Open full geocoder →
        </Link>
      </div>

      <div className={styles.stage}>
        <div className={styles.map} role="img" aria-label="Simplified map with sample pins">
          <div className={styles.gridLines} aria-hidden />
          {PINS.map((pin) => (
            <button
              key={pin.id}
              type="button"
              className={`${styles.pin} ${activeId === pin.id ? styles.pinActive : ''}`}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              onClick={() => { void runReverse(pin); }}
              aria-pressed={activeId === pin.id}
              aria-label={`Reverse geocode ${pin.label}`}
            >
              <span className={styles.pinDot} />
              <span className={styles.pinLabel}>{pin.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.panel} aria-live="polite">
          {!active && (
            <p className={styles.hint}>Select a pin to reverse-geocode coordinates → place name.</p>
          )}
          {active && (
            <>
              <p className={styles.coords}>
                <span>{active.lat.toFixed(4)}</span>
                <span>, </span>
                <span>{active.lon.toFixed(4)}</span>
              </p>
              {loading && <p className={styles.status}>Looking up…</p>}
              {!loading && result?.display_name && (
                <p className={styles.place}>{result.display_name}</p>
              )}
              {!loading && result?.error && (
                <p className={styles.error}>{result.error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
