'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type Category = 'distance' | 'area' | 'angle' | 'speed' | 'scale';

/* ─── Conversion factors to base unit ─── */
const DISTANCE_UNITS = [
  { key: 'mm',  label: 'Millimeter',     abbr: 'mm',  factor: 0.001 },
  { key: 'm',   label: 'Meter',          abbr: 'm',   factor: 1 },
  { key: 'km',  label: 'Kilometer',      abbr: 'km',  factor: 1000 },
  { key: 'ft',  label: 'Foot',           abbr: 'ft',  factor: 0.3048 },
  { key: 'yd',  label: 'Yard',           abbr: 'yd',  factor: 0.9144 },
  { key: 'mi',  label: 'Mile',           abbr: 'mi',  factor: 1609.344 },
  { key: 'nmi', label: 'Nautical Mile',  abbr: 'nmi', factor: 1852 },
  { key: 'deg', label: 'Degree (lat°)',  abbr: '°',   factor: 111320 },
];

const AREA_UNITS = [
  { key: 'mm2', label: 'Sq. Millimeter', abbr: 'mm²',  factor: 1e-6 },
  { key: 'm2',  label: 'Sq. Meter',      abbr: 'm²',   factor: 1 },
  { key: 'km2', label: 'Sq. Kilometer',  abbr: 'km²',  factor: 1e6 },
  { key: 'ha',  label: 'Hectare',        abbr: 'ha',   factor: 10000 },
  { key: 'ac',  label: 'Acre',           abbr: 'ac',   factor: 4046.8564 },
  { key: 'ft2', label: 'Sq. Foot',       abbr: 'ft²',  factor: 0.092903 },
  { key: 'mi2', label: 'Sq. Mile',       abbr: 'mi²',  factor: 2589988.11 },
];

const ANGLE_UNITS = [
  { key: 'deg',  label: 'Degree',       abbr: '°',    factor: 1 },
  { key: 'rad',  label: 'Radian',       abbr: 'rad',  factor: 180 / Math.PI },
  { key: 'grad', label: 'Gradian',      abbr: 'grad', factor: 0.9 },
  { key: 'arcm', label: 'Arcminute',    abbr: '′',    factor: 1 / 60 },
  { key: 'arcs', label: 'Arcsecond',    abbr: '″',    factor: 1 / 3600 },
  { key: 'turn', label: 'Full Turn',    abbr: 'turn', factor: 360 },
];

/* base unit = m/s */
const SPEED_UNITS = [
  { key: 'mps',  label: 'Meter / second',   abbr: 'm/s',  factor: 1 },
  { key: 'kmh',  label: 'Kilometer / hour', abbr: 'km/h', factor: 1 / 3.6 },
  { key: 'mph',  label: 'Mile / hour',      abbr: 'mph',  factor: 0.44704 },
  { key: 'fps',  label: 'Foot / second',    abbr: 'ft/s', factor: 0.3048 },
  { key: 'kn',   label: 'Knot',             abbr: 'kn',   factor: 0.514444 },
  { key: 'mach', label: 'Mach (sea level)', abbr: 'Mach', factor: 340.29 },
];

/* Map scale: preset denominators */
const SCALE_PRESETS = [1000, 2000, 5000, 10000, 24000, 50000, 100000, 250000];

/* Map-unit rows: 1 map-unit = denom × mapUnitM meters on the ground */
const SCALE_ROWS: { label: string; mapUnitM: number }[] = [
  { label: '1 inch',       mapUnitM: 0.0254 },
  { label: '1 centimeter', mapUnitM: 0.01 },
  { label: '1 millimeter', mapUnitM: 0.001 },
  { label: '1 foot',       mapUnitM: 0.3048 },
  { label: '1 yard',       mapUnitM: 0.9144 },
];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'area',     label: 'Area' },
  { key: 'angle',    label: 'Angle' },
  { key: 'speed',    label: 'Speed' },
  { key: 'scale',    label: 'Map Scale' },
];

function getUnits(cat: Category) {
  if (cat === 'distance') return DISTANCE_UNITS;
  if (cat === 'area')     return AREA_UNITS;
  if (cat === 'angle')    return ANGLE_UNITS;
  if (cat === 'speed')    return SPEED_UNITS;
  return [];
}

function convert(value: number, fromFactor: number, toFactor: number): string {
  const result = (value * fromFactor) / toFactor;
  if (isNaN(result) || !isFinite(result)) return '';
  if (Math.abs(result) >= 1e9 || (Math.abs(result) < 1e-4 && result !== 0)) {
    return result.toExponential(6);
  }
  const decimals = Math.abs(result) >= 100 ? 4 : Math.abs(result) >= 1 ? 6 : 8;
  return parseFloat(result.toFixed(decimals)).toString();
}

/* Compact metric formatter: 24000 m → "24 km", 240 m → "240 m", 0.24 m → "24 cm" */
function fmtMetric(m: number): string {
  if (m >= 1000) return `${+(m / 1000).toPrecision(5)} km`;
  if (m >= 1)    return `${+m.toPrecision(5)} m`;
  if (m >= 0.01) return `${+(m * 100).toPrecision(4)} cm`;
  return `${+(m * 1000).toPrecision(4)} mm`;
}

/* Compact imperial formatter: 24000 ft → "4.545 mi", 2000 ft → "2,000 ft" */
function fmtImperial(m: number): string {
  const ft = m / 0.3048;
  if (ft >= 5280) return `${+(ft / 5280).toPrecision(5)} mi`;
  return `${+ft.toPrecision(5)} ft`;
}

const FOOTER_NOTES: Partial<Record<Category, string>> = {
  distance: '* Degree (lat°) uses the equatorial approximation: 1° ≈ 111.32 km.',
  speed:    '* Mach uses ISA sea-level standard (15°C, 101.325 kPa): 1 Mach ≈ 340.29 m/s.',
  scale:    '* Scale denominator is X in "1 : X". USGS 7.5-min topo = 1 : 24,000; 1 in = 2,000 ft.',
};

export default function UnitConverter() {
  const [category,   setCategory]   = useState<Category>('distance');
  const [values,     setValues]     = useState<Record<string, string>>({ m: '1000' });
  const [copied,     setCopied]     = useState<string | null>(null);
  const [scaleDenom, setScaleDenom] = useState<string>('24000');

  const units = getUnits(category);

  const handleChange = (key: string, raw: string, factor: number) => {
    const num = parseFloat(raw);
    if (raw === '' || raw === '-') { setValues({ [key]: raw }); return; }
    if (isNaN(num)) return;
    const newVals: Record<string, string> = { [key]: raw };
    units.forEach(u => {
      if (u.key !== key) newVals[u.key] = convert(num, factor, u.factor);
    });
    setValues(newVals);
  };

  const switchCategory = (cat: Category) => {
    setCategory(cat);
    setCopied(null);
    if (cat === 'scale') return;
    const us = getUnits(cat);
    const seed = us[1] ?? us[0];
    const newVals: Record<string, string> = { [seed.key]: '1' };
    us.forEach(u => {
      if (u.key !== seed.key) newVals[u.key] = convert(1, seed.factor, u.factor);
    });
    setValues(newVals);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    });
  };

  const denom = Math.max(1, parseInt(scaleDenom, 10) || 24000);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>Spatial Unit Converter</h1>
          <p className={styles.subtitle}>
            Convert between GIS and surveying units — distance, area, angles, speed, and map scales.
            Type in any field — all others update instantly.
          </p>
        </header>

        {/* Category tabs */}
        <div className={styles.tabs}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`${styles.tab} ${category === c.key ? styles.tabActive : ''}`}
              onClick={() => switchCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Standard unit rows (distance / area / angle / speed) */}
        {category !== 'scale' && (
          <div className={styles.unitTable}>
            {units.map(u => {
              const val = values[u.key] ?? '';
              return (
                <div key={u.key} className={styles.unitRow}>
                  <div className={styles.unitMeta}>
                    <span className={styles.unitLabel}>{u.label}</span>
                    <span className={styles.unitAbbr}>{u.abbr}</span>
                  </div>
                  <input
                    className={styles.unitInput}
                    type="number"
                    step="any"
                    value={val}
                    onChange={e => handleChange(u.key, e.target.value, u.factor)}
                    placeholder="—"
                  />
                  <button
                    className={styles.copyBtn}
                    onClick={() => copy(val, u.key)}
                    disabled={!val}
                    title={`Copy ${u.label} value`}
                  >
                    {copied === u.key ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Map Scale calculator */}
        {category === 'scale' && (
          <div className={styles.scaleCalc}>
            <div className={styles.scaleDenomBlock}>
              <label className={styles.scaleDenomLabel} htmlFor="scale-denom">
                Scale denominator
              </label>
              <div className={styles.scaleDenomRow}>
                <span className={styles.scaleRatio}>1 :</span>
                <input
                  id="scale-denom"
                  className={styles.scaleDenomInput}
                  type="number"
                  min={1}
                  step={1}
                  value={scaleDenom}
                  onChange={e => setScaleDenom(e.target.value)}
                  placeholder="24000"
                />
              </div>
              <div className={styles.scalePresets}>
                {SCALE_PRESETS.map(p => (
                  <button
                    key={p}
                    className={`${styles.scalePreset} ${denom === p ? styles.scalePresetActive : ''}`}
                    onClick={() => setScaleDenom(String(p))}
                  >
                    {p >= 1000 ? `${p / 1000}k` : p}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.scaleTableWrap}>
              <table className={styles.scaleTable}>
                <thead>
                  <tr>
                    <th>Map unit</th>
                    <th>Ground — metric</th>
                    <th>Ground — imperial</th>
                  </tr>
                </thead>
                <tbody>
                  {SCALE_ROWS.map(row => {
                    const groundM = denom * row.mapUnitM;
                    return (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{fmtMetric(groundM)}</td>
                        <td>{fmtImperial(groundM)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {FOOTER_NOTES[category] && (
          <p className={styles.note}>{FOOTER_NOTES[category]}</p>
        )}
      </div>
    </div>
  );
}
