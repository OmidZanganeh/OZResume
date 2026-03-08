'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type Category = 'distance' | 'area' | 'angle';

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

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'distance', label: 'Distance', emoji: '📏' },
  { key: 'area',     label: 'Area',     emoji: '⬛' },
  { key: 'angle',    label: 'Angle',    emoji: '📐' },
];

function getUnits(cat: Category) {
  return cat === 'distance' ? DISTANCE_UNITS : cat === 'area' ? AREA_UNITS : ANGLE_UNITS;
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

export default function UnitConverter() {
  const [category, setCategory] = useState<Category>('distance');
  const [values, setValues] = useState<Record<string, string>>({ m: '1000' });
  const [copied, setCopied] = useState<string | null>(null);

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
    const firstUnit = getUnits(cat)[1]; // second unit = nice default
    const newVals: Record<string, string> = { [firstUnit.key]: '1' };
    getUnits(cat).forEach(u => {
      if (u.key !== firstUnit.key) newVals[u.key] = convert(1, firstUnit.factor, u.factor);
    });
    setValues(newVals);
    setCopied(null);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>📏 Spatial Unit Converter</h1>
          <p className={styles.subtitle}>
            Convert between GIS and surveying units for distance, area, and angles.
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
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Unit rows */}
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
                  {copied === u.key ? '✓' : '⧉'}
                </button>
              </div>
            );
          })}
        </div>

        <p className={styles.note}>
          * Degree (lat°) uses the equatorial approximation: 1° ≈ 111.32 km.
        </p>
      </div>
    </div>
  );
}
