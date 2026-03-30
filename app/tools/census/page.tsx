'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

const CensusMap = dynamic<{
  lat: number | null;
  lon: number | null;
  onPick: (lat: number, lon: number) => void;
}>(() => import('./CensusMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

/* ─── Types ─── */
interface TractInfo {
  STATE: string;
  COUNTY: string;
  TRACT: string;
  name: string;
}

interface CensusData {
  NAME: string;
  population: number | null;
  medianAge: number | null;
  medianIncome: number | null;
  medianHomeValue: number | null;
  ownershipRate: number | null;
  unemploymentRate: number | null;
  tract: TractInfo;
}

type FetchStatus = 'idle' | 'loading' | 'done' | 'error';

/* ─── Helpers ─── */
function fmt(n: number | null, prefix = '', suffix = ''): string {
  if (n === null) return 'N/A';
  return `${prefix}${n.toLocaleString()}${suffix}`;
}

function StatCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={color ? { color } : undefined}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

/* ─── Page ─── */
export default function CensusPage() {
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [data, setData] = useState<CensusData | null>(null);
  const [error, setError] = useState('');

  const handlePick = useCallback(async (lat: number, lon: number) => {
    setPin({ lat, lon });
    setStatus('loading');
    setData(null);
    setError('');

    try {
      const res = await fetch(`/api/census?lat=${lat}&lon=${lon}`);
      const json = await res.json() as CensusData & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? `Error ${res.status}`);
        setStatus('error');
        return;
      }
      setData(json);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>🏘 US Census Demographics</h1>
          <p className={styles.subtitle}>
            Click anywhere on the US map to see census tract demographics from the{' '}
            <a
              href="https://www.census.gov/data/developers/data-sets/acs-5year.html"
              target="_blank" rel="noopener noreferrer"
              className={styles.link}
            >
              ACS 5-Year Estimates
            </a>
            . Data covers population, income, housing, and more — no account needed.
          </p>
        </header>

        <div className={styles.mainGrid}>
          {/* ── Map ── */}
          <div className={styles.mapCol}>
            <CensusMap
              lat={pin?.lat ?? null}
              lon={pin?.lon ?? null}
              onPick={handlePick}
            />
            <p className={styles.mapHint}>
              {pin
                ? `📍 ${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)} — click elsewhere to update`
                : 'Click anywhere on the US map to load census tract data'}
            </p>
          </div>

          {/* ── Data panel ── */}
          <div className={styles.dataCol}>

            {/* Idle state */}
            {status === 'idle' && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🗺</span>
                <p className={styles.emptyTitle}>No location selected</p>
                <p className={styles.emptyDesc}>Click anywhere on the map to load demographics for that census tract.</p>
              </div>
            )}

            {/* Loading */}
            {status === 'loading' && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>⏳</span>
                <p className={styles.emptyTitle}>Looking up tract…</p>
                <p className={styles.emptyDesc}>Querying Census Geocoder and ACS API…</p>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className={styles.errorState}>
                <p className={styles.errorTitle}>⚠ Could not load data</p>
                <p className={styles.errorDesc}>{error}</p>
                <p className={styles.errorDesc} style={{ marginTop: 6 }}>
                  This tool only covers the United States (including territories). Try clicking inside a US state.
                </p>
              </div>
            )}

            {/* Data */}
            {status === 'done' && data && (
              <div className={styles.dataPanel}>
                {/* Header */}
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelTractName}>{data.NAME}</p>
                    <p className={styles.panelFips}>
                      State {data.tract.STATE} · County {data.tract.COUNTY} · Tract {data.tract.TRACT}
                    </p>
                  </div>
                  <span className={styles.panelBadge}>ACS 5-Year · 2023</span>
                </div>

                {/* Stats grid */}
                <div className={styles.statsGrid}>
                  <StatCard
                    label="Total Population"
                    value={fmt(data.population)}
                    sub="residents in tract"
                    color="var(--accent-blue)"
                  />
                  <StatCard
                    label="Median Age"
                    value={data.medianAge !== null ? `${data.medianAge} yrs` : 'N/A'}
                    sub="years old"
                  />
                  <StatCard
                    label="Median Household Income"
                    value={fmt(data.medianIncome, '$')}
                    sub="per year"
                    color="#34d399"
                  />
                  <StatCard
                    label="Median Home Value"
                    value={fmt(data.medianHomeValue, '$')}
                    sub="owner-occupied"
                  />
                  <StatCard
                    label="Homeownership Rate"
                    value={fmt(data.ownershipRate, '', '%')}
                    sub="owner-occupied units"
                    color="#f59e0b"
                  />
                  <StatCard
                    label="Unemployment Rate"
                    value={fmt(data.unemploymentRate, '', '%')}
                    sub="of civilian labor force"
                    color={
                      data.unemploymentRate === null ? undefined
                        : data.unemploymentRate > 8 ? '#ef4444'
                        : data.unemploymentRate > 5 ? '#f59e0b'
                        : '#34d399'
                    }
                  />
                </div>

                <p className={styles.sourceNote}>
                  Source: US Census Bureau, American Community Survey 5-Year Estimates (2019–2023).
                  Figures are estimates and subject to margin of error.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
