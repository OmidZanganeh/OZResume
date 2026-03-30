'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

const CensusMap = dynamic<{
  lat: number | null;
  lon: number | null;
  onPick: (lat: number, lon: number) => void;
  tractState?: string | null;
  tractCounty?: string | null;
  tractTract?: string | null;
}>(() => import('./CensusMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

/* ─── Types ─── */
interface TractInfo { STATE: string; COUNTY: string; TRACT: string; name: string; }
interface RaceData { total: number; white: number|null; black: number|null; asian: number|null; hispanic: number|null; nativeAmerican: number|null; twoOrMore: number|null; other: number|null; }
interface EducationData { total: number; lessThanHS: number|null; hsOrGed: number|null; someCollege: number|null; bachelors: number|null; graduate: number|null; }
interface CommuteData { total: number; driveAlone: number|null; carpool: number|null; transit: number|null; bicycle: number|null; walk: number|null; workFromHome: number|null; avgMinutes: number|null; }
interface HousingData { totalUnits: number|null; vacancyRate: number|null; medianYearBuilt: number|null; singleFamily: number|null; smallMulti: number|null; largeMulti: number|null; mobile: number|null; }
interface LanguageData { total: number; englishOnly: number|null; spanish: number|null; other: number|null; }

interface CensusData {
  NAME: string;
  tract: TractInfo;
  population: number|null;
  medianAge: number|null;
  medianIncome: number|null;
  medianHomeValue: number|null;
  ownershipRate: number|null;
  unemploymentRate: number|null;
  povertyRate: number|null;
  medianRent: number|null;
  rentBurden: number|null;
  snapRate: number|null;
  race: RaceData|null;
  education: EducationData|null;
  commute: CommuteData|null;
  housing: HousingData;
  broadbandRate: number|null;
  language: LanguageData|null;
}

type FetchStatus = 'idle'|'loading'|'done'|'error';

/* ─── Helper functions ─── */
function fmt(n: number|null, prefix = '', suffix = '') {
  if (n === null) return 'N/A';
  return `${prefix}${n.toLocaleString()}${suffix}`;
}
function fmtPct(n: number|null) {
  if (n === null) return 'N/A';
  return `${n}%`;
}
function pctOf(count: number|null, total: number): number {
  if (count === null || total === 0) return 0;
  return (count / total) * 100;
}

/* ─── BarRow: label | ████░░░ | 34.5% ─── */
function BarRow({ label, count, total, color }: { label: string; count: number|null; total: number; color: string }) {
  const w = pctOf(count, total);
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
      <span className={styles.barPct}>{count !== null ? `${w.toFixed(1)}%` : 'N/A'}</span>
    </div>
  );
}

/* ─── Stacked horizontal bar (race/language) ─── */
interface Seg { label: string; value: number|null; color: string; }
function StackedBar({ segs, total }: { segs: Seg[]; total: number }) {
  return (
    <div>
      <div className={styles.stackedBar}>
        {segs.map((s, i) => {
          const w = pctOf(s.value, total);
          if (w < 0.3 || s.value === null) return null;
          return <div key={i} className={styles.stackSeg} style={{ width: `${w}%`, backgroundColor: s.color }} title={`${s.label}: ${s.value.toLocaleString()} (${w.toFixed(1)}%)`} />;
        })}
      </div>
      <div className={styles.stackLegend}>
        {segs.map((s, i) => {
          if (!s.value || pctOf(s.value, total) < 0.3) return null;
          return (
            <div key={i} className={styles.stackItem}>
              <div className={styles.stackDot} style={{ backgroundColor: s.color }} />
              <span className={styles.stackLbl}>{s.label}</span>
              <span className={styles.stackPct}>{pctOf(s.value, total).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MiniStat: compact stat used inside sections ─── */
function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={styles.miniStat}>
      <span className={styles.miniStatLabel}>{label}</span>
      <span className={styles.miniStatValue} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

/* ─── Collapsible section ─── */
function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button className={styles.sectionToggle} onClick={() => setOpen(o => !o)}>
        <span>{icon}&nbsp;{title}</span>
        <span className={styles.sectionArrow}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

/* ─── Main page ─── */
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
      const res  = await fetch(`/api/census?lat=${lat}&lon=${lon}`);
      const json = await res.json() as CensusData & { error?: string };
      if (!res.ok || json.error) { setError(json.error ?? `Error ${res.status}`); setStatus('error'); return; }
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
            <a href="https://www.census.gov/data/developers/data-sets/acs-5year.html" target="_blank" rel="noopener noreferrer" className={styles.link}>
              ACS 5-Year Estimates (2023)
            </a>. No account needed.
          </p>
        </header>

        <div className={styles.mainGrid}>
          {/* ── Map ── */}
          <div className={styles.mapCol}>
            <CensusMap
              lat={pin?.lat ?? null}
              lon={pin?.lon ?? null}
              onPick={handlePick}
              tractState={data?.tract.STATE ?? null}
              tractCounty={data?.tract.COUNTY ?? null}
              tractTract={data?.tract.TRACT ?? null}
            />
            <p className={styles.mapHint}>
              {pin
                ? `📍 ${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)} — click elsewhere to update`
                : 'Click anywhere on the US map to load census tract data'}
            </p>
          </div>

          {/* ── Data panel ── */}
          <div className={styles.dataCol}>

            {status === 'idle' && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🗺</span>
                <p className={styles.emptyTitle}>No location selected</p>
                <p className={styles.emptyDesc}>Click anywhere on the US map to load demographics for that census tract.</p>
              </div>
            )}

            {status === 'loading' && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>⏳</span>
                <p className={styles.emptyTitle}>Looking up tract…</p>
                <p className={styles.emptyDesc}>Querying Census Geocoder and ACS API…</p>
              </div>
            )}

            {status === 'error' && (
              <div className={styles.errorState}>
                <p className={styles.errorTitle}>⚠ Could not load data</p>
                <p className={styles.errorDesc}>{error}</p>
                <p className={styles.errorDesc} style={{ marginTop: 6 }}>
                  This tool only covers the United States (including territories). Try clicking inside a US state.
                </p>
              </div>
            )}

            {status === 'done' && data && (
              <div className={styles.dataPanel}>

                {/* Panel header */}
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelTractName}>{data.NAME}</p>
                    <p className={styles.panelFips}>
                      State {data.tract.STATE} · County {data.tract.COUNTY} · Tract {data.tract.TRACT}
                    </p>
                  </div>
                  <span className={styles.panelBadge}>ACS 5-Year · 2023</span>
                </div>

                {/* ── Core stats ── */}
                <div className={styles.statsGrid}>
                  <StatCard label="Total Population"        value={fmt(data.population)}            sub="residents in tract"           color="var(--accent-blue)" />
                  <StatCard label="Median Age"              value={data.medianAge !== null ? `${data.medianAge} yrs` : 'N/A'} sub="years old" />
                  <StatCard label="Median Household Income" value={fmt(data.medianIncome, '$')}      sub="per year"                     color="#34d399" />
                  <StatCard label="Median Home Value"       value={fmt(data.medianHomeValue, '$')}   sub="owner-occupied" />
                  <StatCard label="Homeownership Rate"      value={fmtPct(data.ownershipRate)}       sub="owner-occupied units"         color="#f59e0b" />
                  <StatCard label="Unemployment Rate"       value={fmtPct(data.unemploymentRate)}    sub="of civilian labor force"
                    color={data.unemploymentRate === null ? undefined : data.unemploymentRate > 8 ? '#ef4444' : data.unemploymentRate > 5 ? '#f59e0b' : '#34d399'}
                  />
                </div>

                {/* ── Sections 2-col grid ── */}
                <div className={styles.sectionsGrid}>

                {/* ── Economy & Poverty ── */}
                <Section icon="💰" title="Economy & Poverty" defaultOpen>
                  <div className={styles.miniGrid}>
                    <MiniStat label="Poverty Rate" value={fmtPct(data.povertyRate)}
                      color={data.povertyRate !== null ? (data.povertyRate > 20 ? '#ef4444' : data.povertyRate > 12 ? '#f59e0b' : '#34d399') : undefined} />
                    <MiniStat label="Median Gross Rent" value={fmt(data.medianRent, '$', '/mo')} />
                    <MiniStat label="Rent Burden" value={fmtPct(data.rentBurden)}
                      color={data.rentBurden !== null ? (data.rentBurden > 35 ? '#ef4444' : data.rentBurden > 28 ? '#f59e0b' : '#34d399') : undefined} />
                    <MiniStat label="SNAP Recipients" value={fmtPct(data.snapRate)} />
                  </div>
                </Section>

                {/* ── Race & Ethnicity ── */}
                {data.race ? (
                  <Section icon="🌎" title="Race & Ethnicity" defaultOpen>
                    <StackedBar total={data.race.total} segs={[
                      { label: 'White',          value: data.race.white,         color: '#60a5fa' },
                      { label: 'Hispanic',       value: data.race.hispanic,      color: '#fbbf24' },
                      { label: 'Black',          value: data.race.black,         color: '#f87171' },
                      { label: 'Asian',          value: data.race.asian,         color: '#34d399' },
                      { label: 'Native Am.',     value: data.race.nativeAmerican,color: '#a78bfa' },
                      { label: 'Two or more',    value: data.race.twoOrMore,     color: '#fb923c' },
                      { label: 'Other',          value: data.race.other,         color: '#9ca3af' },
                    ]} />
                  </Section>
                ) : <div />}

                {/* ── Education ── */}
                {data.education ? (
                  <Section icon="🎓" title="Education (age 25+)">
                    <BarRow label="Less than HS"   count={data.education.lessThanHS}  total={data.education.total} color="#ef4444" />
                    <BarRow label="HS diploma/GED" count={data.education.hsOrGed}     total={data.education.total} color="#f59e0b" />
                    <BarRow label="Some college"   count={data.education.someCollege} total={data.education.total} color="#60a5fa" />
                    <BarRow label="Bachelor's"     count={data.education.bachelors}   total={data.education.total} color="#34d399" />
                    <BarRow label="Graduate"       count={data.education.graduate}    total={data.education.total} color="#a78bfa" />
                  </Section>
                ) : <div />}

                {/* ── Commute ── */}
                {data.commute ? (
                  <Section icon="🚗" title="Commute & Transportation">
                    {data.commute.avgMinutes !== null && (
                      <p className={styles.sectionHighlight}>
                        Avg commute: <strong>{data.commute.avgMinutes} min</strong>
                      </p>
                    )}
                    <BarRow label="Drives alone"    count={data.commute.driveAlone}   total={data.commute.total} color="#60a5fa" />
                    <BarRow label="Carpools"        count={data.commute.carpool}       total={data.commute.total} color="#34d399" />
                    <BarRow label="Public transit"  count={data.commute.transit}       total={data.commute.total} color="#fbbf24" />
                    <BarRow label="Walks"           count={data.commute.walk}          total={data.commute.total} color="#fb923c" />
                    <BarRow label="Bicycle"         count={data.commute.bicycle}       total={data.commute.total} color="#a78bfa" />
                    <BarRow label="Works from home" count={data.commute.workFromHome}  total={data.commute.total} color="#f87171" />
                  </Section>
                ) : <div />}

                {/* ── Housing ── */}
                <Section icon="🏠" title="Housing">
                  <div className={styles.miniGrid}>
                    <MiniStat label="Vacancy Rate"      value={fmtPct(data.housing.vacancyRate)} />
                    <MiniStat label="Median Year Built" value={data.housing.medianYearBuilt?.toString() ?? 'N/A'} />
                  </div>
                  {data.housing.singleFamily !== null && data.housing.totalUnits !== null && (
                    <div style={{ marginTop: 10 }}>
                      <BarRow label="Single-family"          count={data.housing.singleFamily} total={data.housing.totalUnits ?? 1} color="#60a5fa" />
                      <BarRow label="Small multi (2–4 units)" count={data.housing.smallMulti}  total={data.housing.totalUnits ?? 1} color="#34d399" />
                      <BarRow label="Large multi (5+ units)"  count={data.housing.largeMulti}  total={data.housing.totalUnits ?? 1} color="#fbbf24" />
                      <BarRow label="Mobile home"             count={data.housing.mobile}       total={data.housing.totalUnits ?? 1} color="#f87171" />
                    </div>
                  )}
                </Section>

                {/* ── Digital & Language ── */}
                <Section icon="💻" title="Digital Access & Language">
                  <div className={styles.miniGrid}>
                    <MiniStat label="Broadband Internet" value={fmtPct(data.broadbandRate)}
                      color={data.broadbandRate !== null ? (data.broadbandRate < 60 ? '#ef4444' : data.broadbandRate < 80 ? '#f59e0b' : '#34d399') : undefined} />
                  </div>
                  {data.language && (
                    <div style={{ marginTop: 10 }}>
                      <BarRow label="English only"   count={data.language.englishOnly} total={data.language.total} color="#60a5fa" />
                      <BarRow label="Spanish"        count={data.language.spanish}     total={data.language.total} color="#fbbf24" />
                      <BarRow label="Other language" count={data.language.other}       total={data.language.total} color="#9ca3af" />
                    </div>
                  )}
                </Section>

                </div>

                <p className={styles.sourceNote}>
                  Source: US Census Bureau, ACS 5-Year Estimates (2019–2023). Figures are estimates subject to margin of error.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={color ? { color } : undefined}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}
