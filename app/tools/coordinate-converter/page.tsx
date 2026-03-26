'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

/* ─── Math helpers ─── */
function ddToDms(dd: number): { deg: number; min: number; sec: number } {
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = (minFull - min) * 60;
  return { deg, min, sec };
}

function ddToDdm(dd: number): { deg: number; decMin: number } {
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const decMin = (abs - deg) * 60;
  return { deg, decMin };
}

function dmsToDd(deg: number, min: number, sec: number, negative: boolean): number {
  const abs = deg + min / 60 + sec / 3600;
  return negative ? -abs : abs;
}

function ddmToDd(deg: number, decMin: number, negative: boolean): number {
  const abs = deg + decMin / 60;
  return negative ? -abs : abs;
}

function fmt(n: number, decimals = 6): string {
  return isNaN(n) ? '' : n.toFixed(decimals);
}

function dirLat(dd: number) { return dd >= 0 ? 'N' : 'S'; }
function dirLon(dd: number) { return dd >= 0 ? 'E' : 'W'; }

type FormatKey = 'dd' | 'dms' | 'ddm';

interface DDState { lat: string; lon: string; }
interface DMSState { latD: string; latM: string; latS: string; latDir: 'N' | 'S'; lonD: string; lonM: string; lonS: string; lonDir: 'E' | 'W'; }
interface DDMState { latD: string; latDM: string; latDir: 'N' | 'S'; lonD: string; lonDM: string; lonDir: 'E' | 'W'; }

function computeFromDD(lat: number, lon: number): { dms: DMSState; ddm: DDMState } {
  const dmsLat = ddToDms(lat);
  const dmsLon = ddToDms(lon);
  const ddmLat = ddToDdm(lat);
  const ddmLon = ddToDdm(lon);
  return {
    dms: {
      latD: String(dmsLat.deg), latM: String(dmsLat.min), latS: fmt(dmsLat.sec, 4), latDir: dirLat(lat) as 'N' | 'S',
      lonD: String(dmsLon.deg), lonM: String(dmsLon.min), lonS: fmt(dmsLon.sec, 4), lonDir: dirLon(lon) as 'E' | 'W',
    },
    ddm: {
      latD: String(ddmLat.deg), latDM: fmt(ddmLat.decMin, 6), latDir: dirLat(lat) as 'N' | 'S',
      lonD: String(ddmLon.deg), lonDM: fmt(ddmLon.decMin, 6), lonDir: dirLon(lon) as 'E' | 'W',
    },
  };
}

export default function CoordConverter() {
  const [active, setActive] = useState<FormatKey>('dd');
  const [copied, setCopied] = useState<string | null>(null);
  const [elevUnit, setElevUnit] = useState<'ft' | 'm'>('ft');
  const [elev, setElev] = useState<{ ft: number; m: number } | null>(null);
  const [elevStatus, setElevStatus] = useState<'idle' | 'loading' | 'error' | 'nodata'>('idle');
  const elevAbortRef = useRef<AbortController | null>(null);

  const [dd, setDD] = useState<DDState>({ lat: '40.7128', lon: '-74.0060' });
  const [dms, setDMS] = useState<DMSState>(() => {
    const { dms } = computeFromDD(40.7128, -74.006);
    return dms;
  });
  const [ddm, setDDM] = useState<DDMState>(() => {
    const { ddm } = computeFromDD(40.7128, -74.006);
    return ddm;
  });

  const [latDD, lonDD] = [parseFloat(dd.lat), parseFloat(dd.lon)];
  const validDD = !isNaN(latDD) && !isNaN(lonDD) && Math.abs(latDD) <= 90 && Math.abs(lonDD) <= 180;

  /* Sync from DD → DMS & DDM */
  const syncFromDD = useCallback((lat: string, lon: string) => {
    const la = parseFloat(lat), lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo)) return;
    const { dms: d, ddm: dm } = computeFromDD(la, lo);
    setDMS(d);
    setDDM(dm);
  }, []);

  /* Sync from DMS → DD & DDM */
  const syncFromDMS = useCallback((d: DMSState) => {
    const lat = dmsToDd(+d.latD, +d.latM, +d.latS, d.latDir === 'S');
    const lon = dmsToDd(+d.lonD, +d.lonM, +d.lonS, d.lonDir === 'W');
    if (isNaN(lat) || isNaN(lon)) return;
    setDD({ lat: fmt(lat), lon: fmt(lon) });
    const { ddm: dm } = computeFromDD(lat, lon);
    setDDM(dm);
  }, []);

  /* Sync from DDM → DD & DMS */
  const syncFromDDM = useCallback((d: DDMState) => {
    const lat = ddmToDd(+d.latD, +d.latDM, d.latDir === 'S');
    const lon = ddmToDd(+d.lonD, +d.lonDM, d.lonDir === 'W');
    if (isNaN(lat) || isNaN(lon)) return;
    setDD({ lat: fmt(lat), lon: fmt(lon) });
    const { dms: dm } = computeFromDD(lat, lon);
    setDMS(dm);
  }, []);

  /* Called when user clicks/drags on the map */
  const handleMapPick = useCallback((lat: number, lon: number) => {
    const latStr = fmt(lat);
    const lonStr = fmt(lon);
    setDD({ lat: latStr, lon: lonStr });
    syncFromDD(latStr, lonStr);
  }, [syncFromDD]);

  /* ── Elevation lookup via USGS 3DEP ── */
  const fetchElevation = useCallback(async (lat: number, lon: number) => {
    if (elevAbortRef.current) elevAbortRef.current.abort();
    const ctrl = new AbortController();
    elevAbortRef.current = ctrl;
    setElevStatus('loading');
    setElev(null);
    try {
      const res = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: [{ lat, lon }] }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) { setElevStatus('error'); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const msg = JSON.parse(line.slice(6)) as { type: string; results?: Array<{ elevFt: number | null; elevM: number | null; noData: boolean; failed: boolean }> };
          if (msg.type === 'done') {
            const r = msg.results?.[0];
            if (!r || r.noData) { setElevStatus('nodata'); return; }
            if (r.failed || r.elevFt === null || r.elevM === null) { setElevStatus('error'); return; }
            setElev({ ft: r.elevFt, m: r.elevM });
            setElevStatus('idle');
            return;
          }
          if (msg.type === 'error') { setElevStatus('error'); return; }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setElevStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!validDD) { setElev(null); setElevStatus('idle'); return; }
    const t = setTimeout(() => fetchElevation(latDD, lonDD), 700);
    return () => clearTimeout(t);
  }, [latDD, lonDD, validDD, fetchElevation]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const ddCopyText = `${dd.lat}, ${dd.lon}`;
  const dmsCopyText = `${dms.latD}° ${dms.latM}' ${dms.latS}" ${dms.latDir}, ${dms.lonD}° ${dms.lonM}' ${dms.lonS}" ${dms.lonDir}`;
  const ddmCopyText = `${ddm.latD}° ${ddm.latDM}' ${ddm.latDir}, ${ddm.lonD}° ${ddm.lonDM}' ${ddm.lonDir}`;

  const gmapsUrl = validDD ? `https://www.google.com/maps?q=${dd.lat},${dd.lon}&z=10` : '#';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>📍 Coordinate Converter</h1>
          <p className={styles.subtitle}>
            Convert between coordinate formats used in GIS, GPS, and mapping.
            Edit any format — others update instantly. Click the map or drag the pin to pick a location.
          </p>
        </header>

        <div className={styles.mainGrid}>
          {/* ── Left column: formats ── */}
          <div className={styles.formCol}>

        {/* ── Format tabs ── */}
        <div className={styles.tabs}>
          {(['dd', 'dms', 'ddm'] as FormatKey[]).map(f => (
            <button
              key={f}
              className={`${styles.tab} ${active === f ? styles.tabActive : ''}`}
              onClick={() => setActive(f)}
            >
              {f === 'dd' ? 'Decimal Degrees' : f === 'dms' ? 'Deg Min Sec' : 'Deg Decimal Min'}
            </button>
          ))}
        </div>

        <div className={styles.sections}>

          {/* ── DD ── */}
          <div className={`${styles.section} ${active === 'dd' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionLabel}>Decimal Degrees</span>
                <span className={styles.sectionAbbr}>DD</span>
              </div>
              <button className={styles.copyBtn} onClick={() => copy(ddCopyText, 'dd')}>
                {copied === 'dd' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Latitude</label>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="e.g. 40.7128"
                  value={dd.lat}
                  onChange={e => { setDD(p => ({ ...p, lat: e.target.value })); syncFromDD(e.target.value, dd.lon); }}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Longitude</label>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="e.g. -74.0060"
                  value={dd.lon}
                  onChange={e => { setDD(p => ({ ...p, lon: e.target.value })); syncFromDD(dd.lat, e.target.value); }}
                />
              </div>
            </div>
            {validDD && (
              <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>
                Open in Google Maps ↗
              </a>
            )}
          </div>

          {/* ── DMS ── */}
          <div className={`${styles.section} ${active === 'dms' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionLabel}>Degrees Minutes Seconds</span>
                <span className={styles.sectionAbbr}>DMS</span>
              </div>
              <button className={styles.copyBtn} onClick={() => copy(dmsCopyText, 'dms')}>
                {copied === 'dms' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            {/* Latitude row */}
            <p className={styles.coordLabel}>Latitude</p>
            <div className={styles.dmsRow}>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>°</label>
                <input className={styles.inputSm} type="number" min={0} max={90} placeholder="0" value={dms.latD}
                  onChange={e => { const n = { ...dms, latD: e.target.value }; setDMS(n); syncFromDMS(n); }} />
              </div>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>′</label>
                <input className={styles.inputSm} type="number" min={0} max={59} placeholder="0" value={dms.latM}
                  onChange={e => { const n = { ...dms, latM: e.target.value }; setDMS(n); syncFromDMS(n); }} />
              </div>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>″</label>
                <input className={styles.inputSm} type="number" min={0} step="any" placeholder="0.0000" value={dms.latS}
                  onChange={e => { const n = { ...dms, latS: e.target.value }; setDMS(n); syncFromDMS(n); }} />
              </div>
              <select className={styles.dirSelect} value={dms.latDir}
                onChange={e => { const n = { ...dms, latDir: e.target.value as 'N' | 'S' }; setDMS(n); syncFromDMS(n); }}>
                <option>N</option><option>S</option>
              </select>
            </div>
            {/* Longitude row */}
            <p className={styles.coordLabel}>Longitude</p>
            <div className={styles.dmsRow}>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>°</label>
                <input className={styles.inputSm} type="number" min={0} max={180} placeholder="0" value={dms.lonD}
                  onChange={e => { const n = { ...dms, lonD: e.target.value }; setDMS(n); syncFromDMS(n); }} />
              </div>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>′</label>
                <input className={styles.inputSm} type="number" min={0} max={59} placeholder="0" value={dms.lonM}
                  onChange={e => { const n = { ...dms, lonM: e.target.value }; setDMS(n); syncFromDMS(n); }} />
              </div>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>″</label>
                <input className={styles.inputSm} type="number" min={0} step="any" placeholder="0.0000" value={dms.lonS}
                  onChange={e => { const n = { ...dms, lonS: e.target.value }; setDMS(n); syncFromDMS(n); }} />
              </div>
              <select className={styles.dirSelect} value={dms.lonDir}
                onChange={e => { const n = { ...dms, lonDir: e.target.value as 'E' | 'W' }; setDMS(n); syncFromDMS(n); }}>
                <option>E</option><option>W</option>
              </select>
            </div>
          </div>

          {/* ── DDM ── */}
          <div className={`${styles.section} ${active === 'ddm' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionLabel}>Degrees Decimal Minutes</span>
                <span className={styles.sectionAbbr}>DDM</span>
              </div>
              <button className={styles.copyBtn} onClick={() => copy(ddmCopyText, 'ddm')}>
                {copied === 'ddm' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            {/* Lat */}
            <p className={styles.coordLabel}>Latitude</p>
            <div className={styles.dmsRow}>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>°</label>
                <input className={styles.inputSm} type="number" min={0} max={90} placeholder="0" value={ddm.latD}
                  onChange={e => { const n = { ...ddm, latD: e.target.value }; setDDM(n); syncFromDDM(n); }} />
              </div>
              <div className={`${styles.dmsField} ${styles.dmsFieldWide}`}>
                <label className={styles.fieldLabel}>′</label>
                <input className={styles.inputSm} type="number" min={0} step="any" placeholder="0.000000" value={ddm.latDM}
                  onChange={e => { const n = { ...ddm, latDM: e.target.value }; setDDM(n); syncFromDDM(n); }} />
              </div>
              <select className={styles.dirSelect} value={ddm.latDir}
                onChange={e => { const n = { ...ddm, latDir: e.target.value as 'N' | 'S' }; setDDM(n); syncFromDDM(n); }}>
                <option>N</option><option>S</option>
              </select>
            </div>
            {/* Lon */}
            <p className={styles.coordLabel}>Longitude</p>
            <div className={styles.dmsRow}>
              <div className={styles.dmsField}>
                <label className={styles.fieldLabel}>°</label>
                <input className={styles.inputSm} type="number" min={0} max={180} placeholder="0" value={ddm.lonD}
                  onChange={e => { const n = { ...ddm, lonD: e.target.value }; setDDM(n); syncFromDDM(n); }} />
              </div>
              <div className={`${styles.dmsField} ${styles.dmsFieldWide}`}>
                <label className={styles.fieldLabel}>′</label>
                <input className={styles.inputSm} type="number" min={0} step="any" placeholder="0.000000" value={ddm.lonDM}
                  onChange={e => { const n = { ...ddm, lonDM: e.target.value }; setDDM(n); syncFromDDM(n); }} />
              </div>
              <select className={styles.dirSelect} value={ddm.lonDir}
                onChange={e => { const n = { ...ddm, lonDir: e.target.value as 'E' | 'W' }; setDDM(n); syncFromDDM(n); }}>
                <option>E</option><option>W</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── All-formats summary ── */}
        {validDD && (
          <div className={styles.summary}>
            <p className={styles.summaryTitle}>All Formats</p>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>DD</span>
              <span className={styles.summaryVal}>{ddCopyText}</span>
              <button className={styles.copyBtnSm} onClick={() => copy(ddCopyText, 'sum-dd')}>{copied === 'sum-dd' ? '✓' : 'Copy'}</button>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>DMS</span>
              <span className={styles.summaryVal}>{dmsCopyText}</span>
              <button className={styles.copyBtnSm} onClick={() => copy(dmsCopyText, 'sum-dms')}>{copied === 'sum-dms' ? '✓' : 'Copy'}</button>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>DDM</span>
              <span className={styles.summaryVal}>{ddmCopyText}</span>
              <button className={styles.copyBtnSm} onClick={() => copy(ddmCopyText, 'sum-ddm')}>{copied === 'sum-ddm' ? '✓' : 'Copy'}</button>
            </div>
          </div>
        )}

        {/* ── Elevation card ── */}
        {validDD && (
          <div className={styles.elevCard}>
            <div className={styles.elevHeader}>
              <span className={styles.elevLabel}>↑ Elevation</span>
              <div className={styles.elevUnitToggle}>
                <button
                  className={`${styles.unitBtn} ${elevUnit === 'ft' ? styles.unitBtnActive : ''}`}
                  onClick={() => setElevUnit('ft')}
                >ft</button>
                <button
                  className={`${styles.unitBtn} ${elevUnit === 'm' ? styles.unitBtnActive : ''}`}
                  onClick={() => setElevUnit('m')}
                >m</button>
              </div>
            </div>
            <div className={styles.elevValue}>
              {elevStatus === 'loading' && (
                <span className={styles.elevLoading}>querying USGS…</span>
              )}
              {elevStatus === 'error' && (
                <span className={styles.elevError}>unavailable</span>
              )}
              {elevStatus === 'nodata' && (
                <span className={styles.elevMuted}>no data (ocean / coverage gap)</span>
              )}
              {elevStatus === 'idle' && elev && (
                <>
                  <span className={styles.elevNum}>
                    {elevUnit === 'ft' ? elev.ft.toFixed(1) : elev.m.toFixed(1)}
                  </span>
                  <span className={styles.elevUnitLabel}>{elevUnit}</span>
                </>
              )}
            </div>
            <p className={styles.elevSource}>Source: USGS 3DEP (EPQS v1)</p>
          </div>
        )}

          </div>{/* end formCol */}

          {/* ── Right column: map ── */}
          <div className={styles.mapCol}>
            <MapPicker lat={latDD} lon={lonDD} onPick={handleMapPick} />
          </div>

        </div>{/* end mainGrid */}
      </div>
    </div>
  );
}
