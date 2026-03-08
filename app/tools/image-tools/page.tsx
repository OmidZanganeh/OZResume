'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type Tab = 'bg' | 'exif';

/* ─────────────────────────────────────────
   Background Remover
───────────────────────────────────────── */
type BgStatus = 'idle' | 'loading' | 'done' | 'error';

function BackgroundRemover() {
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<BgStatus>('idle');
  const [progress, setProgress] = useState('');
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = useCallback(async (file: File) => {
    setStatus('loading');
    setProgress('Loading AI model…');
    setResult(null);

    const originalUrl = URL.createObjectURL(file);
    setOriginal(originalUrl);

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      setProgress('Removing background…');
      const blob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) setProgress(`Processing… ${Math.round((current / total) * 100)}%`);
        },
      });
      setResult(URL.createObjectURL(blob));
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    fileRef.current = file;
    process(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = 'background-removed.png';
    a.click();
  };

  return (
    <div>
      <p className={styles.toolDesc}>
        AI-powered background removal — runs entirely in your browser. Your image is never uploaded to any server.
        <br /><em className={styles.toolNote}>First run downloads the AI model (~15 MB). Subsequent runs are instant.</em>
      </p>

      {status === 'idle' && (
        <div
          className={styles.dropzone}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <span className={styles.dropIcon}>🖼️</span>
          <p className={styles.dropText}>Drop an image here or <span className={styles.dropLink}>click to upload</span></p>
          <p className={styles.dropHint}>PNG, JPG, WEBP — any size</p>
          <input ref={inputRef} type="file" accept="image/*" className={styles.hiddenInput}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {status === 'loading' && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>{progress}</p>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.errorBox}>
          ❌ Something went wrong. Try a different image or browser.
          <button className={styles.retryBtn} onClick={() => setStatus('idle')}>Try Again</button>
        </div>
      )}

      {status === 'done' && original && result && (
        <div>
          <div className={styles.compareGrid}>
            <div className={styles.compareItem}>
              <p className={styles.compareLabel}>Original</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={original} alt="Original" className={styles.compareImg} />
            </div>
            <div className={styles.compareItem}>
              <p className={styles.compareLabel}>Background Removed</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="Background removed" className={`${styles.compareImg} ${styles.compareImgTransparent}`} />
            </div>
          </div>
          <div className={styles.actionRow}>
            <button className={styles.downloadBtn} onClick={download}>⬇ Download PNG</button>
            <button className={styles.retryBtn} onClick={() => { setStatus('idle'); setOriginal(null); setResult(null); }}>
              Try Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   EXIF / Metadata Reader
───────────────────────────────────────── */
type ExifStatus = 'idle' | 'loading' | 'done' | 'error' | 'nodata';

interface ExifData {
  [key: string]: string | number | boolean | undefined;
}

const EXIF_LABELS: Record<string, string> = {
  Make: 'Camera Make', Model: 'Camera Model', LensModel: 'Lens',
  ExposureTime: 'Exposure Time', FNumber: 'Aperture', ISO: 'ISO',
  FocalLength: 'Focal Length', Flash: 'Flash',
  DateTimeOriginal: 'Date Taken', PixelXDimension: 'Width (px)', PixelYDimension: 'Height (px)',
  GPSLatitude: 'GPS Latitude', GPSLongitude: 'GPS Longitude', GPSAltitude: 'GPS Altitude',
  Software: 'Software', Orientation: 'Orientation', ColorSpace: 'Color Space',
  WhiteBalance: 'White Balance', MeteringMode: 'Metering Mode',
};

function ExifReader() {
  const [status, setStatus] = useState<ExifStatus>('idle');
  const [meta, setMeta] = useState<ExifData>({});
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStatus('loading');
    setMeta({});
    setGps(null);
    try {
      const exifr = await import('exifr');
      const data = await exifr.parse(file, {
        pick: Object.keys(EXIF_LABELS),
        gps: true,
      });
      if (!data || Object.keys(data).length === 0) {
        setStatus('nodata');
        return;
      }
      const gpsData = await exifr.gps(file).catch(() => null);
      if (gpsData) setGps({ lat: gpsData.latitude, lon: gpsData.longitude });
      setMeta(data as ExifData);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  const fmt = (val: string | number | boolean | undefined): string => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(4);
    return String(val);
  };

  const mapsUrl = gps ? `https://www.google.com/maps?q=${gps.lat},${gps.lon}&z=14` : null;

  const copyCoords = () => {
    if (!gps) return;
    navigator.clipboard.writeText(`${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div>
      <p className={styles.toolDesc}>
        Upload a photo to read its embedded metadata: camera model, lens, exposure settings, GPS location, and more.
        Everything runs locally — no data leaves your device.
      </p>

      {(status === 'idle' || status === 'nodata' || status === 'error') && (
        <div
          className={styles.dropzone}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <span className={styles.dropIcon}>📷</span>
          <p className={styles.dropText}>Drop a photo here or <span className={styles.dropLink}>click to upload</span></p>
          <p className={styles.dropHint}>Works best with JPEG photos from cameras and phones</p>
          <input ref={inputRef} type="file" accept="image/*" className={styles.hiddenInput}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {status === 'nodata' && <p className={styles.infoMsg}>⚠ No EXIF metadata found in this image. Try a JPEG photo from a camera or smartphone.</p>}
      {status === 'error' && <p className={styles.errorMsg}>❌ Could not read metadata. Try a different file.</p>}

      {status === 'loading' && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Reading metadata…</p>
        </div>
      )}

      {status === 'done' && (
        <div>
          {gps && (
            <div className={styles.gpsCard}>
              <span className={styles.gpsIcon}>📍</span>
              <div>
                <p className={styles.gpsTitle}>GPS Location Found</p>
                <p className={styles.gpsCoords}>{gps.lat.toFixed(6)}, {gps.lon.toFixed(6)}</p>
              </div>
              <div className={styles.gpsBtns}>
                <button className={styles.gpsCopy} onClick={copyCoords}>{copied ? '✓ Copied' : 'Copy'}</button>
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.gpsMaps}>Maps ↗</a>}
              </div>
            </div>
          )}

          <div className={styles.metaTable}>
            {Object.entries(EXIF_LABELS).map(([key, label]) => {
              const val = meta[key];
              if (val === undefined) return null;
              return (
                <div key={key} className={styles.metaRow}>
                  <span className={styles.metaKey}>{label}</span>
                  <span className={styles.metaVal}>{fmt(val)}</span>
                </div>
              );
            })}
          </div>

          <button className={styles.retryBtn} style={{ marginTop: 16 }} onClick={() => { setStatus('idle'); setMeta({}); setGps(null); }}>
            Read Another Image
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function ImageToolsPage() {
  const [tab, setTab] = useState<Tab>('bg');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>🖼️ Image Tools</h1>
          <p className={styles.subtitle}>
            Two tools in one: remove image backgrounds with AI, or read hidden EXIF metadata from any photo.
            Everything runs in your browser — nothing is uploaded.
          </p>
        </header>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'bg' ? styles.tabActive : ''}`} onClick={() => setTab('bg')}>
            ✂️ Background Remover
          </button>
          <button className={`${styles.tab} ${tab === 'exif' ? styles.tabActive : ''}`} onClick={() => setTab('exif')}>
            📷 EXIF Metadata Reader
          </button>
        </div>

        <div className={styles.toolBody}>
          {tab === 'bg' ? <BackgroundRemover /> : <ExifReader />}
        </div>
      </div>
    </div>
  );
}
