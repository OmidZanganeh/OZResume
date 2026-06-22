'use client';
import React, { useState } from 'react';
import {
  DollarSign, Globe2, BookOpen, Car, Home, Wifi,
  ChevronDown, MapPin, AlertTriangle, Download,
} from 'lucide-react';
import styles from './TripExplorer.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TractInfo { STATE: string; COUNTY: string; TRACT: string; name: string; }
interface RaceData { total: number; white: number|null; black: number|null; asian: number|null; hispanic: number|null; nativeAmerican: number|null; twoOrMore: number|null; other: number|null; }
interface EducationData { total: number; lessThanHS: number|null; hsOrGed: number|null; someCollege: number|null; bachelors: number|null; graduate: number|null; }
interface CommuteData { total: number; driveAlone: number|null; carpool: number|null; transit: number|null; bicycle: number|null; walk: number|null; workFromHome: number|null; avgMinutes: number|null; }
interface HousingData { totalUnits: number|null; vacancyRate: number|null; medianYearBuilt: number|null; singleFamily: number|null; smallMulti: number|null; largeMulti: number|null; mobile: number|null; }
interface LanguageData { total: number; englishOnly: number|null; spanish: number|null; other: number|null; }

export interface CensusData {
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

export type CensusStatus = 'idle' | 'loading' | 'done' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number|null, prefix = '', suffix = '') {
  if (n === null) return 'N/A';
  return `${prefix}${n.toLocaleString()}${suffix}`;
}
function fmtPct(n: number|null) { return n === null ? 'N/A' : `${n}%`; }
function pctOf(count: number|null, total: number) {
  if (count === null || total === 0) return 0;
  return (count / total) * 100;
}

function buildExportFlat(data: CensusData, pin: [number, number] | null) {
  return {
    tract_name: data.NAME, state_fips: data.tract.STATE, county_fips: data.tract.COUNTY, tract_fips: data.tract.TRACT,
    latitude: pin?.[0] ?? null, longitude: pin?.[1] ?? null,
    source: 'ACS 5-Year Estimates 2019–2023',
    population: data.population, median_age: data.medianAge, median_income_usd: data.medianIncome,
    median_home_value_usd: data.medianHomeValue, ownership_rate_pct: data.ownershipRate,
    unemployment_rate_pct: data.unemploymentRate, poverty_rate_pct: data.povertyRate,
    median_rent_usd: data.medianRent, rent_burden_pct: data.rentBurden, snap_rate_pct: data.snapRate,
    broadband_rate_pct: data.broadbandRate,
    race_white: data.race?.white ?? null, race_black: data.race?.black ?? null,
    race_asian: data.race?.asian ?? null, race_hispanic: data.race?.hispanic ?? null,
    edu_bachelors: data.education?.bachelors ?? null, edu_graduate: data.education?.graduate ?? null,
    commute_avg_minutes: data.commute?.avgMinutes ?? null, commute_wfh: data.commute?.workFromHome ?? null,
  };
}

function dlBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click(); URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={styles.censusStatCard}>
      <span className={styles.censusStatLabel}>{label}</span>
      <span className={styles.censusStatValue} style={color ? { color } : undefined}>{value}</span>
      {sub && <span className={styles.censusStatSub}>{sub}</span>}
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number|null; total: number; color: string }) {
  const w = pctOf(count, total);
  return (
    <div className={styles.censusBarRow}>
      <span className={styles.censusBarLabel}>{label}</span>
      <div className={styles.censusBarTrack}>
        <div className={styles.censusBarFill} style={{ width: `${w}%`, background: color }} />
      </div>
      <span className={styles.censusBarPct}>{count !== null ? `${w.toFixed(1)}%` : 'N/A'}</span>
    </div>
  );
}

interface Seg { label: string; value: number|null; color: string; }
function StackedBar({ segs, total }: { segs: Seg[]; total: number }) {
  return (
    <div>
      <div className={styles.censusStackedBar}>
        {segs.map((s, i) => {
          const w = pctOf(s.value, total);
          if (w < 0.3 || s.value === null) return null;
          return <div key={i} className={styles.censusStackSeg} style={{ width: `${w}%`, background: s.color }} title={`${s.label}: ${w.toFixed(1)}%`} />;
        })}
      </div>
      <div className={styles.censusStackLegend}>
        {segs.map((s, i) => {
          if (!s.value || pctOf(s.value, total) < 0.3) return null;
          return (
            <div key={i} className={styles.censusStackItem}>
              <div className={styles.censusStackDot} style={{ background: s.color }} />
              <span className={styles.censusStackLbl}>{s.label}</span>
              <span className={styles.censusStackPct}>{pctOf(s.value, total).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={styles.censusMiniStat}>
      <span className={styles.censusMiniLabel}>{label}</span>
      <span className={styles.censusMiniValue} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.censusSection}>
      <button className={styles.censusSectionToggle} onClick={() => setOpen(o => !o)}>
        <span className={styles.censusSectionTitle}>{icon} {title}</span>
        <ChevronDown size={13} className={open ? styles.chevronOpen : styles.chevronClosed} />
      </button>
      {open && <div className={styles.censusSectionBody}>{children}</div>}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  pin: [number, number] | null;
  status: CensusStatus;
  data: CensusData | null;
  error: string;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CensusPanel({ pin, status, data, error }: Props) {

  const doExportCSV = () => { if (data) dlBlob(new Blob([Object.entries(buildExportFlat(data, pin)).map(([k,v]) => k).join(',') + '\n' + Object.entries(buildExportFlat(data, pin)).map(([,v]) => v === null ? '' : String(v)).join(',')], { type: 'text/csv' }), `census_${data.tract.STATE}_${data.tract.COUNTY}_${data.tract.TRACT}.csv`); };
  const doExportJSON = () => { if (data) dlBlob(new Blob([JSON.stringify(buildExportFlat(data, pin), null, 2)], { type: 'application/json' }), `census_${data.tract.STATE}_${data.tract.COUNTY}_${data.tract.TRACT}.json`); };

  return (
    <div className={styles.censusPanel}>

      {/* Idle — click hint */}
      {status === 'idle' && (
        <div className={styles.emptyState}>
          <MapPin size={28} className={styles.emptyIcon} style={{ color: '#4f8ef7' }} />
          <p className={styles.emptyTitle}>Click anywhere on the US map</p>
          <p className={styles.emptyDesc}>Census tract demographics will appear here. Covers the United States only (ACS 2023).</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className={styles.osmError} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> Could not load data</span>
          <span style={{ fontSize: 11.5, opacity: 0.8 }}>{error}</span>
          <span style={{ fontSize: 11.5, opacity: 0.65 }}>This tool only covers the United States. Try clicking inside a US state.</span>
        </div>
      )}

      {/* Loading skeleton (no previous data) */}
      {status === 'loading' && !data && (
        <div className={styles.detailSkeleton}>
          {[100, 80, 90, 70, 85].map((w, i) => (
            <div key={i} className={styles.skeletonLine} style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {/* Data */}
      {(status === 'done' || (status === 'loading' && data)) && data && (
        <div className={styles.censusData}>

          {/* Header */}
          <div className={styles.censusHeader}>
            <div>
              <p className={styles.censusTractName}>{data.NAME}</p>
              <p className={styles.censusFips}>
                State {data.tract.STATE} · County {data.tract.COUNTY} · Tract {data.tract.TRACT}
              </p>
            </div>
            <div className={styles.censusActions}>
              {status === 'loading'
                ? <span className={styles.censusUpdating}>Updating…</span>
                : <span className={styles.censusBadge}>ACS · 2023</span>
              }
              <button className={styles.censusExportBtn} onClick={doExportCSV} title="Download CSV">
                <Download size={11} /> CSV
              </button>
              <button className={styles.censusExportBtn} onClick={doExportJSON} title="Download JSON">
                <Download size={11} /> JSON
              </button>
            </div>
          </div>

          {/* Core stats grid */}
          <div className={styles.censusStatsGrid}>
            <StatCard label="Population"       value={fmt(data.population)}          sub="residents"      color="#4f8ef7" />
            <StatCard label="Median Age"        value={data.medianAge !== null ? `${data.medianAge} yrs` : 'N/A'} />
            <StatCard label="Household Income"  value={fmt(data.medianIncome, '$')}   sub="median/year"    color="#34d399" />
            <StatCard label="Home Value"         value={fmt(data.medianHomeValue, '$')} sub="owner-occ." />
            <StatCard label="Homeownership"     value={fmtPct(data.ownershipRate)}    sub="owner units"    color="#f59e0b" />
            <StatCard label="Unemployment"       value={fmtPct(data.unemploymentRate)} sub="labor force"
              color={data.unemploymentRate === null ? undefined : data.unemploymentRate > 8 ? '#ef4444' : data.unemploymentRate > 5 ? '#f59e0b' : '#34d399'} />
          </div>

          {/* Sections */}
          <div className={styles.censusSections}>

            <Section icon={<DollarSign size={12} />} title="Economy & Poverty">
              <div className={styles.censusMiniGrid}>
                <MiniStat label="Poverty Rate" value={fmtPct(data.povertyRate)}
                  color={data.povertyRate !== null ? (data.povertyRate > 20 ? '#ef4444' : data.povertyRate > 12 ? '#f59e0b' : '#34d399') : undefined} />
                <MiniStat label="Median Rent" value={fmt(data.medianRent, '$', '/mo')} />
                <MiniStat label="Rent Burden" value={fmtPct(data.rentBurden)}
                  color={data.rentBurden !== null ? (data.rentBurden > 35 ? '#ef4444' : data.rentBurden > 28 ? '#f59e0b' : '#34d399') : undefined} />
                <MiniStat label="SNAP" value={fmtPct(data.snapRate)} />
              </div>
            </Section>

            {data.race && (
              <Section icon={<Globe2 size={12} />} title="Race & Ethnicity">
                <StackedBar total={data.race.total} segs={[
                  { label: 'White',       value: data.race.white,          color: '#60a5fa' },
                  { label: 'Hispanic',    value: data.race.hispanic,       color: '#fbbf24' },
                  { label: 'Black',       value: data.race.black,          color: '#f87171' },
                  { label: 'Asian',       value: data.race.asian,          color: '#34d399' },
                  { label: 'Native Am.',  value: data.race.nativeAmerican, color: '#a78bfa' },
                  { label: 'Two or more', value: data.race.twoOrMore,      color: '#fb923c' },
                  { label: 'Other',       value: data.race.other,          color: '#9ca3af' },
                ]} />
              </Section>
            )}

            {data.education && (
              <Section icon={<BookOpen size={12} />} title="Education (25+)" defaultOpen={false}>
                <BarRow label="Less than HS"    count={data.education.lessThanHS}  total={data.education.total} color="#ef4444" />
                <BarRow label="HS / GED"        count={data.education.hsOrGed}     total={data.education.total} color="#f59e0b" />
                <BarRow label="Some college"    count={data.education.someCollege} total={data.education.total} color="#60a5fa" />
                <BarRow label="Bachelor's"      count={data.education.bachelors}   total={data.education.total} color="#34d399" />
                <BarRow label="Graduate"        count={data.education.graduate}    total={data.education.total} color="#a78bfa" />
              </Section>
            )}

            {data.commute && (
              <Section icon={<Car size={12} />} title="Commute" defaultOpen={false}>
                {data.commute.avgMinutes !== null && (
                  <p className={styles.censusSectionHighlight}>Avg commute: <strong>{data.commute.avgMinutes} min</strong></p>
                )}
                <BarRow label="Drives alone"   count={data.commute.driveAlone}  total={data.commute.total} color="#60a5fa" />
                <BarRow label="Carpool"         count={data.commute.carpool}      total={data.commute.total} color="#34d399" />
                <BarRow label="Transit"         count={data.commute.transit}      total={data.commute.total} color="#fbbf24" />
                <BarRow label="Walks"           count={data.commute.walk}         total={data.commute.total} color="#fb923c" />
                <BarRow label="WFH"             count={data.commute.workFromHome} total={data.commute.total} color="#f87171" />
              </Section>
            )}

            <Section icon={<Home size={12} />} title="Housing" defaultOpen={false}>
              <div className={styles.censusMiniGrid}>
                <MiniStat label="Vacancy Rate"  value={fmtPct(data.housing.vacancyRate)} />
                <MiniStat label="Median Built"  value={data.housing.medianYearBuilt?.toString() ?? 'N/A'} />
              </div>
              {data.housing.singleFamily !== null && data.housing.totalUnits !== null && (
                <div style={{ marginTop: 8 }}>
                  <BarRow label="Single-family" count={data.housing.singleFamily} total={data.housing.totalUnits!} color="#60a5fa" />
                  <BarRow label="Small multi"   count={data.housing.smallMulti}   total={data.housing.totalUnits!} color="#34d399" />
                  <BarRow label="Large multi"   count={data.housing.largeMulti}   total={data.housing.totalUnits!} color="#fbbf24" />
                  <BarRow label="Mobile home"   count={data.housing.mobile}       total={data.housing.totalUnits!} color="#f87171" />
                </div>
              )}
            </Section>

            <Section icon={<Wifi size={12} />} title="Digital & Language" defaultOpen={false}>
              <div className={styles.censusMiniGrid}>
                <MiniStat label="Broadband" value={fmtPct(data.broadbandRate)}
                  color={data.broadbandRate !== null ? (data.broadbandRate < 60 ? '#ef4444' : data.broadbandRate < 80 ? '#f59e0b' : '#34d399') : undefined} />
              </div>
              {data.language && (
                <div style={{ marginTop: 8 }}>
                  <BarRow label="English only"  count={data.language.englishOnly} total={data.language.total} color="#60a5fa" />
                  <BarRow label="Spanish"        count={data.language.spanish}     total={data.language.total} color="#fbbf24" />
                  <BarRow label="Other"          count={data.language.other}       total={data.language.total} color="#9ca3af" />
                </div>
              )}
            </Section>
          </div>

          <p className={styles.censusSource}>
            Source: US Census Bureau, ACS 5-Year Estimates (2019–2023).
          </p>
        </div>
      )}
    </div>
  );
}
